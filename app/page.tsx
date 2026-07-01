"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const SECTIONS = [
  { id: "header",    label: "Header",          icon: "📋" },
  { id: "sermon",   label: "Sermon",           icon: "✝️" },
  { id: "services", label: "Services",         icon: "👥" },
  { id: "bible",    label: "Bible Reading",    icon: "📖" },
  { id: "memory",   label: "Memory Verses",    icon: "💭" },
  { id: "calendar", label: "Calendar",         icon: "📅" },
  { id: "schedule", label: "Weekly Schedule",  icon: "🗓️" },
  { id: "news",     label: "News",             icon: "📰" },
  { id: "prayer",   label: "Prayer",           icon: "🙏" },
  { id: "cleaning", label: "Cleaning",         icon: "🧹" },
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

function SidebarSourceProgress({
  icon, label, detail, percentUsed, status, daysRemaining, onClick,
}: {
  icon: string;
  label: string;
  detail: string;
  percentUsed: number;
  status?: string;
  daysRemaining: number;
  onClick: () => void;
}) {
  const color = usageColor(percentUsed, status);
  const missing = status === "missing";
  return (
    <button onClick={onClick} style={{
      display:"block", width:"calc(100% - 20px)", margin:"0 10px 7px", padding:"8px 10px",
      background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8,
      cursor:"pointer", textAlign:"left", color:"#475569",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ fontSize:13 }}>{icon}</span>
        <span style={{ fontSize:12, fontWeight:700, color:"#1E3A8A", flex:1 }}>{label}</span>
        <span style={{ fontSize:10, fontWeight:800, color }}>{missing ? "Missing" : `${percentUsed}%`}</span>
      </div>
      <div style={{ height:5, background:"#E2E8F0", borderRadius:99, overflow:"hidden", margin:"6px 0 4px" }}>
        <div style={{ height:"100%", width:`${missing ? 100 : Math.min(100, percentUsed)}%`, background:color, borderRadius:99 }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", gap:6, fontSize:9.5, color:"#94A3B8" }}>
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
              const { dates, reading1 } = await res.json();
              bulletin.bibleReadingDates = dates;
              bulletin.bibleReading1     = reading1;
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

  // Initialize PDF canvas to fit both pages after data loads
  useEffect(() => {
    if (!data || !canvasRef.current || !pdfPanRef.current || initialized.current) return;
    const el = canvasRef.current;
    const cW = el.clientWidth, cH = el.clientHeight;
    const totalH = PAGE_H * 2 + 4;
    const z = Math.min(cW / (PAGE_W + 40), cH / (totalH + 40)) * 0.90;
    applyTransform((cW - PAGE_W * z) / 2, Math.max(16, (cH - totalH * z) / 2), z);
    initialized.current = true;
  }, [data, applyTransform]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setActiveTab(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        const el = canvasRef.current;
        if (!el) return;
        const totalH = PAGE_H * 2 + 4;
        const z = Math.min(el.clientWidth / (PAGE_W + 40), el.clientHeight / (totalH + 40)) * 0.90;
        applyTransform((el.clientWidth - PAGE_W * z) / 2, Math.max(16, (el.clientHeight - totalH * z) / 2), z, true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [applyTransform]);

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
          const { dates, reading1 } = await res.json();
          bulletin.bibleReadingDates = dates;
          bulletin.bibleReading1     = reading1;
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

  // Drag handlers (pointer-based for performance)
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    dragging.current = true;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, tx: transformRef.current.x, ty: transformRef.current.y };
    (e.currentTarget as HTMLDivElement).style.cursor = "grabbing";
  }
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const { mx, my, tx, ty } = dragOrigin.current;
    applyTransform(tx + e.clientX - mx, ty + e.clientY - my, transformRef.current.z);
  }
  function onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    dragging.current = false;
    (e.currentTarget as HTMLDivElement).style.cursor = "grab";
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
        width: 240, flexShrink: 0, height: "100%",
        background: "#fff",
        borderRight: "1px solid #E2E8F0",
        display: "flex", flexDirection: "column",
        overflow: "hidden", zIndex: 30,
      }}>
        {/* Logo header */}
        <div style={{ flexShrink: 0, height: 52, borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", padding: "0 14px", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#1E3A8A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>NEW YORK CHURCH</div>
            <div style={{ fontSize: 10, color: "#94A3B8", whiteSpace: "nowrap" }}>Bulletin Editor</div>
          </div>
        </div>

        {/* Layers nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0", scrollbarWidth: "none" }}>

          {/* Bulletin date generator */}
          <div style={{ padding:"4px 10px 10px", borderBottom:"1px solid #F1F5F9", marginBottom:5 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
              <span style={{ fontSize:10, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                Bulletin date
              </span>
              <span style={{ fontSize:10, fontWeight:700, color:"#1E3A8A" }}>{data?.date ?? "—"}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:6 }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSelectedWeekIndex(0);
                  setGenerationNotice("");
                }}
                style={{
                  width:"100%", minWidth:0, padding:"6px 8px", borderRadius:7,
                  border:"1px solid #CBD5E1", background:"#fff", color:"#1E3A8A",
                  fontSize:11, fontWeight:700, outline:"none",
                }}
              />
              <select
                value={selectedWeekIndex}
                onChange={(event) => {
                  setSelectedWeekIndex(Number(event.target.value));
                  setGenerationNotice("");
                }}
                disabled={!bulletinWeeks.length}
                style={{
                  width:"100%", minWidth:0, padding:"6px 8px", borderRadius:7,
                  border:"1px solid #CBD5E1", background:"#fff", color:"#1E3A8A",
                  fontSize:11, fontWeight:700, outline:"none",
                }}
              >
                {bulletinWeeks.map((week, index) => (
                  <option key={week.startIso} value={index}>{week.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop:7, padding:"7px 8px", borderRadius:7, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
              <div style={{ fontSize:9.5, color:"#64748B", lineHeight:1.35 }}>
                Full auto-fill through{" "}
                <strong style={{ color:fullAutoFillEnd ? "#1E3A8A" : "#DC2626" }}>
                  {displayCoverageDate(fullAutoFillEnd)}
                </strong>
              </div>
              {selectedWeek && (
                <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:readingReady ? "#15803D" : "#C2410C" }}>
                    {readingReady ? "Reading ready" : "Reading partial"}
                  </span>
                  <span style={{ fontSize:9, fontWeight:700, color:scheduleReady ? "#15803D" : "#C2410C" }}>
                    {scheduleReady ? "Schedule ready" : "Schedule partial"}
                  </span>
                </div>
              )}
            </div>

            {lowSources.length > 0 && (
              <div style={{ marginTop:6, padding:"6px 8px", borderRadius:7, background:"#FFF7ED", border:"1px solid #FED7AA" }}>
                <div style={{ fontSize:9.5, fontWeight:800, color:"#C2410C", marginBottom:2 }}>Data running low</div>
                {lowSources.map((message) => (
                  <div key={message} style={{ fontSize:9, color:"#9A3412", lineHeight:1.35 }}>{message}</div>
                ))}
              </div>
            )}

            <button
              onClick={handleGenerateWeek}
              disabled={!selectedWeek || generatingWeek}
              style={{
                width:"100%", marginTop:7, padding:"7px 10px", borderRadius:7,
                background:"#1E3A8A", color:"#fff", border:0,
                fontSize:11, fontWeight:800, cursor:selectedWeek && !generatingWeek ? "pointer" : "not-allowed",
                opacity:selectedWeek && !generatingWeek ? 1 : 0.5,
              }}
            >
              {generatingWeek ? "Generating…" : "Generate selected week"}
            </button>
            {generationNotice && (
              <div style={{ marginTop:5, fontSize:9.5, lineHeight:1.35, color:generationNotice.includes("unavailable") || generationNotice.includes("outside") ? "#C2410C" : "#15803D" }}>
                {generationNotice}
              </div>
            )}
          </div>

          {/* ── Page 1 group ── */}
          <div style={{ padding: "6px 14px 3px", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Page 1
          </div>
          {([
            { id: "header",    label: "Header",        icon: "📋" },
            { id: "sermon",    label: "Sermon",         icon: "✝️" },
            { id: "services",  label: "Services",       icon: "👥" },
            { id: "bible",     label: "Bible Reading",  icon: "📖" },
            { id: "memory",    label: "Memory Verses",  icon: "💭" },
            { id: "cleaning",  label: "Cleaning",       icon: "🧹" },
          ] as { id: TabId; label: string; icon: string }[]).map((sec) => {
            const isActive = activeTab === sec.id;
            return (
              <button key={sec.id} onClick={() => handleSectionClick(sec.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "6px 14px 6px 26px",
                background: isActive ? "#EEF3FB" : "transparent",
                border: "none", borderLeft: `3px solid ${isActive ? "#4472C4" : "transparent"}`,
                cursor: "pointer", color: isActive ? "#1E3A8A" : "#475569",
                textAlign: "left",
              }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{sec.icon}</span>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400 }}>{sec.label}</span>
              </button>
            );
          })}

          {/* ── Page 2 group ── */}
          <div style={{ padding: "10px 14px 3px", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Page 2
          </div>
          {([
            { id: "calendar", label: "Calendar",        icon: "📅" },
            { id: "schedule", label: "Weekly Schedule", icon: "🗓️" },
            { id: "news",     label: "News",            icon: "📰" },
            { id: "prayer",   label: "Prayer",          icon: "🙏" },
          ] as { id: TabId; label: string; icon: string }[]).map((sec) => {
            const isActive = activeTab === sec.id;
            return (
              <button key={sec.id} onClick={() => handleSectionClick(sec.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "6px 14px 6px 26px",
                background: isActive ? "#EEF3FB" : "transparent",
                border: "none", borderLeft: `3px solid ${isActive ? "#4472C4" : "transparent"}`,
                cursor: "pointer", color: isActive ? "#1E3A8A" : "#475569",
                textAlign: "left",
              }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{sec.icon}</span>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400 }}>{sec.label}</span>
              </button>
            );
          })}

          {/* Divider */}
          <div style={{ height: 1, background: "#F1F5F9", margin: "10px 0" }} />

          {/* ── Auto-fill group ── */}
          <div style={{ padding: "0 14px 5px", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Auto-fill
          </div>
          <SidebarSourceProgress
            icon="📚"
            label="Reading Plan"
            detail={reading?.endDate ? `Through ${displayCoverageDate(reading.endDate)}` : "Upload a reading plan"}
            percentUsed={reading?.percentUsed ?? 100}
            status={reading?.status ?? "missing"}
            daysRemaining={reading?.daysRemaining ?? 0}
            onClick={() => setUploadTarget("reading")}
          />
          <SidebarSourceProgress
            icon="🗓️"
            label={schedule?.quarter ?? "Schedule"}
            detail={schedule?.endDate ? `Through ${displayCoverageDate(schedule.endDate)}` : "Upload a schedule"}
            percentUsed={schedule?.percentUsed ?? 100}
            status={schedule?.status ?? "missing"}
            daysRemaining={schedule?.daysRemaining ?? 0}
            onClick={() => setUploadTarget("schedule")}
          />
          <div style={{ padding:"0 12px 4px", fontSize:8.5, color:"#94A3B8", lineHeight:1.3 }}>
            Usage: <span style={{ color:"#16A34A" }}>green</span> → <span style={{ color:"#D6A400" }}>yellow</span> → <span style={{ color:"#EA580C" }}>orange</span> → <span style={{ color:"#DC2626" }}>red</span>
          </div>
        </nav>

        {/* Footer: save */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #F1F5F9", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={save} disabled={saving || !data} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 7, background: "#1E3A8A", color: "#fff", border: "none", cursor: "pointer", opacity: saving || !data ? 0.5 : 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              {savedMsg || (saving ? "Saving…" : "Save")}
            </span>
          </button>
        </div>
      </div>

      {/* ── PDF canvas — Miro-like pan & zoom ── */}
      <div
        ref={canvasRef}
        style={{ flex: 1, minWidth: 0, height: "100%", background: "#1C1C2B", overflow: "hidden", position: "relative", cursor: "grab", userSelect: "none" }}
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

        {/* Overlay controls */}
        <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", pointerEvents: "none" }}>
          <button
            onClick={exportPDF}
            disabled={exporting || !data}
            style={{ pointerEvents: "all", background: "#4472C4", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: exporting || !data ? "not-allowed" : "pointer", opacity: exporting || !data ? 0.5 : 1, boxShadow: "0 4px 16px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", gap: 8 }}
          >
            {exporting ? (
              <><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />Generating…</>
            ) : "Export PDF"}
          </button>
          <div style={{ fontSize: 10, color: "#444466", fontWeight: 600 }}>scroll to zoom · drag to pan · Ctrl+0 to fit · Esc to close panel</div>
          {exportError && (
            <div style={{ fontSize: 11, color: "#F87171", background: "#2A1A1A", border: "1px solid #7F1D1D", borderRadius: 6, padding: "5px 10px", pointerEvents: "all" }}>
              {exportError}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
