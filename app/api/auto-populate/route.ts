import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DISPLAY: Record<string, string> = { Ps: "Psalms" };

function fmt(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/^(\w+) /, (_, a) => (DISPLAY[a] ?? a) + " ");
}

// "2 Readings" runs at 2x the "1 Reading" pace through the SAME year plan:
// each day it covers that day's Reading-1 block AND the next one, so it
// finishes the whole plan around the year's midpoint and wraps back to the
// start for the remainder of the year. Both blocks are shown as-is, stacked
// on two lines — never merged into a single combined range.
function computeReading2(sortedKeys: string[], plan: Record<string, string | null>, dayKey: string): string {
  const total = sortedKeys.length;
  const n = sortedKeys.indexOf(dayKey);
  if (n === -1 || total === 0) return "";
  const posA = (2 * n) % total;
  const posB = (2 * n + 1) % total;
  const a = fmt(plan[sortedKeys[posA]] ?? null);
  const b = fmt(plan[sortedKeys[posB]] ?? null);
  if (!a) return b;
  if (!b) return a;
  return `${a}\n${b}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date"); // MM/DD/YYYY

  const planPath = join(process.cwd(), "data", "year_reading_plan.json");
  if (!existsSync(planPath)) {
    return NextResponse.json({ error: "No reading plan loaded" }, { status: 404 });
  }

  const plan: Record<string, string | null> = JSON.parse(readFileSync(planPath, "utf8"));
  const coveredDates = Object.keys(plan).filter((key) => plan[key] !== null).sort();
  const coverageStart = coveredDates[0] ?? null;
  const coverageEnd = coveredDates[coveredDates.length - 1] ?? null;

  let base: Date;
  if (dateStr) {
    const parts = dateStr.split("/").map(Number);
    const [m, d, y] = parts;
    if (parts.length !== 3 || parts.some(Number.isNaN) || m < 1 || m > 12 || d < 1 || d > 31) {
      return NextResponse.json({ error: "Invalid date — expected MM/DD/YYYY" }, { status: 400 });
    }
    base = new Date(y, m - 1, d);
    // Reject impossible dates like 02/30 — JS Date silently rolls them over, so
    // confirm the constructed month still matches what was requested.
    if (Number.isNaN(base.getTime()) || base.getMonth() !== m - 1) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
  } else {
    base = new Date();
  }

  // Rewind to the Sunday of the current week
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - base.getDay());

  const dates: string[] = [];
  const reading1: string[] = [];
  const reading2: string[] = [];
  const missingDates: string[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const reading = plan[key] ?? null;
    reading1.push(fmt(reading));
    reading2.push(computeReading2(coveredDates, plan, key));
    if (!reading) missingDates.push(key);
  }

  return NextResponse.json({
    dates,
    reading1,
    reading2,
    coverageStart,
    coverageEnd,
    missingDates,
    complete: missingDates.length === 0,
  });
}
