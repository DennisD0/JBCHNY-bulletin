"use client";

import { LayoutDashboard, Church, Users, BookOpen, Quote, CalendarDays, CalendarClock, Newspaper, HandHeart, Sparkles, BookMarked, CalendarRange, ClipboardList, Eye, Pencil, type LucideIcon } from "lucide-react";
import type { AppNotification } from "@/app/api/notifications/route";
import type { BulletinData } from "@/lib/bulletin-types";
import { type BulletinLanguage, type LanguageLock } from "@/lib/bulletin-languages";

export const SECTIONS = [
  { id: "header",    label: "Header",          icon: LayoutDashboard, page: 1 },
  { id: "sermon",    label: "Sermon",          icon: Church,          page: 1 },
  { id: "services",  label: "Services",        icon: Users,           page: 1 },
  { id: "bible",     label: "Bible Reading",   icon: BookOpen,        page: 1 },
  { id: "memory",    label: "Memory Verses",   icon: Quote,           page: 1 },
  { id: "cleaning",  label: "Cleaning",        icon: Sparkles,        page: 1 },
  { id: "calendar",  label: "Calendar",        icon: CalendarDays,    page: 2 },
  { id: "seminar-info", label: "Bible Seminar Info", icon: BookMarked,  page: 2 },
  { id: "schedule",  label: "Weekly Schedule", icon: CalendarClock,   page: 2 },
  { id: "news",      label: "News",            icon: Newspaper,       page: 2 },
  { id: "prayer",    label: "Prayer",          icon: HandHeart,       page: 2 },
  { id: "retreat",        label: "Retreat Info",       icon: CalendarRange,   page: 2 },
  { id: "seminar-service", label: "Seminar Service",   icon: ClipboardList,   page: 2 },
] as const;

export type TabId = (typeof SECTIONS)[number]["id"];

export const TAB_SECTION_KEY: Record<TabId, string> = {
  header: "header",
  sermon: "sermon",
  services: "services",
  bible: "bibleReading",
  memory: "memoryVerses",
  cleaning: "cleaning",
  calendar: "calendar",
  "seminar-info": "seminarInfo",
  schedule: "weekSchedule",
  news: "news",
  prayer: "prayer",
  retreat: "retreatInfo",
  "seminar-service": "seminarService",
};

export const FIELD_TO_TAB: Partial<Record<keyof BulletinData, TabId>> = {
  bulletinTitle: "header", labels: "header", number: "header", date: "header",
  quote: "header", quoteRef: "header", pastor: "header",
  phone: "header", address: "header",
  sermonTitle: "sermon", sermonVerse: "sermon", sermonSpeaker: "sermon", sermonEndingPraise: "sermon",
  services: "services", eastCoastSeminar: "services", fellowship: "services",
  bibleReadingDates: "bible", bibleReading1: "bible", bibleReading2: "bible",
  memoryVerses: "memory",
  cleaningAreas: "cleaning",
  calendarMonth: "calendar", calendarEvents: "calendar", calendarBanners: "calendar", weeklyRecurring: "calendar",
  weekSchedule: "schedule",
  news: "news", jointPrayer: "news", seminarInfo: "seminar-info",
  prayerRequests: "prayer",
  retreatInfo: "retreat",
  seminarService: "seminar-service",
};

export const LANGUAGE_CONFIG: Record<BulletinLanguage, { code: string; flag: string; name: string }> = {
  en: { code: "EN", flag: "🇺🇸", name: "English" },
  es: { code: "ES", flag: "🇪🇸", name: "Spanish" },
  ko: { code: "KO", flag: "🇰🇷", name: "Korean" },
  zh: { code: "ZH", flag: "🇨🇳", name: "Chinese" },
  ru: { code: "RU", flag: "🇷🇺", name: "Russian" },
};

export type PresenceRole = "editor" | "collaborator" | "viewer";

// Single source of truth for the three collaboration roles — icon, colors, label.
export const ROLE_META: Record<PresenceRole, {
  label: string;
  Icon: LucideIcon;
  solid: string;   // badge / accent fill
  tint: string;    // soft chip background
  ink: string;     // chip text/icon color
  ring: string;    // chip border
}> = {
  editor:       { label: "Editor",       Icon: Pencil, solid: "#F59E0B", tint: "rgba(245,158,11,0.14)", ink: "#B45309", ring: "rgba(245,158,11,0.45)" },
  collaborator: { label: "Collaborator", Icon: Users,  solid: "#8B5CF6", tint: "rgba(139,92,246,0.14)", ink: "#7C3AED", ring: "rgba(139,92,246,0.45)" },
  viewer:       { label: "Viewer",       Icon: Eye,    solid: "#94A3B8", tint: "rgba(148,163,184,0.14)", ink: "#64748B", ring: "rgba(148,163,184,0.42)" },
};

export function roleForSession(lock: LanguageLock | null | undefined, sessionId: string): PresenceRole {
  if (lock?.sessionId === sessionId) return "editor";
  if (lock?.collaborators?.includes(sessionId)) return "collaborator";
  return "viewer";
}

// Section centers in full-PDF coordinate space (1344 × 1634 stacked)
// h = approximate section height — used to compute zoom level
export const ACCESS_REQUEST_TYPES = ["takeover_request", "join_request"] as const;
export type AccessRequestType = (typeof ACCESS_REQUEST_TYPES)[number];

export function isAccessRequestNotification(notification: AppNotification): notification is AppNotification & { type: AccessRequestType } {
  return ACCESS_REQUEST_TYPES.includes(notification.type as AccessRequestType);
}

// Short, pleasant two-note "ding-dong" chime for incoming requests/notifications.
// Synthesized with the Web Audio API so there's no audio asset to ship or load.
let sharedAudioCtx: AudioContext | null = null;
export function playNotificationChime() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    sharedAudioCtx = sharedAudioCtx ?? new Ctor();
    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const notes = [
      { freq: 880.0, start: 0.0, dur: 0.18 },    // A5
      { freq: 1174.66, start: 0.11, dur: 0.30 }, // D6
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.16, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.03);
    }
  } catch { /* audio unavailable — silently skip */ }
}

export const SECTION_ZOOM: Record<TabId, { cx: number; cy: number; h: number }> = {
  // Page 1 (y: 0–816), col widths ≈ [449, 448, 447]
  header:   { cx: 1120, cy: 320,  h: 380 }, // col 3 – cover panel
  sermon:   { cx: 673,  cy: 102,  h: 140 }, // col 2, y 32–172
  services: { cx: 673,  cy: 251,  h: 157 }, // col 2, y 172–329
  bible:    { cx: 225,  cy: 120,  h: 176 }, // col 1, y 32–208
  memory:   { cx: 225,  cy: 394,  h: 372 }, // col 1, y 208–580
  cleaning: { cx: 225,  cy: 698,  h: 236 }, // col 1, y 580–816
  // Page 2 (y: 818–1634)
  calendar: { cx: 225,  cy: 1098, h: 560 }, // col 1 p2
  "seminar-info": { cx: 225, cy: 1530, h: 200 }, // col 1 p2, below the calendar
  schedule: { cx: 673,  cy: 967,  h: 299 }, // col 2 p2, top half
  news:     { cx: 673,  cy: 1374, h: 330 }, // col 2 p2, bottom half
  prayer:   { cx: 1120, cy: 967,  h: 299 }, // col 3 p2, top half
  retreat:          { cx: 1120, cy: 1530, h: 240 }, // col 3 p2, below joint prayer
  "seminar-service": { cx: 1120, cy: 1530, h: 240 }, // col 3 p2, same slot as retreat
};

export type BulletinWeek = {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  label: string;
};

export function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addLocalDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function displayShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function displayCoverageDate(iso: string | null | undefined) {
  if (!iso) return "Not available";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function getBulletinWeeks(monthValue: string): BulletinWeek[] {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return [];
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  let cursor = addLocalDays(first, -first.getDay());
  const weeks: BulletinWeek[] = [];
  while (cursor <= last) {
    const start = new Date(cursor);
    const end = addLocalDays(start, 6);
    weeks.push({
      start,
      end,
      startIso: localIso(start),
      endIso: localIso(end),
      label: `Week ${weeks.length + 1} · ${displayShortDate(start)}–${displayShortDate(end)}`,
    });
    cursor = addLocalDays(cursor, 7);
  }
  return weeks;
}

export function monthFromBulletinDate(value: string) {
  const [month, , year] = value.split("/").map(Number);
  return month && year ? `${year}-${String(month).padStart(2, "0")}` : "";
}

/** How far through its calendar month `now` is ("MM/YYYY" → percent, whole days left). */
export function monthProgress(calendarMonth: string | undefined, now: number) {
  const m = /^(\d{2})\/(\d{4})$/.exec(calendarMonth ?? "");
  if (!m) return null;
  const start = new Date(Number(m[2]), Number(m[1]) - 1, 1);
  const end = new Date(Number(m[2]), Number(m[1]), 1);
  const share = (now - start.getTime()) / (end.getTime() - start.getTime());
  return {
    percentUsed: Math.min(100, Math.max(0, Math.round(share * 100))),
    daysRemaining: Math.max(0, Math.ceil((end.getTime() - now) / 86_400_000)),
    expired: now >= end.getTime(),
    label: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
}

export function usageColor(percentUsed: number, status?: string) {
  if (status === "missing" || status === "expired" || percentUsed >= 90) return "#DC2626";
  if (percentUsed >= 75) return "#EA580C";
  if (percentUsed >= 50) return "#D6A400";
  return "#16A34A";
}
