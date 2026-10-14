import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { BulletinLanguage } from "@/lib/bulletin-languages";

/**
 * Fetches Bible verses from authoritative translations instead of Google Translate.
 *   Korean  → 개역한글 (Korean Revised Version / ko_ko)
 *   Spanish → Reina Valera (es_rvr)
 *   Chinese → 和合本 Union Version (ChiUn, Traditional → Simplified on read)
 *   Russian → Russian Synodal Bible (RusSynodal)
 *
 * Source: github.com/thiagobodruk/bible (raw JSON, downloaded once and cached locally).
 * JSON format: [{abbrev, chapters: [[v1, v2, ...], ...]}, ...] — all arrays are 0-indexed.
 */

// thiagobodruk format: [{abbrev, chapters: string[][]}]
// TriGataro RVR1960 format: [{BoookNumber, Chapter, Verse, Text, ...}] (flat per-verse)
const GITHUB_URLS: Partial<Record<BulletinLanguage, string>> = {
  // KorRV = 개역성경 (the 개역한글 text). thiagobodruk's ko_ko.json no longer exists (404), which
  // silently dropped Korean verses back to machine translation.
  ko: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KorRV.json",
  // RVR1960 (Reina Valera 1960) — flat format, converted on load
  es: "https://raw.githubusercontent.com/TriGataro/Biblia_Reina_Valera_1960/master/Biblia_Reina_Valera_1960_Esp.json",
  // ChiUn = 和合本 in Traditional script; converted to Simplified when a verse is read.
  zh: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/ChiUn.json",
  // RusSynodal includes the apocrypha (78 books) and Greek psalm numbering; handled below.
  ru: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/RusSynodal.json",
};

type BibleBook = { abbrev: string; chapters: string[][] };
type BibleData = BibleBook[];

// TriGataro flat-verse format (Reina Valera 1960)
type RVR1960Entry = { BoookNumber: number; Chapter: number; Verse: number; Text: string };

function convertRVR1960(flat: RVR1960Entry[]): BibleData {
  const books: BibleData = [];
  for (const entry of flat) {
    const bookIdx = entry.BoookNumber - 1;
    if (!books[bookIdx]) books[bookIdx] = { abbrev: "", chapters: [] };
    const chapterIdx = entry.Chapter - 1;
    if (!books[bookIdx].chapters[chapterIdx]) books[bookIdx].chapters[chapterIdx] = [];
    books[bookIdx].chapters[chapterIdx][entry.Verse - 1] = entry.Text;
  }
  return books;
}

// scrollmapper format: { translation, books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }
type ScrollmapperBible = { books: Array<{ name?: string; chapters: Array<{ verses: Array<{ verse: number; text: string }> }> }> };

// The 66 canonical books in the order BOOK_INDEX expects, by normalised English name.
const CANON = [
  "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","1 samuel","2 samuel",
  "1 kings","2 kings","1 chronicles","2 chronicles","ezra","nehemiah","esther","job","psalms","proverbs",
  "ecclesiastes","song of solomon","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos",
  "obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi",
  "matthew","mark","luke","john","acts","romans","1 corinthians","2 corinthians","galatians","ephesians",
  "philippians","colossians","1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon",
  "hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation",
];
function normBookName(n: string): string {
  return n.toLowerCase().replace(/^iii /, "3 ").replace(/^ii /, "2 ").replace(/^i /, "1 ").replace(/ of john$/, "");
}

export function convertScrollmapper(src: ScrollmapperBible): BibleData {
  // Some files (RusSynodal) include apocryphal books in the middle; pick out the canonical 66.
  let books = src.books;
  if (books.length !== 66 && books.every((b) => b.name)) {
    const byName = new Map(books.map((b) => [normBookName(b.name!), b]));
    const picked = CANON.map((n) => byName.get(n));
    if (picked.every(Boolean)) books = picked as typeof books;
  }
  return books.map((book) => ({
    abbrev: "",
    chapters: book.chapters.map((ch) => {
      const verses: string[] = [];
      for (const v of ch.verses) verses[v.verse - 1] = v.text;
      return verses;
    }),
  }));
}

// In-memory cache of parsed Bible files (avoids repeated 2-5 MB disk reads)
const memoryBibles = new Map<BulletinLanguage, BibleData>();

async function loadBible(lang: BulletinLanguage): Promise<BibleData | null> {
  if (memoryBibles.has(lang)) return memoryBibles.get(lang)!;

  const localPath = join(process.cwd(), "data", `bible_${lang}.json`);

  let raw: string | null = null;
  if (existsSync(localPath)) {
    raw = readFileSync(localPath, "utf-8");
  } else {
    const url = GITHUB_URLS[lang];
    if (!url) return null;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
      if (!res.ok) return null;
      raw = await res.text();
      // Remove BOM if present, then save locally for future calls
      if (raw.startsWith("﻿")) raw = raw.slice(1);
      // Validate BEFORE writing so a truncated/HTML error response can't poison the
      // on-disk cache permanently (the next call would keep reading the bad file).
      JSON.parse(raw);
      writeFileSync(localPath, raw, "utf-8");
    } catch {
      return null;
    }
  }

  try {
    if (raw.startsWith("﻿")) raw = raw.slice(1);
    const parsed = JSON.parse(raw);
    // TriGataro RVR1960 is a flat per-verse array; convert to standard BibleData format
    const data: BibleData = lang === "es" && Array.isArray(parsed) && parsed[0]?.BoookNumber !== undefined
      ? convertRVR1960(parsed as RVR1960Entry[])
      : Array.isArray(parsed?.books)
        ? convertScrollmapper(parsed as ScrollmapperBible)
        : parsed as BibleData;
    memoryBibles.set(lang, data);
    return data;
  } catch {
    return null;
  }
}

// Standard Bible book name/abbreviation → 0-indexed position in the Bible array
const BOOK_INDEX: Record<string, number> = {
  // Old Testament
  "genesis": 0, "gen": 0,
  "exodus": 1, "exod": 1, "exo": 1,
  "leviticus": 2, "lev": 2,
  "numbers": 3, "num": 3,
  "deuteronomy": 4, "deut": 4, "deu": 4,
  "joshua": 5, "josh": 5,
  "judges": 6, "judg": 6,
  "ruth": 7,
  "1 samuel": 8, "1samuel": 8, "1sam": 8, "i samuel": 8,
  "2 samuel": 9, "2samuel": 9, "2sam": 9, "ii samuel": 9,
  "1 kings": 10, "1kings": 10, "1kgs": 10, "i kings": 10,
  "2 kings": 11, "2kings": 11, "2kgs": 11, "ii kings": 11,
  "1 chronicles": 12, "1chr": 12, "1chron": 12, "i chronicles": 12,
  "2 chronicles": 13, "2chr": 13, "2chron": 13, "ii chronicles": 13,
  "ezra": 14,
  "nehemiah": 15, "neh": 15,
  "esther": 16, "esth": 16,
  "job": 17,
  "psalms": 18, "psalm": 18, "ps": 18, "psa": 18,
  "proverbs": 19, "prov": 19, "pro": 19,
  "ecclesiastes": 20, "eccles": 20, "eccl": 20, "ecc": 20,
  "song of solomon": 21, "song of songs": 21, "song": 21, "sos": 21, "ss": 21,
  "isaiah": 22, "isa": 22,
  "jeremiah": 23, "jer": 23,
  "lamentations": 24, "lam": 24,
  "ezekiel": 25, "ezek": 25, "eze": 25,
  "daniel": 26, "dan": 26,
  "hosea": 27, "hos": 27,
  "joel": 28,
  "amos": 29,
  "obadiah": 30, "obad": 30,
  "jonah": 31, "jon": 31,
  "micah": 32, "mic": 32,
  "nahum": 33, "nah": 33,
  "habakkuk": 34, "hab": 34,
  "zephaniah": 35, "zeph": 35, "zep": 35,
  "haggai": 36, "hag": 36,
  "zechariah": 37, "zech": 37, "zec": 37,
  "malachi": 38, "mal": 38,
  // New Testament
  "matthew": 39, "matt": 39, "mat": 39,
  "mark": 40, "mrk": 40,
  "luke": 41, "luk": 41,
  "john": 42, "joh": 42, "jhn": 42,
  "acts": 43,
  "romans": 44, "rom": 44,
  "1 corinthians": 45, "1corinthians": 45, "1cor": 45, "i corinthians": 45,
  "2 corinthians": 46, "2corinthians": 46, "2cor": 46, "ii corinthians": 46,
  "galatians": 47, "gal": 47,
  "ephesians": 48, "eph": 48,
  "philippians": 49, "phil": 49, "php": 49,
  "colossians": 50, "col": 50,
  "1 thessalonians": 51, "1thess": 51, "1th": 51, "i thessalonians": 51,
  "2 thessalonians": 52, "2thess": 52, "2th": 52, "ii thessalonians": 52,
  "1 timothy": 53, "1tim": 53, "i timothy": 53,
  "2 timothy": 54, "2tim": 54, "ii timothy": 54,
  "titus": 55, "tit": 55,
  "philemon": 56, "phlm": 56, "phm": 56,
  "hebrews": 57, "heb": 57,
  "james": 58, "jas": 58,
  "1 peter": 59, "1peter": 59, "1pet": 59, "i peter": 59,
  "2 peter": 60, "2peter": 60, "2pet": 60, "ii peter": 60,
  "1 john": 61, "1john": 61, "1jn": 61, "i john": 61,
  "2 john": 62, "2john": 62, "2jn": 62, "ii john": 62,
  "3 john": 63, "3john": 63, "3jn": 63, "iii john": 63,
  "jude": 64,
  "revelation": 65, "revelations": 65, "rev": 65,
};

interface ParsedRef {
  bookIdx: number;
  chapter: number;    // 1-indexed
  verseStart: number; // 1-indexed
  verseEnd: number;   // 1-indexed
}

function parseReference(ref: string): ParsedRef | null {
  const match = ref.trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const [, bookStr, chapterStr, verseStartStr, verseEndStr] = match;
  const bookIdx = BOOK_INDEX[bookStr.toLowerCase().trim()];
  if (bookIdx === undefined) return null;
  const verseStart = parseInt(verseStartStr, 10);
  return {
    bookIdx,
    chapter: parseInt(chapterStr, 10),
    verseStart,
    verseEnd: verseEndStr ? parseInt(verseEndStr, 10) : verseStart,
  };
}

/**
 * RusSynodal numbers the Psalms like the Greek Septuagint, so Hebrew (English-Bible)
 * Psalm 118 is Synodal 117. Translate a Hebrew chapter:verse to the Synodal one.
 */
export function ruPsalmRef(chapter: number, verse: number): [number, number] {
  if (chapter <= 8 || chapter >= 148) return [chapter, verse];
  if (chapter === 9) return [9, verse];
  if (chapter === 10) return [9, verse + 21];          // Hebrew 9 and 10 are one psalm
  if (chapter <= 113) return [chapter - 1, verse];
  if (chapter === 114) return [113, verse];            // Hebrew 114 + 115 are Synodal 113
  if (chapter === 115) return [113, verse + 8];
  if (chapter === 116) return verse <= 9 ? [114, verse] : [115, verse - 9];  // split in two
  if (chapter <= 146) return [chapter - 1, verse];
  return verse <= 11 ? [146, verse] : [147, verse - 11];                    // Hebrew 147 spans two
}

/** Per-language clean-up of verse text from the source file. */
export async function normalizeVerseText(lang: BulletinLanguage, text: string): Promise<string> {
  if (lang !== "zh") return text;
  // The Traditional-script source puts spaces between words, which Chinese doesn't use;
  // the bulletin is in Simplified script.
  const OpenCC = await import("opencc-js");
  const toSimplified = OpenCC.Converter({ from: "tw", to: "cn" });
  return toSimplified(text.replace(/\s+/g, ""));
}

// Per-verse result cache so we never re-fetch the same verse twice
const VERSE_CACHE_PATH = join(process.cwd(), "data", "bible_verse_cache.json");
type VerseCache = Partial<Record<BulletinLanguage, Record<string, string>>>;

// Keep the parsed cache in memory (like memoryBibles) so we don't re-read/parse the
// whole JSON on every call, and so a disk-write failure can't break a lookup.
let memoryVerseCache: VerseCache | null = null;

function readVerseCache(): VerseCache {
  if (memoryVerseCache) return memoryVerseCache;
  try { memoryVerseCache = JSON.parse(readFileSync(VERSE_CACHE_PATH, "utf-8")) as VerseCache; }
  catch { memoryVerseCache = {}; }
  return memoryVerseCache;
}
function writeVerseCache(cache: VerseCache) {
  memoryVerseCache = cache;
  try {
    writeFileSync(VERSE_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf-8");
  } catch {
    // Best-effort persistence; the in-memory cache still serves this process.
  }
}

// data/verse_overrides.json: { "<lang>": { "<English reference>": "<verse text>" } }
const OVERRIDES_PATH = join(process.cwd(), "data", "verse_overrides.json");
function readOverrides(): Partial<Record<BulletinLanguage, Record<string, string>>> {
  try { return JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8")); } catch { return {}; }
}

/**
 * Returns the verse text for `reference` in the authoritative Bible version for `lang`,
 * or null if the reference is unparseable / the source is unavailable.
 * Caches both the full Bible file (disk) and individual verse results (JSON cache).
 */
export async function fetchVerseText(
  reference: string,
  lang: BulletinLanguage,
): Promise<string | null> {
  if (!GITHUB_URLS[lang]) return null;

  // Verses pinned in the repo (e.g. the cover verse) win over everything, so they stay in
  // the intended translation even when the Bible download is unavailable.
  const pinned = readOverrides()[lang]?.[reference];
  if (pinned) return pinned;

  // Check verse cache first
  const cache = readVerseCache();
  const cached = cache[lang]?.[reference];
  if (cached) return cached;

  const parsed = parseReference(reference);
  if (!parsed) return null;

  const bible = await loadBible(lang);
  if (!bible) return null;

  const book = bible[parsed.bookIdx];
  if (!book) return null;

  const chapter = book.chapters[parsed.chapter - 1];
  if (!chapter) return null;

  const lines: string[] = [];
  for (let v = parsed.verseStart; v <= parsed.verseEnd; v++) {
    const [ch, vv] = lang === "ru" && parsed.bookIdx === 18 ? ruPsalmRef(parsed.chapter, v) : [parsed.chapter, v];
    // Some Bible sources (e.g. Synodal) embed verse numbers like "(117:17)" in text — strip them
    const text = book.chapters[ch - 1]?.[vv - 1]?.trim().replace(/^\(\d+:\d+\)\s*/, "");
    if (text) lines.push(text);
  }
  if (!lines.length) return null;

  const result = await normalizeVerseText(lang, lines.join(lang === "zh" ? "" : " "));

  // Persist to verse cache
  cache[lang] ??= {};
  cache[lang]![reference] = result;
  writeVerseCache(cache);

  return result;
}
