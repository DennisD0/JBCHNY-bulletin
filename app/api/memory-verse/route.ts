import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const VERSE_LIST_PATH  = join(process.cwd(), "data", "memory_verse_list.json");
const INDEX_PATH       = join(process.cwd(), "data", "memory_verse_index.json");
const TEXT_CACHE_PATH  = join(process.cwd(), "data", "memory_verse_texts.json");
const NKJV_BIBLE_ID    = "de4e12af7fb5a05d-01";

// ── Date-based verse anchor ───────────────────────────────────────────────────
// July 5, 2026 (Sunday) = verse index 145 (벧전 3:15-16)
const ANCHOR_SUNDAY_MS = Date.UTC(2026, 6, 5); // month is 0-indexed
const ANCHOR_INDEX     = 145;
const MS_PER_WEEK      = 7 * 24 * 60 * 60 * 1000;

function getSundayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekIndexForDate(date: Date, total: number): number {
  const sunday = getSundayOf(date);
  const weeksDiff = Math.round((sunday.getTime() - ANCHOR_SUNDAY_MS) / MS_PER_WEEK);
  return ((ANCHOR_INDEX + weeksDiff) % total + total) % total;
}

function parseBulletinDate(dateStr: string): Date {
  // Handles MM/DD/YYYY or M/D/YYYY (bulletin date field format)
  const parts = dateStr.split("/").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[2], parts[0] - 1, parts[1]);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

type VerseEntry = { theme: string; themeKorean: string; reference: string };

const KOR_TO_EN: Record<string, string> = {
  "창": "Genesis", "출": "Exodus", "레": "Leviticus", "민": "Numbers", "신": "Deuteronomy",
  "수": "Joshua", "삿": "Judges", "룻": "Ruth", "삼상": "1 Samuel", "삼하": "2 Samuel",
  "왕상": "1 Kings", "왕하": "2 Kings", "대상": "1 Chronicles", "대하": "2 Chronicles",
  "스": "Ezra", "느": "Nehemiah", "에": "Esther", "욥": "Job", "시": "Psalms",
  "잠": "Proverbs", "전": "Ecclesiastes", "아": "Song of Solomon", "사": "Isaiah",
  "렘": "Jeremiah", "애": "Lamentations", "겔": "Ezekiel", "단": "Daniel",
  "호": "Hosea", "욜": "Joel", "암": "Amos", "옵": "Obadiah", "욘": "Jonah",
  "미": "Micah", "나": "Nahum", "합": "Habakkuk", "습": "Zephaniah", "학": "Haggai",
  "슥": "Zechariah", "말": "Malachi",
  "마": "Matthew", "막": "Mark", "눅": "Luke", "요": "John", "행": "Acts",
  "롬": "Romans", "고전": "1 Corinthians", "고후": "2 Corinthians", "갈": "Galatians",
  "엡": "Ephesians", "빌": "Philippians", "골": "Colossians",
  "살전": "1 Thessalonians", "살후": "2 Thessalonians",
  "딤전": "1 Timothy", "딤후": "2 Timothy", "딛": "Titus", "몬": "Philemon",
  "히": "Hebrews", "약": "James", "벧전": "1 Peter", "벧후": "2 Peter",
  "요일": "1 John", "요이": "2 John", "요삼": "3 John", "유": "Jude", "계": "Revelation",
};

const KOR_TO_CODE: Record<string, string> = {
  "창": "GEN", "출": "EXO", "레": "LEV", "민": "NUM", "신": "DEU",
  "수": "JOS", "삿": "JDG", "룻": "RUT", "삼상": "1SA", "삼하": "2SA",
  "왕상": "1KI", "왕하": "2KI", "대상": "1CH", "대하": "2CH",
  "스": "EZR", "느": "NEH", "에": "EST", "욥": "JOB", "시": "PSA",
  "잠": "PRO", "전": "ECC", "아": "SNG", "사": "ISA",
  "렘": "JER", "애": "LAM", "겔": "EZK", "단": "DAN",
  "호": "HOS", "욜": "JOL", "암": "AMO", "옵": "OBA", "욘": "JON",
  "미": "MIC", "나": "NAM", "합": "HAB", "습": "ZEP", "학": "HAG",
  "슥": "ZEC", "말": "MAL",
  "마": "MAT", "막": "MRK", "눅": "LUK", "요": "JHN", "행": "ACT",
  "롬": "ROM", "고전": "1CO", "고후": "2CO", "갈": "GAL",
  "엡": "EPH", "빌": "PHP", "골": "COL",
  "살전": "1TH", "살후": "2TH",
  "딤전": "1TI", "딤후": "2TI", "딛": "TIT", "몬": "PHM",
  "히": "HEB", "약": "JAS", "벧전": "1PE", "벧후": "2PE",
  "요일": "1JN", "요이": "2JN", "요삼": "3JN", "유": "JUD", "계": "REV",
};

// ── File helpers ──────────────────────────────────────────────────────────────

function getVerseList(): VerseEntry[] {
  return JSON.parse(readFileSync(VERSE_LIST_PATH, "utf8"));
}

function getNextWeekIndex(): number {
  if (!existsSync(INDEX_PATH)) return 0;
  return JSON.parse(readFileSync(INDEX_PATH, "utf8")).nextWeekIndex ?? 0;
}

function saveNextWeekIndex(idx: number) {
  writeFileSync(INDEX_PATH, JSON.stringify({ nextWeekIndex: idx }, null, 2));
}

function getTextCache(): Record<string, string> {
  if (!existsSync(TEXT_CACHE_PATH)) return {};
  try { return JSON.parse(readFileSync(TEXT_CACHE_PATH, "utf8")); }
  catch { return {}; }
}

function saveTextToCache(ref: string, text: string) {
  const cache = getTextCache();
  cache[ref] = text;
  writeFileSync(TEXT_CACHE_PATH, JSON.stringify(cache, null, 2));
}

// ── Reference conversion ──────────────────────────────────────────────────────

function parseKorRef(ref: string): { kor: string; chap: string; verses?: string } | null {
  const m = ref.trim().match(/^([가-힣]+)\s+(\d+)(?::(\S+))?$/);
  if (!m) return null;
  return { kor: m[1], chap: m[2], verses: m[3] };
}

export function korToEnglish(ref: string): string {
  const p = parseKorRef(ref);
  if (!p) return ref;
  const eng = KOR_TO_EN[p.kor];
  if (!eng) return ref;
  return p.verses ? `${eng} ${p.chap}:${p.verses}` : `${eng} ${p.chap}`;
}

function korToPassageId(ref: string): string | null {
  const p = parseKorRef(ref);
  if (!p) return null;
  const code = KOR_TO_CODE[p.kor];
  if (!code) return null;
  if (!p.verses) return `${code}.${p.chap}`;
  if (/^\d+$/.test(p.verses)) return `${code}.${p.chap}.${p.verses}`;
  const range = p.verses.match(/^(\d+)-(\d+)$/);
  if (range) return `${code}.${p.chap}.${range[1]}-${code}.${p.chap}.${range[2]}`;
  // comma "9,11" — treat as range (includes middle verse, acceptable)
  const comma = p.verses.match(/^(\d+),(\d+)$/);
  if (comma) return `${code}.${p.chap}.${comma[1]}-${code}.${p.chap}.${comma[2]}`;
  return `${code}.${p.chap}.${p.verses}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ── NKJV fetch — primary: scripture.api.bible, backup: cached local text ──────

async function fetchVerseText(ref: string): Promise<{ text: string; cached: boolean; apiKey: boolean }> {
  const apiKey = process.env.BIBLE_API_KEY ?? "";
  const cache  = getTextCache();

  // 1. Serve from local cache if available (already NKJV from a prior fetch)
  if (cache[ref]) {
    return { text: cache[ref], cached: true, apiKey: !!apiKey };
  }

  // 2. Fetch from scripture.api.bible (NKJV) when API key is configured
  if (apiKey) {
    const passageId = korToPassageId(ref);
    if (passageId) {
      try {
        const url = `https://api.scripture.api.bible/v1/bibles/${NKJV_BIBLE_ID}/passages/${passageId}`
          + `?content-type=text&include-notes=false&include-titles=false`
          + `&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false`;
        const res = await fetch(url, { headers: { "api-key": apiKey } });
        if (res.ok) {
          const data = await res.json();
          const text = stripHtml(data.data?.content ?? "").replace(/\s+/g, " ").trim();
          if (text) {
            saveTextToCache(ref, text);   // persist for offline use
            return { text, cached: false, apiKey: true };
          }
        }
      } catch { /* fall through */ }
    }
  }

  // 3. No text available — NKJV only, no KJV fallback
  return { text: "", cached: false, apiKey: !!apiKey };
}

// ── Stats helper ─────────────────────────────────────────────────────────────

function buildStats(verses: VerseEntry[], idx: number, cache: Record<string, string>) {
  const themes = [...new Set(verses.map((v) => v.theme))];
  const currentTheme = verses[idx].theme;
  const themeNumber  = themes.indexOf(currentTheme) + 1;
  const themeStart   = verses.findIndex((v) => v.theme === currentTheme);
  const themeTotal   = verses.filter((v) => v.theme === currentTheme).length;
  const themeProgress = idx - themeStart + 1;        // 1-based
  const cachedCount   = verses.filter((v) => cache[v.reference]).length;
  const overallPct    = Math.round((idx / verses.length) * 100);
  return { themeNumber, totalThemes: themes.length, themeProgress, themeTotal, cachedCount, overallPct };
}

// ── Route handlers ────────────────────────────────────────────────────────────

// GET /api/memory-verse?index=N  OR  ?date=MM/DD/YYYY
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const indexParam = searchParams.get("index");
  const dateParam  = searchParams.get("date");

  const verses = getVerseList();
  let idx: number;
  if (indexParam !== null) {
    const parsed = parseInt(indexParam, 10);
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: "Invalid index" }, { status: 400 });
    }
    idx = ((parsed % verses.length) + verses.length) % verses.length;
  } else if (dateParam) {
    idx = weekIndexForDate(parseBulletinDate(dateParam), verses.length);
  } else {
    idx = weekIndexForDate(new Date(), verses.length);
  }
  const entry  = verses[idx];

  const { text, cached, apiKey } = await fetchVerseText(entry.reference);
  const cache = getTextCache();
  const stats = buildStats(verses, idx, cache);

  return NextResponse.json({
    index: idx,
    total: verses.length,
    theme: entry.theme,
    themeKorean: entry.themeKorean,
    reference: entry.reference,
    referenceEn: korToEnglish(entry.reference),
    text,
    translation: (text ? "NKJV" : ""),
    cached,
    hasApiKey: apiKey,
    ...stats,
  });
}

// POST /api/memory-verse
export async function POST(request: Request) {
  const body   = await request.json();
  const verses = getVerseList();

  // ── setIndex ──
  if (body.action === "setIndex") {
    const parsed = parseInt(body.index ?? 0, 10);
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: "Invalid index" }, { status: 400 });
    }
    const idx = (parsed % verses.length + verses.length) % verses.length;
    saveNextWeekIndex(idx);
    const cache = getTextCache();
    return NextResponse.json({ nextWeekIndex: idx, total: verses.length, entry: verses[idx], ...buildStats(verses, idx, cache) });
  }

  // ── detect: find current "next week" ref in list, set index to what follows it ──
  if (body.action === "detect") {
    const needle = (body.referenceEn ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const found  = verses.findIndex((v) =>
      korToEnglish(v.reference).toLowerCase().replace(/\s+/g, " ").trim() === needle
    );
    if (found === -1) return NextResponse.json({ error: "Not found in verse list" }, { status: 404 });
    const newIdx = (found + 1) % verses.length;
    saveNextWeekIndex(newIdx);
    const cache = getTextCache();
    return NextResponse.json({ nextWeekIndex: newIdx, total: verses.length, foundAt: found, ...buildStats(verses, newIdx, cache) });
  }

  // ── roll: auto-compute last/this/next week from the bulletin date ──
  if (body.action === "roll") {
    const bulletinDate = body.bulletinDate
      ? parseBulletinDate(body.bulletinDate)
      : new Date();

    const thisSunday = getSundayOf(bulletinDate);
    const lastSunday = new Date(thisSunday.getTime() - MS_PER_WEEK);
    const nextSunday = new Date(thisSunday.getTime() + MS_PER_WEEK);

    const lastIdx = weekIndexForDate(lastSunday, verses.length);
    const thisIdx = weekIndexForDate(thisSunday, verses.length);
    const nextIdx = weekIndexForDate(nextSunday, verses.length);

    const [lastFetch, thisFetch, nextFetch] = await Promise.all([
      fetchVerseText(verses[lastIdx].reference),
      fetchVerseText(verses[thisIdx].reference),
      fetchVerseText(verses[nextIdx].reference),
    ]);

    const newVerses = [
      { label: "Last week", date: formatMonthDay(lastSunday), reference: korToEnglish(verses[lastIdx].reference), theme: verses[lastIdx].theme, text: lastFetch.text },
      { label: "This week", date: formatMonthDay(thisSunday), reference: korToEnglish(verses[thisIdx].reference), theme: verses[thisIdx].theme, text: thisFetch.text },
      { label: "Next week", date: formatMonthDay(nextSunday), reference: korToEnglish(verses[nextIdx].reference), theme: verses[nextIdx].theme, text: nextFetch.text },
    ];

    saveNextWeekIndex(nextIdx);
    const cache = getTextCache();
    return NextResponse.json({
      memoryVerses: newVerses,
      newIndex: thisIdx,
      total: verses.length,
      ...buildStats(verses, thisIdx, cache),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
