// Pure helpers for the quarterly sermon-plan grid (미주교회 설교계획). No Node-only
// imports here — the upload modal uses these too, to rebuild the East Coast rows
// after the user corrects names in the review table.

export type CellStatus = "ok" | "corrected" | "unknown" | "same" | "retreat" | "empty";

export interface GridCell {
  date: string;       // ISO Sunday, YYYY-MM-DD
  name: string;       // Korean name without the p/e suffix ("" for same/retreat/empty)
  title: "p" | "e";
  status: CellStatus;
  raw?: string;       // what OCR actually read, for review
}

export interface GridChurch {
  no: number;
  ko: string;
  en: string;
  region: string;
  sundays: GridCell[];
}

export interface EastCoastEntry {
  date: string; church: string; speakerKo: string; speaker: string; language: string;
}

// Row order of the printed table. The plan has a fixed set of 21 churches.
export const CHURCHES: Array<{ ko: string; en: string; region: string }> = [
  { ko: "올랜도", en: "Orlando", region: "East" },
  { ko: "아틀란타", en: "Atlanta", region: "East" },
  { ko: "남버지니아", en: "Southern Virginia", region: "East" },
  { ko: "워싱턴", en: "Washington DC", region: "East" },
  { ko: "뉴저지", en: "New Jersey", region: "East" },
  { ko: "뉴욕", en: "New York", region: "East" },
  { ko: "미시간", en: "Michigan", region: "East" },
  { ko: "시카고", en: "Chicago", region: "East" },
  { ko: "남일리노이", en: "Southern Illinois", region: "East" },
  { ko: "덴버", en: "Denver", region: "Central" },
  { ko: "콜로라도", en: "Colorado", region: "Central" },
  { ko: "달라스", en: "Dallas", region: "Central" },
  { ko: "휴스턴", en: "Houston", region: "Central" },
  { ko: "샌안토니오", en: "San Antonio", region: "Central" },
  { ko: "LA중앙", en: "LA Central", region: "West" },
  { ko: "LA", en: "LA", region: "West" },
  { ko: "LA코로나", en: "LA Corona", region: "West" },
  { ko: "라스베가스", en: "Las Vegas", region: "West" },
  { ko: "샌프란시스코", en: "San Francisco", region: "West" },
  { ko: "시애틀", en: "Seattle", region: "Northwest" },
  { ko: "하와이", en: "Hawaii", region: "Northwest" },
];

export const EAST_ROWS = 9; // rows 1–9 are the East Coast churches

// Known preachers and their title (p = pastor, e = evangelist). OCR reads are snapped
// to this list; anything that doesn't match is flagged for review, never guessed.
export const PREACHERS: Record<string, "p" | "e"> = {
  오동준: "p", 권종안: "p", 최현우: "p", 이혜찬: "p", 신민철: "p", 김재광: "p",
  조정훈: "p", 우성준: "p", 문동찬: "p", 김재호: "e", 박종경: "p", 김지환: "e",
  김승준: "p", 구본효: "p", 정광국: "p", 김상원: "p", 양희환: "e", 신문호: "p",
  고봉산: "p", 김태우: "e", 이재준: "p", 정성호: "p", 신종근: "e", 박철오: "p",
  박철민: "p", 박철웅: "p", 이지은: "p", 김성열: "p",
};

const SURNAME_EN: Record<string, string> = {
  오: "Oh", 권: "Kwon", 최: "Choi", 이: "Lee", 신: "Shin", 김: "Kim", 조: "Cho",
  우: "Woo", 문: "Moon", 박: "Park", 구: "Koo", 정: "Jung", 양: "Yang", 고: "Ko",
};

export function speakerEn(name: string, title: "p" | "e"): string {
  return `${title}.${SURNAME_EN[name[0]] ?? name[0]}`;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/** Snap a raw OCR string (e.g. "박총경[") to a known preacher. */
export function matchPreacher(
  raw: string,
  roster: Record<string, "p" | "e"> = PREACHERS,
  aliases: Record<string, string> = {},
): { name: string; title: "p" | "e"; status: "ok" | "corrected" | "unknown" } {
  const hangul = raw.replace(/[^가-힣]/g, "");
  const candidate = hangul.slice(0, 3);
  if (candidate.length < 2) return { name: candidate, title: "p", status: "unknown" };
  if (roster[candidate]) return { name: candidate, title: roster[candidate], status: "ok" };
  // A misread a person already corrected once: apply that correction.
  const learned = aliases[candidate];
  if (learned) return { name: learned, title: roster[learned] ?? "p", status: "ok" };

  let best: string | null = null;
  let bestDist = Infinity;
  let tie = false;
  for (const known of Object.keys(roster)) {
    const d = editDistance(candidate, known);
    if (d < bestDist) { best = known; bestDist = d; tie = false; }
    else if (d === bestDist) tie = true;
  }
  if (best && bestDist <= 1 && !tie) return { name: best, title: roster[best], status: "corrected" };
  return { name: candidate, title: "p", status: "unknown" };
}

/** Parse what a user typed in a review cell: "→"/blank = same as last week, else "박종경p". */
export function parseCellInput(text: string, date: string): GridCell {
  const t = text.trim();
  if (!t) return { date, name: "", title: "p", status: "empty" };
  if (/^dvd$/i.test(t)) return { date, name: "DVD", title: "p", status: "ok" };
  if (/^[→>~\-–—=]+$/.test(t)) return { date, name: "", title: "p", status: "same" };
  if (t.includes("동계")) return { date, name: "", title: "p", status: "retreat" };
  const name = t.replace(/[^가-힣]/g, "");
  const suffix = t.match(/[pPeE]\s*$/)?.[0].toLowerCase();
  const title = (suffix === "e" ? "e" : suffix === "p" ? "p" : PREACHERS[name] ?? "p") as "p" | "e";
  return { date, name, title, status: name ? "ok" : "unknown" };
}

export function formatCell(c: GridCell): string {
  if (c.status === "same") return "→";
  if (c.status === "retreat") return "동계";
  if (c.name === "DVD") return "DVD";
  if (!c.name) return "";
  return `${c.name}${c.title}`;
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The 13 Sundays of a quarter, starting with the first Sunday of its first month. */
export function quarterSundays(year: number, quarter: number): string[] {
  const d = new Date(year, (quarter - 1) * 3, 1);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  const out: string[] = [];
  for (let i = 0; i < 13; i++) {
    out.push(iso(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/**
 * East Coast table rows: one per explicit preacher cell of the East churches.
 * "Same as last week" arrows are left out — that matches how the bulletin's
 * existing eastCoastSeminars data was entered.
 */
export function buildEastCoastEntries(churches: GridChurch[]): EastCoastEntry[] {
  const out: EastCoastEntry[] = [];
  for (const ch of churches.slice(0, EAST_ROWS)) {
    for (const cell of ch.sundays) {
      if (!cell.name || cell.name === "DVD" || cell.status === "same" || cell.status === "retreat" || cell.status === "empty") continue;
      out.push({
        date: cell.date,
        church: ch.en,
        speakerKo: `${cell.name}${cell.title}`,
        speaker: speakerEn(cell.name, cell.title),
        language: "Korean",
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Event bands ("각 교회별 전도집회" and "미주 행사") ─────────────────────
export interface BandEvent {
  id: string; type: string; label: string;
  startDate: string; endDate: string; location: string;
}

// Matched against the line with all whitespace removed (Tesseract spaces out Hangul).
// First match wins, so specific phrases come before general ones.
const EVENT_KINDS: Array<{ re: RegExp; type: string; label: string; needsEast: boolean }> = [
  { re: /선교팀.*방문/, type: "special-christian-life-seminar", label: "Special Christian Life Seminar", needsEast: false },
  { re: /전도인부부수련회/, type: "ec-pastor-couples-retreat", label: "Pastor Couples Retreat", needsEast: true },
  { re: /전도인수련회/, type: "ec-pastor-retreat", label: "EC Pastor Retreat", needsEast: true },
  { re: /청년임원수련회/, type: "ya-officer-retreat", label: "YA Officer Retreat", needsEast: true },
  { re: /청년수련회/, type: "ec-ya-retreat", label: "EC YA Retreat", needsEast: true },
  { re: /교사수련회/, type: "ec-teacher-retreat", label: "EC Teacher Retreat", needsEast: true },
  { re: /동계수련회/, type: "ec-winter-retreat", label: "EC Winter Retreat", needsEast: true },
  { re: /중고등부.*(캠프|수련회)/, type: "ec-youth-camp", label: "EC Youth Camp", needsEast: true },
];

const LOCATIONS: Array<[RegExp, string]> = [
  [/워싱턴교회/, "Washington DC"], [/휴스턴교회/, "Houston"], [/라스베가스교회/, "Las Vegas"],
  [/온라인/, "Online"], [/KRC/i, "KRC"], [/SCU/i, "SCU"], [/AMC/i, "AMC"],
];

/**
 * Turn OCR text of an event band into calendar events. Only events that matter to
 * the New York bulletin are kept: those on the East Coast (동부), US-wide (미주),
 * or that mention New York (뉴욕).
 */
export function parseEventBand(text: string, quarter: number, year: number): BandEvent[] {
  const out: BandEvent[] = [];
  const qStartMonth = (quarter - 1) * 3 + 1;
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine
      .replace(/\s+/g, "")
      .replace(/통부/g, "동부").replace(/통계/g, "동계");
    if (!line) continue;
    const kind = EVENT_KINDS.find((k) => k.re.test(line));
    if (!kind) continue;
    const east = /^(동부|미주)/.test(line) || line.includes("뉴욕");
    if (!east) continue;

    // "10/12~16", "11/26~29", "12/21~1/8", or a single day "10/17".
    const m = line.match(/(\d{1,2})\/(\d{1,2})(?:[~\-–](?:(\d{1,2})\/)?(\d{1,2}))?/);
    if (!m) continue;
    const sm = Number(m[1]), sd = Number(m[2]);
    const em = m[3] ? Number(m[3]) : sm, ed = m[4] ? Number(m[4]) : sd;
    if (sm < 1 || sm > 12 || em < 1 || em > 12 || sd < 1 || sd > 31 || ed < 1 || ed > 31) continue;
    // The band can include the tail of the previous quarter (9/28–10/5 on a Q4 sheet) or run
    // into the next year (12/21–1/8): put the start in whichever year lands nearest the quarter.
    const qStart = new Date(year, qStartMonth - 1, 1).getTime();
    const sy = [year - 1, year, year + 1].reduce((best, y) =>
      Math.abs(new Date(y, sm - 1, sd).getTime() - qStart) < Math.abs(new Date(best, sm - 1, sd).getTime() - qStart) ? y : best, year);
    const ey = em < sm ? sy + 1 : sy;
    const startDate = `${sy}-${String(sm).padStart(2, "0")}-${String(sd).padStart(2, "0")}`;
    const endDate = `${ey}-${String(em).padStart(2, "0")}-${String(ed).padStart(2, "0")}`;
    const location = LOCATIONS.find(([re]) => re.test(line))?.[1] ?? "";
    out.push({ id: `${kind.type}-${startDate}`, type: kind.type, label: kind.label, startDate, endDate, location });
  }
  return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

// ── Learning from corrections ────────────────────────────────────────────
export interface LearnedRoster {
  names: Record<string, "p" | "e">;   // preachers added by people (not in PREACHERS)
  aliases: Record<string, string>;    // OCR misread → correct name
}

/**
 * From a reviewed grid, work out what to remember: where a person's final name differs
 * from what OCR read, store the misread as an alias; new names join the roster.
 * An alias is never stored for a string that is itself a known name.
 */
export function learnFromGrid(churches: GridChurch[], prior: LearnedRoster): LearnedRoster {
  const names = { ...prior.names };
  const aliases = { ...prior.aliases };
  const known = (n: string) => !!PREACHERS[n] || !!names[n];
  for (const ch of churches) {
    for (const cell of ch.sundays) {
      // Only learn from cells that were recognised or fixed by a person — never from OCR garbage.
      if (!cell.name || cell.name === "DVD" || cell.status === "same" || cell.status === "retreat" || cell.status === "unknown" || cell.status === "empty") continue;
      if (!/^[가-힣]{2,3}$/.test(cell.name)) continue;
      if (!known(cell.name)) names[cell.name] = cell.title;
      const read = (cell.raw ?? "").replace(/[^가-힣]/g, "").slice(0, 3);
      if (read.length >= 2 && read !== cell.name && !known(read)) aliases[read] = cell.name;
    }
  }
  return { names, aliases };
}
