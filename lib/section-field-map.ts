import type { BulletinData } from "@/lib/bulletin-types";

export const SECTION_FIELD_MAP: Record<string, (keyof BulletinData)[]> = {
  header: ["number", "date", "quote", "quoteRef", "pastor"],
  sermon: ["sermonTitle", "sermonVerse", "sermonSpeaker", "sermonEndingPraise"],
  services: ["services"],
  bibleReading: ["bibleReadingDates", "bibleReading1", "bibleReading2"],
  memoryVerses: ["memoryVerses"],
  cleaning: ["cleaningAreas"],
  calendar: ["calendarMonth", "calendarEvents", "calendarBanners", "weeklyRecurring"],
  weekSchedule: ["weekSchedule"],
  news: ["news"],
  prayer: ["prayerRequests", "jointPrayer"],
  retreatInfo: ["retreatInfo"],
  seminarInfo: ["seminarInfo"],
};

export function snapshotSection(data: BulletinData, sectionKey: string): Partial<BulletinData> {
  const snapshot: Partial<BulletinData> = {};
  for (const field of SECTION_FIELD_MAP[sectionKey] ?? []) {
    (snapshot as Record<keyof BulletinData, BulletinData[keyof BulletinData]>)[field] = data[field];
  }
  return snapshot;
}

