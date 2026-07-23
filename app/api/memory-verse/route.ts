import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fetchVerseText as fetchAuthoritativeVerse } from "@/lib/bible-lookup";

const VERSE_LIST_PATH  = join(process.cwd(), "data", "memory_verse_list.json");
const INDEX_PATH       = join(process.cwd(), "data", "memory_verse_index.json");
const TEXT_CACHE_PATH  = join(process.cwd(), "data", "memory_verse_texts.json");
const NKJV_BIBLE_ID    = "de4e12af7fb5a05d-01";

// ── Multi-language support ────────────────────────────────────────────────────

type Lang = "en" | "ko" | "zh" | "ru" | "es";

// Korean abbreviation → 0-based canonical Bible book index (same order across all local Bible files)
const KOR_TO_BOOK_INDEX: Record<string, number> = {
  "창": 0,  "출": 1,  "레": 2,  "민": 3,  "신": 4,  "수": 5,  "삿": 6,  "룻": 7,
  "삼상": 8, "삼하": 9, "왕상": 10,"왕하": 11,"대상": 12,"대하": 13,
  "스": 14, "느": 15, "에": 16, "욥": 17, "시": 18, "잠": 19, "전": 20,
  "아": 21, "사": 22, "렘": 23, "애": 24, "겔": 25, "단": 26, "호": 27,
  "욜": 28, "암": 29, "옵": 30, "욘": 31, "미": 32, "나": 33, "합": 34,
  "습": 35, "학": 36, "슥": 37, "말": 38, "마": 39, "막": 40, "눅": 41,
  "요": 42, "행": 43, "롬": 44, "고전": 45,"고후": 46,"갈": 47, "엡": 48,
  "빌": 49, "골": 50, "살전": 51,"살후": 52,"딤전": 53,"딤후": 54,
  "딛": 55, "몬": 56, "히": 57, "약": 58, "벧전": 59,"벧후": 60,
  "요일": 61,"요이": 62,"요삼": 63,"유": 64, "계": 65,
};

// Book names per language (index matches KOR_TO_BOOK_INDEX)
const BOOK_NAMES: Partial<Record<Lang, string[]>> = {
  zh: ["创","出","利","民","申","书","士","得","撒上","撒下","王上","王下","代上","代下","拉","尼","斯","伯","诗","箴","传","歌","赛","耶","哀","结","但","何","珥","摩","俄","拿","弥","鸿","哈","番","该","亚","玛","太","可","路","约","徒","罗","林前","林后","加","弗","腓","西","帖前","帖后","提前","提后","多","门","来","雅","彼前","彼后","约一","约二","约三","犹","启"],
  ru: ["Быт","Исх","Лев","Чис","Втор","Нав","Суд","Руфь","1Цар","2Цар","3Цар","4Цар","1Пар","2Пар","Ездр","Неем","Есф","Иов","Пс","Притч","Еккл","Песн","Ис","Иер","Плач","Иез","Дан","Ос","Иоил","Ам","Авд","Ион","Мих","Наум","Авв","Соф","Агг","Зах","Мал","Мф","Мк","Лк","Ин","Деян","Рим","1Кор","2Кор","Гал","Еф","Флп","Кол","1Фес","2Фес","1Тим","2Тим","Тит","Флм","Евр","Иак","1Пет","2Пет","1Ин","2Ин","3Ин","Иуд","Откр"],
  es: ["Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut","1 Samuel","2 Samuel","1 Reyes","2 Reyes","1 Crónicas","2 Crónicas","Esdras","Nehemías","Ester","Job","Salmos","Proverbios","Eclesiastés","Cantares","Isaías","Jeremías","Lamentaciones","Ezequiel","Daniel","Oseas","Joel","Amós","Abdías","Jonás","Miqueas","Nahúm","Habacuc","Sofonías","Hageo","Zacarías","Malaquías","Mateo","Marcos","Lucas","Juan","Hechos","Romanos","1 Corintios","2 Corintios","Gálatas","Efesios","Filipenses","Colosenses","1 Tesalonicenses","2 Tesalonicenses","1 Timoteo","2 Timoteo","Tito","Filemón","Hebreos","Santiago","1 Pedro","2 Pedro","1 Juan","2 Juan","3 Juan","Judas","Apocalipsis"],
};

const WEEK_LABELS: Record<Lang, [string, string, string]> = {
  en: ["Last week",           "This week",          "Next week"],
  ko: ["지난 주",              "이번 주",             "다음 주"],
  zh: ["上周",                 "本周",                "下周"],
  ru: ["На прошлой неделе",   "На этой неделе",      "На следующей неделе"],
  es: ["Semana pasada",        "Esta semana",         "Próxima semana"],
};

const THEME_TRANSLATIONS: Partial<Record<Lang, Record<string, string>>> = {
  ko: { "Atonement":"속죄","Bible":"성경","Christ":"그리스도","Eternal Life":"영생","Fellowship":"교제","God":"하나님","Holiness":"성결","Holy Spirit":"성령","Hope":"희망","Judgment":"심판","Law":"율법","Life":"인생","Obedience":"순종","Peace":"평안","Prayer":"기도","Righteousness":"의","Salvation":"구원","Second Coming":"재림","Sin":"죄","Soul":"영혼" },
  zh: { "Atonement":"赎罪","Bible":"圣经","Christ":"基督","Eternal Life":"永生","Fellowship":"团契","God":"上帝","Holiness":"圣洁","Holy Spirit":"圣灵","Hope":"希望","Judgment":"审判","Law":"律法","Life":"生命","Obedience":"顺从","Peace":"平安","Prayer":"祈祷","Righteousness":"义","Salvation":"救恩","Second Coming":"再临","Sin":"罪","Soul":"灵魂" },
  ru: { "Atonement":"Искупление","Bible":"Библия","Christ":"Христос","Eternal Life":"Вечная жизнь","Fellowship":"Общение","God":"Бог","Holiness":"Святость","Holy Spirit":"Святой Дух","Hope":"Надежда","Judgment":"Суд","Law":"Закон","Life":"Жизнь","Obedience":"Послушание","Peace":"Мир","Prayer":"Молитва","Righteousness":"Праведность","Salvation":"Спасение","Second Coming":"Второе пришествие","Sin":"Грех","Soul":"Душа" },
  es: { "Atonement":"Expiación","Bible":"Biblia","Christ":"Cristo","Eternal Life":"Vida eterna","Fellowship":"Comunión","God":"Dios","Holiness":"Santidad","Holy Spirit":"Espíritu Santo","Hope":"Esperanza","Judgment":"Juicio","Law":"Ley","Life":"Vida","Obedience":"Obediencia","Peace":"Paz","Prayer":"Oración","Righteousness":"Justicia","Salvation":"Salvación","Second Coming":"Segunda Venida","Sin":"Pecado","Soul":"Alma" },
};

function translateTheme(theme: string, lang: Lang): string {
  return THEME_TRANSLATIONS[lang]?.[theme] ?? theme;
}

function formatRef(korRef: string, lang: Lang): string {
  if (lang === "en") return korToEnglish(korRef);
  if (lang === "ko") return korRef;
  const p = parseKorRef(korRef);
  if (!p) return korToEnglish(korRef);
  const bookIndex = KOR_TO_BOOK_INDEX[p.kor];
  if (bookIndex === undefined) return korToEnglish(korRef);
  const names = BOOK_NAMES[lang];
  if (!names) return korToEnglish(korRef);
  const bookName = names[bookIndex];
  if (!bookName) return korToEnglish(korRef);
  return p.verses ? `${bookName} ${p.chap}:${p.verses}` : `${bookName} ${p.chap}`;
}

async function lookupLocalVerse(korRef: string, lang: Lang): Promise<string> {
  if (lang === "en") return "";
  // Convert Korean reference to English (e.g. "벧전 3:15-16" → "1 Peter 3:15-16")
  // then delegate to the authoritative bible-lookup lib which auto-downloads and
  // caches the full Bible JSON for each language on first use.
  const engRef = korToEnglish(korRef);
  const result = await fetchAuthoritativeVerse(engRef, lang);
  return result ?? "";
}

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
    const lang: Lang = (["en","ko","zh","ru","es"].includes(body.lang) ? body.lang : "en") as Lang;
    const bulletinDate = body.bulletinDate
      ? parseBulletinDate(body.bulletinDate)
      : new Date();

    const thisSunday = getSundayOf(bulletinDate);
    const lastSunday = new Date(thisSunday.getTime() - MS_PER_WEEK);
    const nextSunday = new Date(thisSunday.getTime() + MS_PER_WEEK);

    const lastIdx = weekIndexForDate(lastSunday, verses.length);
    const thisIdx = weekIndexForDate(thisSunday, verses.length);
    const nextIdx = weekIndexForDate(nextSunday, verses.length);

    const labels = WEEK_LABELS[lang];

    const [lastText, thisText, nextText] = await Promise.all(
      lang === "en"
        ? [fetchVerseText(verses[lastIdx].reference), fetchVerseText(verses[thisIdx].reference), fetchVerseText(verses[nextIdx].reference)].map(p => p.then(r => r.text))
        : [lookupLocalVerse(verses[lastIdx].reference, lang), lookupLocalVerse(verses[thisIdx].reference, lang), lookupLocalVerse(verses[nextIdx].reference, lang)]
    );

    const newVerses = [
      { label: labels[0], date: formatMonthDay(lastSunday), reference: formatRef(verses[lastIdx].reference, lang), theme: translateTheme(verses[lastIdx].theme, lang), text: lastText },
      { label: labels[1], date: formatMonthDay(thisSunday), reference: formatRef(verses[thisIdx].reference, lang), theme: translateTheme(verses[thisIdx].theme, lang), text: thisText },
      { label: labels[2], date: formatMonthDay(nextSunday), reference: formatRef(verses[nextIdx].reference, lang), theme: translateTheme(verses[nextIdx].theme, lang), text: nextText },
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
