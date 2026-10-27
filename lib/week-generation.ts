import type { ServiceRow } from "./bulletin-types";
import { bulletinChurchName, CHURCHES, speakerFromKo } from "./schedule-grid-shared.ts";

const MS_DAY = 86_400_000;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

// Rotation anchored on the printed 10/18/2026 bulletin (Jungho Park / John Park),
// which advanced to Andrew Kim / Jiwook Jang on 10/25.
export const USHER_ROTATION = {
  anchorIso: "2026-10-18",
  sun: ["Jungho Park", "Andrew Kim", "Jose H"],
  wed: ["John Park", "Jiwook Jang"],
};

const utc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const md = (ms: number) => `${new Date(ms).getUTCMonth() + 1}/${new Date(ms).getUTCDate()}`;
const mod = (n: number, m: number) => ((n % m) + m) % m;
const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

export function ushersForWeek(sundayIso: string) {
  const weeks = Math.round((utc(sundayIso) - utc(USHER_ROTATION.anchorIso)) / (7 * MS_DAY));
  return {
    usherSun: USHER_ROTATION.sun[mod(weeks, USHER_ROTATION.sun.length)],
    usherWed: USHER_ROTATION.wed[mod(weeks, USHER_ROTATION.wed.length)],
  };
}

// Two rows: the bulletin Sunday and the next one. Lunch duty and child care are
// kept when a row for the same date already exists.
export function buildServiceRows(sundayIso: string, existing: ServiceRow[] = []): ServiceRow[] {
  return [0, 1].map((offset) => {
    const ms = utc(sundayIso) + offset * 7 * MS_DAY;
    const iso = new Date(ms).toISOString().slice(0, 10);
    const date = md(ms);
    const prior = existing.find((row) => row.date === date);
    return {
      date,
      ...ushersForWeek(iso),
      lunchDuty: prior?.lunchDuty ?? "",
      childCare: prior?.childCare ?? "",
    };
  });
}

interface EastCoastEntry { date: string; church: string; speaker: string; speakerKo?: string; language: string }

// Each entry is keyed by the Sunday before its seminar week; the seminar runs
// Monday through the following Sunday. Only the nearest seminar week is listed.
const KO_LANGUAGE: Record<string, string> = { Korean: "한국어", English: "영어" };

// The Korean bulletin prints the table the way the printed Korean edition does:
// Korean church name, "이지은목사" speaker, 한국어/영어 language.
function koreanRow(e: EastCoastEntry, date: string) {
  const church = CHURCHES.find((c) => c.en === e.church)?.ko ?? e.church;
  const name = (e.speakerKo ?? "").replace(/[^가-힣]/g, "");
  const title = /e\s*$/i.test(e.speakerKo ?? "") ? "전도사" : "목사";
  return { date, church, speaker: name ? `${name}${title}` : e.speaker, language: KO_LANGUAGE[e.language] ?? e.language };
}

export function buildEastCoastRows(entries: EastCoastEntry[], bulletinIso: string, lang: string = "en") {
  const upcoming = entries.filter((e) => e.date >= bulletinIso).sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length === 0) return [];
  const first = upcoming[0].date;
  const start = utc(first);
  const toMonday = ((1 - new Date(start).getUTCDay() + 7) % 7) || 7;
  const monday = start + toMonday * MS_DAY;
  const sunday = monday + 6 * MS_DAY;
  const sameMonth = new Date(monday).getUTCMonth() === new Date(sunday).getUTCMonth();
  const range = `${md(monday)}-${sameMonth ? new Date(sunday).getUTCDate() : md(sunday)}`;
  // Older saved schedules stored surname-only speakers and long church names;
  // rebuild both the way the bulletin prints them.
  return upcoming
    .filter((e) => e.date === first)
    .map((e) => lang === "ko" ? koreanRow(e, range) : ({
      date: range,
      church: bulletinChurchName(e.church),
      speaker: (e.speakerKo && speakerFromKo(e.speakerKo)) || e.speaker,
      language: e.language,
    }));
}

interface SeminarEvent { type: string; label?: string; startDate: string; endDate: string; pastor?: string }

// Events added by hand in the review window have type "other"; recognise them by name.
const isBibleSeminar = (e: SeminarEvent) =>
  e.type === "grand-bible-seminar" || (!!e.label && /bible seminar/i.test(e.label) && !/special|christian life/i.test(e.label));

export function buildSeminarInfo(events: SeminarEvent[], bulletinIso: string) {
  const next = events
    .filter((e) => isBibleSeminar(e) && e.endDate >= bulletinIso)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (!next) return null;
  const start = utc(next.startDate);
  const end = utc(next.endDate);
  const s = new Date(start);
  const e = new Date(end);
  const part = (d: Date, ms: number) => `${ordinal(d.getUTCDate())}(${DOW[new Date(ms).getUTCDay()]})`;
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  const endText = sameMonth ? part(e, end) : `${MONTHS[e.getUTCMonth()]} ${part(e, end)}`;
  return {
    title: `${MONTHS[s.getUTCMonth()]} Bible Seminar`,
    date: `${MONTHS[s.getUTCMonth()]} ${part(s, start)} - ${endText}`,
    speaker: next.pastor ? `Pastor ${next.pastor}` : undefined,
  };
}
