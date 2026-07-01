import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const VERSE_LIST_PATH = join(process.cwd(), "data", "memory_verse_list.json");
const INDEX_PATH = join(process.cwd(), "data", "memory_verse_index.json");
const NKJV_BIBLE_ID = "de4e12af7fb5a05d-01";

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
  // single verse
  if (/^\d+$/.test(p.verses)) return `${code}.${p.chap}.${p.verses}`;
  // range "16-17"
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

async function fetchVerseText(ref: string): Promise<{ text: string; translation: string }> {
  const apiKey = process.env.BIBLE_API_KEY;

  if (apiKey) {
    const passageId = korToPassageId(ref);
    if (passageId) {
      try {
        const url = `https://api.scripture.api.bible/v1/bibles/${NKJV_BIBLE_ID}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false&include-verse-spans=false`;
        const res = await fetch(url, { headers: { "api-key": apiKey } });
        if (res.ok) {
          const data = await res.json();
          const text = stripHtml(data.data?.content ?? "").replace(/\s+/g, " ").trim();
          if (text) return { text, translation: "NKJV" };
        }
      } catch { /* fall through */ }
    }
  }

  // Fallback: bible-api.com (KJV, free, no key needed)
  try {
    const englishRef = korToEnglish(ref);
    const url = `https://bible-api.com/${encodeURIComponent(englishRef)}?translation=kjv`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const text = (data.text ?? "").trim().replace(/\n+/g, " ").trim();
      if (text) return { text, translation: "KJV" };
    }
  } catch { /* fall through */ }

  return { text: "", translation: "" };
}

// GET /api/memory-verse?index=N  (peek without changing state)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const indexParam = searchParams.get("index");

  const verses = getVerseList();
  const rawIdx = indexParam !== null ? parseInt(indexParam) : getNextWeekIndex();
  const idx = ((rawIdx % verses.length) + verses.length) % verses.length;
  const entry = verses[idx];

  const { text, translation } = await fetchVerseText(entry.reference);

  return NextResponse.json({
    index: idx,
    total: verses.length,
    theme: entry.theme,
    themeKorean: entry.themeKorean,
    reference: entry.reference,
    referenceEn: korToEnglish(entry.reference),
    text,
    translation,
    hasApiKey: !!process.env.BIBLE_API_KEY,
  });
}

// POST /api/memory-verse
// { action: "roll", currentVerses: [...3 MemoryVerse...], nextDate: "7/12" }
//   → promotes last←this, this←next, fetches new next week from list, advances index
// { action: "setIndex", index: N }
//   → manually set the position
// { action: "detect", referenceEn: "1 Peter 3:15-16" }
//   → find this reference in the list, set index to the one after it
export async function POST(request: Request) {
  const body = await request.json();
  const verses = getVerseList();

  if (body.action === "setIndex") {
    const idx = ((parseInt(body.index ?? 0)) % verses.length + verses.length) % verses.length;
    saveNextWeekIndex(idx);
    const entry = verses[idx];
    return NextResponse.json({ nextWeekIndex: idx, total: verses.length, entry });
  }

  if (body.action === "detect") {
    // Find where a given English reference appears in the list
    const needle = (body.referenceEn ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const found = verses.findIndex((v) =>
      korToEnglish(v.reference).toLowerCase().replace(/\s+/g, " ").trim() === needle
    );
    if (found === -1) {
      return NextResponse.json({ error: "Not found in verse list" }, { status: 404 });
    }
    const newIdx = (found + 1) % verses.length;
    saveNextWeekIndex(newIdx);
    return NextResponse.json({ nextWeekIndex: newIdx, total: verses.length, foundAt: found });
  }

  if (body.action === "roll") {
    const currentIdx = getNextWeekIndex();
    const safeIdx = ((currentIdx % verses.length) + verses.length) % verses.length;
    const nextEntry = verses[safeIdx];
    const { text, translation } = await fetchVerseText(nextEntry.reference);

    const current: { label: string; date: string; reference: string; theme: string; text: string }[] =
      body.currentVerses ?? [];

    const thisWeek = current.find((v) => v.label === "This week") ?? current[1];
    const nextWeek = current.find((v) => v.label === "Next week") ?? current[2];

    const newVerses = [
      { ...(thisWeek ?? {}), label: "Last week" },
      { ...(nextWeek ?? {}), label: "This week" },
      {
        label: "Next week",
        date: body.nextDate ?? "",
        reference: korToEnglish(nextEntry.reference),
        theme: nextEntry.theme,
        text,
      },
    ];

    const newIdx = (safeIdx + 1) % verses.length;
    saveNextWeekIndex(newIdx);

    return NextResponse.json({
      memoryVerses: newVerses,
      newIndex: newIdx,
      total: verses.length,
      translation,
      nextVerse: { ...nextEntry, referenceEn: korToEnglish(nextEntry.reference) },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
