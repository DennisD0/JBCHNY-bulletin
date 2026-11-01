"use client";

import { useState } from "react";
import type { BulletinData, CleaningRow, SeminarServiceData } from "@/lib/bulletin-types";
import { Field, SectionTitle, Card, AddBtn, RemoveBtn } from "@/app/components/editor/ui";

export const DEFAULT_SEMINAR_SERVICE_ROWS = [
  { label: "USHER",        cells: ["", "", "", "", "", ""], merged: false },
  { label: "DINNER\nPREP", cells: ["", "", "", "", "", ""], merged: false },
  { label: "DINNER\nDUTY", cells: ["", "", "", "", "", ""], merged: false },
  { label: "CHILD\nCARE",  cells: ["", "", "", "", "", ""], merged: false },
  { label: "CLEAN\nUP",    cells: [""],                     merged: true  },
];

export const DEFAULT_SEMINAR_SERVICE_DAYS = [
  "MON\n(7/13)", "TUE\n(7/14)", "WED\n(7/15)",
  "THU\n(7/16)", "FRI\n(7/17)", "SAT\n(7/18)",
];

export function SeminarServicePanel({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const ss: SeminarServiceData = data.seminarService ?? {
    enabled: false,
    days: DEFAULT_SEMINAR_SERVICE_DAYS,
    rows: DEFAULT_SEMINAR_SERVICE_ROWS,
  };
  const setSS = (patch: Partial<SeminarServiceData>) =>
    set({ seminarService: { ...ss, ...patch } });

  const dayCount = ss.days.length;

  const [activeDay, setActiveDay] = useState(0);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ss.enabled ? 12 : 0 }}>
        <SectionTitle>Bible Seminar Service</SectionTitle>
        <button
          onClick={() => {
            const next = !ss.enabled;
            setSS({ enabled: next });
            if (next) set({ retreatInfo: { ...(data.retreatInfo ?? { title:"", date:"", location:"", fees:[] }), enabled: false } });
          }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 700,
            color: ss.enabled ? "#fff" : "#4472C4",
            background: ss.enabled ? "#4472C4" : "#EFF6FF",
            border: `1px solid ${ss.enabled ? "#4472C4" : "#BFDBFE"}`,
            borderRadius: 6, padding: "4px 10px", cursor: "pointer", flexShrink: 0,
          }}
        >
          {ss.enabled ? "Hide" : "Show"}
        </button>
      </div>

      {ss.enabled && (
        <div className="flex flex-col gap-3">
          {/* Day tabs */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {ss.days.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: activeDay === i ? "#4472C4" : "#F1F5F9",
                  color: activeDay === i ? "#fff" : "#475569",
                  border: `1px solid ${activeDay === i ? "#4472C4" : "#CBD5E1"}`,
                  whiteSpace: "pre-line", textAlign: "center", lineHeight: 1.2,
                }}
              >
                {d.replace("\n", "\n")}
              </button>
            ))}
          </div>

          {/* Day label editor */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>Day label:</span>
            <input
              value={ss.days[activeDay] ?? ""}
              onChange={(e) => setSS({ days: ss.days.map((x, j) => j === activeDay ? e.target.value : x) })}
              className="flex-1 text-sm border border-blue-200 rounded-lg px-2 py-1 bg-blue-50 focus:outline-none focus:border-blue-400"
              placeholder="e.g. MON&#10;(7/13)"
            />
          </div>

          {/* Row inputs for active day */}
          <div className="flex flex-col gap-2">
            {ss.rows.map((row, ri) => (
              <div key={ri} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px" }}>
                {/* Row label + merge toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <input
                    value={row.label}
                    onChange={(e) => setSS({ rows: ss.rows.map((r, j) => j === ri ? { ...r, label: e.target.value } : r) })}
                    className="text-xs font-bold text-blue-700 bg-transparent border-none focus:outline-none focus:bg-blue-50 rounded px-1 w-24"
                    placeholder="Role"
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94A3B8", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!row.merged}
                      onChange={(e) => setSS({ rows: ss.rows.map((r, j) => j === ri ? { ...r, merged: e.target.checked, cells: e.target.checked ? [r.cells[0] ?? ""] : Array(dayCount).fill("") } : r) })}
                      className="cursor-pointer accent-blue-600"
                    />
                    All days same
                  </label>
                </div>
                {/* Input */}
                {row.merged ? (
                  <textarea
                    value={row.cells[0] ?? ""}
                    rows={2}
                    onChange={(e) => setSS({ rows: ss.rows.map((r, j) => j === ri ? { ...r, cells: [e.target.value] } : r) })}
                    className="w-full text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-amber-400"
                    placeholder="Same person(s) every day"
                    style={{ lineHeight: 1.5 }}
                  />
                ) : (
                  <textarea
                    value={row.cells[activeDay] ?? ""}
                    rows={2}
                    onChange={(e) => setSS({ rows: ss.rows.map((r, j) => j === ri ? { ...r, cells: r.cells.map((c, k) => k === activeDay ? e.target.value : c) } : r) })}
                    className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-400"
                    placeholder="Name(s) — one per line"
                    style={{ lineHeight: 1.5 }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSS({ rows: [...ss.rows, { label: "NEW ROLE", cells: Array(dayCount).fill(""), merged: false }] })}
              className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs text-blue-700 font-bold hover:bg-blue-100"
            >
              + Add row
            </button>
            {ss.rows.length > 1 && (
              <button
                onClick={() => setSS({ rows: ss.rows.slice(0, -1) })}
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-600 font-bold hover:bg-red-100"
              >
                − Remove last row
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sidebar panel: Retreat Info
// ---------------------------------------------------------------------------

export function RetreatInfoPanel({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
}) {
  const defaultFees = [
    { label: "Adult (13+)", amount: "$200" },
    { label: "Senior (70+)", amount: "$100" },
    { label: "Ages 7-12", amount: "$100" },
    { label: "Under 6 / Prospect", amount: "FREE" },
  ];
  const retreat = data.retreatInfo ?? { enabled: false, title: "", date: "", location: "", fees: defaultFees };
  const fees = retreat.fees ?? defaultFees;
  const setRetreat = (patch: Partial<typeof retreat>) =>
    set({ retreatInfo: { ...retreat, ...patch } });
  const setFee = (i: number, field: "label" | "amount", v: string) =>
    setRetreat({ fees: fees.map((f, x) => (x === i ? { ...f, [field]: v } : f)) });

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: retreat.enabled ? 12 : 0 }}>
        <SectionTitle>Retreat Info</SectionTitle>
        <button
          onClick={() => {
            const next = !retreat.enabled;
            setRetreat({ enabled: next });
            if (next && data.seminarService?.enabled) set({ seminarService: { ...data.seminarService, enabled: false } });
          }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 700,
            color: retreat.enabled ? "#fff" : "#4472C4",
            background: retreat.enabled ? "#4472C4" : "#EFF6FF",
            border: `1px solid ${retreat.enabled ? "#4472C4" : "#BFDBFE"}`,
            borderRadius: 6, padding: "4px 10px", cursor: "pointer", flexShrink: 0,
          }}
        >
          {retreat.enabled ? "Hide" : "Show"}
        </button>
      </div>
      {retreat.enabled && (
        <div className="flex flex-col gap-3">
          <Field label="Title" value={retreat.title} onChange={(v) => setRetreat({ title: v })} />
          <Field label="Date" value={retreat.date} onChange={(v) => setRetreat({ date: v })} />
          <Field label="Location" value={retreat.location} onChange={(v) => setRetreat({ location: v })} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Fee Tiers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {fees.map((fee, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    value={fee.label}
                    onChange={(e) => setFee(i, "label", e.target.value)}
                    placeholder="Category"
                    style={{ flex: 3, fontSize: 12, padding: "5px 8px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#FAFAFA" }}
                  />
                  <input
                    value={fee.amount}
                    onChange={(e) => setFee(i, "amount", e.target.value)}
                    placeholder="Amount"
                    style={{ flex: 1, fontSize: 12, padding: "5px 8px", border: "1px solid #E2E8F0", borderRadius: 6, background: "#FAFAFA" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Cleaning
// ---------------------------------------------------------------------------

export function CleaningTab({
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
