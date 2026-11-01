"use client";

import { ChevronRight } from "lucide-react";
import type { BulletinData, ServiceRow, FellowshipRow } from "@/lib/bulletin-types";
import { Field, SectionTitle, Card, AddBtn, RemoveBtn } from "@/app/components/editor/ui";

export function HeaderTab({
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
        <Field
          label="Bulletin title (front page)"
          value={data.bulletinTitle ?? "Church Bulletin"}
          onChange={(v) => set({ bulletinTitle: v })}
        />
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
        <Field
          label="Phone"
          value={data.phone}
          onChange={(v) => set({ phone: v })}
        />
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

export function SermonTab({
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

export function ServicesTab({
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

  const advanceWeek = () => {
    const blank: ServiceRow = { date: "", usherSun: "", lunchDuty: "", childCare: "", usherWed: "" };
    const promoted = data.services[1] ?? blank;
    const rest = data.services.slice(2);
    set({ services: [promoted, ...rest, blank] });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <SectionTitle>Weekly duty roster</SectionTitle>
          <button
            onClick={advanceWeek}
            title="Promote next week to current; add blank row at end"
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#4472C4", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "4px 9px", cursor: "pointer", flexShrink: 0 }}
          >
            <ChevronRight size={12} strokeWidth={2.5} />
            Advance week
          </button>
        </div>
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
        {(data.eastCoastSeminar ?? []).map((row, i) => (
          <div
            key={i}
            className="flex gap-2 items-start rounded-xl border border-stone-100 p-3"
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <Field
                label="Date"
                value={row.date}
                onChange={(v) => {
                  const rows = (data.eastCoastSeminar ?? []).map((r, idx) =>
                    idx === i ? { ...r, date: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
              <Field
                label="Church"
                value={row.church}
                onChange={(v) => {
                  const rows = (data.eastCoastSeminar ?? []).map((r, idx) =>
                    idx === i ? { ...r, church: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
              <Field
                label="Speaker"
                value={row.speaker}
                onChange={(v) => {
                  const rows = (data.eastCoastSeminar ?? []).map((r, idx) =>
                    idx === i ? { ...r, speaker: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
              <Field
                label="Language"
                value={row.language}
                onChange={(v) => {
                  const rows = (data.eastCoastSeminar ?? []).map((r, idx) =>
                    idx === i ? { ...r, language: v } : r
                  );
                  set({ eastCoastSeminar: rows });
                }}
              />
            </div>
            <RemoveBtn
              onClick={() =>
                set({
                  eastCoastSeminar: (data.eastCoastSeminar ?? []).filter(
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
                ...(data.eastCoastSeminar ?? []),
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

export function BibleReadingTab({
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
// Sidebar panel: Memory Verses automation
// ---------------------------------------------------------------------------
