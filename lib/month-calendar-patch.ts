import type { BulletinData } from "./bulletin-types";
import type { MonthSheetResult } from "./month-sheet";
import { buildSeminarInfo } from "./week-generation.ts";

/** Today's bulletin fields that the monthly fill needs to look at. */
export interface MonthPatchContext {
  /** The bulletin's date, "MM/DD/YYYY". */
  bulletinDate?: string;
  /** The church's pastor, used as the seminar speaker when the sheet names none. */
  pastor?: string;
  seminarInfo?: BulletinData["seminarInfo"];
}

/**
 * What filling the calendar from a month sheet changes: the calendar section, plus Bible
 * Seminar Info when the sheet has a Bible seminar (of any kind) on or after the bulletin's date.
 */
export function monthCalendarPatch(sheet: MonthSheetResult, ctx: MonthPatchContext = {}): Partial<BulletinData> {
  const patch: Partial<BulletinData> = {
    calendarMonth: sheet.calendarMonth,
    calendarEvents: sheet.calendarEvents,
    calendarBanners: sheet.calendarBanners,
    weeklyRecurring: sheet.weeklyRecurring,
  };

  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(ctx.bulletinDate ?? "");
  const bulletinIso = m
    ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`
    : `${sheet.calendarMonth.slice(3)}-${sheet.calendarMonth.slice(0, 2)}-01`;

  const info = buildSeminarInfo(sheet.seminars.map((s) => ({ type: "other", ...s })), bulletinIso);
  if (info) {
    patch.seminarInfo = {
      title: info.title,
      date: info.date,
      // Bible seminars are led by the church's own pastor unless the sheet names someone else.
      speaker: info.speaker ?? (ctx.pastor ? `Pastor ${ctx.pastor}` : ctx.seminarInfo?.speaker ?? ""),
      hidden: false,
    };
  }
  return patch;
}
