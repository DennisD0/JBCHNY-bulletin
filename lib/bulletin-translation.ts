import type { BulletinLanguage } from "@/lib/bulletin-languages";

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
]);

function shouldTranslate(text: string, key?: string) {
  if (!text.trim() || (key && UNTRANSLATED_KEYS.has(key))) return false;
  if (/https?:\/\/|@/.test(text)) return false;
  if (/^[\d\s/.,:()+$-]+$/.test(text)) return false;
  return true;
}

function collectStrings(value: unknown, output: Set<string>, key?: string) {
  if (typeof value === "string") {
    if (shouldTranslate(value, key)) output.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output, key);
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectStrings(childValue, output, childKey);
    }
  }
}

function replaceStrings(value: unknown, translations: Map<string, string>, key?: string): unknown {
  if (typeof value === "string") return shouldTranslate(value, key) ? translations.get(value) ?? value : value;
  if (Array.isArray(value)) return value.map((item) => replaceStrings(item, translations, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, replaceStrings(childValue, translations, childKey)]),
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

export async function translateBulletinContent<T>(value: T, language: Exclude<BulletinLanguage, "en">): Promise<T> {
  const strings = new Set<string>();
  collectStrings(value, strings);
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

  await Promise.all(Array.from({ length:Math.min(4, queue.length || 1) }, () => worker()));
  return replaceStrings(value, translations) as T;
}

