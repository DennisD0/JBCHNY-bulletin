import type { CalendarBanner } from "./bulletin-types";

/** A Bible seminar read from a month calendar, with full dates (the shape buildSeminarInfo takes). */
export interface MonthSeminar { label: string; startDate: string; endDate: string; pastor?: string }

/** "m/d" → "YYYY-MM-DD", picking the year nearest the calendar month (a Dec banner in a Jan sheet is last year). */
export function fullDate(mdText: string, year: number, month: number): string {
  const [m, d] = mdText.split("/").map(Number);
  const y = m - (month + 1) > 6 ? year - 1 : (month + 1) - m > 6 ? year + 1 : year;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Bible seminars among (possibly edited) banners, with full dates. Banners with a malformed
 * "m/d" are skipped; `pastors` keeps a speaker the sheet named (by banner label) through an edit.
 */
export function seminarsFromBanners(
  banners: CalendarBanner[],
  calendarMonth: string,
  pastors: Record<string, string | undefined> = {},
): MonthSeminar[] {
  const year = Number(calendarMonth.slice(3));
  const month = Number(calendarMonth.slice(0, 2)) - 1;
  const valid = (s: string) => /^\d{1,2}\/\d{1,2}$/.test(s);
  return banners
    .filter((b) => /bible seminar/i.test(b.label) && valid(b.startDate) && valid(b.endDate))
    .map((b) => ({
      label: b.label,
      startDate: fullDate(b.startDate, year, month),
      endDate: fullDate(b.endDate, year, month),
      pastor: pastors[b.label],
    }));
}
