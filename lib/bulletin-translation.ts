import type { BulletinLanguage } from "@/lib/bulletin-languages";
import type { BulletinData, MemoryVerse } from "@/lib/bulletin-types";
import { fetchVerseText } from "@/lib/bible-lookup";
import { translateBibleReadingEntry } from "@/lib/bible-book-names";

const TARGET_LANGUAGE: Record<Exclude<BulletinLanguage, "en">, string> = {
  es: "es",
  ko: "ko",
  zh: "zh-CN",
  ru: "ru",
};

const UNTRANSLATED_KEYS = new Set([
  "number", "date", "startDate", "endDate", "phone", "email", "address",
  "pastor", "sermonSpeaker", "speaker", "reference", "quoteRef", "sermonVerse",
  "who", "whom", "usherSun", "lunchDuty", "childCare", "usherWed", "church",
  "amount",
  // Bible reading values are scripture references (e.g. "Psalms 73-77", "1 Pet 1-5") —
  // translating them mangles abbreviations ("Pet" → "mascota", "Rev" → "Rev.", etc.)
  "bibleReading1", "bibleReading2", "bibleReadingDates",
  // Cover title is locked per-language below — skip Google Translate so it stays stable
  "bulletinTitle",
]);

// Fixed cover titles per language — locked so re-translation never changes them
const BULLETIN_TITLES: Record<Exclude<BulletinLanguage, "en">, string> = {
  es: "Boletín Dominical",
  ko: "교회소식",
  zh: "教会消息",
  ru: "Церковный вестник",
};

// skipValues is a Set of specific string *values* (not key names) that were already
// translated by the Bible API — skip them in the Google Translate pass.
function shouldTranslate(text: string, key?: string, skipValues?: Set<string>) {
  if (!text.trim()) return false;
  if (key && UNTRANSLATED_KEYS.has(key)) return false;
  if (skipValues?.has(text)) return false;
  if (/https?:\/\/|@/.test(text)) return false;
  if (/^[\d\s/.,:()+$-]+$/.test(text)) return false;
  return true;
}

function collectStrings(value: unknown, output: Set<string>, key?: string, skipValues?: Set<string>) {
  if (typeof value === "string") {
    if (shouldTranslate(value, key, skipValues)) output.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output, key, skipValues);
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectStrings(childValue, output, childKey, skipValues);
    }
  }
}

function replaceStrings(value: unknown, translations: Map<string, string>, key?: string, skipValues?: Set<string>): unknown {
  if (typeof value === "string") return shouldTranslate(value, key, skipValues) ? (translations.get(value) ?? value) : value;
  if (Array.isArray(value)) return value.map((item) => replaceStrings(item, translations, key, skipValues));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, replaceStrings(childValue, translations, childKey, skipValues)]),
    );
  }
  return value;
}

async function translateText(text: string, target: string) {
  const query = new URLSearchParams({ client:"gtx", sl:"en", tl:target, dt:"t", q:text });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, {
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
  const payload = await response.json() as unknown[][];
  const segments = payload[0] as unknown[][];
  return segments.map((segment) => String(segment[0] ?? "")).join("") || text;
}

/**
 * Fills `quote` and each `memoryVerse.text` with the authoritative Bible translation.
 * Returns both the enriched data and the set of string values that were successfully
 * replaced — only those values are skipped in the Google Translate pass, so a failed
 * Bible lookup automatically falls back to Google Translate.
 */
async function injectBibleVerses(
  data: Partial<BulletinData>,
  lang: Exclude<BulletinLanguage, "en">,
): Promise<{ enriched: Partial<BulletinData>; replacedValues: Set<string> }> {
  const result = { ...data };
  const replacedValues = new Set<string>();

  // Opening quote
  if (result.quote && result.quoteRef) {
    const text = await fetchVerseText(String(result.quoteRef), lang);
    if (text) {
      replacedValues.add(text);
      result.quote = text;
    }
    // Translate the book name in the displayed reference ("Psalms 118:17" → "시 118:17")
    result.quoteRef = translateBibleReadingEntry(String(result.quoteRef), lang);
  }

  // Memory verses
  if (Array.isArray(result.memoryVerses)) {
    result.memoryVerses = await Promise.all(
      (result.memoryVerses as MemoryVerse[]).map(async (verse) => {
        if (!verse.reference || !verse.text) return verse;
        // Fetch verse text from authoritative Bible version using English reference
        const text = await fetchVerseText(verse.reference, lang);
        // Translate book name in the reference label ("1 Peter 1:3-4" → "벧전 1:3-4")
        const translatedRef = translateBibleReadingEntry(verse.reference, lang);
        if (text) {
          replacedValues.add(text);
          return { ...verse, text, reference: translatedRef };
        }
        return { ...verse, reference: translatedRef };
      }),
    );
  }

  return { enriched: result, replacedValues };
}

export async function translateBulletinContent<T>(value: T, language: Exclude<BulletinLanguage, "en">): Promise<T> {
  // Step 1: Fill Bible verse fields from the authoritative translation for this language.
  // replacedValues tracks which text strings are now already in the target language so
  // Google Translate can skip them. If a Bible lookup fails, the original English text
  // is NOT in replacedValues and flows through to Google Translate automatically.
  let enriched: T = value;
  const replacedValues = new Set<string>();

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const result = await injectBibleVerses(value as Partial<BulletinData>, language);
    enriched = result.enriched as T;
    for (const v of result.replacedValues) replacedValues.add(v);

    // Translate Bible book names in the reading schedule using a lookup table
    // (these fields are in UNTRANSLATED_KEYS so Google Translate skips them,
    //  but we still need "Psalms" → "시", "Sal", "诗", "Пс" etc.)
    const bd = enriched as Partial<BulletinData>;
    if (bd.bibleReading1 || bd.bibleReading2) {
      enriched = {
        ...bd,
        bibleReading1: bd.bibleReading1?.map(e => translateBibleReadingEntry(e, language)),
        bibleReading2: bd.bibleReading2?.map(e => translateBibleReadingEntry(e, language)),
      } as T;
    }
  }

  // Step 2: Google-translate the remaining fields
  const strings = new Set<string>();
  collectStrings(enriched, strings, undefined, replacedValues);
  const queue = [...strings];
  const translations = new Map<string, string>();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < queue.length) {
      const index = nextIndex;
      nextIndex += 1;
      const text = queue[index];
      translations.set(text, await translateText(text, TARGET_LANGUAGE[language]));
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, queue.length || 1) }, () => worker()));
  const result = replaceStrings(enriched, translations, undefined, replacedValues) as T;

  // Lock in the fixed per-language cover title regardless of source content
  if (result && typeof result === "object" && !Array.isArray(result)) {
    (result as Partial<BulletinData>).bulletinTitle = BULLETIN_TITLES[language];
  }

  return result;
}
