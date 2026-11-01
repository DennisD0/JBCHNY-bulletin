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
  // Only a seminar within two weeks belongs on this bulletin; a schedule that
  // doesn't reach this week must not pull in a seminar months away.
  const latest = new Date(utc(bulletinIso) + 14 * MS_DAY).toISOString().slice(0, 10);
  const upcoming = entries.filter((e) => e.date >= bulletinIso && e.date <= latest).sort((a, b) => a.date.localeCompare(b.date));
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

// ── "This week's schedule" ────────────────────────────────────────────────
export interface ScheduleItem { name: string; location: string; time: string }
export interface WeekScheduleDay { date: string; items: ScheduleItem[] }

// The calendar uses short labels ("Teachers'"); the printed schedule spells them out
// and adds where and when. Anything not listed keeps its own name with no place or time.
const FULL_SCHEDULE: Array<[RegExp, ScheduleItem]> = [
  [/^sermon$/i, { name: "Sunday Sermon", location: "Main Hall", time: "11 AM" }],
  [/^wed(nesday)?\.? sermon$/i, { name: "Wednesday Sermon", location: "Main Hall", time: "8 PM" }],
  [/^teachers?['’]?$/i, { name: "Teacher Training", location: "Fellowship Hall", time: "8 PM" }],
  [/^translators?['’]?$/i, { name: "Translator Meeting", location: "Counseling #1", time: "5 PM" }],
  [/^(ya|young adults?)['’]?$/i, { name: "Young Adults Fellowship", location: "Fellowship Hall", time: "7 PM" }],
  [/^officers?['’]?$/i, { name: "Officer Meeting", location: "Fellowship Hall", time: "2:30 PM" }],
  [/^mothers? officers?['’]?$/i, { name: "Mother Officer Meeting", location: "Fellowship Hall", time: "4 PM" }],
  [/^new believers?['’]?$/i, { name: "New Believer Sermon", location: "Fellowship Hall", time: "2 PM" }],
  [/^choirs?['’]?$/i, { name: "Choir Meeting", location: "Fellowship Hall", time: "4 PM" }],
  [/^region 3$/i, { name: "Region 3 Fellowship", location: "Fellowship Hall", time: "2 PM" }],
  [/^region 2$/i, { name: "Region 2 Fellowship", location: "TBA", time: "8 PM" }],
  [/^region 1$/i, { name: "Region 1 Fellowship", location: "TBA", time: "8 PM" }],
  [/^fel(lowship)?\.? by lang(uage)?$/i, { name: "Fellowship by Language", location: "TBA", time: "2 PM" }],
];

export function fullScheduleItem(label: string): ScheduleItem {
  const key = label.trim();
  return FULL_SCHEDULE.find(([re]) => re.test(key))?.[1] ?? { name: key, location: "", time: "" };
}

const minutes = (time: string) => {
  const m = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return Infinity;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m[2] ?? 0);
};

/**
 * The bulletin Sunday through the next Sunday (8 days), as printed: full wording, place and
 * time per item. A Bible-seminar banner replaces the weekday routine on its days, and
 * consecutive days with the same items are shown as one range ("10/19-23").
 */
export function buildWeekSchedule(opts: {
  sundayIso: string;
  recurring: Array<{ dayOfWeek: number; label: string }>;
  events: Record<string, string[]>;                                  // "m/d" → labels
  banners: Array<{ label: string; startDate: string; endDate: string }>;   // "m/d"
}): WeekScheduleDay[] {
  const val = (v: string) => { const [m, d] = v.split("/").map(Number); return m * 100 + d; };
  const seminars = opts.banners.filter((b) => /bible seminar/i.test(b.label) && !/special|christian life/i.test(b.label));
  const days = Array.from({ length: 8 }, (_, i) => {
    const ms = utc(opts.sundayIso) + i * MS_DAY;
    const d = new Date(ms);
    const m = d.getUTCMonth() + 1, dayNum = d.getUTCDate(), current = m * 100 + dayNum;
    const dow = d.getUTCDay();
    const seminar = seminars.find((b) => current >= val(b.startDate) && current <= val(b.endDate));
    const labels: string[] = [];
    if (!seminar) for (const r of opts.recurring) if (r.dayOfWeek === dow) labels.push(r.label);
    for (const e of opts.events[`${m}/${dayNum}`] ?? []) if (e.trim()) labels.push(e);
    const items: ScheduleItem[] = [];
    if (seminar) {
      const span = Math.round((utc(`2000-${String(Math.floor(val(seminar.endDate) / 100)).padStart(2, "0")}-${String(val(seminar.endDate) % 100).padStart(2, "0")}`)
        - utc(`2000-${String(Math.floor(val(seminar.startDate) / 100)).padStart(2, "0")}-${String(val(seminar.startDate) % 100).padStart(2, "0")}`)) / MS_DAY) + 1;
      items.push({ name: `${span}-Day Bible Seminar`, location: "TBA", time: "8 PM" });
    }
    for (const label of labels) {
      const item = fullScheduleItem(label);
      if (!items.some((x) => x.name === item.name)) items.push(item);
    }
    items.sort((a, b) => minutes(a.time) - minutes(b.time));
    return { m, dayNum, dow, items };
  }).filter((day) => day.items.length > 0);

  const out: Array<{ first: typeof days[number]; last: typeof days[number] }> = [];
  for (const day of days) {
    const prev = out[out.length - 1];
    const same = prev && JSON.stringify(prev.last.items) === JSON.stringify(day.items)
      && utc(`2000-${String(day.m).padStart(2, "0")}-${String(day.dayNum).padStart(2, "0")}`)
        - utc(`2000-${String(prev.last.m).padStart(2, "0")}-${String(prev.last.dayNum).padStart(2, "0")}`) === MS_DAY;
    if (same) prev.last = day; else out.push({ first: day, last: day });
  }
  return out.map(({ first, last }) => ({
    date: first === last
      ? `${first.m}/${first.dayNum}(${DOW[first.dow][0]}${DOW[first.dow].slice(1).toLowerCase()})`
      : `${first.m}/${first.dayNum}-${last.m === first.m ? last.dayNum : `${last.m}/${last.dayNum}`}`,
    items: first.items,
  }));
}
