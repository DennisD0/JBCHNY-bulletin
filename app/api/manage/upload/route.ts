import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { readDataJson, writeDataJson } from "@/lib/cloud-data";
import { createOcrWorker } from "@/lib/ocr-worker";
import { loadRoster, saveLearnedFromGrid } from "@/lib/preacher-roster";
import { readScheduleGrid } from "@/lib/schedule-grid";
import { buildEastCoastEntries, type GridChurch } from "@/lib/schedule-grid-shared";

export const maxDuration = 60;

// Guardrails so one upload can't exhaust memory or the 60s OCR budget.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_PDF_PAGES = 10;

// ── Korean Bible abbreviation → English name ──────────────────
// Short forms, matching the convention already used throughout the existing
// year_reading_plan.json data (e.g. "Gen", "1 Sam", "Isa") — only "Ps" is
// expanded to "Psalms" at display time (see auto-populate/route.ts's fmt()).
const KR_BOOK: Record<string, string> = {
  창:"Gen", 출:"Ex", 레:"Lev", 민:"Num", 신:"Deut",
  수:"Josh", 삿:"Judg", 룻:"Ruth", 삼상:"1 Sam", 삼하:"2 Sam",
  왕상:"1 Ki", 왕하:"2 Ki", 대상:"1 Chr", 대하:"2 Chr",
  스:"Ezra", 느:"Neh", 에:"Esth", 욥:"Job", 시:"Ps",
  잠:"Prov", 전:"Eccl", 아:"Song",
  사:"Isa", 렘:"Jer", 애:"Lam", 겔:"Ezek",
  단:"Dan", 호:"Hos", 욜:"Joel", 암:"Amos", 옵:"Obad",
  욘:"Jonah", 미:"Mic", 나:"Nah", 합:"Hab", 습:"Zeph",
  학:"Hag", 슥:"Zech", 말:"Mal",
  마:"Matt", 막:"Mark", 눅:"Luke", 요:"John", 행:"Acts",
  롬:"Rom", 고전:"1 Cor", 고후:"2 Cor",
  갈:"Gal", 엡:"Eph", 빌:"Phil", 골:"Col",
  살전:"1 Thess", 살후:"2 Thess",
  딤전:"1 Tim", 딤후:"2 Tim", 딛:"Titus", 몬:"Phlm",
  히:"Heb", 약:"Jas", 벧전:"1 Pet", 벧후:"2 Pet",
  요일:"1 John", 요이:"2 John", 요삼:"3 John", 유:"Jude", 계:"Rev",
};

// ── English book name variants → canonical ──────────────────
const EN_BOOK_ALIAS: Record<string, string> = {
  gen:"Genesis", ex:"Exodus", exo:"Exodus", lev:"Leviticus", num:"Numbers",
  deut:"Deuteronomy", dt:"Deuteronomy", josh:"Joshua", jdg:"Judges",
  jg:"Judges", ruth:"Ruth", "1sam":"1 Samuel", "2sam":"2 Samuel",
  "1ki":"1 Kings", "2ki":"2 Kings", "1ch":"1 Chronicles", "2ch":"2 Chronicles",
  ezr:"Ezra", neh:"Nehemiah", est:"Esther", job:"Job", ps:"Psalms",
  psa:"Psalms", prov:"Proverbs", pr:"Proverbs", eccl:"Ecclesiastes",
  song:"Song of Solomon", isa:"Isaiah", jer:"Jeremiah", lam:"Lamentations",
  ezek:"Ezekiel", dan:"Daniel", hos:"Hosea", joel:"Joel", amos:"Amos",
  obad:"Obadiah", jonah:"Jonah", mic:"Micah", nah:"Nahum", hab:"Habakkuk",
  zeph:"Zephaniah", hag:"Haggai", zech:"Zechariah", mal:"Malachi",
  matt:"Matthew", mt:"Matthew", mk:"Mark", lk:"Luke", jn:"John",
  acts:"Acts", rom:"Romans", "1cor":"1 Corinthians", "2cor":"2 Corinthians",
  gal:"Galatians", eph:"Ephesians", phil:"Philippians", col:"Colossians",
  "1thess":"1 Thessalonians", "2thess":"2 Thessalonians",
  "1tim":"1 Timothy", "2tim":"2 Timothy", tit:"Titus", phlm:"Philemon",
  heb:"Hebrews", jas:"James", "1pet":"1 Peter", "2pet":"2 Peter",
  "1jn":"1 John", "2jn":"2 John", "3jn":"3 John", jude:"Jude", rev:"Revelation",
};

// ── Korean event keywords → type ───────────────────────────
const KR_EVENT: Record<string, string> = {
  전도집회: "grand-bible-seminar",
  청년임원: "ya-officer-retreat",
  수련회:   "ya-officer-retreat",
  중고등부: "ec-youth-camp",
  여름캠프: "ec-youth-camp",
  캠프:     "ec-youth-camp",
  "ec youth camp":     "ec-youth-camp",
  "ya officer":        "ya-officer-retreat",
  "grand bible":       "grand-bible-seminar",
  "bible seminar":     "grand-bible-seminar",
};

// Korean month names
const KR_MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const EN_MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

// ── Expand a single (non-slash) Korean passage code ──────────
function expandKrPassageOne(clean: string, prevBook: string): { passage: string; book: string } {
  // Multi-char abbrevs first (삼상, 삼하, 왕상, 왕하, 대상, 대하, 고전, 고후, 살전, 살후, 딤전, 딤후, 벧전, 벧후, 요일, 요이, 요삼)
  const multiMatch = clean.match(/^(삼상|삼하|왕상|왕하|대상|대하|고전|고후|살전|살후|딤전|딤후|벧전|벧후|요일|요이|요삼)(\d.*)$/);
  if (multiMatch) {
    const book = KR_BOOK[multiMatch[1]] ?? multiMatch[1];
    return { passage: `${book} ${multiMatch[2]}`, book };
  }

  // Single Korean char + digits
  const singleMatch = clean.match(/^([가-힣]{1,2})(\d.*)$/);
  if (singleMatch) {
    const abbr = singleMatch[1];
    const book = KR_BOOK[abbr] ?? abbr;
    return { passage: `${book} ${singleMatch[2]}`, book };
  }

  // Digits only — continuation of previous book
  if (/^\d/.test(clean)) {
    return { passage: prevBook ? `${prevBook} ${clean}` : clean, book: prevBook };
  }

  return { passage: clean, book: prevBook };
}

// ── Expand Korean passage code ──────────────────────────────
// "창1-3" → "Gen 1-3"
// "4-7" → just chapters (appended to previous book if no book prefix)
// "딛1-3/몬1" → "Titus 1-3 / Phlm 1" (short combined-book days near year-end)
function expandKrPassage(code: string, prevBook: string): { passage: string; book: string } {
  // Strip whitespace / punctuation noise, but keep a comma directly between
  // digits (e.g. "2,3" meaning chapters 2 and 3) rather than collapsing it.
  const clean = code.trim().replace(/[：:.。,](?!\d)/g, "");
  if (!clean) return { passage: "", book: prevBook };

  if (clean.includes("/")) {
    let book = prevBook;
    const passages: string[] = [];
    for (const part of clean.split("/")) {
      const r = expandKrPassageOne(part, book);
      passages.push(r.passage);
      book = r.book;
    }
    return { passage: passages.join(" / "), book };
  }

  return expandKrPassageOne(clean, prevBook);
}

// ── Parse Korean columnar reading plan ─────────────────────
// The OCR produces lines in column-major order: all rows of col1, then col2, etc.
// Each "column" = one month. Rows = 일/성경/확인 header then 31 entries.
function parseKoreanReadingPlan(lines: string[], year: number): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) daysInMonth[1] = 29;

  // Strip empty lines and known non-data lines
  const skip = new Set(["일","성경","확인","","check","date","reading"]);
  const dataLines = lines.map(l => l.trim()).filter(l => !skip.has(l.toLowerCase()));

  // Find month markers. They cluster into "runs" — one run per physical page,
  // e.g. [1월..6월] then [7월..12월] — because the OCR emits all of a page's
  // month headers up front, followed by ALL of that page's day-rows in
  // row-major order (day 1 for every column, then day 2 for every column...).
  // A single contiguous per-month slice (the old approach) is the wrong shape
  // for this layout and silently drops/misattributes data at month boundaries.
  const monthIndices: number[] = [];
  dataLines.forEach((l, i) => {
    if (KR_MONTHS.includes(l)) monthIndices.push(i);
  });

  const runs: number[][] = [];
  for (const idx of monthIndices) {
    const lastRun = runs[runs.length - 1];
    if (lastRun && idx === lastRun[lastRun.length - 1] + 1) lastRun.push(idx);
    else runs.push([idx]);
  }

  const useColumns = monthIndices.length >= 2;

  if (useColumns) {
    for (let ri = 0; ri < runs.length; ri++) {
      const run = runs[ri];
      const months = run.map((i) => KR_MONTHS.indexOf(dataLines[i]) + 1);
      const blockStart = run[run.length - 1] + 1;
      const blockEnd = ri + 1 < runs.length ? runs[ri + 1][0] : dataLines.length;
      const block = dataLines.slice(blockStart, blockEnd);

      // Book continuation is tracked per column (per month) so it survives
      // across month boundaries within the same page/run — the reading plan
      // continues a book from one month into the next.
      const prevBook = new Array(months.length).fill("");
      let day = 1;
      let pos = 0;
      const maxDay = Math.max(...months.map((m) => daysInMonth[m - 1]));

      while (day <= maxDay && pos < block.length) {
        const validCols = months
          .map((m, idx) => idx)
          .filter((idx) => day <= daysInMonth[months[idx] - 1]);

        for (const colIdx of validCols) {
          if (pos >= block.length) break;
          let tag = block[pos];
          // Defensive resync: a stray duplicate day-number token (OCR noise
          // from a skipped short-month column) shows up as two tag-shaped
          // tokens in a row with no passage between them — drop the extra.
          while (tag !== String(day) && /^\d{1,2}$/.test(tag) && Number(tag) <= 31) {
            pos++;
            tag = block[pos];
          }
          pos++;
          let passageTok = block[pos];
          if (passageTok === String(day)) {
            pos++;
            passageTok = block[pos];
          }
          pos++;

          const { passage, book } = expandKrPassage(passageTok ?? "", prevBook[colIdx]);
          prevBook[colIdx] = book;
          const month = months[colIdx];
          const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          result[key] = passage || null;
        }
        day++;
      }
    }
  } else {
    // Flat sequential: just look for passage-like tokens and assign to Jan 1, Jan 2, ...
    let month = 1, day = 1, prevBook = "";
    for (const tok of dataLines) {
      if (!tok || /^[vV✓✗□■\s]+$/.test(tok)) continue;
      if (/^\d{1,2}$/.test(tok)) continue; // day numbers, skip
      if (/\d/.test(tok)) {
        const { passage, book } = expandKrPassage(tok, prevBook);
        if (passage) {
          prevBook = book;
          const key = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          result[key] = passage;
          day++;
          if (day > daysInMonth[month - 1]) { day = 1; month++; }
          if (month > 12) break;
        }
      }
    }
  }

  return result;
}

// ── Parse English reading plan ──────────────────────────────
// Handles patterns like: "January 1 - Genesis 1-3" or "Jan 1: Gen 1-3"
function parseEnglishReadingPlan(text: string, year: number): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  const daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) daysInMonth[1] = 29;

  // Pattern: [month] [day] [sep] [book] [chapters]
  const lineRe = /(?:([A-Za-z]+)\s+(\d{1,2})\s*[:\-–]\s*)?([1-9A-Za-z][A-Za-z]*)\s+(\d[\d\-–,]+)/g;
  let month = 0, day = 0;
  let m;
  while ((m = lineRe.exec(text)) !== null) {
    const [, monStr, dayStr, bookRaw, chapters] = m;
    if (monStr) {
      const idx = EN_MONTHS.indexOf(monStr.slice(0,3).toLowerCase());
      if (idx >= 0) { month = idx + 1; day = Number(dayStr); }
    }
    if (!month || day < 1) continue;
    const bookLower = bookRaw.toLowerCase().replace(/\./g,"");
    let book = EN_BOOK_ALIAS[bookLower] ?? bookRaw;
    // Capitalize first letter of each word if not found
    if (!EN_BOOK_ALIAS[bookLower]) {
      // Check if it's a full name
      const fullLower = Object.values(EN_BOOK_ALIAS).find(v => v.toLowerCase() === bookLower.toLowerCase());
      if (fullLower) book = fullLower;
    }
    const key = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    result[key] = `${book} ${chapters}`;
    // Advance to the next calendar day, rolling into the next month so we never emit
    // an impossible date like -02-30. Stop after December.
    day++;
    if (day > daysInMonth[month - 1]) { day = 1; month++; }
    if (month > 12) break;
  }

  return result;
}

// ── Parse monthly schedule OCR text ────────────────────────
interface ParsedEvent {
  id: string; type: string; label: string;
  startDate: string; endDate: string;
  location: string; pastor?: string;
}

function detectEventType(text: string): string {
  const lower = text.toLowerCase();
  for (const [kw, type] of Object.entries(KR_EVENT)) {
    if (lower.includes(kw.toLowerCase())) return type;
  }
  return "other";
}

const TYPE_LABEL: Record<string, string> = {
  "grand-bible-seminar": "Grand Bible Seminar",
  "ya-officer-retreat":  "YA Officer Retreat",
  "ec-youth-camp":       "EC Youth Camp",
  "other":               "Event",
};

// Extract "month/day" or "M월 D일" patterns
function extractDates(text: string, year: number): string[] {
  const dates: string[] = [];
  // Korean: 7월 1일, 7월1일
  for (const m of text.matchAll(/(\d{1,2})월\s*(\d{1,2})일/g)) {
    const mo = String(m[1]).padStart(2,"0");
    const d  = String(m[2]).padStart(2,"0");
    dates.push(`${year}-${mo}-${d}`);
  }
  // English: July 1, Jul 1
  for (const m of text.matchAll(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/gi)) {
    const monName = text.slice(m.index!, m.index! + 3).toLowerCase();
    const mo = EN_MONTHS.indexOf(monName) + 1;
    if (mo > 0) dates.push(`${year}-${String(mo).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`);
  }
  // Numeric: 7/1, 07/01
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)) {
    dates.push(`${year}-${String(m[1]).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`);
  }
  return [...new Set(dates)].sort();
}

function parseScheduleText(text: string, year: number): {
  coverageStart: string; coverageEnd: string; quarter: string; events: ParsedEvent[];
} {
  const events: ParsedEvent[] = [];
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  // Detect location (뉴욕 = New York, 뉴저지 = NJ)
  function detectLocation(chunk: string): string {
    if (/뉴욕|new\s*york|ny church/i.test(chunk)) return "New York";
    if (/뉴저지|new\s*jersey|nj/i.test(chunk)) return "NJ Church";
    if (/krc|켄터키|kentucky/i.test(chunk)) return "KRC";
    return "";
  }

  // Detect pastor name (박종경 = Pastor Park)
  function detectPastor(chunk: string): string | undefined {
    if (/박종경|pastor\s*park/i.test(chunk)) return "Pastor Park";
    return undefined;
  }

  // Group lines into event chunks by detecting event keywords
  let currentChunk = "";
  let currentType  = "";
  const chunks: { text: string; type: string }[] = [];

  for (const line of lines) {
    const type = detectEventType(line);
    if (type !== "other" && type !== currentType) {
      if (currentChunk && currentType) chunks.push({ text: currentChunk, type: currentType });
      currentChunk = line;
      currentType  = type;
    } else {
      currentChunk += "\n" + line;
    }
  }
  if (currentChunk && currentType) chunks.push({ text: currentChunk, type: currentType });

  // If no chunks found by keyword, try to find date ranges and group nearby text
  if (chunks.length === 0) {
    const allDates = extractDates(text, year);
    if (allDates.length >= 2) {
      // Create a single event spanning all found dates
      chunks.push({ text, type: "other" });
    }
  }

  // Build events from chunks
  for (const chunk of chunks) {
    const dates = extractDates(chunk.text, year);
    if (dates.length === 0) continue;
    const start = dates[0];
    const end   = dates[dates.length - 1];
    const loc   = detectLocation(chunk.text);
    const pastor = detectPastor(chunk.text);
    const id    = `${chunk.type}-${start.slice(0,7)}`;
    events.push({
      id, type: chunk.type,
      label: TYPE_LABEL[chunk.type] ?? "Event",
      startDate: start, endDate: end,
      location: loc,
      ...(pastor ? { pastor } : {}),
    });
  }

  // Determine coverage
  const allDates = events.flatMap(e => [e.startDate, e.endDate]).sort();
  const coverageStart = allDates[0] ?? `${year}-01-01`;
  const coverageEnd   = allDates[allDates.length - 1] ?? `${year}-12-31`;
  const startMonth    = Number(coverageStart.slice(5, 7));
  const endMonth      = Number(coverageEnd.slice(5, 7));
  const quarter       = endMonth <= 3 ? "Q1" : endMonth <= 6 ? "Q2" : endMonth <= 9 ? "Q3" : "Q4";

  return { coverageStart, coverageEnd, quarter: `${quarter} ${year}`, events };
}

// ── Render PDF pages → image buffers via mupdf ─────────────
async function renderPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  // Dynamic import to avoid loading mupdf at module level
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mupdf = require("mupdf") as typeof import("mupdf");
  const doc = mupdf.Document.openDocument(pdfBuffer as unknown as ArrayBuffer, "application/pdf");
  const pageCount = doc.countPages();
  const images: Buffer[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const scale = 2.5; // ~180 DPI
    const pixmap = page.toPixmap(
      [scale, 0, 0, scale, 0, 0] as import("mupdf").Matrix,
      mupdf.ColorSpace.DeviceRGB,
      false,
      true
    );
    images.push(Buffer.from(pixmap.asPNG()));
  }
  return images;
}

// ── OCR via tesseract.js ────────────────────────────────────
// Phone photos can be 4000+px; OCR time and memory scale with pixel count and
// nothing useful is gained above ~2400px on a printed table.
async function shrinkForOcr(buf: Buffer): Promise<Buffer> {
  try {
    return await sharp(buf)
      .rotate() // honour EXIF orientation
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return buf; // let tesseract try the original if sharp can't decode it
  }
}

async function runOCR(imageBuffers: Buffer[], langs: string): Promise<string> {
  const worker = await createOcrWorker(langs);
  const parts: string[] = [];
  try {
    for (const buf of imageBuffers) {
      const { data: { text } } = await worker.recognize(await shrinkForOcr(buf));
      parts.push(text);
    }
    return parts.join("\n");
  } finally {
    // Always terminate — a throw mid-recognition would otherwise leak the worker.
    await worker.terminate();
  }
}

// ── Schedule merge ──────────────────────────────────────────
interface ScheduleFile {
  coverageStart?: string; coverageEnd?: string; quarter?: string;
  events?: ParsedEvent[];
  eastCoastSeminars?: ReturnType<typeof buildEastCoastEntries>;
  churches?: GridChurch[];
}

// A new upload only replaces what falls inside its own date range. Everything else
// already saved (other quarters' East Coast rows and events, and anything the upload
// couldn't read) is kept, so a bad or partial parse can't wipe the schedule.
function mergeSchedule(existing: ScheduleFile | null, incoming: ScheduleFile): ScheduleFile {
  const start = incoming.coverageStart ?? existing?.coverageStart;
  const end   = incoming.coverageEnd   ?? existing?.coverageEnd;
  const outside = (a: string, b: string) => !!start && !!end && (b < start || a > end);
  const keptEvents = (existing?.events ?? []).filter((e) => outside(e.startDate, e.endDate));
  const keptEast   = (existing?.eastCoastSeminars ?? []).filter((e) => outside(e.date, e.date));
  const east = incoming.churches ? buildEastCoastEntries(incoming.churches) : [];
  return {
    ...existing,
    coverageStart: [existing?.coverageStart, start].filter(Boolean).sort()[0],
    coverageEnd:   [existing?.coverageEnd, end].filter(Boolean).sort().reverse()[0],
    quarter: incoming.quarter ?? existing?.quarter,
    events: [...keptEvents, ...(incoming.events ?? [])],
    eastCoastSeminars: [...keptEast, ...east].sort((a, b) => a.date.localeCompare(b.date)),
    ...(incoming.churches ? { churches: incoming.churches } : {}),
  };
}

function isGridChurches(v: unknown): v is GridChurch[] {
  return Array.isArray(v) && v.length > 0 && v.every((c) =>
    c && typeof c.en === "string" && Array.isArray(c.sundays) &&
    c.sundays.every((s: { date?: unknown; name?: unknown }) => typeof s.date === "string" && typeof s.name === "string"));
}

// ── POST handler ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Reviewed/corrected schedule from the upload modal's table (no file involved).
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const body = await request.json();
      if (body?.type !== "schedule" || !isGridChurches(body?.data?.churches)) {
        return NextResponse.json({ error: "Invalid schedule data" }, { status: 400 });
      }
      const { coverageStart, coverageEnd, quarter, churches, events } = body.data;
      const existing = await readDataJson<ScheduleFile>("monthly_schedule.json");
      const merged = mergeSchedule(existing, {
        coverageStart, coverageEnd, quarter, churches,
        events: Array.isArray(events) ? events : [],
      });
      await writeDataJson("monthly_schedule.json", merged);
      // Remember what the person fixed so the same misread is corrected automatically next time.
      await saveLearnedFromGrid(churches).catch((e) => console.error("Failed to save learned names", e));
      return NextResponse.json({ success: true, saved: true });
    }

    const formData = await request.formData();
    const uploadType = formData.get("type") as string; // "reading" | "schedule"
    const yearStr    = formData.get("year") as string;
    const file       = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!uploadType) return NextResponse.json({ error: "No type provided" }, { status: 400 });

    // Reject oversized uploads before reading them into memory / spending the 60s OCR budget.
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)` },
        { status: 400 }
      );
    }

    const year       = Number(yearStr) || new Date().getFullYear();
    const buffer     = Buffer.from(await file.arrayBuffer());
    const isPdf      = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage    = !isPdf;

    // Step 1: Get image buffers
    let imageBuffers: Buffer[];
    if (isPdf) {
      imageBuffers = await renderPdfToImages(buffer);
      if (imageBuffers.length > MAX_PDF_PAGES) {
        return NextResponse.json(
          { error: `PDF has too many pages (max ${MAX_PDF_PAGES})` },
          { status: 400 }
        );
      }
    } else {
      imageBuffers = [buffer];
    }

    // Step 2a: the quarterly sermon plan is a ruled grid — read it cell by cell.
    const shouldSave = formData.get("save") === "true";
    if (uploadType === "schedule") {
      const { roster, aliases } = await loadRoster();
      const grid = await readScheduleGrid(imageBuffers[0], year, roster, aliases);
      if (grid) {
        const ny = grid.churches.find((c) => c.en === "New York");
        const fmtDay = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
        const previewLines = [
          `${grid.quarter}: ${fmtDay(grid.coverageStart)} – ${fmtDay(grid.coverageEnd)} · ${grid.churches.length} churches`,
          ...(ny ? [`New York: ${ny.sundays.filter((c) => c.name && c.status !== "same").map((c) => `${fmtDay(c.date)} ${c.name}${c.title}`).join(", ")}`] : []),
          ...(grid.events.length > 0
            ? [`Events: ${grid.events.map((e) => `${e.label} ${fmtDay(e.startDate)}–${fmtDay(e.endDate)}`).join("; ")}`]
            : ["No events found in the top bands"]),
          grid.unmatched > 0
            ? `⚠ ${grid.unmatched} name${grid.unmatched === 1 ? "" : "s"} not recognised — fix the red cells below`
            : "All names recognised",
          ...(grid.corrected > 0 ? [`${grid.corrected} name${grid.corrected === 1 ? "" : "s"} auto-corrected (amber cells) — worth a quick look`] : []),
        ];
        if (shouldSave) {
          const existing = await readDataJson<ScheduleFile>("monthly_schedule.json");
          await writeDataJson("monthly_schedule.json", mergeSchedule(existing, grid));
        }
        return NextResponse.json({ success: true, preview: previewLines, rawText: "", data: grid, saved: shouldSave });
      }
    }

    // Step 2b: OCR — use Korean + English for schedule, Korean+English for reading
    const langs = "kor+eng";
    const rawText = await runOCR(imageBuffers, langs);

    // Step 3: Parse based on type
    let parsedData: unknown;
    let outputName: string;
    let previewLines: string[] = [];

    if (uploadType === "reading") {
      const rawLines = rawText.split(/\n/);
      // Detect language: if many Korean chars, use Korean parser
      const koreanCharCount = (rawText.match(/[가-힣]/g) ?? []).length;
      let plan: Record<string, string | null>;
      if (koreanCharCount > 20) {
        plan = parseKoreanReadingPlan(rawLines, year);
      } else {
        plan = parseEnglishReadingPlan(rawText, year);
      }
      parsedData = plan;
      outputName = "year_reading_plan.json";
      const entries = Object.entries(plan).filter(([,v]) => v);
      previewLines = entries.slice(0, 10).map(([k, v]) => `${k}: ${v}`);
      previewLines.push(`... ${entries.length} total entries`);
    } else {
      const schedule = parseScheduleText(rawText, year);
      parsedData = schedule;
      outputName = "monthly_schedule.json";
      previewLines = schedule.events.map(e =>
        `${e.label}: ${e.startDate} – ${e.endDate}${e.location ? " · " + e.location : ""}`
      );
      if (previewLines.length === 0) previewLines = ["No events detected — check the raw text below"];
    }

    // Step 4: Optionally save immediately (controlled by "save" flag)
    if (shouldSave) {
      let toWrite = parsedData;
      // Merge onto what's saved so a partial or poor parse doesn't wipe the rest:
      // reading plans are a flat {date: passage} map; the schedule is merged by date range.
      if (uploadType === "reading") {
        const existing = await readDataJson<Record<string, string | null>>(outputName);
        if (existing) toWrite = { ...existing, ...(parsedData as Record<string, string | null>) };
      } else {
        const existing = await readDataJson<ScheduleFile>(outputName);
        toWrite = mergeSchedule(existing, parsedData as ScheduleFile);
      }
      await writeDataJson(outputName, toWrite);
    }

    return NextResponse.json({
      success: true,
      preview: previewLines,
      rawText: rawText.slice(0, 2000), // first 2000 chars for debugging
      data: parsedData,
      saved: shouldSave,
    });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
