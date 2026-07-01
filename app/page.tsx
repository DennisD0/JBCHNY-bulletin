"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Church, Users, BookOpen, Quote,
  CalendarDays, CalendarClock, Newspaper, HandHeart, Sparkles,
  BookMarked, CalendarRange, Save as SaveIcon,
  MousePointer2, Hand, ZoomIn, Maximize2, Download,
  type LucideIcon,
} from "lucide-react";
import BulletinPreview, { PAGE_W, PAGE_H } from "@/app/components/BulletinPreview";
import BulletinFitController from "@/app/components/BulletinFitController";
import { UploadModal } from "@/app/components/UploadModal";
import type {
  BulletinData,
  ServiceRow,
  MemoryVerse,
  CleaningRow,
  WeekScheduleDay,
  WeekScheduleItem,
  NewsItem,
  PrayerRequest,
  CalendarBanner,
  FellowshipRow,
} from "@/lib/bulletin-types";

// ---------------------------------------------------------------------------
// Shared small components
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const cls =
    "w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-blue-400";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-black uppercase tracking-widest text-blue-900 mb-4">
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm flex flex-col gap-4">
      {children}
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="self-start rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-bold text-blue-900 transition-colors hover:bg-blue-50"
    >
      + {label}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-2 py-1 text-lg leading-none text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors"
    >
      ×
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tab: Header
// ---------------------------------------------------------------------------

function HeaderTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle>Bulletin header</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Bulletin number"
            value={data.number}
            onChange={(v) => set({ number: v })}
          />
          <Field
            label="Date"
            value={data.date}
            onChange={(v) => set({ date: v })}
          />
        </div>
        <Field
          label="Pastor name"
          value={data.pastor}
          onChange={(v) => set({ pastor: v })}
        />
      </Card>

      <Card>
        <SectionTitle>Cover quote</SectionTitle>
        <Field
          label="Quote text"
          value={data.quote}
          onChange={(v) => set({ quote: v })}
          multiline
          rows={2}
        />
        <Field
          label="Scripture reference"
          value={data.quoteRef}
          onChange={(v) => set({ quoteRef: v })}
        />
      </Card>

      <Card>
        <SectionTitle>Contact info</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Phone"
            value={data.phone}
            onChange={(v) => set({ phone: v })}
          />
          <Field
            label="Email"
            value={data.email}
            onChange={(v) => set({ email: v })}
          />
        </div>
        <Field
          label="Address"
          value={data.address}
          onChange={(v) => set({ address: v })}
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Sermon
// ---------------------------------------------------------------------------

function SermonTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  return (
    <Card>
      <SectionTitle>Lord&apos;s Day Sermon</SectionTitle>
      <Field
        label="Title"
        value={data.sermonTitle}
        onChange={(v) => set({ sermonTitle: v })}
      />
      <Field
        label="Main verse"
        value={data.sermonVerse}
        onChange={(v) => set({ sermonVerse: v })}
      />
      <Field
        label="Speaker"
        value={data.sermonSpeaker}
        onChange={(v) => set({ sermonSpeaker: v })}
      />
      <Field
        label="Ending praise"
        value={data.sermonEndingPraise}
        onChange={(v) => set({ sermonEndingPraise: v })}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Services
// ---------------------------------------------------------------------------

function ServicesTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const updateRow = (i: number, patch: Partial<ServiceRow>) => {
    const rows = data.services.map((r, idx) =>
      idx === i ? { ...r, ...patch } : r
    );
    set({ services: rows });
  };
  const addRow = () =>
    set({
      services: [
        ...data.services,
        { date: "", usherSun: "", lunchDuty: "", childCare: "", usherWed: "" },
      ],
    });
  const removeRow = (i: number) =>
    set({ services: data.services.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle>Weekly duty roster</SectionTitle>
        {data.services.map((row, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Field
                label="Date"
                value={row.date}
                onChange={(v) => updateRow(i, { date: v })}
              />
              <Field
                label="Usher (Sun)"
                value={row.usherSun}
                onChange={(v) => updateRow(i, { usherSun: v })}
              />
              <Field
                label="Lunch duty"
                value={row.lunchDuty}
                onChange={(v) => updateRow(i, { lunchDuty: v })}
                multiline
                rows={2}
              />
              <Field
                label="Child care"
                value={row.childCare}
                onChange={(v) => updateRow(i, { childCare: v })}
              />
              <Field
                label="Usher (Wed)"
                value={row.usherWed}
                onChange={(v) => updateRow(i, { usherWed: v })}
              />
            </div>
            <RemoveBtn onClick={() => removeRow(i)} />
          </div>
        ))}
        <AddBtn onClick={addRow} label="Add week" />
      </Card>

      <Card>
        <SectionTitle>US East Coast Bible Seminar</SectionTitle>
        {data.eastCoastSeminar.map((row, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Field
                label="Date"
                value={row.date}
                onChange={(v) => {
                  const rows = data.eastCoastSeminar.map((r, idx) =>
                    idx === i ? { ...r, date: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
              <Field
                label="Church"
                value={row.church}
                onChange={(v) => {
                  const rows = data.eastCoastSeminar.map((r, idx) =>
                    idx === i ? { ...r, church: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
              <Field
                label="Speaker"
                value={row.speaker}
                onChange={(v) => {
                  const rows = data.eastCoastSeminar.map((r, idx) =>
                    idx === i ? { ...r, speaker: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
              <Field
                label="Language"
                value={row.language}
                onChange={(v) => {
                  const rows = data.eastCoastSeminar.map((r, idx) =>
                    idx === i ? { ...r, language: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  eastCoastSeminar: data.eastCoastSeminar.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
            />
          </div>
        ))}
        <AddBtn
          onClick={() =>
            set({
              eastCoastSeminar: [
                ...data.eastCoastSeminar,
                { date: "", church: "", speaker: "", language: "" },
              ],
            })
          }
          label="Add seminar row"
        />
      </Card>

      <Card>
        <SectionTitle>Services &amp; Fellowship (fixed schedule)</SectionTitle>
        {data.fellowship.map((row, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              {(
                [
                  ["name", "Service name"],
                  ["day", "Day"],
                  ["time", "Time"],
                  ["location", "Location"],
                ] as [keyof FellowshipRow, string][]
              ).map(([key, lbl]) => (
                <Field
                  key={key}
                  label={lbl}
                  value={row[key]}
                  onChange={(v) => {
                    const rows = data.fellowship.map((r, idx) =>
                      idx === i ? { ...r, [key]: v } : r
                    );
                    set({ fellowship: rows });
                  }}
                />
              ))}
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  fellowship: data.fellowship.filter((_, idx) => idx !== i),
                })
              }
            />
          </div>
        ))}
        <AddBtn
          onClick={() =>
            set({
              fellowship: [
                ...data.fellowship,
                { name: "", day: "", time: "", location: "" },
              ],
            })
          }
          label="Add row"
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Bible Reading
// ---------------------------------------------------------------------------

function BibleReadingTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const days = data.bibleReadingDates;
  const updateDate = (i: number, v: string) => {
    const arr = [...data.bibleReadingDates];
    arr[i] = v;
    set({ bibleReadingDates: arr });
  };
  const update1 = (i: number, v: string) => {
    const arr = [...data.bibleReading1];
    arr[i] = v;
    set({ bibleReading1: arr });
  };
  const update2 = (i: number, v: string) => {
    const arr = [...data.bibleReading2];
    arr[i] = v;
    set({ bibleReading2: arr });
  };

  return (
    <Card>
      <SectionTitle>Weekly Bible reading</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-stone-400 pb-2 pr-3 whitespace-nowrap">
                Row
              </th>
              {days.map((_, i) => (
                <th key={i} className="pb-2 px-1">
                  <input
                    value={data.bibleReadingDates[i]}
                    onChange={(e) => updateDate(i, e.target.value)}
                    className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-center text-xs font-bold text-stone-600 focus:outline-none focus:border-blue-400"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {([
              ["Reading 1", data.bibleReading1, update1],
              ["Reading 2", data.bibleReading2, update2],
            ] as [string, string[], (i: number, v: string) => void][]).map(
              ([label, vals, updater]) => (
                <tr key={label}>
                  <td className="text-[10px] font-bold uppercase tracking-widest text-stone-400 pr-3 py-1 whitespace-nowrap align-top pt-2">
                    {label}
                  </td>
                  {days.map((_, i) => (
                    <td key={i} className="px-1 py-1 align-top">
                      <textarea
                        rows={2}
                        value={vals[i] ?? ""}
                        onChange={(e) => updater(i, e.target.value)}
                        className="w-full min-w-[90px] rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 resize-none focus:outline-none focus:border-blue-400"
                      />
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Memory Verses
// ---------------------------------------------------------------------------

function MemoryVersesTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const update = (i: number, patch: Partial<MemoryVerse>) => {
    const arr = data.memoryVerses.map((v, idx) =>
      idx === i ? { ...v, ...patch } : v
    );
    set({ memoryVerses: arr });
  };

  return (
    <div className="flex flex-col gap-5">
      {data.memoryVerses.map((verse, i) => (
        <Card key={i}>
          <SectionTitle>{verse.label} — Memory Verse</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            <Field
              label="Label"
              value={verse.label}
              onChange={(v) => update(i, { label: v })}
            />
            <Field
              label="Date"
              value={verse.date}
              onChange={(v) => update(i, { date: v })}
            />
            <Field
              label="Theme"
              value={verse.theme}
              onChange={(v) => update(i, { theme: v })}
            />
          </div>
          <Field
            label="Scripture reference"
            value={verse.reference}
            onChange={(v) => update(i, { reference: v })}
          />
          <Field
            label="Verse text"
            value={verse.text}
            onChange={(v) => update(i, { text: v })}
            multiline
            rows={4}
          />
        </Card>
      ))}
    </div>
  );
}

const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

function RecurringEventsSidebarPanel({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const [dow, setDow] = useState(0);
  const [label, setLabel] = useState("");

  const recurring = data.weeklyRecurring ?? [];

  const addEntry = () => {
    if (!label.trim()) return;
    set({ weeklyRecurring: [...recurring, { dayOfWeek: dow, label: label.trim() }] });
    setLabel("");
  };

  return (
    <div style={{
      margin: "0 10px 4px",
      background: "#F8FAFC",
      border: "1px solid #E2E8F0",
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        Weekly Recurring
      </div>

      {DOW_LABELS.map((dayLabel, dowIdx) => {
        const items = recurring.filter(r => r.dayOfWeek === dowIdx);
        if (items.length === 0) return null;
        return (
          <div key={dowIdx} style={{ marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>{dayLabel}: </span>
            {items.map((item) => {
              const globalIdx = recurring.indexOf(item);
              return (
                <span key={globalIdx} style={{
                  display: "inline-flex", alignItems: "center", gap: 2,
                  background: "#EEF3FB", border: "1px solid #BFDBFE",
                  borderRadius: 99, padding: "1px 6px",
                  fontSize: 10.5, color: "#1E3A8A", marginRight: 3, marginBottom: 2,
                }}>
                  {item.label}
                  <button
                    onClick={() => set({ weeklyRecurring: recurring.filter((_, i) => i !== globalIdx) })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#93C5FD", padding: 0, lineHeight: 1, fontSize: 12 }}
                  >×</button>
                </span>
              );
            })}
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        <select
          value={dow}
          onChange={(e) => setDow(Number(e.target.value))}
          style={{ borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", padding: "3px 4px", fontSize: 11, color: "#334155" }}
        >
          {DOW_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input
          placeholder="Event label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addEntry()}
          style={{ flex: 1, minWidth: 0, borderRadius: 6, border: "1px solid #E2E8F0", background: "#fff", padding: "3px 6px", fontSize: 11, color: "#334155" }}
        />
        <button
          onClick={addEntry}
          style={{ borderRadius: 6, background: "#1E3A8A", color: "#fff", border: "none", padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
        >+</button>
      </div>
    </div>
  );
}

function RecurringEventAdder({ onAdd }: { onAdd: (entry: { dayOfWeek: number; label: string }) => void }) {
  const [dow, setDow] = useState(0);
  const [label, setLabel] = useState("");
  const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div className="flex gap-2 items-center">
      <select
        value={dow}
        onChange={(e) => setDow(Number(e.target.value))}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      >
        {DOW_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
      </select>
      <input
        placeholder="Event label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) {
            onAdd({ dayOfWeek: dow, label: label.trim() });
            setLabel("");
          }
        }}
        className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
      <button
        onClick={() => {
          if (!label.trim()) return;
          onAdd({ dayOfWeek: dow, label: label.trim() });
          setLabel("");
        }}
        className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
      >Add</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Monthly Calendar
// ---------------------------------------------------------------------------

function CalendarTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [newEvent, setNewEvent] = useState("");

  const addEvent = () => {
    if (!newDate.trim() || !newEvent.trim()) return;
    const prev = data.calendarEvents[newDate] ?? [];
    set({
      calendarEvents: { ...data.calendarEvents, [newDate]: [...prev, newEvent.trim()] },
    });
    setNewEvent("");
  };

  const removeEvent = (date: string, evtIdx: number) => {
    const prev = data.calendarEvents[date].filter((_, i) => i !== evtIdx);
    const next = { ...data.calendarEvents };
    if (prev.length === 0) delete next[date];
    else next[date] = prev;
    set({ calendarEvents: next });
  };

  const updateBanner = (i: number, patch: Partial<CalendarBanner>) => {
    set({
      calendarBanners: data.calendarBanners.map((b, idx) =>
        idx === i ? { ...b, ...patch } : b
      ),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle>Calendar month</SectionTitle>
        <Field
          label="Month / Year (e.g. 07/2026)"
          value={data.calendarMonth}
          onChange={(v) => set({ calendarMonth: v })}
        />
      </Card>

      <Card>
        <SectionTitle>Weekly recurring events</SectionTitle>
        <p className="text-[11px] text-stone-400 -mt-2">
          These appear automatically on every matching weekday in the calendar — no manual entry needed.
        </p>
        {(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const).map((dow, dowIdx) => {
          const items = (data.weeklyRecurring ?? []).filter(r => r.dayOfWeek === dowIdx);
          if (items.length === 0) return null;
          return (
            <div key={dow} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{dow}</span>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, itemIdx) => {
                  const globalIdx = (data.weeklyRecurring ?? []).indexOf(item);
                  return (
                    <span key={itemIdx} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      {item.label}
                      <button
                        onClick={() => set({ weeklyRecurring: (data.weeklyRecurring ?? []).filter((_, i) => i !== globalIdx) })}
                        className="text-blue-300 hover:text-red-400 leading-none"
                      >×</button>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="border-t border-stone-100 pt-3 flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Add recurring event</span>
          <RecurringEventAdder onAdd={(entry) => set({ weeklyRecurring: [...(data.weeklyRecurring ?? []), entry] })} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Daily events</SectionTitle>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {Object.entries(data.calendarEvents)
            .sort(([a], [b]) => {
              const parse = (d: string) => {
                const [m, day] = d.split("/").map(Number);
                return m * 100 + day;
              };
              return parse(a) - parse(b);
            })
            .map(([date, events]) => (
              <div
                key={date}
                className="rounded-xl border border-stone-100 p-3 flex flex-col gap-1"
              >
                <span className="text-xs font-black text-blue-900">{date}</span>
                <div className="flex flex-wrap gap-1.5">
                  {events.map((evt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-800"
                    >
                      {evt}
                      <button
                        onClick={() => removeEvent(date, idx)}
                        className="text-blue-300 hover:text-red-400 leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>

        <div className="border-t border-stone-100 pt-4 flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
            Add event
          </span>
          <div className="flex gap-2">
            <input
              placeholder="Date (e.g. 7/12)"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-28 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              placeholder="Event name"
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={addEvent}
              className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Add
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Spanning events (banners)</SectionTitle>
        {data.calendarBanners.map((banner, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 grid grid-cols-3 gap-3">
              <Field
                label="Label"
                value={banner.label}
                onChange={(v) => updateBanner(i, { label: v })}
              />
              <Field
                label="Start date"
                value={banner.startDate}
                onChange={(v) => updateBanner(i, { startDate: v })}
              />
              <Field
                label="End date"
                value={banner.endDate}
                onChange={(v) => updateBanner(i, { endDate: v })}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  calendarBanners: data.calendarBanners.filter(
                    (_, idx) => idx !== i
                  ),
                })
              }
            />
          </div>
        ))}
        <AddBtn
          onClick={() =>
            set({
              calendarBanners: [
                ...data.calendarBanners,
                { label: "", startDate: "", endDate: "" },
              ],
            })
          }
          label="Add banner"
        />
      </Card>

      <Card>
        <SectionTitle>Bible Seminar info</SectionTitle>
        <Field
          label="Title"
          value={data.seminarInfo.title}
          onChange={(v) =>
            set({ seminarInfo: { ...data.seminarInfo, title: v } })
          }
        />
        <Field
          label="Date / time"
          value={data.seminarInfo.date}
          onChange={(v) =>
            set({ seminarInfo: { ...data.seminarInfo, date: v } })
          }
        />
        <Field
          label="Speaker"
          value={data.seminarInfo.speaker}
          onChange={(v) =>
            set({ seminarInfo: { ...data.seminarInfo, speaker: v } })
          }
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Weekly Schedule
// ---------------------------------------------------------------------------

function WeeklyScheduleTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const updateDay = (di: number, patch: Partial<WeekScheduleDay>) => {
    set({
      weekSchedule: data.weekSchedule.map((d, i) =>
        i === di ? { ...d, ...patch } : d
      ),
    });
  };

  const updateItem = (di: number, ii: number, patch: Partial<WeekScheduleItem>) => {
    const items = data.weekSchedule[di].items.map((it, i) =>
      i === ii ? { ...it, ...patch } : it
    );
    updateDay(di, { items });
  };

  const addItem = (di: number) => {
    const items = [
      ...data.weekSchedule[di].items,
      { name: "", location: "", time: "" },
    ];
    updateDay(di, { items });
  };

  const removeItem = (di: number, ii: number) => {
    const items = data.weekSchedule[di].items.filter((_, i) => i !== ii);
    updateDay(di, { items });
  };

  const addDay = () => {
    set({
      weekSchedule: [
        ...data.weekSchedule,
        { date: "", items: [{ name: "", location: "", time: "" }] },
      ],
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {data.weekSchedule.map((day, di) => (
        <Card key={di}>
          <div className="flex items-center gap-3">
            <input
              value={day.date}
              onChange={(e) => updateDay(di, { date: e.target.value })}
              placeholder="Date (e.g. 6/28(Sun))"
              className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-bold text-blue-900 focus:outline-none focus:border-blue-400"
            />
            <RemoveBtn
              onClick={() =>
                set({
                  weekSchedule: data.weekSchedule.filter((_, i) => i !== di),
                })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            {day.items.map((item, ii) => (
              <div
                key={ii}
                className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
              >
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <Field
                    label="Event"
                    value={item.name}
                    onChange={(v) => updateItem(di, ii, { name: v })}
                  />
                  <Field
                    label="Location"
                    value={item.location}
                    onChange={(v) => updateItem(di, ii, { location: v })}
                  />
                  <Field
                    label="Time"
                    value={item.time}
                    onChange={(v) => updateItem(di, ii, { time: v })}
                  />
                </div>
                <RemoveBtn onClick={() => removeItem(di, ii)} />
              </div>
            ))}
          </div>

          <AddBtn onClick={() => addItem(di)} label="Add event" />
        </Card>
      ))}
      <AddBtn onClick={addDay} label="Add day" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: News
// ---------------------------------------------------------------------------

function NewsTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const updateNews = (i: number, patch: Partial<NewsItem>) => {
    set({ news: data.news.map((n, idx) => (idx === i ? { ...n, ...patch } : n)) });
  };
  const updateJoint = (i: number, patch: Partial<NewsItem>) => {
    set({
      jointPrayer: data.jointPrayer.map((n, idx) =>
        idx === i ? { ...n, ...patch } : n
      ),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionTitle>NY Church News</SectionTitle>
        {data.news.map((item, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 flex flex-col gap-3">
              <Field
                label="Title"
                value={item.title}
                onChange={(v) => updateNews(i, { title: v })}
              />
              <Field
                label="Body"
                value={item.body}
                onChange={(v) => updateNews(i, { body: v })}
                multiline
                rows={3}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({ news: data.news.filter((_, idx) => idx !== i) })
              }
            />
          </div>
        ))}
        <AddBtn
          onClick={() =>
            set({ news: [...data.news, { title: "", body: "" }] })
          }
          label="Add news item"
        />
      </Card>

      <Card>
        <SectionTitle>Joint Prayer</SectionTitle>
        {data.jointPrayer.map((item, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 flex flex-col gap-3">
              <Field
                label="Title"
                value={item.title}
                onChange={(v) => updateJoint(i, { title: v })}
              />
              <Field
                label="Body"
                value={item.body}
                onChange={(v) => updateJoint(i, { body: v })}
                multiline
                rows={3}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  jointPrayer: data.jointPrayer.filter((_, idx) => idx !== i),
                })
              }
            />
          </div>
        ))}
        <AddBtn
          onClick={() =>
            set({ jointPrayer: [...data.jointPrayer, { title: "", body: "" }] })
          }
          label="Add joint prayer"
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Prayer Requests
// ---------------------------------------------------------------------------

function PrayerTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const update = (i: number, patch: Partial<PrayerRequest>) => {
    set({
      prayerRequests: data.prayerRequests.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r
      ),
    });
  };

  return (
    <Card>
      <SectionTitle>Prayer Requests</SectionTitle>
      <div className="flex flex-col gap-2">
        {data.prayerRequests.map((req, i) => (
          <div
            key={i}
            className="flex gap-2 items-center rounded-xl border border-stone-100 p-2"
          >
            <div className="flex-1 grid grid-cols-3 gap-2">
              <Field
                label="Who (requester)"
                value={req.who}
                onChange={(v) => update(i, { who: v })}
              />
              <Field
                label="Whom (person)"
                value={req.whom}
                onChange={(v) => update(i, { whom: v })}
              />
              <Field
                label="Relation"
                value={req.relation}
                onChange={(v) => update(i, { relation: v })}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  prayerRequests: data.prayerRequests.filter((_, idx) => idx !== i),
                })
              }
            />
          </div>
        ))}
      </div>
      <AddBtn
        onClick={() =>
          set({
            prayerRequests: [
              ...data.prayerRequests,
              { who: "", whom: "", relation: "" },
            ],
          })
        }
        label="Add prayer request"
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Cleaning
// ---------------------------------------------------------------------------

function CleaningTab({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const update = (i: number, patch: Partial<CleaningRow>) => {
    set({
      cleaningAreas: data.cleaningAreas.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r
      ),
    });
  };

  return (
    <Card>
      <SectionTitle>Lord&apos;s Day Cleaning Areas</SectionTitle>
      {data.cleaningAreas.map((row, i) => (
        <div
          key={i}
          className="flex gap-2 items-center rounded-xl border border-stone-100 p-2"
        >
          <div className="flex-1 grid grid-cols-2 gap-3">
            <Field
              label="Location"
              value={row.location}
              onChange={(v) => update(i, { location: v })}
            />
            <Field
              label="Group"
              value={row.group}
              onChange={(v) => update(i, { group: v })}
            />
          </div>
          <RemoveBtn
            onClick={() =>
              set({
                cleaningAreas: data.cleaningAreas.filter((_, idx) => idx !== i),
              })
            }
          />
        </div>
      ))}
      <AddBtn
        onClick={() =>
          set({
            cleaningAreas: [...data.cleaningAreas, { location: "", group: "" }],
          })
        }
        label="Add area"
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Automation Panel (right column)
// ---------------------------------------------------------------------------

type ManageData = {
  readingSources?: Array<{
    name: string;
    planFile: string | null;
    startDate: string | null;
    endDate: string | null;
    totalDays: number;
    coveredDays: number;
    daysRemaining: number;
    percentUsed: number;
    status: string;
    autoEnabled: boolean;
  }>;
  scheduleSrc?: {
    name: string;
    quarter: string | null;
    status: string;
    planFile: string | null;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number;
    percentUsed: number;
    events: Array<{ label: string; startDate: string; endDate: string; type: string }>;
  } | null;
  today?: string;
};

function AutomationPanel({ onDataRefreshed }: { onDataRefreshed?: () => void }) {
  const [mgmt, setMgmt] = useState<ManageData | null>(null);
  const [uploadTarget, setUploadTarget] = useState<null | "reading" | "schedule">(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/manage");
      if (r.ok) setMgmt(await r.json());
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const reading = mgmt?.readingSources?.[0];
  const schedule = mgmt?.scheduleSrc;

  // Status pill helper
  function Pill({ ok, label }: { ok: boolean; label: string }) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: ok ? "#F0FDF4" : "#FEF2F2",
        color: ok ? "#15803D" : "#B91C1C",
        border: `1px solid ${ok ? "#BBF7D0" : "#FECACA"}`,
        borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      }}>
        <span style={{ fontSize: 8 }}>{ok ? "●" : "●"}</span>
        {label}
      </span>
    );
  }

  // Section label
  function PanelLabel({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ fontSize: 10, fontWeight: 900, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, marginTop: 20 }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#1E3A8A", marginBottom: 2 }}>
        Auto-fill
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
        Upload PDFs to refill reading & schedule data
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#E2E8F0", margin: "16px 0" }} />

      {/* Bible Reading */}
      <PanelLabel>Year Reading Plan</PanelLabel>
      <div style={{ background: "#F8FAFD", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {reading ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1E3A8A" }}>
                {reading.name}
              </span>
              <Pill ok={reading.status === "active" || reading.status === "warning"} label={reading.planFile ? (reading.status === "expired" ? "Expired" : "Active") : "Missing"} />
            </div>
            {reading.planFile && reading.totalDays > 0 && (
              <>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
                    <span>{reading.coveredDays} / {reading.totalDays} days</span>
                    <span>{reading.percentUsed}%</span>
                  </div>
                  <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${reading.percentUsed}%`, background: "#4472C4", borderRadius: 999, transition: "width 0.4s" }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>
                  {reading.daysRemaining} days remaining
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#94A3B8" }}>Loading…</div>
        )}
        <button
          onClick={() => setUploadTarget("reading")}
          style={{
            background: "#fff", border: "1.5px solid #CBD5E1",
            borderRadius: 10, padding: "8px 12px",
            fontSize: 12, fontWeight: 700, color: "#1E3A8A",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span>📤</span> Upload new plan
        </button>
      </div>

      {/* Monthly Schedule */}
      <PanelLabel>Monthly Schedule</PanelLabel>
      <div style={{ background: "#F8FAFD", borderRadius: 14, border: "1px solid #E2E8F0", padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {mgmt ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1E3A8A" }}>
                {schedule?.quarter ?? "Schedule"}
              </span>
              <Pill ok={!!schedule && (schedule.status === "active" || schedule.status === "warning")} label={schedule?.planFile ? (schedule.status === "expired" ? "Expired" : "Active") : "Missing"} />
            </div>
            {schedule && schedule.events.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "#64748B" }}>
                  {schedule.events.length} events loaded
                </div>
                {(() => {
                  const todayIso = mgmt.today ?? "";
                  const next = schedule.events
                    .filter((e) => e.startDate >= todayIso)
                    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
                  if (!next) return null;
                  const ms = new Date(next.startDate).getTime() - new Date(todayIso).getTime();
                  const days = Math.ceil(ms / 86400000);
                  return (
                    <div style={{ fontSize: 11, color: "#64748B" }}>
                      Next:{" "}
                      <span style={{ color: "#1E3A8A", fontWeight: 700 }}>
                        {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {schedule.events.slice(0, 3).map((ev, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#475569", display: "flex", gap: 6 }}>
                      <span style={{ color: "#94A3B8", flexShrink: 0 }}>
                        {ev.startDate.replace(/^\d{4}-/, "").replace("-", "/")}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.label}
                      </span>
                    </div>
                  ))}
                  {schedule.events.length > 3 && (
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>+{schedule.events.length - 3} more…</div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#94A3B8" }}>Loading…</div>
        )}
        <button
          onClick={() => setUploadTarget("schedule")}
          style={{
            background: "#fff", border: "1.5px solid #CBD5E1",
            borderRadius: 10, padding: "8px 12px",
            fontSize: 12, fontWeight: 700, color: "#1E3A8A",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span>📤</span> Upload new schedule
        </button>
      </div>

      {/* Upload modals */}
      {uploadTarget === "reading" && (
        <UploadModal
          name="Year Reading Plan"
          uploadType="reading"
          onClose={() => setUploadTarget(null)}
          onSaved={() => { setUploadTarget(null); load(); onDataRefreshed?.(); }}
        />
      )}
      {uploadTarget === "schedule" && (
        <UploadModal
          name="Monthly Schedule"
          uploadType="schedule"
          onClose={() => setUploadTarget(null)}
          onSaved={() => { setUploadTarget(null); load(); onDataRefreshed?.(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor sections + zoom targets
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Canvas mode toolbar
// ---------------------------------------------------------------------------

type CanvasMode = "grab" | "select" | "zoom";

const CANVAS_TOOLS: { id: CanvasMode; label: string; shortcut: string; Icon: LucideIcon }[] = [
  { id: "select", label: "Select & Edit", shortcut: "V", Icon: MousePointer2 },
  { id: "grab",   label: "Grab & Pan",   shortcut: "H", Icon: Hand },
  { id: "zoom",   label: "Zoom In",      shortcut: "Z", Icon: ZoomIn },
];

function ToolbarTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(10,10,18,0.96)",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 8,
              padding: "5px 9px",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingToolbar({
  mode, onMode, onFit, onExport, exporting, disabled,
}: {
  mode: CanvasMode;
  onMode: (m: CanvasMode) => void;
  onFit: () => void;
  onExport: () => void;
  exporting: boolean;
  disabled?: boolean;
}) {
  const pillStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center",
    background: "rgba(10,10,18,0.88)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    padding: "5px 7px",
    gap: 2,
    boxShadow: "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
    userSelect: "none",
  };

  const btnBase: React.CSSProperties = {
    position: "relative", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    width: 44, height: 40, borderRadius: 9,
    border: "none", background: "transparent",
    cursor: "pointer", gap: 2, flexShrink: 0,
  };

  return (
    <div style={{
      position: "absolute", bottom: 20, left: "50%",
      transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 8,
      zIndex: 30, pointerEvents: "all",
    }}>
      {/* Main pill */}
      <div style={pillStyle}>
        {/* Mode tools */}
        {CANVAS_TOOLS.map(({ id, label, shortcut, Icon }) => {
          const active = mode === id;
          return (
            <ToolbarTooltip key={id} text={`${label}  ${shortcut}`}>
              <button
                onClick={() => onMode(id)}
                style={{ ...btnBase, color: active ? "#fff" : "rgba(255,255,255,0.45)" }}
                aria-label={label}
                aria-pressed={active}
              >
                {active && (
                  <motion.div
                    layoutId="toolbar-active"
                    transition={{ type: "spring", stiffness: 520, damping: 36 }}
                    style={{
                      position: "absolute", inset: 0,
                      borderRadius: 9,
                      background: "rgba(68,114,196,0.85)",
                      boxShadow: "0 2px 8px rgba(68,114,196,0.4)",
                    }}
                  />
                )}
                <Icon size={16} strokeWidth={2} style={{ position: "relative", zIndex: 1, flexShrink: 0 }} />
                <span style={{
                  position: "relative", zIndex: 1,
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.04em", lineHeight: 1,
                  color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                }}>
                  {shortcut}
                </span>
              </button>
            </ToolbarTooltip>
          );
        })}

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)", margin: "0 4px", flexShrink: 0 }} />

        {/* Fit to screen */}
        <ToolbarTooltip text="Fit to Screen  ⌃0">
          <button
            onClick={onFit}
            style={{ ...btnBase, color: "rgba(255,255,255,0.45)", width: 36 }}
            aria-label="Fit to screen"
          >
            <Maximize2 size={15} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        </ToolbarTooltip>
      </div>

      {/* Export button — separate accent pill */}
      <ToolbarTooltip text="Export PDF">
        <motion.button
          onClick={onExport}
          disabled={exporting || disabled}
          whileHover={!exporting && !disabled ? { scale: 1.04 } : undefined}
          whileTap={!exporting && !disabled ? { scale: 0.97 } : undefined}
          transition={{ duration: 0.13 }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: exporting || disabled ? "rgba(68,114,196,0.5)" : "#4472C4",
            color: "#fff", border: "none", borderRadius: 11,
            padding: "9px 16px",
            fontSize: 13, fontWeight: 800, cursor: exporting || disabled ? "not-allowed" : "pointer",
            boxShadow: exporting || disabled ? "none" : "0 4px 18px rgba(68,114,196,0.45)",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
          aria-label="Export PDF"
        >
          {exporting
            ? <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
            : <Download size={14} strokeWidth={2.5} />}
          {exporting ? "Generating…" : "Export PDF"}
        </motion.button>
      </ToolbarTooltip>
    </div>
  );
}

const SECTIONS = [
  { id: "header",    label: "Header",          icon: LayoutDashboard, page: 1 },
  { id: "sermon",    label: "Sermon",          icon: Church,          page: 1 },
  { id: "services",  label: "Services",        icon: Users,           page: 1 },
  { id: "bible",     label: "Bible Reading",   icon: BookOpen,        page: 1 },
  { id: "memory",    label: "Memory Verses",   icon: Quote,           page: 1 },
  { id: "cleaning",  label: "Cleaning",        icon: Sparkles,        page: 1 },
  { id: "calendar",  label: "Calendar",        icon: CalendarDays,    page: 2 },
  { id: "schedule",  label: "Weekly Schedule", icon: CalendarClock,   page: 2 },
  { id: "news",      label: "News",            icon: Newspaper,       page: 2 },
  { id: "prayer",    label: "Prayer",          icon: HandHeart,       page: 2 },
] as const;

type TabId = (typeof SECTIONS)[number]["id"];

// Section centers in full-PDF coordinate space (1344 × 1634 stacked)
// h = approximate section height — used to compute zoom level
const SECTION_ZOOM: Record<TabId, { cx: number; cy: number; h: number }> = {
  // Page 1 (y: 0–816), col widths ≈ [449, 448, 447]
  header:   { cx: 1120, cy: 320,  h: 380 }, // col 3 – cover panel
  sermon:   { cx: 673,  cy: 102,  h: 140 }, // col 2, y 32–172
  services: { cx: 673,  cy: 251,  h: 157 }, // col 2, y 172–329
  bible:    { cx: 225,  cy: 120,  h: 176 }, // col 1, y 32–208
  memory:   { cx: 225,  cy: 394,  h: 372 }, // col 1, y 208–580
  cleaning: { cx: 225,  cy: 698,  h: 236 }, // col 1, y 580–816
  // Page 2 (y: 818–1634)
  calendar: { cx: 225,  cy: 1098, h: 560 }, // col 1 p2
  schedule: { cx: 673,  cy: 967,  h: 299 }, // col 2 p2, top half
  news:     { cx: 673,  cy: 1374, h: 330 }, // col 2 p2, bottom half
  prayer:   { cx: 1120, cy: 967,  h: 299 }, // col 3 p2, top half
};

type BulletinWeek = {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  label: string;
};

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addLocalDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function displayShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function displayCoverageDate(iso: string | null | undefined) {
  if (!iso) return "Not available";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getBulletinWeeks(monthValue: string): BulletinWeek[] {
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

function monthFromBulletinDate(value: string) {
  const [month, , year] = value.split("/").map(Number);
  return month && year ? `${year}-${String(month).padStart(2, "0")}` : "";
}

function usageColor(percentUsed: number, status?: string) {
  if (status === "missing" || status === "expired" || percentUsed >= 90) return "#DC2626";
  if (percentUsed >= 75) return "#EA580C";
  if (percentUsed >= 50) return "#D6A400";
  return "#16A34A";
}

// Nav row for the sidebar's section list. The active state's highlight is a
// single shared-layout element (framer-motion layoutId) that slides smoothly
// between rows instead of popping instantly when the selection changes.
function NavItem({
  icon: Icon, label, isActive, onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 11,
        width: "100%", padding: "10px 16px 10px 22px",
        background: isActive ? "transparent" : hovered ? "#F8FAFC" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
        transition: "background-color 150ms ease-out",
      }}
    >
      {isActive && (
        <motion.div
          layoutId="nav-active-highlight"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          style={{
            position: "absolute", inset: 0,
            background: "#EEF3FB", borderLeft: "3px solid #4472C4",
          }}
        />
      )}
      <Icon
        size={17} strokeWidth={2} style={{
          position: "relative", flexShrink: 0,
          color: isActive ? "#1E3A8A" : "#64748B",
          transition: "color 150ms ease-out",
        }}
      />
      <span style={{
        position: "relative", fontSize: 14,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? "#1E3A8A" : "#334155",
        transition: "color 150ms ease-out",
      }}>
        {label}
      </span>
    </button>
  );
}

function SidebarSourceProgress({
  icon: Icon, label, detail, percentUsed, status, daysRemaining, onClick,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  percentUsed: number;
  status?: string;
  daysRemaining: number;
  onClick: () => void;
}) {
  const color = usageColor(percentUsed, status);
  const missing = status === "missing";
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:"block", width:"calc(100% - 20px)", margin:"0 10px 8px", padding:"10px 12px",
        background:"#F8FAFC", border:`1px solid ${hovered ? "#CBD5E1" : "#E2E8F0"}`, borderRadius:10,
        cursor:"pointer", textAlign:"left", color:"#475569",
        transition:"border-color 150ms ease-out, box-shadow 150ms ease-out",
        boxShadow: hovered ? "0 2px 8px rgba(15,23,42,0.06)" : "none",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <Icon size={15} strokeWidth={2} style={{ color:"#64748B", flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:700, color:"#1E3A8A", flex:1 }}>{label}</span>
        <span style={{ fontSize:10.5, fontWeight:800, color }}>{missing ? "Missing" : `${percentUsed}%`}</span>
      </div>
      <div style={{ height:6, background:"#E2E8F0", borderRadius:99, overflow:"hidden", margin:"7px 0 5px" }}>
        <motion.div
          initial={false}
          animate={{ width: `${missing ? 100 : Math.min(100, percentUsed)}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ height:"100%", background:color, borderRadius:99 }}
        />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", gap:6, fontSize:10.5, color:"#94A3B8" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{detail}</span>
        {!missing && <span style={{ flexShrink:0 }}>{daysRemaining}d left</span>}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// Layout: [framer sidebar hover-expand] [slide-in form panel] [Miro canvas]
// ---------------------------------------------------------------------------

export default function Home() {
  const [data, setData]           = useState<BulletinData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [saving, setSaving]       = useState(false);
  const [savedMsg, setSavedMsg]   = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [generationNotice, setGenerationNotice] = useState("");

  const [mgmt, setMgmt]           = useState<ManageData | null>(null);
  const [uploadTarget, setUploadTarget] = useState<null | "reading" | "schedule">(null);

  // Canvas refs — transform applied directly to DOM for smooth drag perf
  const canvasRef   = useRef<HTMLDivElement>(null);
  const pdfDivRef   = useRef<HTMLDivElement>(null);
  const transformRef = useRef({ x: 0, y: 0, z: 0.5 });
  const dragging    = useRef(false);
  const dragOrigin  = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const initialized = useRef(false);

  const [exporting, setExporting]     = useState(false);
  const [exportError, setExportError] = useState("");
  const [canvasMode, setCanvasMode]   = useState<CanvasMode>("grab");
  const spaceHeld    = useRef(false);
  const canvasModeRef = useRef<CanvasMode>("grab");

  // Two-layer transform: outer div pans via translate, inner div zooms via CSS zoom.
  // CSS zoom re-rasterizes at the display size → crisp text (vs transform:scale which blurs).
  const pdfPanRef  = useRef<HTMLDivElement>(null);
  const pdfZoomRef = useRef<HTMLDivElement>(null);

  const applyTransform = useCallback((x: number, y: number, z: number, animate = false) => {
    transformRef.current = { x, y, z };
    const pan  = pdfPanRef.current;
    const zoom = pdfZoomRef.current;
    if (!pan || !zoom) return;
    const easing = "cubic-bezier(0.4,0,0.2,1)";
    pan.style.transition  = animate ? `transform 0.42s ${easing}` : "none";
    zoom.style.transition = animate ? `zoom 0.42s ${easing}` : "none";
    pan.style.transform   = `translate(${x}px,${y}px)`;
    zoom.style.zoom       = String(z);
  }, []);

  // Load bulletin
  useEffect(() => {
    fetch("/api/bulletin")
      .then((r) => r.json())
      .then(async (bulletin) => {
        if (bulletin.date) {
          try {
            const res = await fetch(`/api/auto-populate?date=${encodeURIComponent(bulletin.date)}`);
            if (res.ok) {
              const { dates, reading1, reading2 } = await res.json();
              bulletin.bibleReadingDates = dates;
              bulletin.bibleReading1     = reading1;
              bulletin.bibleReading2     = reading2;
            }
          } catch {}
        }
        setData(bulletin);
        const [calendarMonth, calendarYear] = String(bulletin.calendarMonth ?? "").split("/").map(Number);
        const initialMonth = calendarMonth && calendarYear
          ? `${calendarYear}-${String(calendarMonth).padStart(2, "0")}`
          : monthFromBulletinDate(bulletin.date ?? "");
        if (initialMonth) {
          setSelectedMonth(initialMonth);
          const [month, day, year] = String(bulletin.date).split("/").map(Number);
          const selectedDate = new Date(year, month - 1, day);
          const sunday = addLocalDays(selectedDate, -selectedDate.getDay());
          const weekIndex = getBulletinWeeks(initialMonth)
            .findIndex((week) => week.startIso === localIso(sunday));
          setSelectedWeekIndex(Math.max(0, weekIndex));
        }
      });
  }, []);

  // Load auto-fill management data
  const loadMgmt = useCallback(async () => {
    try {
      const r = await fetch("/api/manage");
      if (r.ok) setMgmt(await r.json());
    } catch {}
  }, []);
  useEffect(() => { loadMgmt(); }, [loadMgmt]);

  const fitToScreen = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const totalH = PAGE_H * 2 + 4;
    const z = Math.min(el.clientWidth / (PAGE_W + 40), el.clientHeight / (totalH + 40)) * 0.90;
    applyTransform((el.clientWidth - PAGE_W * z) / 2, Math.max(16, (el.clientHeight - totalH * z) / 2), z, true);
  }, [applyTransform]);

  // Initialize PDF canvas to fit both pages after data loads
  useEffect(() => {
    if (!data || initialized.current) return;
    fitToScreen();
    initialized.current = true;
  }, [data, fitToScreen]);

  // Non-passive wheel listener for zoom-toward-cursor
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y, z } = transformRef.current;
      const factor = e.deltaY < 0 ? 1.08 : 0.925;
      const newZ = Math.min(4, Math.max(0.1, z * factor));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // With CSS zoom, pan coords are in un-zoomed space, so math is identical to scale()
      applyTransform(mx - (mx - x) * (newZ / z), my - (my - y) * (newZ / z), newZ);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyTransform]);

  // Sync mode ref whenever state changes + update cursor
  useEffect(() => {
    canvasModeRef.current = canvasMode;
    const el = canvasRef.current;
    if (el && !dragging.current) {
      el.style.cursor = canvasMode === "grab" ? "grab" : canvasMode === "zoom" ? "zoom-in" : "default";
    }
  }, [canvasMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editing = target.tagName === "INPUT" || target.tagName === "TEXTAREA"
        || target.tagName === "SELECT" || target.isContentEditable;

      if (e.key === "Escape") { setActiveTab(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        fitToScreen();
      }

      if (editing) return;
      if (e.code === "Space" && !e.repeat) {
        spaceHeld.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "v" || e.key === "V") setCanvasMode("select");
        if (e.key === "h" || e.key === "H") setCanvasMode("grab");
        if (e.key === "z" || e.key === "Z") setCanvasMode("zoom");
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        const m = canvasModeRef.current;
        if (canvasRef.current && !dragging.current) {
          canvasRef.current.style.cursor = m === "grab" ? "grab" : m === "zoom" ? "zoom-in" : "default";
        }
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", upHandler);
    };
  }, [applyTransform, fitToScreen]);

  const patch = useCallback((p: Partial<BulletinData>) => {
    setData((prev) => (prev ? { ...prev, ...p } : prev));
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const res = await fetch("/api/bulletin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSavedMsg(res.ok ? "Saved!" : "Error saving");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const handleGenerateWeek = async () => {
    const week = getBulletinWeeks(selectedMonth)[selectedWeekIndex];
    if (!week) return;

    setGeneratingWeek(true);
    setGenerationNotice("");
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = `${String(week.start.getMonth() + 1).padStart(2, "0")}/${String(week.start.getDate()).padStart(2, "0")}/${week.start.getFullYear()}`;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = localIso(new Date(year, month, 0));
    const calendarBanners = (schedule?.events ?? [])
      .filter((event) => event.endDate >= monthStart && event.startDate <= monthEnd)
      .map((event) => {
        const [, startMonth, startDay] = event.startDate.split("-").map(Number);
        const [, endMonth, endDay] = event.endDate.split("-").map(Number);
        return {
          label: event.label,
          startDate: `${startMonth}/${startDay}`,
          endDate: `${endMonth}/${endDay}`,
        };
      });

    const nextPatch: Partial<BulletinData> = {
      date,
      calendarMonth: `${String(month).padStart(2, "0")}/${year}`,
      calendarBanners,
    };

    try {
      const res = await fetch(`/api/auto-populate?date=${encodeURIComponent(date)}`);
      if (res.ok) {
        const result = await res.json();
        nextPatch.bibleReadingDates = result.dates;
        nextPatch.bibleReading1 = result.reading1;
        nextPatch.bibleReading2 = result.reading2;
        setGenerationNotice(result.complete === false
          ? "Week generated, but some Bible-reading dates are outside the loaded plan."
          : "Bulletin week generated from the available auto-fill data.");
      } else {
        setGenerationNotice("Date generated. Bible-reading data is unavailable for this week.");
      }
    } catch {
      setGenerationNotice("Date generated. Bible-reading data could not be loaded.");
    } finally {
      patch(nextPatch);
      setGeneratingWeek(false);
    }
  };

  async function exportPDF() {
    setExporting(true);
    setExportError("");
    try {
      const res = await fetch("/api/export-pdf");
      if (!res.ok) {
        const result = await res.json();
        setExportError(`Export failed: ${result.error ?? "unknown"}`);
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `bulletin-${data?.number ?? "draft"}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  const refreshBulletin = async () => {
    const bulletin = await fetch("/api/bulletin").then((r) => r.json());
    if (bulletin.date) {
      try {
        const res = await fetch(`/api/auto-populate?date=${encodeURIComponent(bulletin.date)}`);
        if (res.ok) {
          const { dates, reading1, reading2 } = await res.json();
          bulletin.bibleReadingDates = dates;
          bulletin.bibleReading1     = reading1;
          bulletin.bibleReading2     = reading2;
        }
      } catch {}
    }
    setData(bulletin);
    loadMgmt();
  };

  function handleSectionClick(id: TabId) {
    setActiveTab((prev) => prev === id ? null : id);
    // Zoom canvas to section center
    const target = SECTION_ZOOM[id];
    const el = canvasRef.current;
    if (!el) return;
    const cW = el.clientWidth, cH = el.clientHeight;
    const targetZ = Math.min(Math.max((cH * 0.60) / target.h, 0.35), 2.8);
    applyTransform(cW / 2 - target.cx * targetZ, cH / 2 - target.cy * targetZ, targetZ, true);
  }

  // Drag / zoom / select handlers — behaviour depends on canvasMode
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const effective = spaceHeld.current ? "grab" : canvasModeRef.current;
    if (effective === "grab") {
      dragging.current = true;
      dragOrigin.current = { mx: e.clientX, my: e.clientY, tx: transformRef.current.x, ty: transformRef.current.y };
      (e.currentTarget as HTMLDivElement).style.cursor = "grabbing";
    } else if (effective === "zoom") {
      const { x, y, z } = transformRef.current;
      const factor = e.altKey ? 1 / 1.3 : 1.3;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const newZ = Math.min(4, Math.max(0.1, z * factor));
      applyTransform(mx - (mx - x) * (newZ / z), my - (my - y) * (newZ / z), newZ, true);
      e.preventDefault();
    }
    // select mode: do nothing — let clicks propagate to BulletinPreview
  }
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const { mx, my, tx, ty } = dragOrigin.current;
    applyTransform(tx + e.clientX - mx, ty + e.clientY - my, transformRef.current.z);
  }
  function onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    dragging.current = false;
    const m = spaceHeld.current ? "grab" : canvasModeRef.current;
    (e.currentTarget as HTMLDivElement).style.cursor =
      m === "grab" ? "grab" : m === "zoom" ? "zoom-in" : "default";
  }

  const reading  = mgmt?.readingSources?.[0];
  const schedule = mgmt?.scheduleSrc;
  const bulletinWeeks = getBulletinWeeks(selectedMonth);
  const selectedWeek = bulletinWeeks[selectedWeekIndex] ?? bulletinWeeks[0];
  const coverageEnds = [
    reading?.autoEnabled && reading.endDate ? reading.endDate : null,
    schedule?.planFile && schedule.endDate ? schedule.endDate : null,
  ].filter((value): value is string => Boolean(value)).sort();
  const fullAutoFillEnd = coverageEnds[0] ?? null;
  const [selectedYear, selectedMonthNumber] = selectedMonth.split("-").map(Number);
  const selectedMonthStart = selectedYear && selectedMonthNumber
    ? `${selectedYear}-${String(selectedMonthNumber).padStart(2, "0")}-01`
    : "";
  const selectedMonthEnd = selectedYear && selectedMonthNumber
    ? localIso(new Date(selectedYear, selectedMonthNumber, 0))
    : "";
  const readingReady = Boolean(
    selectedWeek && reading?.startDate && reading.endDate &&
    selectedWeek.startIso >= reading.startDate && selectedWeek.endIso <= reading.endDate
  );
  const scheduleReady = Boolean(
    selectedMonthStart && selectedMonthEnd && schedule?.startDate && schedule.endDate &&
    selectedMonthStart >= schedule.startDate && selectedMonthEnd <= schedule.endDate
  );
  const lowSources = [
    reading && (reading.percentUsed >= 75 || reading.status === "warning" || reading.status === "expired")
      ? `Reading plan: ${reading.daysRemaining} days left` : null,
    schedule && (schedule.percentUsed >= 75 || schedule.status === "warning" || schedule.status === "expired")
      ? `Schedule: ${schedule.daysRemaining} days left` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {uploadTarget && (
        <UploadModal
          name={uploadTarget === "reading" ? "Year Reading Plan" : "Monthly Schedule"}
          uploadType={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSaved={() => { setUploadTarget(null); refreshBulletin(); }}
        />
      )}

      {/* ── Figma-style layers sidebar (always visible) ── */}
      <div style={{
        width: 264, flexShrink: 0, height: "100%",
        background: "#fff",
        borderRight: "1px solid #E2E8F0",
        display: "flex", flexDirection: "column",
        overflow: "hidden", zIndex: 30,
      }}>
        {/* Logo header */}
        <div style={{ flexShrink: 0, height: 60, borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", padding: "0 16px", gap: 11 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#1E3A8A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>NEW YORK CHURCH</div>
            <div style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap" }}>Bulletin Editor</div>
          </div>
        </div>

        {/* Layers nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0", scrollbarWidth: "none" }}>

          {/* Bulletin date generator */}
          <div style={{ padding:"4px 12px 12px", borderBottom:"1px solid #F1F5F9", marginBottom:7 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:10.5, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                Bulletin date
              </span>
              <span style={{ fontSize:11, fontWeight:700, color:"#1E3A8A" }}>{data?.date ?? "—"}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:7 }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSelectedWeekIndex(0);
                  setGenerationNotice("");
                }}
                style={{
                  width:"100%", minWidth:0, padding:"8px 9px", borderRadius:8,
                  border:"1px solid #CBD5E1", background:"#fff", color:"#1E3A8A",
                  fontSize:12.5, fontWeight:700, outline:"none",
                  transition:"border-color 150ms ease-out, box-shadow 150ms ease-out",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#4472C4"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,114,196,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <select
                value={selectedWeekIndex}
                onChange={(event) => {
                  setSelectedWeekIndex(Number(event.target.value));
                  setGenerationNotice("");
                }}
                disabled={!bulletinWeeks.length}
                style={{
                  width:"100%", minWidth:0, padding:"8px 9px", borderRadius:8,
                  border:"1px solid #CBD5E1", background:"#fff", color:"#1E3A8A",
                  fontSize:12.5, fontWeight:700, outline:"none",
                  transition:"border-color 150ms ease-out, box-shadow 150ms ease-out",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#4472C4"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,114,196,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {bulletinWeeks.map((week, index) => (
                  <option key={week.startIso} value={index}>{week.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop:8, padding:"8px 9px", borderRadius:8, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
              <div style={{ fontSize:10.5, color:"#64748B", lineHeight:1.4 }}>
                Full auto-fill through{" "}
                <strong style={{ color:fullAutoFillEnd ? "#1E3A8A" : "#DC2626" }}>
                  {displayCoverageDate(fullAutoFillEnd)}
                </strong>
              </div>
              {selectedWeek && (
                <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                  <span style={{
                    display:"inline-flex", alignItems:"center", gap:4,
                    fontSize:10, fontWeight:700, color:readingReady ? "#15803D" : "#C2410C",
                  }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:readingReady ? "#16A34A" : "#EA580C", flexShrink:0 }} />
                    {readingReady ? "Reading ready" : "Reading partial"}
                  </span>
                  <span style={{
                    display:"inline-flex", alignItems:"center", gap:4,
                    fontSize:10, fontWeight:700, color:scheduleReady ? "#15803D" : "#C2410C",
                  }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:scheduleReady ? "#16A34A" : "#EA580C", flexShrink:0 }} />
                    {scheduleReady ? "Schedule ready" : "Schedule partial"}
                  </span>
                </div>
              )}
            </div>

            {lowSources.length > 0 && (
              <div style={{ marginTop:7, padding:"7px 9px", borderRadius:8, background:"#FFF7ED", border:"1px solid #FED7AA" }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:"#C2410C", marginBottom:2 }}>Data running low</div>
                {lowSources.map((message) => (
                  <div key={message} style={{ fontSize:10, color:"#9A3412", lineHeight:1.4 }}>{message}</div>
                ))}
              </div>
            )}

            <motion.button
              onClick={handleGenerateWeek}
              disabled={!selectedWeek || generatingWeek}
              whileHover={selectedWeek && !generatingWeek ? { scale: 1.015 } : undefined}
              whileTap={selectedWeek && !generatingWeek ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                width:"100%", marginTop:8, padding:"9px 10px", borderRadius:8,
                background:"#1E3A8A", color:"#fff", border:0,
                fontSize:12.5, fontWeight:800, cursor:selectedWeek && !generatingWeek ? "pointer" : "not-allowed",
                opacity:selectedWeek && !generatingWeek ? 1 : 0.5,
              }}
            >
              {generatingWeek ? "Generating…" : "Generate selected week"}
            </motion.button>
            <AnimatePresence>
              {generationNotice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ marginTop:6, fontSize:10.5, lineHeight:1.4, color:generationNotice.includes("unavailable") || generationNotice.includes("outside") ? "#C2410C" : "#15803D" }}
                >
                  {generationNotice}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Page 1 group ── */}
          <div style={{ padding: "8px 16px 4px", fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Page 1
          </div>
          {SECTIONS.filter((sec) => sec.page === 1).map((sec) => (
            <NavItem
              key={sec.id}
              icon={sec.icon}
              label={sec.label}
              isActive={activeTab === sec.id}
              onClick={() => handleSectionClick(sec.id)}
            />
          ))}

          {/* ── Page 2 group ── */}
          <div style={{ padding: "12px 16px 4px", fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Page 2
          </div>
          {SECTIONS.filter((sec) => sec.page === 2).map((sec) => (
            <div key={sec.id}>
              <NavItem
                icon={sec.icon}
                label={sec.label}
                isActive={activeTab === sec.id}
                onClick={() => handleSectionClick(sec.id)}
              />
              {sec.id === "calendar" && activeTab === "calendar" && data && (
                <RecurringEventsSidebarPanel data={data} set={patch} />
              )}
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: "#F1F5F9", margin: "12px 0" }} />

          {/* ── Auto-fill group ── */}
          <div style={{ padding: "0 16px 6px", fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Auto-fill
          </div>
          <SidebarSourceProgress
            icon={BookMarked}
            label="Reading Plan"
            detail={reading?.endDate ? `Through ${displayCoverageDate(reading.endDate)}` : "Upload a reading plan"}
            percentUsed={reading?.percentUsed ?? 100}
            status={reading?.status ?? "missing"}
            daysRemaining={reading?.daysRemaining ?? 0}
            onClick={() => setUploadTarget("reading")}
          />
          <SidebarSourceProgress
            icon={CalendarRange}
            label={schedule?.quarter ?? "Schedule"}
            detail={schedule?.endDate ? `Through ${displayCoverageDate(schedule.endDate)}` : "Upload a schedule"}
            percentUsed={schedule?.percentUsed ?? 100}
            status={schedule?.status ?? "missing"}
            daysRemaining={schedule?.daysRemaining ?? 0}
            onClick={() => setUploadTarget("schedule")}
          />
          <div style={{ padding:"0 13px 6px", fontSize:9.5, color:"#94A3B8", lineHeight:1.4 }}>
            Usage: <span style={{ color:"#16A34A", fontWeight:700 }}>green</span> → <span style={{ color:"#D6A400", fontWeight:700 }}>yellow</span> → <span style={{ color:"#EA580C", fontWeight:700 }}>orange</span> → <span style={{ color:"#DC2626", fontWeight:700 }}>red</span>
          </div>
        </nav>

        {/* Footer: save */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #F1F5F9", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <motion.button
            onClick={save}
            disabled={saving || !data}
            whileHover={!saving && data ? { scale: 1.015 } : undefined}
            whileTap={!saving && data ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "11px 10px", borderRadius: 8, background: "#1E3A8A", color: "#fff", border: "none", cursor: "pointer", opacity: saving || !data ? 0.5 : 1 }}
          >
            <SaveIcon size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              {savedMsg || (saving ? "Saving…" : "Save")}
            </span>
          </motion.button>
        </div>
      </div>

      {/* ── PDF canvas — Miro-like pan & zoom ── */}
      <div
        ref={canvasRef}
        style={{ flex: 1, minWidth: 0, height: "100%", background: "#1C1C2B", overflow: "hidden", position: "relative", cursor: canvasMode === "grab" ? "grab" : canvasMode === "zoom" ? "zoom-in" : "default", userSelect: canvasMode === "select" ? "auto" : "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {data ? (
          /* Pan layer — translate only */
          <div ref={pdfPanRef} style={{ position: "absolute", left: 0, top: 0, willChange: "transform" }}>
            {/* Zoom layer — CSS zoom for crisp text re-rasterize */}
            <div ref={pdfZoomRef} style={{ width: PAGE_W, transformOrigin: "0 0" }}>
              <BulletinPreview data={data} onUpdate={patch} />
              <BulletinFitController fitKey={JSON.stringify(data)} />
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: "50%", border: "2.5px solid #3A3A52", borderTopColor: "#4472C4", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        <FloatingToolbar mode={canvasMode} onMode={setCanvasMode} onFit={fitToScreen} onExport={exportPDF} exporting={exporting} disabled={!data} />
        {exportError && (
          <div style={{ position: "absolute", bottom: 80, right: 16, fontSize: 11, color: "#F87171", background: "#2A1A1A", border: "1px solid #7F1D1D", borderRadius: 6, padding: "5px 10px", pointerEvents: "all" }}>
            {exportError}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
