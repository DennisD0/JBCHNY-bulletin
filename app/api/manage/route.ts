import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface DataSource {
  id: string;
  name: string;
  description: string;
  planFile: string | null;
  startDate: string | null;
  endDate: string | null;
  totalDays: number;
  coveredDays: number;
  daysRemaining: number;
  percentUsed: number;
  status: "active" | "missing" | "expired" | "warning";
  autoEnabled: boolean;
}

export interface ScheduleEvent {
  id: string;
  type: "grand-bible-seminar" | "ya-officer-retreat" | "ec-youth-camp";
  label: string;
  startDate: string;
  endDate: string;
  location: string;
  pastor?: string;
}

export interface EastCoastSeminarEntry {
  date: string;
  church: string;
  speaker: string;
  speakerKo: string;
  language: string;
}

export interface ScheduleSource {
  id: string;
  name: string;
  description: string;
  planFile: string | null;
  quarter: string | null;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  percentUsed: number;
  status: "active" | "missing" | "expired" | "warning";
  events: ScheduleEvent[];
  eastCoastSeminars: EastCoastSeminarEntry[];
}

function getPlanCoverage(planFile: string) {
  const p = join(process.cwd(), "data", planFile);
  if (!existsSync(p)) return { start: null, end: null, total: 0 };
  try {
    const plan: Record<string, string | null> = JSON.parse(readFileSync(p, "utf8"));
    const keys = Object.keys(plan).filter((k) => plan[k] !== null).sort();
    if (!keys.length) return { start: null, end: null, total: 0 };
    return { start: keys[0], end: keys[keys.length - 1], total: keys.length };
  } catch (error) {
    // Malformed or partially-written plan file — degrade to "missing" rather than 500.
    console.error(`Failed to read/parse ${planFile}`, error);
    return { start: null, end: null, total: 0 };
  }
}

function computeSourceStatus(
  startDate: string | null,
  endDate: string | null,
  today: Date,
  todayStr: string,
  totalDays: number
) {
  if (!startDate || !endDate) return { coveredDays: 0, daysRemaining: 0, percentUsed: 0, status: "missing" as const };

  const endDate_ = new Date(endDate);
  const msLeft = endDate_.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msLeft / 86400000));

  if (todayStr < startDate) {
    return { coveredDays: 0, daysRemaining, percentUsed: 0, status: "active" as const };
  } else if (todayStr > endDate) {
    return { coveredDays: totalDays, daysRemaining: 0, percentUsed: 100, status: "expired" as const };
  } else {
    const startDate_ = new Date(startDate);
    const elapsed = today.getTime() - startDate_.getTime();
    const coveredDays = Math.ceil(elapsed / 86400000);
    // totalDays can be 0 for a single-day coverage window (start === end) — avoid NaN/Infinity.
    const percentUsed = totalDays > 0 ? Math.round((coveredDays / totalDays) * 100) : 100;
    const status = daysRemaining < 60 ? "warning" : "active";
    return { coveredDays, daysRemaining, percentUsed, status: status as "active" | "warning" };
  }
}

export async function GET() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // --- Reading plan sources ---
  const readingSources: DataSource[] = [
    {
      id: "bible-reading-1",
      name: "Bible Reading — 1 Reading",
      description: "Daily reading for the '1 Reading' row in the Bible Reading table.",
      planFile: "year_reading_plan.json",
      autoEnabled: true,
      startDate: null, endDate: null, totalDays: 0,
      coveredDays: 0, daysRemaining: 0, percentUsed: 0, status: "missing",
    },
    {
      id: "bible-reading-2",
      name: "Bible Reading — 2 Readings",
      description: "Daily reading for the '2 Readings' row in the Bible Reading table.",
      planFile: null,
      autoEnabled: false,
      startDate: null, endDate: null, totalDays: 0,
      coveredDays: 0, daysRemaining: 0, percentUsed: 0, status: "missing",
    },
  ];

  for (const src of readingSources) {
    if (!src.planFile) continue;
    const { start, end, total } = getPlanCoverage(src.planFile);
    if (!start || !end) continue;
    src.startDate = start;
    src.endDate = end;
    src.totalDays = total;
    const s = computeSourceStatus(start, end, today, todayStr, total);
    src.coveredDays = s.coveredDays;
    src.daysRemaining = s.daysRemaining;
    src.percentUsed = s.percentUsed;
    src.status = s.status;
  }

  // --- Monthly schedule source ---
  const scheduleFile = "monthly_schedule.json";
  const schedulePath = join(process.cwd(), "data", scheduleFile);
  let scheduleSrc: ScheduleSource;

  type EastCoastSeminarEntry = { date: string; church: string; speaker: string; speakerKo: string; language: string };
  let scheduleRaw: { coverageStart?: string; coverageEnd?: string; quarter?: string; events?: ScheduleEvent[]; eastCoastSeminars?: EastCoastSeminarEntry[] } | null = null;
  if (existsSync(schedulePath)) {
    try {
      scheduleRaw = JSON.parse(readFileSync(schedulePath, "utf8"));
    } catch (error) {
      console.error("Failed to read/parse monthly_schedule.json", error);
    }
  }

  if (scheduleRaw) {
    const coverageStart = scheduleRaw.coverageStart ?? null;
    const coverageEnd = scheduleRaw.coverageEnd ?? null;
    const { quarter, events, eastCoastSeminars } = scheduleRaw;
    const totalDays = coverageStart && coverageEnd
      ? Math.max(0, Math.ceil((new Date(coverageEnd).getTime() - new Date(coverageStart).getTime()) / 86400000))
      : 0;
    const s = computeSourceStatus(coverageStart, coverageEnd, today, todayStr, totalDays);
    scheduleSrc = {
      id: "monthly-schedule",
      name: "Monthly Schedule",
      description: "Calendar events — Grand Bible Seminar, EC Youth Camp, YA Officer Retreat.",
      planFile: scheduleFile,
      quarter: quarter ?? null,
      startDate: coverageStart,
      endDate: coverageEnd,
      daysRemaining: s.daysRemaining,
      percentUsed: s.percentUsed,
      status: s.status,
      events: events ?? [],
      eastCoastSeminars: eastCoastSeminars ?? [],
    };
  } else {
    scheduleSrc = {
      id: "monthly-schedule",
      name: "Monthly Schedule",
      description: "Calendar events — Grand Bible Seminar, EC Youth Camp, YA Officer Retreat.",
      planFile: null,
      quarter: null,
      startDate: null,
      endDate: null,
      daysRemaining: 0,
      percentUsed: 0,
      status: "missing",
      events: [],
      eastCoastSeminars: [],
    };
  }

  return NextResponse.json({ readingSources, scheduleSrc, today: todayStr });
}
