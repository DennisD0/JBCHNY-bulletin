import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import type { CalendarBanner, WeeklyRecurringEvent } from "./bulletin-types";
import { fullDate, type MonthSeminar } from "./month-seminars.ts";

// Reads the church's one-month calendar spreadsheet (.xlsx) into the bulletin's calendar
// section. Each sheet is a month grid: a title cell holding the month's first day, a
// LORD'S DAY / MON … SAT header, then one block per week — a row of dates followed by the
// week's items. "- Item (time)" lines are that day's meetings; text without a leading dash
// is a banner (a retreat or seminar) whose width is the merged cells it sits in.

export interface MonthSheetResult {
  sheetName: string;
  /** "MM/YYYY", the format of BulletinData.calendarMonth. */
  calendarMonth: string;
  calendarBanners: CalendarBanner[];
  /** Day notes keyed "m/d". */
  calendarEvents: Record<string, string[]>;
  weeklyRecurring: WeeklyRecurringEvent[];
  /** Bible seminars among the banners, with full dates, for the Bible Seminar Info section. */
  seminars: MonthSeminar[];
  /** Banners left off the printed calendar (online-only events). */
  skipped: string[];
  /** Things worth a second look: unrecognised labels, dates that don't line up. */
  warnings: string[];
}

interface Cell { text?: string; num?: number }
interface Merge { r1: number; c1: number; r2: number; c2: number }

const DAY_MS = 86_400_000;
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

// Sheet wording → the short labels the bulletin calendar prints (see data/bulletin.en.json).
const LABEL_ALIASES: Record<string, string> = {
  "lords day sermon": "Sermon",
  "sermon": "Sermon",
  "wed sermon": "Wed sermon",
  "teacher training": "Teachers'",
  "translator meeting": "Translators'",
  "ya fellowship": "YA'",
  "officer meeting": "Officers'",
  "mother officer mtg": "Mothers Officers'",
  "ya officer meeting": "YA Officers'",
  "new believers": "New believers'",
  "choir meeting": "Choirs'",
  "choir practice": "Choirs'",
  "mothers group": "Mother Group",
  "fellowship by lang": "Fel. by Lang",
  "fel by language": "Fel. by Lang",
  "mtg by language": "Fel. by Lang",
  "altogether fel": "Altogether",
};

const normKey = (s: string) =>
  s.toLowerCase().replace(/[’'`.]/g, "").replace(/[^a-z0-9&]+/g, " ").trim();

/** "- Lord's Day Sermon (11:00a)" → "Sermon"; labels with no known short form keep their wording. */
export function shortenLabel(raw: string): { label: string; known: boolean } {
  const cleaned = raw
    .replace(/^[\s\-–•]+/, "")
    .replace(/\s*\(\s*\d{1,2}(:\d{2})?\s*[ap]m?\s*\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const alias = LABEL_ALIASES[normKey(cleaned)];
  if (alias) return { label: alias, known: true };
  if (/^region \d$/i.test(cleaned)) return { label: cleaned.replace(/^region/i, "Region"), known: true };
  return { label: cleaned, known: false };
}

function colNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function parseRef(ref: string): { r: number; c: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  return m ? { r: Number(m[2]), c: colNumber(m[1]) } : null;
}

function serialToDate(serial: number): Date {
  return new Date(EXCEL_EPOCH_MS + Math.round(serial) * DAY_MS);
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const md = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

/** Visible text of a <si>/<is> node, ignoring phonetic (rPh) runs. */
function stringText(node: Element): string {
  let out = "";
  const ts = node.getElementsByTagName("t");
  for (let i = 0; i < ts.length; i++) {
    const t = ts.item(i)!;
    if ((t.parentNode as Element | null)?.nodeName === "rPh") continue;
    out += t.textContent ?? "";
  }
  return out;
}

interface Sheet { name: string; cells: Map<string, Cell>; merges: Merge[]; maxRow: number }

const key = (r: number, c: number) => `${r},${c}`;

function parseSheetXml(name: string, xml: string, shared: string[]): Sheet {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const cells = new Map<string, Cell>();
  let maxRow = 0;
  const cs = doc.getElementsByTagName("c");
  for (let i = 0; i < cs.length; i++) {
    const c = cs.item(i)!;
    const at = parseRef(c.getAttribute("r") ?? "");
    if (!at) continue;
    const type = c.getAttribute("t");
    const v = c.getElementsByTagName("v").item(0)?.textContent ?? "";
    let cell: Cell | null = null;
    if (type === "s") cell = { text: shared[Number(v)] ?? "" };
    else if (type === "inlineStr") { const is = c.getElementsByTagName("is").item(0); cell = { text: is ? stringText(is) : "" }; }
    else if (type === "str") cell = { text: v };
    else if (v !== "" && !Number.isNaN(Number(v))) cell = { num: Number(v) };
    if (!cell) continue;
    if (cell.text !== undefined && cell.text.trim() === "") continue;
    cells.set(key(at.r, at.c), cell);
    if (at.r > maxRow) maxRow = at.r;
  }
  const merges: Merge[] = [];
  const ms = doc.getElementsByTagName("mergeCell");
  for (let i = 0; i < ms.length; i++) {
    const [a, b] = (ms.item(i)!.getAttribute("ref") ?? "").split(":");
    const p = parseRef(a ?? ""), q = parseRef(b ?? a ?? "");
    if (p && q) merges.push({ r1: p.r, c1: p.c, r2: q.r, c2: q.c });
  }
  return { name, cells, merges, maxRow };
}

/** "(3/7~9)", "(3/31~4/6)" → ["3/7","3/9"]; null when the text carries no date range. */
function explicitRange(text: string): [string, string] | null {
  const m = /\(\s*(\d{1,2})\/(\d{1,2})\s*[~\-–]\s*(?:(\d{1,2})\/)?(\d{1,2})\s*\)/.exec(text);
  if (!m) return null;
  return [`${Number(m[1])}/${Number(m[2])}`, `${Number(m[3] ?? m[1])}/${Number(m[4])}`];
}

/** Banner text → printed label: no dates, no ":place" suffix, "P.Samuel Park" → "(p.Park)". */
function bannerLabel(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/_+\s*$/, "").trim()).filter(Boolean);
  let first = lines[0] ?? "";
  const rest = lines.slice(1).join(" ");
  const strip = (s: string) => s.replace(/\(\s*\d{1,2}\/\d{1,2}[^)]*\)/g, "").replace(/\s*:\s*[^:]*$/, "").replace(/\s+/g, " ").trim();
  first = strip(first);
  const speaker = /^p\.\s*(.+)$/i.exec(strip(rest));
  if (speaker) return `${first} (p.${speaker[1].trim().split(/\s+/).pop()})`;
  return strip([first, rest].filter(Boolean).join(" "));
}

/** "P.Samuel Park" on a banner's second line → "Samuel Park". */
function bannerPastor(text: string): string | undefined {
  const rest = text.split(/\r?\n/).slice(1).join(" ").replace(/\(\s*\d{1,2}\/\d{1,2}[^)]*\)/g, "").trim();
  return /^p\.\s*(.+)$/i.exec(rest)?.[1].trim();
}

function parseMonth(sheet: Sheet): MonthSheetResult | null {
  const { cells, merges } = sheet;

  // The header row is the one holding "MON"; the column before it is Sunday.
  let headerRow = 0, sunCol = 0;
  for (const [k, cell] of cells) {
    if (cell.text && /^mon$/i.test(cell.text.trim())) {
      const [r, c] = k.split(",").map(Number);
      if (!headerRow || r < headerRow) { headerRow = r; sunCol = c - 1; }
    }
  }
  if (!headerRow || sunCol < 1) return null;

  // Title cell (above the header): the month's first day as a date.
  let anchor: Date | null = null;
  for (let r = 1; r < headerRow && !anchor; r++) {
    for (let c = 1; c <= sunCol + 8 && !anchor; c++) {
      const n = cells.get(key(r, c))?.num;
      if (n !== undefined && n > 36_526) anchor = serialToDate(n);
    }
  }
  if (!anchor) return null;
  const year = anchor.getUTCFullYear(), month = anchor.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstSunday = addDays(firstOfMonth, -firstOfMonth.getUTCDay());

  // A week block starts on each row of dates (a row with numbers in the day columns).
  const dateRows: number[] = [];
  for (let r = headerRow + 1; r <= sheet.maxRow; r++) {
    for (let d = 0; d < 7; d++) {
      if (cells.get(key(r, sunCol + d))?.num !== undefined) { dateRows.push(r); break; }
    }
  }
  if (dateRows.length === 0) return null;

  const warnings: string[] = [];
  const skipped: string[] = [];
  const calendarEvents: Record<string, string[]> = {};
  const banners: CalendarBanner[] = [];
  const seminars: MonthSeminar[] = [];
  const unknownLabels = new Set<string>();
  // Per label+weekday: the dates (inside this month) it appears on.
  const seen = new Map<string, { dow: number; label: string; dates: Set<string> }>();

  let previousWeek = firstSunday;
  dateRows.forEach((dateRow, k) => {
    const lastRow = (dateRows[k + 1] ?? sheet.maxRow + 1) - 1;

    // A real date in the row (the sheet's own formula result) fixes the week; rows of bare
    // day numbers follow the week before, and the first such row starts the month's first week.
    let weekStart: Date | null = null;
    for (let d = 0; d < 7 && !weekStart; d++) {
      const n = cells.get(key(dateRow, sunCol + d))?.num;
      if (n !== undefined && n > 36_526) weekStart = addDays(serialToDate(n), -d);
    }
    weekStart ??= k === 0 ? firstSunday : addDays(previousWeek, 7);
    previousWeek = weekStart;

    // The printed numbers should match where the block falls in the month.
    for (let d = 0; d < 7; d++) {
      const n = cells.get(key(dateRow, sunCol + d))?.num;
      if (n === undefined) continue;
      const expected = addDays(weekStart, d);
      const ok = n > 36_526 ? serialToDate(n).getTime() === expected.getTime() : n === expected.getUTCDate();
      if (!ok) { warnings.push(`Week ${k + 1}: the date in the sheet doesn't match ${md(expected)} — check that week.`); break; }
    }

    for (let r = dateRow + 1; r <= lastRow; r++) {
      for (let d = 0; d < 7; d++) {
        const c = sunCol + d;
        const raw = cells.get(key(r, c))?.text;
        if (!raw) continue;
        const text = raw.trim();
        if (/^memo\b/i.test(text)) continue;
        const date = addDays(weekStart, d);

        if (/^[-–•]/.test(text)) {
          const dayKey = md(date);
          const inMonth = date.getUTCMonth() === month && date.getUTCFullYear() === year;
          for (const line of text.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const { label, known } = shortenLabel(line);
            if (!label) continue;
            if (!known) unknownLabels.add(label);
            const list = (calendarEvents[dayKey] ??= []);
            if (!list.includes(label)) list.push(label);
            if (inMonth) {
              const id = `${d}|${label}`;
              const entry = seen.get(id) ?? { dow: d, label, dates: new Set<string>() };
              entry.dates.add(dayKey);
              seen.set(id, entry);
            }
          }
          continue;
        }

        // Banner: the merged cells it sits in give its width, unless its text states the dates.
        const merge = merges.find((m) => r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2);
        if (merge && (merge.r1 !== r || merge.c1 !== c)) continue;
        const c1 = merge ? merge.c1 : c, c2 = merge ? merge.c2 : c;
        const span: [string, string] = [
          md(addDays(weekStart, Math.max(0, c1 - sunCol))),
          md(addDays(weekStart, Math.min(6, c2 - sunCol))),
        ];
        const [startDate, endDate] = explicitRange(text) ?? span;
        const label = bannerLabel(text);
        if (!label) continue;
        if (/online/i.test(label)) { skipped.push(`${label} (${startDate}) — online only`); continue; }
        if (!banners.some((b) => b.label === label && b.startDate === startDate)) {
          banners.push({ label, startDate, endDate });
          if (/bible seminar/i.test(label)) {
            seminars.push({
              label,
              startDate: fullDate(startDate, year, month),
              endDate: fullDate(endDate, year, month),
              pastor: bannerPastor(text),
            });
          }
        }
      }
    }
  });

  // Meetings held on every one of the month's matching weekdays are "recurring" (printed
  // from weeklyRecurring); the rest stay as that day's notes only.
  const inMonthCount = [0, 0, 0, 0, 0, 0, 0];
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let day = 1; day <= last; day++) inMonthCount[new Date(Date.UTC(year, month, day)).getUTCDay()]++;
  const weeklyRecurring: WeeklyRecurringEvent[] = [...seen.values()]
    .filter((e) => inMonthCount[e.dow] >= 3 && e.dates.size === inMonthCount[e.dow])
    .sort((a, b) => a.dow - b.dow)
    .map((e) => ({ dayOfWeek: e.dow, label: e.label }));

  if (unknownLabels.size > 0) {
    warnings.push(`Kept as written (no short form known): ${[...unknownLabels].join(", ")}.`);
  }

  return {
    sheetName: sheet.name,
    calendarMonth: `${String(month + 1).padStart(2, "0")}/${year}`,
    calendarBanners: banners,
    calendarEvents,
    weeklyRecurring,
    seminars,
    skipped,
    warnings,
  };
}

/** Every sheet in the workbook that looks like a month calendar, in workbook order. */
export async function readMonthSheets(buf: Buffer | Uint8Array): Promise<MonthSheetResult[]> {
  const zip = await JSZip.loadAsync(buf);
  const read = async (path: string) => (await zip.file(path)?.async("string")) ?? null;

  const workbook = await read("xl/workbook.xml");
  const rels = await read("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) throw new Error("This doesn't look like an Excel (.xlsx) file.");

  const sharedXml = await read("xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedXml) {
    const sis = new DOMParser().parseFromString(sharedXml, "text/xml").getElementsByTagName("si");
    for (let i = 0; i < sis.length; i++) shared.push(stringText(sis.item(i)!));
  }

  const target = new Map<string, string>();
  const relNodes = new DOMParser().parseFromString(rels, "text/xml").getElementsByTagName("Relationship");
  for (let i = 0; i < relNodes.length; i++) {
    const rel = relNodes.item(i)!;
    target.set(rel.getAttribute("Id") ?? "", rel.getAttribute("Target") ?? "");
  }

  const results: MonthSheetResult[] = [];
  const sheetNodes = new DOMParser().parseFromString(workbook, "text/xml").getElementsByTagName("sheet");
  for (let i = 0; i < sheetNodes.length; i++) {
    const node = sheetNodes.item(i)!;
    if (node.getAttribute("state") === "hidden") continue;
    const rid = node.getAttribute("r:id") ?? "";
    const t = target.get(rid);
    if (!t) continue;
    const path = t.startsWith("/") ? t.slice(1) : `xl/${t}`;
    const xml = await read(path);
    if (!xml) continue;
    const parsed = parseMonth(parseSheetXml(node.getAttribute("name") ?? `Sheet ${i + 1}`, xml, shared));
    if (parsed) results.push(parsed);
  }
  return results;
}
