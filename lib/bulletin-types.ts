export interface ServiceRow {
  date: string;
  usherSun: string;
  lunchDuty: string;
  childCare: string;
  usherWed: string;
}

export interface SeminarRow {
  date: string;
  church: string;
  speaker: string;
  language: string;
}

export interface FellowshipRow {
  name: string;
  day: string;
  time: string;
  location: string;
}

export interface MemoryVerse {
  label: string;
  date: string;
  reference: string;
  theme: string;
  text: string;
}

export interface CleaningRow {
  location: string;
  group: string;
}

export interface CalendarBanner {
  label: string;
  startDate: string;
  endDate: string;
  type?: "retreat" | "seminar" | "camp" | "conference" | "other";
}

export interface WeeklyRecurringEvent {
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  label: string;
}

export interface WeekScheduleItem {
  name: string;
  location: string;
  time: string;
}

export interface WeekScheduleDay {
  date: string;
  items: WeekScheduleItem[];
}

export interface NewsItem {
  title: string;
  body: string;
}

export interface PrayerRequest {
  who: string;
  whom: string;
  relation: string;
}

export interface BulletinLabels {
  // Section headings
  headSermon: string;
  headServices: string;
  headSeminar: string;
  headFellowship: string;
  // Sermon row labels
  lblTitle: string;
  lblMainVerse: string;
  lblSpeaker: string;
  lblEndingPraise: string;
  // Services table columns
  colSunday: string;
  colUsherSun: string;
  colLunchDuty: string;
  colChildCare: string;
  colUsherWed: string;
  // Seminar table columns
  colDate: string;
  colChurchName: string;
  colSemSpeaker: string;
  colLanguage: string;
  // Contact / front-page labels
  lblPastor: string;
  lblAddress: string;
  // Section headings (back page — previously hardcoded in preview)
  headBibleReading: string;
  headMemoryVerses: string;
  headCleaning: string;
  headCalendar: string;
  headSeminarInfo: string;
  headWeekSchedule: string;
  headChurchNews: string;
  headPrayer: string;
  headJointPrayer: string;
  headRetreats: string;
  // Week schedule table columns
  colWeekDate: string;
  colWeekEvent: string;
  colWeekLocation: string;
  colWeekTime: string;
}

export interface BulletinData {
  bulletinTitle?: string;
  labels?: BulletinLabels;
  number: string;
  date: string;
  quote: string;
  quoteRef: string;
  pastor: string;

  sermonTitle: string;
  sermonVerse: string;
  sermonSpeaker: string;
  sermonEndingPraise: string;

  services: ServiceRow[];
  eastCoastSeminar: SeminarRow[];
  fellowship: FellowshipRow[];

  phone: string;
  email: string;
  address: string;

  bibleReadingDates: string[];
  bibleReading1: string[];
  bibleReading2: string[];

  memoryVerses: MemoryVerse[];
  cleaningAreas: CleaningRow[];

  calendarMonth: string;
  calendarEvents: Record<string, string[]>;
  calendarBanners: CalendarBanner[];
  weeklyRecurring: WeeklyRecurringEvent[];

  weekSchedule: WeekScheduleDay[];

  news: NewsItem[];
  prayerRequests: PrayerRequest[];
  jointPrayer: NewsItem[];

  seminarInfo: { title: string; date: string; speaker: string };

  retreatInfo: {
    enabled: boolean;
    title: string;
    date: string;
    location: string;
    fees: { label: string; amount: string }[];
  };
}
