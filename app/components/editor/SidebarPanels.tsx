"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import type { BulletinData } from "@/lib/bulletin-types";
import { type BulletinLanguage } from "@/lib/bulletin-languages";

export type VerseStats = {
  index: number;
  total: number;
  theme: string;
  themeKorean: string;
  hasApiKey: boolean;
  themeNumber: number;
  totalThemes: number;
  themeProgress: number;
  themeTotal: number;
  cachedCount: number;
  overallPct: number;
};

export function MemoryVersesSidebarPanel({
  data,
  set,
  lang,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
  lang: BulletinLanguage;
}) {
  const [stats, setStats] = useState<VerseStats | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollMsg, setRollMsg] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [offsetVerses, setOffsetVerses] = useState<typeof data.memoryVerses>([]);
  const [offsetLoading, setOffsetLoading] = useState(false);

  // Load stats once on mount / when date changes
  useEffect(() => {
    fetch(`/api/memory-verse?date=${encodeURIComponent(data.date)}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => json && setStats(json));
  }, [data.date]);

  const shiftWeek = useCallback(async (newOffset: number) => {
    setWeekOffset(newOffset);
    setExpandedWeek(null);
    if (newOffset === 0) return;
    setOffsetLoading(true);
    try {
      const parts = data.date.split("/").map(Number);
      const base = new Date(parts[2], parts[0] - 1, parts[1]);
      const shifted = new Date(base.getTime() + newOffset * 7 * 24 * 60 * 60 * 1000);
      const shiftedStr = `${shifted.getMonth() + 1}/${shifted.getDate()}/${shifted.getFullYear()}`;
      const res = await fetch("/api/memory-verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "roll", bulletinDate: shiftedStr, lang }),
      });
      if (res.ok) {
        const json = await res.json();
        setOffsetVerses(json.memoryVerses);
      }
    } finally {
      setOffsetLoading(false);
    }
  }, [data.date]);

  const roll = async () => {
    setRolling(true);
    setRollMsg(null);
    try {
      const res = await fetch("/api/memory-verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "roll", bulletinDate: data.date, lang }),
      });
      if (res.ok) {
        const json = await res.json();
        set({ memoryVerses: json.memoryVerses });
        setWeekOffset(0);
        setRollMsg("Filled!");
        // refresh stats
        fetch(`/api/memory-verse?date=${encodeURIComponent(data.date)}`)
          .then(r => r.ok ? r.json() : null)
          .then(json => json && setStats(json));
      } else {
        setRollMsg("Failed — check console");
      }
    } finally {
      setRolling(false);
      setTimeout(() => setRollMsg(null), 3000);
    }
  };

  const displayVerses = weekOffset === 0 ? data.memoryVerses : offsetVerses;

  const btnBase: React.CSSProperties = {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    height: 28, borderRadius: 6, fontSize: 11, fontWeight: 700,
    border: "1px solid #E2E8F0", cursor: "pointer",
  };

  return (
    <div style={{ margin: "0 10px 8px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 12px 10px", display: "flex", flexDirection: "column", gap: 9 }}>

      {/* ── Stats bar ─────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.07em", color: "#64748B", textTransform: "uppercase" }}>
            Memory Verse Auto-Fill
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {stats && <span style={{ fontSize: 10, color: "#94A3B8" }}>{stats.index + 1}/{stats.total}</span>}
            <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 99, background: "#DCFCE7", color: "#15803D" }}>NKJV</span>
          </div>
        </div>
        <div style={{ height: 5, background: "#E2E8F0", borderRadius: 99, overflow: "hidden", marginBottom: 5 }}>
          <motion.div
            initial={false}
            animate={{ width: `${stats?.overallPct ?? 0}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ height: "100%", background: "#4472C4", borderRadius: 99 }}
          />
        </div>
        {stats && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8" }}>
            <span>Theme {stats.themeNumber}/{stats.totalThemes} · {stats.theme} ({stats.themeProgress}/{stats.themeTotal})</span>
            <span style={{ flexShrink: 0, color: "#15803D" }}>{stats.cachedCount} cached</span>
          </div>
        )}
      </div>

      {/* ── Week navigation ───────────────────────── */}
      <div style={{ display: "flex", gap: 5 }}>
        <button
          onClick={() => shiftWeek(weekOffset - 1)}
          disabled={offsetLoading}
          style={{ ...btnBase, background: weekOffset < 0 ? "#1E3A8A" : "#fff", color: weekOffset < 0 ? "#fff" : "#64748B", borderColor: weekOffset < 0 ? "#1E3A8A" : "#E2E8F0" }}
        >
          <ChevronLeft size={12} />Last week
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => shiftWeek(0)}
            style={{ ...btnBase, flex: "none", width: 28, background: "#fff", color: "#4472C4", borderColor: "#BFDBFE" }}
            title="Back to current week"
          >
            ↺
          </button>
        )}
        <button
          onClick={() => shiftWeek(weekOffset + 1)}
          disabled={offsetLoading}
          style={{ ...btnBase, background: weekOffset > 0 ? "#1E3A8A" : "#fff", color: weekOffset > 0 ? "#fff" : "#64748B", borderColor: weekOffset > 0 ? "#1E3A8A" : "#E2E8F0" }}
        >
          Next week<ChevronRight size={12} />
        </button>
      </div>

      {/* Offset label */}
      {weekOffset !== 0 && (
        <div style={{ fontSize: 10, color: "#4472C4", fontWeight: 700, textAlign: "center", marginTop: -4 }}>
          {weekOffset < 0
            ? `${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? "s" : ""} earlier`
            : `${weekOffset} week${weekOffset > 1 ? "s" : ""} ahead`}
        </div>
      )}

      {/* ── 3-week cards ──────────────────────────── */}
      {offsetLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#94A3B8", fontSize: 11, padding: "10px 0" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid #BFDBFE", borderTopColor: "#4472C4", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          Loading…
        </div>
      ) : displayVerses.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {displayVerses.map((v, i) => {
            const isThis = v.label === "This week";
            const isExpanded = expandedWeek === i;
            return (
              <div
                key={i}
                onClick={() => setExpandedWeek(isExpanded ? null : i)}
                style={{
                  background: isThis ? "#EFF6FF" : "#fff",
                  border: `1px solid ${isThis ? "#BFDBFE" : "#E2E8F0"}`,
                  borderRadius: 7, padding: "7px 9px",
                  cursor: "pointer", userSelect: "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: isThis ? "#1E3A8A" : "#64748B" }}>
                    {v.label}{v.date ? ` (${v.date})` : ""}
                  </span>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{v.theme}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginTop: 2 }}>{v.reference}</div>
                {isExpanded && v.text && (
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, fontStyle: "italic", marginTop: 5, borderTop: "1px solid #E2E8F0", paddingTop: 5 }}>
                    {v.text}
                  </div>
                )}
                {!isExpanded && v.text && (
                  <div style={{ fontSize: 10.5, color: "#94A3B8", fontStyle: "italic", marginTop: 2 }}>
                    {v.text.length > 70 ? v.text.slice(0, 67) + "…" : v.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#94A3B8", padding: "6px 0" }}>No verses loaded — click Preview.</div>
      )}

      {/* ── Sync button ───────────────────────────── */}
      <motion.button
        onClick={roll}
        disabled={rolling}
        whileHover={!rolling ? { scale: 1.015 } : undefined}
        whileTap={!rolling ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.13 }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          padding: "10px 14px", borderRadius: 8,
          background: rolling ? "rgba(30,58,138,0.5)" : "#1E3A8A",
          color: "#fff", border: "none", cursor: rolling ? "not-allowed" : "pointer",
          fontSize: 12.5, fontWeight: 800,
        }}
      >
        <RefreshCw size={13} strokeWidth={2.5} style={{ animation: rolling ? "spin 0.8s linear infinite" : undefined, flexShrink: 0 }} />
        {rolling ? "Loading…" : "Preview"}
      </motion.button>
      {rollMsg && <div style={{ fontSize: 10.5, color: "#15803D", fontWeight: 700, textAlign: "center", marginTop: -4 }}>{rollMsg}</div>}
      <div style={{ fontSize: 9.5, color: "#94A3B8", lineHeight: 1.45 }}>
        Auto-fills Last / This / Next week from the bulletin's date field.
      </div>
    </div>
  );
}

export const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

export const BANNER_TYPES = [
  { value: "retreat",    label: "Retreat",    color: "#4472C4", bg: "#D6E8F7" },
  { value: "seminar",    label: "Seminar",    color: "#7C3AED", bg: "#EDE9FE" },
  { value: "camp",       label: "Camp",       color: "#16A34A", bg: "#DCFCE7" },
  { value: "conference", label: "Conference", color: "#D97706", bg: "#FEF3C7" },
  { value: "other",      label: "Other",      color: "#64748B", bg: "#F1F5F9" },
] as const;

export function RecurringEventsSidebarPanel({
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

      {/* ── Spanning events (banners) ──────────────────── */}
      <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 12, paddingTop: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Spanning Events
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 8, lineHeight: 1.4 }}>
          Multi-day events shown as colored bars in the calendar.
        </div>

        {(data.calendarBanners ?? []).map((banner, i) => {
          return (
            <div key={i} style={{
              marginBottom: 8, borderRadius: 8, border: `1px solid #E2E8F0`,
              borderLeftWidth: 3, borderLeftColor: "#4472C4",
              padding: "8px 10px", background: "#fff", display: "flex", flexDirection: "column", gap: 5,
            }}>
              {/* Label row */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  placeholder="Event name"
                  value={banner.label}
                  onChange={(e) => set({ calendarBanners: (data.calendarBanners ?? []).map((b, j) => j === i ? { ...b, label: e.target.value } : b) })}
                  style={{ flex: 1, borderRadius: 5, border: "1px solid #E2E8F0", padding: "3px 6px", fontSize: 11, color: "#334155", minWidth: 0 }}
                />
                <button
                  onClick={() => set({ calendarBanners: (data.calendarBanners ?? []).filter((_, j) => j !== i) })}
                  style={{ borderRadius: 5, background: "none", border: "1px solid #E2E8F0", color: "#94A3B8", cursor: "pointer", padding: "3px 6px", fontSize: 12, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}
                >×</button>
              </div>
              {/* Date row */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", minWidth: 0 }}>
                <input
                  placeholder="Start (M/D)"
                  title="Start date (M/D)"
                  value={banner.startDate}
                  onChange={(e) => set({ calendarBanners: (data.calendarBanners ?? []).map((b, j) => j === i ? { ...b, startDate: e.target.value } : b) })}
                  style={{ flex: 1, minWidth: 0, borderRadius: 5, border: "1px solid #E2E8F0", padding: "3px 6px", fontSize: 11, color: "#334155", textAlign: "center" }}
                />
                <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>→</span>
                <input
                  placeholder="End (M/D)"
                  title="End date (M/D)"
                  value={banner.endDate}
                  onChange={(e) => set({ calendarBanners: (data.calendarBanners ?? []).map((b, j) => j === i ? { ...b, endDate: e.target.value } : b) })}
                  style={{ flex: 1, minWidth: 0, borderRadius: 5, border: "1px solid #E2E8F0", padding: "3px 6px", fontSize: 11, color: "#334155", textAlign: "center" }}
                />
              </div>
            </div>
          );
        })}

        <button
          onClick={() => set({ calendarBanners: [...(data.calendarBanners ?? []), { label: "", startDate: "", endDate: "", type: "retreat" }] })}
          style={{ width: "100%", borderRadius: 7, border: "1.5px dashed #BFDBFE", background: "#F0F7FF", color: "#4472C4", fontSize: 11, fontWeight: 700, padding: "5px 0", cursor: "pointer" }}
        >+ Add spanning event</button>
      </div>
    </div>
  );
}

export function RecurringEventAdder({ onAdd }: { onAdd: (entry: { dayOfWeek: number; label: string }) => void }) {
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
