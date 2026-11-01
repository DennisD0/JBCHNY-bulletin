"use client";

import { useState } from "react";
import type { BulletinData, WeekScheduleDay, WeekScheduleItem, CalendarBanner } from "@/lib/bulletin-types";
import { Field, SectionTitle, Card, AddBtn, RemoveBtn } from "@/app/components/editor/ui";
import { RecurringEventAdder } from "@/app/components/editor/SidebarPanels";

export function CalendarTab({
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
              className="w-28 shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              placeholder="Event name"
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEvent()}
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={addEvent}
              className="shrink-0 rounded-xl bg-blue-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Add
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Spanning events (banners)</SectionTitle>
        <p className="text-[11px] text-stone-400 -mt-2">
          Blue boxes that span a date range in the calendar — retreats, seminars, camps, etc.
        </p>
        {data.calendarBanners.map((banner, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
            style={{ borderLeftWidth: 3, borderLeftColor: "#4472C4" }}
          >
            <div className="flex-1 flex flex-col gap-2">
              <Field
                label="Event name"
                value={banner.label}
                onChange={(v) => updateBanner(i, { label: v })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Start (M/D)"
                  value={banner.startDate}
                  onChange={(v) => updateBanner(i, { startDate: v })}
                />
                <Field
                  label="End (M/D)"
                  value={banner.endDate}
                  onChange={(v) => updateBanner(i, { endDate: v })}
                />
              </div>
            </div>
            <RemoveBtn
              onClick={() =>
                set({ calendarBanners: data.calendarBanners.filter((_, idx) => idx !== i) })
              }
            />
          </div>
        ))}
        <AddBtn
          onClick={() =>
            set({
              calendarBanners: [
                ...data.calendarBanners,
                { label: "", startDate: "", endDate: "", type: "retreat" },
              ],
            })
          }
          label="Add banner"
        />
      </Card>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Bible Seminar Info
// ---------------------------------------------------------------------------

export function SeminarInfoPanel({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const info = data.seminarInfo;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: info.hidden ? 0 : 12 }}>
        <SectionTitle>Bible Seminar info</SectionTitle>
        <button
          onClick={() => set({ seminarInfo: { ...info, hidden: !info.hidden } })}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 700,
            color: info.hidden ? "#4472C4" : "#fff",
            background: info.hidden ? "#EFF6FF" : "#4472C4",
            border: `1px solid ${info.hidden ? "#BFDBFE" : "#4472C4"}`,
            borderRadius: 6, padding: "4px 10px", cursor: "pointer", flexShrink: 0,
          }}
        >
          {info.hidden ? "Show" : "Hide"}
        </button>
      </div>
      {!info.hidden && (
        <>
          <Field label="Title" value={info.title} onChange={(v) => set({ seminarInfo: { ...info, title: v } })} />
          <Field label="Date / time" value={info.date} onChange={(v) => set({ seminarInfo: { ...info, date: v } })} />
          <Field label="Speaker" value={info.speaker} onChange={(v) => set({ seminarInfo: { ...info, speaker: v } })} />
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Weekly Schedule
// ---------------------------------------------------------------------------

export function WeeklyScheduleTab({
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
// Tab: News — drag card sub-component (needs useDragControls at top level)
// ---------------------------------------------------------------------------
