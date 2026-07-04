"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import {
  LayoutDashboard, Church, Users, BookOpen, Quote,
  CalendarDays, CalendarClock, Newspaper, HandHeart, Sparkles,
  BookMarked, CalendarRange, Save as SaveIcon,
  TextCursor, Hand, Maximize2, Download,
  RefreshCw, ChevronLeft, ChevronRight, LocateFixed,
  Undo2, Redo2, GripVertical, Lock, Eye, AlertTriangle,
  Bell, CheckCircle, XCircle, UserCheck,
  MessageCircle, Check, Send, Pencil, LogOut, ChevronDown, ChevronUp,
  type LucideIcon,
} from "lucide-react";
import type { AppNotification } from "@/app/api/notifications/route";
import type { BulletinComment } from "@/app/api/comments/route";
import BulletinPreview, { PAGE_W, PAGE_H } from "@/app/components/BulletinPreview";
import BulletinFitController from "@/app/components/BulletinFitController";
import { UploadModal } from "@/app/components/UploadModal";
import PresenceModal from "@/app/components/PresenceModal";
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
import {
  BULLETIN_LANGUAGES,
  defaultBulletinMeta,
  type BulletinApiResponse,
  type BulletinLanguage,
  type BulletinMeta,
  type LanguageLock,
  type LanguageLocks,
} from "@/lib/bulletin-languages";
import { SECTION_FIELD_MAP } from "@/lib/section-field-map";

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
  const [focused, setFocused] = useState(false);
  const sharedStyle: React.CSSProperties = {
    width: "100%", border: "none", outline: "none",
    background: "transparent", fontSize: 13.5, color: "#0F172A",
    padding: "9px 12px", fontFamily: "inherit", resize: "vertical",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", userSelect: "none",
        color: focused ? "#4472C4" : "#94A3B8",
        transition: "color 0.15s",
      }}>{label}</div>
      <div style={{
        borderRadius: 10,
        border: `1.5px solid ${focused ? "#4472C4" : "#E2E8F0"}`,
        background: focused ? "#fff" : "#F8FAFC",
        boxShadow: focused ? "0 0 0 3px rgba(68,114,196,0.13)" : "none",
        transition: "all 0.18s ease",
        overflow: "hidden",
      }}>
        {multiline ? (
          <textarea rows={rows} value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...sharedStyle, display: "block" }}
          />
        ) : (
          <input value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={sharedStyle}
          />
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{ width: 3, height: 15, borderRadius: 99, background: "linear-gradient(180deg,#4472C4,#1E3A8A)", flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1E3A8A" }}>{children}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16, border: "1px solid #EEF2FF", background: "#fff",
      boxShadow: "0 2px 16px rgba(68,114,196,0.08), 0 1px 3px rgba(15,23,42,0.04)",
      padding: 20, display: "flex", flexDirection: "column", gap: 16,
    }}>
      {children}
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button onClick={onClick}
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      style={{
        alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 99,
        border: "1.5px dashed #93C5FD", background: "#EFF6FF",
        fontSize: 12, fontWeight: 700, color: "#2563EB", cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1, marginTop: -1 }}>+</span>{label}
    </motion.button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, flexShrink: 0,
        display: "grid", placeItems: "center", borderRadius: 8,
        border: `1px solid ${hov ? "#FECACA" : "#F1F5F9"}`,
        background: hov ? "#FEF2F2" : "#F8FAFC",
        color: hov ? "#EF4444" : "#CBD5E1",
        fontSize: 18, lineHeight: 1, cursor: "pointer", transition: "all 0.15s",
      }}
    >×</button>
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
// Sidebar panel: Memory Verses automation
// ---------------------------------------------------------------------------

type VerseStats = {
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

function MemoryVersesSidebarPanel({
  data,
  set,
}: {
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
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
        body: JSON.stringify({ action: "roll", bulletinDate: shiftedStr }),
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
        body: JSON.stringify({ action: "roll", bulletinDate: data.date }),
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

const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

const BANNER_TYPES = [
  { value: "retreat",    label: "Retreat",    color: "#4472C4", bg: "#D6E8F7" },
  { value: "seminar",    label: "Seminar",    color: "#7C3AED", bg: "#EDE9FE" },
  { value: "camp",       label: "Camp",       color: "#16A34A", bg: "#DCFCE7" },
  { value: "conference", label: "Conference", color: "#D97706", bg: "#FEF3C7" },
  { value: "other",      label: "Other",      color: "#64748B", bg: "#F1F5F9" },
] as const;

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
// Tab: News — drag card sub-component (needs useDragControls at top level)
// ---------------------------------------------------------------------------

function NewsDragCard({
  item, index, onUpdate, onDelete,
}: {
  item: NewsItem;
  index: number;
  onUpdate: (patch: Partial<NewsItem>) => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: "none" }}
      whileDrag={{ scale: 1.025, zIndex: 50 }}
      transition={{ layout: { type: "spring", stiffness: 500, damping: 38 } }}
    >
      <motion.div
        layout
        animate={{ boxShadow: "0 2px 12px rgba(68,114,196,0.07)" }}
        whileDrag={{ boxShadow: "0 14px 44px rgba(68,114,196,0.22)" }}
        style={{
          borderRadius: 14, border: "1px solid #EEF2FF", background: "#fff",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {/* Drag rail */}
          <div
            onPointerDown={e => controls.start(e)}
            style={{
              width: 38, flexShrink: 0,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "flex-start", paddingTop: 13, gap: 5,
              background: "linear-gradient(180deg,#EEF2FF 0%,#F8FAFC 100%)",
              borderRight: "1px solid #EEF2FF",
              cursor: "grab", userSelect: "none",
            }}
          >
            <motion.span
              key={index}
              initial={{ scale: 1.4, color: "#4472C4" }}
              animate={{ scale: 1, color: "#4472C4" }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              style={{ fontSize: 12, fontWeight: 900, lineHeight: 1 }}
            >
              {index + 1}
            </motion.span>
            <GripVertical size={13} color="#C7D2E8" />
          </div>
          {/* Content */}
          <div style={{ flex: 1, padding: "13px 13px 13px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Title" value={item.title} onChange={v => onUpdate({ title: v })} />
              <Field label="Body" value={item.body} onChange={v => onUpdate({ body: v })} multiline rows={3} />
            </div>
            <RemoveBtn onClick={onDelete} />
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
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
  const MAX_NEWS = 5;
  const keyMap = useRef(new WeakMap<NewsItem, string>());
  const getKey = (item: NewsItem) => {
    if (!keyMap.current.has(item)) keyMap.current.set(item, Math.random().toString(36).slice(2));
    return keyMap.current.get(item)!;
  };

  const updateNews = (i: number, patch: Partial<NewsItem>) => {
    set({ news: data.news.map((n, idx) => (idx === i ? { ...n, ...patch } : n)) });
  };
  const deleteNews = (i: number) =>
    set({ news: data.news.filter((_, idx) => idx !== i) });
  const addNews = () => {
    if (data.news.length < MAX_NEWS)
      set({ news: [...data.news, { title: "", body: "" }] });
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
        <Reorder.Group
          axis="y"
          values={data.news}
          onReorder={newOrder => set({ news: newOrder })}
          style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <AnimatePresence initial={false}>
            {data.news.map((item, i) => (
              <NewsDragCard
                key={getKey(item)}
                item={item}
                index={i}
                onUpdate={patch => updateNews(i, patch)}
                onDelete={() => deleteNews(i)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
        {Array.from({ length: MAX_NEWS - data.news.length }, (_, j) => {
          const i = data.news.length + j;
          return (
            <motion.div
              key={`empty-${i}`}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                borderRadius: 12, border: "1.5px dashed #E2E8F0",
                padding: "11px 14px", opacity: 0.55,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 900, color: "#CBD5E1", width: 20 }}>{i + 1}</span>
              <button onClick={addNews} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                + Add news item
              </button>
            </motion.div>
          );
        })}
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
// Sidebar panel: Retreat Info
// ---------------------------------------------------------------------------

function RetreatInfoPanel({
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
          onClick={() => setRetreat({ enabled: !retreat.enabled })}
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

type CanvasMode = "grab" | "select" | "comment";

const CANVAS_TOOLS: { id: CanvasMode; label: string; shortcut: string; Icon: LucideIcon }[] = [
  { id: "select",  label: "Select & Edit", shortcut: "V", Icon: TextCursor },
  { id: "grab",    label: "Grab & Pan",   shortcut: "H", Icon: Hand },
  { id: "comment", label: "Comment",      shortcut: "C", Icon: MessageCircle },
];

function ToolbarTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          /* Span full button width, use flex centering — no transform needed */
          <div style={{
            position: "absolute", bottom: "calc(100% + 10px)",
            left: 0, right: 0,
            display: "flex", justifyContent: "center",
            pointerEvents: "none", zIndex: 9999,
          }}>
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              style={{
                background: "rgba(10,10,18,0.96)",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: 8,
                padding: "5px 9px",
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              {text}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingToolbar({
  mode, onMode, onFit, onExport, exporting, disabled,
  canUndo, canRedo, onUndo, onRedo,
  notifCount, onBell,
}: {
  mode: CanvasMode;
  onMode: (m: CanvasMode) => void;
  onFit: () => void;
  onExport: () => void;
  exporting: boolean;
  disabled?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  notifCount: number;
  onBell: () => void;
}) {
  const pillStyle: React.CSSProperties = {
    position: "relative", zIndex: 1,
    display: "inline-flex", alignItems: "center",
    borderRadius: 14, padding: "5px 7px", gap: 2,
    background: "transparent",
    userSelect: "none", overflow: "visible",
  };

  const btnBase: React.CSSProperties = {
    position: "relative", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    width: 44, height: 40, borderRadius: 9,
    border: "none", background: "transparent",
    cursor: "pointer", gap: 2, flexShrink: 0,
  };

  return (
    <div className="floating-toolbar-shell" style={{
      position: "absolute", bottom: 20, left: "50%",
      transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 8,
      zIndex: 32, pointerEvents: "all",
    }}>
      {/* Main pill — layered frosted glass */}
      <div style={{ position: "relative", display: "inline-flex", borderRadius: 14 }}>
        {/* Frosted white glass base */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          background: "rgba(255,255,255,0.95)",
        }} />
        {/* Top-edge sheen */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          background: "linear-gradient(175deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.0) 55%)",
          pointerEvents: "none",
        }} />
        {/* Border + shadow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05)",
          pointerEvents: "none",
        }} />
        <div className="floating-main-pill" style={pillStyle}>
        {/* Mode tools */}
        {CANVAS_TOOLS.map(({ id, label, shortcut, Icon }) => {
          const active = mode === id;
          return (
            <ToolbarTooltip key={id} text={`${label}  ${shortcut}`}>
              <button
                onClick={() => onMode(id)}
                style={{ ...btnBase, color: active ? "#fff" : "#64748B" }}
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
                      background: "#4472C4",
                      boxShadow: "0 2px 8px rgba(68,114,196,0.35)",
                    }}
                  />
                )}
                <Icon size={16} strokeWidth={2} style={{ position: "relative", zIndex: 1, flexShrink: 0 }} />
                <span style={{
                  position: "relative", zIndex: 1,
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.04em", lineHeight: 1,
                  color: active ? "rgba(255,255,255,0.9)" : "#94A3B8",
                }}>
                  {shortcut}
                </span>
              </button>
            </ToolbarTooltip>
          );
        })}

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />

        {/* Fit to screen */}
        <ToolbarTooltip text="Fit to Screen  ⌃0">
          <button
            onClick={onFit}
            style={{ ...btnBase, color: "#64748B", width: 36 }}
            aria-label="Fit to screen"
          >
            <Maximize2 size={15} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        </ToolbarTooltip>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />

        {/* Undo */}
        <ToolbarTooltip text="Undo  Ctrl+Z">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{ ...btnBase, color: canUndo ? "#475569" : "#CBD5E1", width: 36, cursor: canUndo ? "pointer" : "not-allowed" }}
            aria-label="Undo"
          >
            <Undo2 size={15} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        </ToolbarTooltip>

        {/* Redo */}
        <ToolbarTooltip text="Redo  Ctrl+Y">
          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{ ...btnBase, color: canRedo ? "#475569" : "#CBD5E1", width: 36, cursor: canRedo ? "pointer" : "not-allowed" }}
            aria-label="Redo"
          >
            <Redo2 size={15} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        </ToolbarTooltip>
        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />

        {/* Notifications bell */}
        <ToolbarTooltip text="Notifications">
          <button
            onClick={onBell}
            style={{ ...btnBase, color: notifCount > 0 ? "#F59E0B" : "#64748B", width: 40, position: "relative" }}
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
            {notifCount > 0 && (
              <span style={{
                position: "absolute", top: 5, right: 5,
                minWidth: 15, height: 15, padding: "0 3px",
                borderRadius: 99, background: "#EF4444",
                color: "#fff", fontSize: 9, fontWeight: 900,
                display: "grid", placeItems: "center",
                lineHeight: 1, zIndex: 2,
              }}>{notifCount > 9 ? "9+" : notifCount}</span>
            )}
          </button>
        </ToolbarTooltip>
        </div>{/* /floating-main-pill */}
      </div>{/* /glass wrapper */}

      {/* Export button — separate accent pill */}
      <ToolbarTooltip text="Export PDF">
        <motion.button
          className="floating-export-button"
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
  { id: "retreat",   label: "Retreat Info",    icon: CalendarRange,   page: 2 },
] as const;

type TabId = (typeof SECTIONS)[number]["id"];

const TAB_SECTION_KEY: Record<TabId, string> = {
  header: "header",
  sermon: "sermon",
  services: "services",
  bible: "bibleReading",
  memory: "memoryVerses",
  cleaning: "cleaning",
  calendar: "calendar",
  schedule: "weekSchedule",
  news: "news",
  prayer: "prayer",
  retreat: "retreatInfo",
};

const LANGUAGE_CONFIG: Record<BulletinLanguage, { code: string; flag: string; name: string }> = {
  en: { code: "EN", flag: "🇺🇸", name: "English" },
  es: { code: "ES", flag: "🇪🇸", name: "Spanish" },
  ko: { code: "KO", flag: "🇰🇷", name: "Korean" },
  zh: { code: "ZH", flag: "🇨🇳", name: "Chinese" },
  ru: { code: "RU", flag: "🇷🇺", name: "Russian" },
};

type PresenceRole = "editor" | "collaborator" | "viewer";

// Single source of truth for the three collaboration roles — icon, colors, label.
const ROLE_META: Record<PresenceRole, {
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

function roleForSession(lock: LanguageLock | null | undefined, sessionId: string): PresenceRole {
  if (lock?.sessionId === sessionId) return "editor";
  if (lock?.collaborators?.includes(sessionId)) return "collaborator";
  return "viewer";
}

// Section centers in full-PDF coordinate space (1344 × 1634 stacked)
// h = approximate section height — used to compute zoom level
const ACCESS_REQUEST_TYPES = ["takeover_request", "join_request"] as const;
type AccessRequestType = (typeof ACCESS_REQUEST_TYPES)[number];

function isAccessRequestNotification(notification: AppNotification): notification is AppNotification & { type: AccessRequestType } {
  return ACCESS_REQUEST_TYPES.includes(notification.type as AccessRequestType);
}

// Short, pleasant two-note "ding-dong" chime for incoming requests/notifications.
// Synthesized with the Web Audio API so there's no audio asset to ship or load.
let sharedAudioCtx: AudioContext | null = null;
function playNotificationChime() {
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
  retreat:  { cx: 1120, cy: 1530, h: 240 }, // col 3 p2, below joint prayer
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
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
          {/* Blur + tint layer */}
          <div style={{
            position: "absolute", inset: 0,
            backdropFilter: "blur(12px) saturate(1.6) brightness(1.04)",
            WebkitBackdropFilter: "blur(12px) saturate(1.6) brightness(1.04)",
            background: "rgba(68,114,196,0.10)",
          }} />
          {/* Top-edge highlight gradient */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 40%, transparent 100%)",
            pointerEvents: "none",
          }} />
          {/* Left accent bar */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: "linear-gradient(180deg, #4472C4, #1E3A8A)",
          }} />
          {/* Border + inner glow */}
          <div style={{
            position: "absolute", inset: 0,
            borderTop: "1px solid rgba(68,114,196,0.22)",
            borderBottom: "1px solid rgba(68,114,196,0.22)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
            pointerEvents: "none",
          }} />
        </motion.div>
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

function LanguageTabBar({
  activeLanguage,
  metaByLanguage,
  locks,
  sessionId,
  onSelect,
  presenceUsers,
  mySessionId,
}: {
  activeLanguage: BulletinLanguage;
  metaByLanguage: Record<BulletinLanguage, BulletinMeta>;
  locks: LanguageLocks;
  sessionId: string;
  onSelect: (language: BulletinLanguage) => void;
  presenceUsers: Array<{ name: string; sessionId: string; language?: string }>;
  mySessionId: string;
}) {
  return (
    <div className="language-tab-bar" aria-label="Bulletin languages">
      {BULLETIN_LANGUAGES.map((language) => {
        const config = LANGUAGE_CONFIG[language];
        const active = activeLanguage === language;
        const pendingCount = Object.values(metaByLanguage[language].sections)
          .filter((s) => s.status === "pending").length;
        const lockedByOther = Boolean(locks[language] && locks[language]?.sessionId !== sessionId);
        const editorsHere = presenceUsers.filter((u) => u.language === language);
        const shownEditors = editorsHere.slice(0, 5);
        const extraCount = editorsHere.length - shownEditors.length;
        return (
          <button
            type="button"
            key={language}
            onClick={() => onSelect(language)}
            title={language === "ko" ? "Korean is isolated from English sync" : config.name}
            style={{
              position: "relative",
              height: 42,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 13px",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: active ? "#fff" : "#475569",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 800,
              whiteSpace: "nowrap",
              transition: "color 0.18s",
            }}
          >
            {active && (
              <motion.div
                layoutId="lang-active-pill"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                style={{
                  position: "absolute", inset: 0, borderRadius: 999,
                  background: "linear-gradient(180deg, #4E80D9 0%, #3E68BF 100%)",
                  boxShadow: "0 4px 14px rgba(62,104,191,0.42), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              />
            )}
            <span aria-hidden style={{ position: "relative", zIndex: 1, fontSize: 15, lineHeight: 1 }}>{config.flag}</span>
            <span style={{ position: "relative", zIndex: 1 }}>{config.code}</span>
            {language === "ko" && (
              <Lock size={10} aria-label="Korean is isolated" style={{ position: "relative", zIndex: 1 }} />
            )}
            {language !== "en" && language !== "ko" && pendingCount > 0 && (
              <span style={{ position: "relative", zIndex: 1, minWidth: 15, height: 15, padding: "0 4px", display: "grid", placeItems: "center", borderRadius: 99, background: "#F59E0B", color: "#111827", fontSize: 9, fontWeight: 900 }}>
                {pendingCount}
              </span>
            )}
            {lockedByOther && (
              <span aria-label="Locked by another editor" style={{ position: "relative", zIndex: 1, width: 6, height: 6, borderRadius: 99, background: "#EF4444", animation: "livePulse 1.6s ease-in-out infinite" }} />
            )}
            {/* Presence avatars with role badges */}
            {shownEditors.length > 0 && (
              <div style={{ position: "relative", zIndex: 1, display: "flex", marginLeft: 3 }}>
                {shownEditors.map((u, i) => {
                  const isSelf = u.sessionId === mySessionId;
                  const c = presenceColorFor(u.name);
                  const role = roleForSession(locks[language], u.sessionId);
                  const meta = ROLE_META[role];
                  const separator = active ? "#4472C4" : "#fff";
                  return (
                    <div
                      key={u.sessionId}
                      title={`${u.name}${isSelf ? " (you)" : ""} — ${meta.label}`}
                      style={{
                        position: "relative",
                        marginLeft: i > 0 ? -7 : 0,
                        zIndex: shownEditors.length - i,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: c.bg,
                        color: c.text,
                        border: `2px solid ${separator}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 900, letterSpacing: "0.02em",
                        boxShadow: isSelf
                          ? `0 0 0 2px ${separator}, 0 0 0 3.5px ${meta.solid}, 0 2px 6px rgba(0,0,0,0.22)`
                          : "0 1px 5px rgba(0,0,0,0.18)",
                      }}>
                        {presenceInitials(u.name)}
                      </div>
                      {/* Role badge */}
                      <div style={{
                        position: "absolute", bottom: -3, right: -3,
                        width: 14, height: 14, borderRadius: "50%",
                        background: meta.solid,
                        border: "2px solid #fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                        pointerEvents: "none",
                      }}>
                        <meta.Icon size={8} strokeWidth={2.75} color="#fff" />
                      </div>
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <div
                    title={`${extraCount} more`}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", marginLeft: -7, flexShrink: 0,
                      background: "#EEF2F7",
                      color: "#475569",
                      border: `2px solid ${active ? "#4472C4" : "#fff"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900,
                      position: "relative", zIndex: 0,
                      boxShadow: "0 1px 5px rgba(0,0,0,0.15)",
                    }}
                  >+{extraCount}</div>
                )}
              </div>
            )}
          </button>
        );
      })}

      {/* My Role chip — far right of tab bar, separated by a hairline divider */}
      {(() => {
        const myRole = roleForSession(locks[activeLanguage], mySessionId);
        const meta = ROLE_META[myRole];
        return (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span aria-hidden style={{ width: 1, height: 22, background: "#E2E8F0", borderRadius: 1 }} />
            <div
              title={`Your role on ${LANGUAGE_CONFIG[activeLanguage].name}: ${meta.label}`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: meta.tint,
                border: `1px solid ${meta.ring}`,
                borderRadius: 999,
                padding: "5px 12px 5px 8px",
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: meta.solid,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 1px 4px ${meta.ring}`,
              }}>
                <meta.Icon size={11} strokeWidth={2.75} color="#fff" />
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: meta.ink, letterSpacing: "0.02em" }}>
                {meta.label}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function LockModal({
  language,
  lock,
  onViewOnly,
  onRequestTakeover,
  onRequestJoin,
}: {
  language: BulletinLanguage;
  lock: LanguageLock;
  onViewOnly: () => void;
  onRequestTakeover: () => void;
  onRequestJoin: () => void;
}) {
  const minutes = Math.max(0, Math.floor((Date.now() - lock.acquiredAt) / 60000));
  return (
    <div className="multilang-modal-backdrop" role="dialog" aria-modal="true" aria-label="Language bulletin locked">
      <div className="multilang-modal-card" style={{ width:"min(360px, calc(100vw - 32px))", padding:"22px 24px 18px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <Lock size={15} color="#F59E0B" />
          <span style={{ fontSize:14, fontWeight:800, color:"#fff", letterSpacing:"-0.01em" }}>Currently being edited</span>
        </div>
        <p style={{ margin:"0 0 18px", color:"rgba(255,255,255,0.6)", fontSize:12.5, lineHeight:1.6 }}>
          <strong style={{ color: "#fff" }}>{lock.userName}</strong> is editing the {LANGUAGE_CONFIG[language].name} bulletin
          {minutes > 0 ? ` (${minutes}m ago)` : " right now"}. Choose how you&apos;d like to proceed:
        </p>
        {/* Request to Take Over */}
        <button
          type="button"
          onClick={onRequestTakeover}
          style={{
            display:"block", width:"100%", textAlign:"left",
            background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.28)",
            borderRadius:10, padding:"11px 14px", marginBottom:8, cursor:"pointer", color:"#fff",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <UserCheck size={14} color="#FCA5A5" />
            <span style={{ fontSize:13, fontWeight:700 }}>Request to Take Over</span>
          </div>
          <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.45)", paddingLeft:22 }}>
            Ask them to hand over full editing access
          </div>
        </button>
        {/* Request to Collaborate */}
        <button
          type="button"
          onClick={onRequestJoin}
          style={{
            display:"block", width:"100%", textAlign:"left",
            background:"rgba(68,114,196,0.12)", border:"1px solid rgba(68,114,196,0.3)",
            borderRadius:10, padding:"11px 14px", marginBottom:16, cursor:"pointer", color:"#fff",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <Users size={14} color="#93B4F0" />
            <span style={{ fontSize:13, fontWeight:700 }}>Request to Collaborate</span>
          </div>
          <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.45)", paddingLeft:22 }}>
            Ask to edit alongside them simultaneously
          </div>
        </button>
        {/* View Only */}
        <button
          type="button"
          onClick={onViewOnly}
          style={{
            display:"block", width:"100%", textAlign:"left",
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"11px 14px", cursor:"pointer", color:"#fff",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <Eye size={14} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize:13, fontWeight:700 }}>View Only</span>
          </div>
          <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.38)", paddingLeft:22 }}>
            Browse without making changes
          </div>
        </button>
      </div>
    </div>
  );
}

function TranslationInitOverlay({ language, onInitialize, loading }: { language: Exclude<BulletinLanguage, "en">; onInitialize: () => void; loading: boolean }) {
  const config = LANGUAGE_CONFIG[language];
  const korean = language === "ko";
  return (
    <div className="multilang-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Initialize ${config.name} bulletin`}>
      <div className="multilang-modal-card" style={{ width:"min(500px, calc(100vw - 32px))", textAlign:"center" }}>
        <div style={{ fontSize:34 }} aria-hidden>{config.flag}</div>
        <h2 style={{ margin:"8px 0 0", color:"#fff", fontSize:20 }}>{config.name} Bulletin</h2>
        <p style={{ margin:"18px auto", maxWidth:390, color:"rgba(255,255,255,0.72)", fontSize:13, lineHeight:1.65 }}>
          No translated {config.name} content yet. Translate the English bulletin now to create the first edition.
          {korean
            ? " After translation, Korean is fully isolated—future English changes will never affect it."
            : " Future English updates will appear as section notifications and translate when applied."}
        </p>
        <button type="button" className="glass-primary-button" onClick={onInitialize} disabled={loading} style={{ margin:"0 auto" }}>
          {loading ? "Translating…" : `Translate into ${config.name}`}
        </button>
      </div>
    </div>
  );
}

function SyncPreviewModal({
  sectionKey,
  currentData,
  meta,
  onKeepMine,
  onUseEnglish,
  onClose,
}: {
  sectionKey: string;
  currentData: BulletinData;
  meta: BulletinMeta;
  onKeepMine: () => void;
  onUseEnglish: () => void;
  onClose: () => void;
}) {
  const pending = meta.sections[sectionKey]?.pendingEnContent ?? {};
  const fields = SECTION_FIELD_MAP[sectionKey] ?? [];
  const displayValue = (value: unknown) => typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div className="multilang-modal-backdrop" role="dialog" aria-modal="true" aria-label="English section update preview">
      <div className="multilang-modal-card sync-preview-card">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:14 }}>
          <div style={{ color:"#fff", fontSize:16, fontWeight:900 }}>Section: {sectionKey}</div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="glass-icon-button">×</button>
        </div>
        <div className="sync-preview-grid">
          <div>
            <div className="sync-column-title">English (updated)</div>
            {fields.map((field) => {
              const changed = JSON.stringify(pending[field]) !== JSON.stringify(currentData[field]);
              return (
                <div key={field} className="sync-field" style={{ background:changed ? "rgba(251,191,36,0.13)" : "rgba(255,255,255,0.04)" }}>
                  <div className="sync-field-label">{field}</div>
                  <pre>{displayValue(pending[field])}</pre>
                </div>
              );
            })}
          </div>
          <div>
            <div className="sync-column-title">Your current translation</div>
            {fields.map((field) => (
              <div key={field} className="sync-field">
                <div className="sync-field-label">{field}</div>
                <pre>{displayValue(currentData[field])}</pre>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginTop:16 }}>
          <button type="button" className="glass-secondary-button" onClick={onKeepMine}>Keep mine</button>
          <button type="button" className="glass-primary-button" onClick={onUseEnglish}>Translate &amp; Apply</button>
        </div>
      </div>
    </div>
  );
}

// ── Presence colour / initials helpers ────────────────────────────────────────
const PRESENCE_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#DCF5E4", text: "#166534" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#F3E8FF", text: "#6B21A8" },
  { bg: "#FFE4E6", text: "#9F1239" },
  { bg: "#CCFBF1", text: "#0F766E" },
];
function presenceColorFor(name: string) {
  return PRESENCE_COLORS[(name.charCodeAt(0) || 0) % PRESENCE_COLORS.length];
}
function presenceInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ── Persistent access-control bar (viewer & collaborator) ─────────────────────
// A pill-shaped dark bar pinned bottom-center that lets non-editors request more
// access at any time — Collaborate / Take over for viewers, Request full control /
// Leave for collaborators — plus live pending/declined status with a cancel option.
function AccessControlBar({
  role, lock, language, notifications, sessionId, candidates,
  onRequestTakeover, onRequestJoin, onLeave, onCancelRequest, onTransferEditor,
}: {
  role: PresenceRole;
  lock: LanguageLock;
  language: BulletinLanguage;
  notifications: AppNotification[];
  sessionId: string;
  candidates: Array<{ name: string; sessionId: string }>;
  onRequestTakeover: () => void;
  onRequestJoin: () => void;
  onLeave: () => void;
  onCancelRequest: (id: string) => void;
  onTransferEditor: (target: { sessionId: string; name: string }) => void;
}) {
  const config = LANGUAGE_CONFIG[language];
  const meta = ROLE_META[role];
  const mine = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.lang === language,
  );
  const pending = mine.find((n) => n.status === "pending");
  const declined = mine.filter((n) => n.status === "declined").sort((a, b) => b.createdAt - a.createdAt)[0];

  const pendingLabel = pending
    ? pending.type === "takeover_request"
      ? (role === "collaborator" ? "Requesting full control" : "Take-over request sent")
      : "Collaborate request sent"
    : null;

  const RoleIcon = meta.Icon;
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isEditor = role === "editor";

  // Collapsed: a compact role chip you can expand back into the full bar.
  if (collapsed) {
    const hasStatus = !isEditor && Boolean(pending || declined);
    return (
      <motion.button
        type="button"
        onClick={() => setCollapsed(false)}
        onMouseDown={(e) => e.stopPropagation()}
        title="Show access options"
        initial={{ y: 16, opacity: 0, x: "-50%" }}
        animate={{ y: 0, opacity: 1, x: "-50%" }}
        exit={{ y: 16, opacity: 0, x: "-50%" }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        style={{
          position: "absolute", bottom: 84, left: "50%",
          zIndex: 31, display: "flex", alignItems: "center", gap: 8,
          background: "rgba(10,15,30,0.9)",
          backdropFilter: "blur(20px) saturate(1.7)",
          WebkitBackdropFilter: "blur(20px) saturate(1.7)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 999, padding: "6px 12px 6px 6px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
          cursor: "pointer", pointerEvents: "all",
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: meta.solid, borderRadius: 999, padding: "4px 10px 4px 8px",
          boxShadow: `0 2px 8px ${meta.solid}66`,
        }}>
          <RoleIcon size={12} strokeWidth={2.75} color="#fff" />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{meta.label}</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{isEditor ? "Pass role" : "Request access"}</span>
        {hasStatus && (
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: pending ? "#93C5FD" : "#FCA5A5", flexShrink: 0,
          }} />
        )}
        <ChevronRight size={14} strokeWidth={2.4} color="rgba(255,255,255,0.55)" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ y: 16, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      exit={{ y: 16, opacity: 0, x: "-50%" }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute", bottom: 84, left: "50%",
        zIndex: 31, display: "flex", alignItems: "center", gap: 12,
        background: "rgba(10,15,30,0.9)",
        backdropFilter: "blur(20px) saturate(1.7)",
        WebkitBackdropFilter: "blur(20px) saturate(1.7)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 999, padding: "8px 10px 8px 14px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
        maxWidth: "calc(100% - 24px)",
        whiteSpace: "nowrap", pointerEvents: "all",
      }}
    >
      {/* Role chip */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: meta.solid, borderRadius: 999, padding: "4px 10px 4px 8px",
        flexShrink: 0, boxShadow: `0 2px 8px ${meta.solid}66`,
      }}>
        <RoleIcon size={12} strokeWidth={2.75} color="#fff" />
        <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>{meta.label}</span>
      </span>

      {/* Status text */}
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis" }}>
        {isEditor ? (
          <>
            Editing <span aria-hidden>{config.flag}</span> {config.name}
          </>
        ) : (
          <>
            {role === "collaborator" ? "Collaborating on " : "Viewing "}
            <span aria-hidden>{config.flag}</span> {config.name}
            <span style={{ color: "rgba(255,255,255,0.4)" }}> · </span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{role === "collaborator" ? "with" : ""}</span>{" "}
            <strong style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{lock.userName}</strong>
            {role === "viewer" && " is editing"}
          </>
        )}
      </span>

      {/* Editor: hand the role off to another present user */}
      {isEditor && (
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span aria-hidden style={{ width: 1, height: 20, background: "rgba(255,255,255,0.14)", flexShrink: 0 }} />
          <button
            onClick={() => candidates.length > 0 && setPickerOpen((v) => !v)}
            disabled={candidates.length === 0}
            title={candidates.length === 0 ? "No one else is in this language" : "Hand the editor role to someone here"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: candidates.length === 0 ? "rgba(255,255,255,0.05)" : "rgba(245,158,11,0.22)",
              color: candidates.length === 0 ? "rgba(255,255,255,0.35)" : "#FCD34D",
              border: `1px solid ${candidates.length === 0 ? "rgba(255,255,255,0.1)" : "rgba(245,158,11,0.4)"}`,
              borderRadius: 999, padding: "6px 13px", fontSize: 12, fontWeight: 700,
              cursor: candidates.length === 0 ? "default" : "pointer",
            }}
          >
            <UserCheck size={13} strokeWidth={2.4} />
            {candidates.length === 0 ? "No one else here" : "Pass editor role"}
            {candidates.length > 0 && (pickerOpen ? <ChevronDown size={13} strokeWidth={2.6} /> : <ChevronUp size={13} strokeWidth={2.6} />)}
          </button>

          {/* Pop-up list of present users to hand off to */}
          <AnimatePresence>
            {pickerOpen && candidates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
                style={{
                  position: "absolute", bottom: "calc(100% + 10px)", right: 0,
                  minWidth: 210, maxHeight: 240, overflowY: "auto",
                  background: "rgba(17,24,39,0.98)",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5)", padding: 6, zIndex: 40,
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "6px 10px 4px" }}>
                  Hand off to
                </div>
                {candidates.map((u) => {
                  const c = presenceColorFor(u.name);
                  return (
                    <button
                      key={u.sessionId}
                      onClick={() => { setPickerOpen(false); onTransferEditor({ sessionId: u.sessionId, name: u.name }); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        background: "transparent", border: "none", borderRadius: 9,
                        padding: "7px 10px", cursor: "pointer", textAlign: "left",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        background: c.bg, color: c.text, fontSize: 11, fontWeight: 800,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {presenceInitials(u.name)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.name}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </span>
      )}

      {/* Pending state */}
      {!isEditor && pending && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#93C5FD", fontSize: 12, fontWeight: 600 }}>
            <span style={{
              width: 13, height: 13, borderRadius: "50%",
              border: "2px solid rgba(147,197,253,0.3)", borderTopColor: "#93C5FD",
              animation: "spin 0.8s linear infinite", flexShrink: 0,
            }} />
            {pendingLabel}…
          </span>
          <button
            onClick={() => onCancelRequest(pending.id)}
            title="Cancel request"
            style={{
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999,
              padding: "5px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </span>
      )}

      {/* Action buttons (hidden while a request is pending) */}
      {!isEditor && !pending && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {declined && (
            <span style={{ color: "#FCA5A5", fontSize: 11.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <XCircle size={13} strokeWidth={2.4} /> Last request declined
            </span>
          )}
          {/* Divider */}
          <span aria-hidden style={{ width: 1, height: 20, background: "rgba(255,255,255,0.14)", flexShrink: 0 }} />
          {/* "Request to:" label makes the buttons read as requests */}
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
            Request to:
          </span>
          {role === "viewer" && (
            <button
              onClick={onRequestJoin}
              title="Ask to edit alongside them at the same time"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(139,92,246,0.22)", color: "#C4B5FD",
                border: "1px solid rgba(139,92,246,0.4)", borderRadius: 999,
                padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <Users size={13} strokeWidth={2.4} /> Edit together
            </button>
          )}
          <button
            onClick={onRequestTakeover}
            title="Ask them to hand over full editing control to you"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(239,68,68,0.22)", color: "#FCA5A5",
              border: "1px solid rgba(239,68,68,0.45)", borderRadius: 999,
              padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Pencil size={12} strokeWidth={2.4} /> Take full control
          </button>
          {role === "collaborator" && (
            <>
              <span aria-hidden style={{ width: 1, height: 20, background: "rgba(255,255,255,0.14)", flexShrink: 0 }} />
              <button
                onClick={onLeave}
                title="Stop collaborating and go back to view-only"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "transparent", color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                <LogOut size={12} strokeWidth={2.4} /> Leave
              </button>
            </>
          )}
        </span>
      )}

      {/* Minimize to a compact chip */}
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        title="Minimize"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, flexShrink: 0,
          background: "transparent", color: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(255,255,255,0.14)", borderRadius: "50%",
          cursor: "pointer",
        }}
      >
        <ChevronLeft size={15} strokeWidth={2.4} />
      </button>
    </motion.div>
  );
}

// ── Floating toast for incoming access requests ────────────────────────────────
function NotificationToast({
  notifications,
  sessionId,
  dismissedToastIds,
  onGrant,
  onDecline,
  onDismissToast,
}: {
  notifications: AppNotification[];
  sessionId: string;
  dismissedToastIds: string[];
  onGrant: (n: AppNotification) => void;
  onDecline: (n: AppNotification) => void;
  onDismissToast: (id: string) => void;
}) {
  const dismissedSet = new Set(dismissedToastIds);
  const toasts = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.targetSessionId === sessionId && n.status === "pending" && !dismissedSet.has(n.id),
  );
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 55, display: "flex", flexDirection: "column-reverse", gap: 8 }}>
      <AnimatePresence>
        {toasts.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
            style={{
              width: 300,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <div style={{ padding: "12px 14px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: presenceColorFor(n.fromUserName).bg,
                  color: presenceColorFor(n.fromUserName).text,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900,
                }}>
                  {presenceInitials(n.fromUserName)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>{n.fromUserName}</div>
                  <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4, marginTop: 1 }}>
                    {n.type === "join_request" ? "wants to collaborate on" : "wants to take over"}{" "}
                    {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismissToast(n.id)}
                aria-label="Dismiss"
                style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
              >
                ×
              </button>
            </div>
            {/* Action buttons */}
            <div style={{ padding: "8px 14px 12px", display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => { onGrant(n); onDismissToast(n.id); }}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: "#22C55E", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              >
                <CheckCircle size={13} /> {n.type === "join_request" ? "Allow" : "Grant"}
              </button>
              <button
                type="button"
                onClick={() => { onDecline(n); onDismissToast(n.id); }}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <XCircle size={13} /> Decline
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationPanel({
  notifications,
  metaByLanguage,
  activeLang,
  sessionId,
  seenSectionNotifications,
  onGrant,
  onDecline,
  onSwitchToSection,
  onClose,
}: {
  notifications: AppNotification[];
  metaByLanguage: Record<BulletinLanguage, BulletinMeta>;
  activeLang: BulletinLanguage;
  sessionId: string;
  seenSectionNotifications: Set<string>;
  onGrant: (notif: AppNotification) => void;
  onDecline: (notif: AppNotification) => void;
  onSwitchToSection: (lang: BulletinLanguage, sectionKey: string, notificationId: string) => void;
  onClose: () => void;
}) {
  const incomingRequests = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.targetSessionId === sessionId && n.status === "pending",
  );
  const myPendingRequests = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.status === "pending",
  );
  const myAccepted = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.status === "accepted",
  );
  const myDeclined = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.status === "declined",
  );

  // Only show section sync alerts for the currently active language
  const sectionUpdates: { lang: BulletinLanguage; sectionKey: string; notificationId: string }[] = [];
  if (activeLang !== "en" && activeLang !== "ko") {
    const sections = metaByLanguage[activeLang]?.sections ?? {};
    for (const [sectionKey, state] of Object.entries(sections)) {
      if (state.status !== "pending") continue;
      const notificationId = `${activeLang}:${sectionKey}:${state.enContentHash}`;
      if (seenSectionNotifications.has(notificationId)) continue;
      sectionUpdates.push({ lang: activeLang, sectionKey, notificationId });
    }
  }

  const hasNothing = incomingRequests.length === 0 && myPendingRequests.length === 0 && myAccepted.length === 0 && myDeclined.length === 0 && sectionUpdates.length === 0;

  return (
    <div className="notification-panel" style={{
      position: "fixed", top: 62, right: 0, bottom: 80, zIndex: 60,
      display: "flex", flexDirection: "column",
      width: "min(360px, 100vw)",
      background: "rgba(10,15,30,0.72)",
      backdropFilter: "blur(24px) saturate(1.8)",
      WebkitBackdropFilter: "blur(24px) saturate(1.8)",
      borderLeft: "1px solid rgba(255,255,255,0.10)",
      borderRadius: "16px 0 0 16px",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.45)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ flexShrink:0, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"#fff", fontWeight:900, fontSize:15 }}>
          <Bell size={17} /> Notifications
        </div>
        <button type="button" onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 4px" }} aria-label="Close notifications">×</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:14 }}>
        {hasNothing && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.38)", fontSize:13, marginTop:40 }}>
            No notifications
          </div>
        )}

        {/* Incoming takeover / join requests */}
        {incomingRequests.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Incoming Requests</div>
            {incomingRequests.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.22)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <UserCheck size={15} color="#FCA5A5" />
                  <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>
                    {n.fromUserName} {n.type === "join_request" ? "wants to join as collaborator" : "wants to edit"} {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}
                  </span>
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  <button type="button" onClick={() => onGrant(n)} style={{ flex:1, padding:"7px 0", borderRadius:8, border:"none", background:"rgba(34,197,94,0.85)", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <CheckCircle size={13} /> {n.type === "join_request" ? "Allow" : "Grant Access"}
                  </button>
                  <button type="button" onClick={() => onDecline(n)} style={{ padding:"7px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"rgba(255,255,255,0.6)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    <XCircle size={13} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* My pending outgoing requests */}
        {myPendingRequests.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Your Requests</div>
            {myPendingRequests.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(68,114,196,0.12)", border:"1px solid rgba(68,114,196,0.25)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:99, background:"#F59E0B", boxShadow:"0 0 6px rgba(245,158,11,0.6)", flexShrink:0 }} />
                  <span style={{ color:"rgba(255,255,255,0.8)", fontSize:12.5 }}>
                    Waiting for access to {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}…
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Access granted — requester sees this */}
        {myAccepted.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Access Granted</div>
            {myAccepted.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <CheckCircle size={15} color="#86EFAC" />
                  <span style={{ color:"#fff", fontSize:12.5, fontWeight:700 }}>
                    You now have access to {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Access declined — requester sees this */}
        {myDeclined.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Request Declined</div>
            {myDeclined.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.28)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <XCircle size={15} color="#FCA5A5" />
                  <span style={{ color:"rgba(255,255,255,0.85)", fontSize:12.5 }}>
                    Your {n.type === "join_request" ? "collaboration" : "takeover"} request for {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name} was declined.
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Section update notifications */}
        {sectionUpdates.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>English Updates Pending</div>
            {sectionUpdates.map(({ lang, sectionKey, notificationId }) => (
              <button
                type="button"
                key={notificationId}
                onClick={() => onSwitchToSection(lang, sectionKey, notificationId)}
                style={{ width:"100%", textAlign:"left", padding:"11px 14px", borderRadius:12, background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.22)", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}
              >
                <AlertTriangle size={14} color="#FCD34D" style={{ flexShrink:0 }} />
                <div>
                  <span style={{ color:"#fff", fontSize:12.5, fontWeight:700 }}>{sectionKey}</span>
                  <span style={{ color:"rgba(255,255,255,0.5)", fontSize:11.5 }}> · {LANGUAGE_CONFIG[lang].flag} {LANGUAGE_CONFIG[lang].name}</span>
                  <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11, marginTop:2 }}>English was updated — tap to review</div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function SectionEditorPanel({
  activeTab,
  data,
  set,
  onClose,
  language,
  meta,
  readOnly,
  onTakeOver,
  onPreviewSync,
  onApplySync,
  onDismissSync,
  presenceUsers,
  mySessionId,
}: {
  activeTab: TabId;
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
  onClose: () => void;
  language: BulletinLanguage;
  meta: BulletinMeta;
  readOnly: boolean;
  onTakeOver: () => void;
  onPreviewSync: (sectionKey: string) => void;
  onApplySync: (sectionKey: string) => void;
  onDismissSync: (sectionKey: string) => void;
  presenceUsers: Array<{ name: string; sessionId: string; language?: string }>;
  mySessionId: string;
}) {
  const section = SECTIONS.find((item) => item.id === activeTab);
  const sectionKey = TAB_SECTION_KEY[activeTab];
  const pendingSync = language !== "en" && language !== "ko" && meta.sections[sectionKey]?.status === "pending";

  const editor = (() => {
    switch (activeTab) {
      case "header":
        return <HeaderTab data={data} set={set} />;
      case "sermon":
        return <SermonTab data={data} set={set} />;
      case "services":
        return <ServicesTab data={data} set={set} />;
      case "bible":
        return <BibleReadingTab data={data} set={set} />;
      case "memory":
        return <MemoryVersesSidebarPanel data={data} set={set} />;
      case "cleaning":
        return <CleaningTab data={data} set={set} />;
      case "calendar":
        return <CalendarTab data={data} set={set} />;
      case "schedule":
        return <WeeklyScheduleTab data={data} set={set} />;
      case "news":
        return <NewsTab data={data} set={set} />;
      case "prayer":
        return <PrayerTab data={data} set={set} />;
      case "retreat":
        return <RetreatInfoPanel data={data} set={set} />;
    }
  })();

  return (
    <aside
      className="section-editor-panel"
      aria-label={`${section?.label ?? "Section"} editor`}
      style={{
        width: "min(420px, calc(100vw - 264px))",
        minWidth: 0,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#F8FAFC",
        borderRight: "1px solid #CBD5E1",
        boxShadow: "6px 0 18px rgba(15,23,42,0.08)",
        zIndex: 20,
      }}
    >
      <div style={{
        flexShrink: 0, height: 68, position: "relative",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "0 16px 0 18px",
      }}>
        {/* Blur + gradient tint layer */}
        <div style={{
          position: "absolute", inset: 0,
          backdropFilter: "blur(28px) saturate(2) brightness(1.08)",
          WebkitBackdropFilter: "blur(28px) saturate(2) brightness(1.08)",
          background: "linear-gradient(135deg,rgba(26,51,112,0.92) 0%,rgba(45,85,170,0.88) 55%,rgba(68,114,196,0.85) 100%)",
        }} />
        {/* Top-edge highlight gradient — glass surface gloss */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(175deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 45%, transparent 100%)",
          pointerEvents: "none",
        }} />
        {/* Bottom border + inner glow */}
        <div style={{
          position: "absolute", inset: 0,
          borderBottom: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          pointerEvents: "none",
        }} />
        {/* Content — sits above glass layers */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {section && (
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "grid", placeItems: "center",
              border: "1px solid rgba(255,255,255,0.2)",
            }}>
              <section.icon size={18} color="#fff" strokeWidth={2} />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Editing
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {section?.label}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close section editor"
          style={{
            position: "relative", zIndex: 1,
            width: 32, height: 32, flexShrink: 0,
            display: "grid", placeItems: "center", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.12)",
            color: "#fff", fontSize: 20, lineHeight: 1, cursor: "pointer",
            transition: "background 0.15s",
          }}
        >×</button>
      </div>
      {/* Presence viewers bar — shows others on this language */}
      {(() => {
        const viewers = presenceUsers.filter((u) => u.language === language && u.sessionId !== mySessionId);
        if (viewers.length === 0) return null;
        return (
          <div style={{ flexShrink: 0, padding: "5px 18px", background: "#EFF6FF", borderBottom: "1px solid #DBEAFE", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Eye size={11} color="#60A5FA" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: "#3B82F6", fontWeight: 600 }}>Also here:</span>
            {viewers.map((u) => {
              const c = presenceColorFor(u.name);
              return (
                <div key={u.sessionId} style={{ display: "flex", alignItems: "center", gap: 4, background: c.bg, color: c.text, borderRadius: 99, padding: "2px 8px 2px 4px", fontSize: 10.5, fontWeight: 700 }}>
                  <div style={{ width: 15, height: 15, borderRadius: "50%", background: c.text, color: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, flexShrink: 0 }}>
                    {presenceInitials(u.name)}
                  </div>
                  {u.name}
                </div>
              );
            })}
          </div>
        );
      })()}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "16px", background: "#F2F5FB" }}>
        {readOnly && (
          <div style={{ position:"sticky", top:0, zIndex:3, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:12, padding:"10px 12px", borderRadius:10, background:"rgba(30,58,138,0.92)", color:"#fff", boxShadow:"0 8px 24px rgba(15,23,42,0.18)" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:11.5, fontWeight:700 }}><Eye size={14} /> Viewing only — {LANGUAGE_CONFIG[language].name} is being edited</span>
            <button type="button" className="glass-secondary-button" onClick={onTakeOver}><UserCheck size={13} /> Request to Take Over</button>
          </div>
        )}
        {pendingSync && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:12, padding:"11px 12px", borderRadius:10, borderLeft:"3px solid #F59E0B", background:"rgba(251,191,36,0.15)", color:"#78350F" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:11.5, fontWeight:800 }}><AlertTriangle size={15} /> English updated this section</span>
            <div style={{ display:"flex", gap:7 }}>
              <button type="button" className="sync-banner-button" onClick={() => onPreviewSync(sectionKey)}>Preview ↗</button>
              <button type="button" className="sync-banner-button" onClick={() => onApplySync(sectionKey)} disabled={readOnly}>Apply</button>
              <button type="button" className="sync-banner-button" onClick={() => onDismissSync(sectionKey)} disabled={readOnly}>Dismiss</button>
            </div>
          </div>
        )}
        <div aria-disabled={readOnly} style={{ pointerEvents:readOnly ? "none" : "auto", opacity:readOnly ? 0.72 : 1 }}>
          {editor}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Comment thread panel component
// ---------------------------------------------------------------------------

function CommentPin({
  x,
  y,
  label,
  active = false,
  onClick,
}: {
  x: number;
  y: number;
  label?: string;
  active?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const marker = (
    <svg aria-hidden="true" width="32" height="40" viewBox="0 0 32 40" style={{ display: "block", overflow: "visible" }}>
      <path
        d="M16 39C14.2 34.2 3 26.3 3 16A13 13 0 0 1 29 16C29 26.3 17.8 34.2 16 39Z"
        fill="#4472C4"
        stroke="#fff"
        strokeWidth="2"
        style={{
          filter: active
            ? "drop-shadow(0 0 4px rgba(68,114,196,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.45))"
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
        }}
      />
      {label && (
        <text x="16" y="16.5" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontWeight="900" fontFamily="inherit">
          {label}
        </text>
      )}
    </svg>
  );
  const sharedStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: 32,
    height: 40,
    padding: 0,
    border: 0,
    background: "transparent",
    transform: "translate(-50%, -100%)",
  };

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={`Open comment by ${label || "Editor"}`}
        onClick={onClick}
        style={{ ...sharedStyle, cursor: "pointer", pointerEvents: "all" }}
      >
        {marker}
      </button>
    );
  }

  return <div style={{ ...sharedStyle, pointerEvents: "none" }}>{marker}</div>;
}

function CommentThreadPanel({ comment, style, onReply, onResolve, onClose }: {
  comment: BulletinComment;
  style: React.CSSProperties;
  onReply: (text: string) => void;
  onResolve: () => void;
  onClose: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const submit = () => {
    if (!replyText.trim()) return;
    onReply(replyText);
    setReplyText("");
  };
  const fmt = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });

  return (
    <div style={{
      width: 260,
      background: "rgba(10,15,30,0.92)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      overflow: "hidden",
      ...style,
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px 8px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <span style={{ color:"rgba(255,255,255,0.5)", fontSize:10.5 }}>{fmt(comment.createdAt)}</span>
        <div style={{ display:"flex", gap:6 }}>
          {!comment.resolved && (
            <button type="button" onClick={onResolve} title="Resolve" style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:"2px 7px", fontSize:10.5, display:"flex", alignItems:"center", gap:4 }}>
              <Check size={11} /> Resolve
            </button>
          )}
          <button type="button" onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 2px" }}>×</button>
        </div>
      </div>
      {/* Thread */}
      <div style={{ maxHeight: 240, overflowY:"auto", padding:"10px 14px" }}>
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
            <div style={{ width:22, height:22, borderRadius:"50%", background:"#4472C4", display:"grid", placeItems:"center", fontSize:10, fontWeight:900, color:"#fff", flexShrink:0 }}>
              {comment.author.charAt(0).toUpperCase()}
            </div>
            <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{comment.author}</span>
          </div>
          <p style={{ color:"rgba(255,255,255,0.82)", fontSize:12.5, margin:"0 0 0 29px", lineHeight:1.5 }}>{comment.text}</p>
        </div>
        {comment.replies.map(r => (
          <div key={r.id} style={{ marginBottom:8, paddingLeft:29 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(68,114,196,0.5)", display:"grid", placeItems:"center", fontSize:9, fontWeight:900, color:"#fff", flexShrink:0 }}>
                {r.author.charAt(0).toUpperCase()}
              </div>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700 }}>{r.author}</span>
            </div>
            <p style={{ color:"rgba(255,255,255,0.72)", fontSize:12, margin:0, lineHeight:1.5 }}>{r.text}</p>
          </div>
        ))}
      </div>
      {/* Reply input */}
      {!comment.resolved && (
        <div style={{ padding:"8px 14px 12px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", gap:7, alignItems:"flex-end" }}>
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="Reply…"
              style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, color:"#fff", fontSize:12, padding:"6px 9px", outline:"none", fontFamily:"inherit" }}
            />
            <button type="button" onClick={submit} disabled={!replyText.trim()} style={{ padding:"6px 8px", borderRadius:7, border:"none", background:"#4472C4", color:"#fff", cursor:"pointer", opacity:replyText.trim()?1:0.5, display:"flex", alignItems:"center" }}>
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
      {comment.resolved && (
        <div style={{ padding:"8px 14px 10px", textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:11 }}>Resolved</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// Layout: [framer sidebar hover-expand] [slide-in form panel] [Miro canvas]
// ---------------------------------------------------------------------------

export default function Home() {
  const historyStack = useRef<BulletinData[]>([]);
  const historyPos   = useRef(-1);
  const [historyStamp, setHistoryStamp] = useState(0);
  // Persist sessionId in sessionStorage so page refreshes reuse the same
  // identity and don't see their own lock as a conflict.
  const sessionId = useRef(
    (() => {
      const KEY = "bulletin-session-id";
      const stored = typeof sessionStorage !== "undefined" && sessionStorage.getItem(KEY);
      if (stored) return stored;
      const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(KEY, id);
      return id;
    })(),
  );
  const activeLangRef = useRef<BulletinLanguage>("en");

  const [data, setData]           = useState<BulletinData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [activeLang, setActiveLang] = useState<BulletinLanguage>("en");
  const [meta, setMeta] = useState<BulletinMeta>(() => defaultBulletinMeta("en"));
  const [metaByLanguage, setMetaByLanguage] = useState<Record<BulletinLanguage, BulletinMeta>>(() => ({
    en: defaultBulletinMeta("en"),
    es: defaultBulletinMeta("es"),
    ko: defaultBulletinMeta("ko"),
    zh: defaultBulletinMeta("zh"),
    ru: defaultBulletinMeta("ru"),
  }));
  const [locks, setLocks] = useState<LanguageLocks>({ en:null, es:null, ko:null, zh:null, ru:null });
  const [lockConflict, setLockConflict] = useState<{ language: BulletinLanguage; lock: LanguageLock } | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [syncPreviewSection, setSyncPreviewSection] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [mobileSetupOpen, setMobileSetupOpen] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [seenSectionNotifications, setSeenSectionNotifications] = useState<string[]>([]);
  // IDs of access-request notifications the user has already seen (panel opened while visible)
  const [seenNotifIds, setSeenNotifIds] = useState<string[]>([]);

  // Presence: list of all active users (including self), updated via PresenceModal callback
  const [presenceUsers, setPresenceUsers] = useState<Array<{ name: string; sessionId: string; language?: string; section?: string }>>([]);
  const [presenceMyName, setPresenceMyName] = useState("");
  const presenceMyNameRef = useRef("");
  // Notification-sound bookkeeping: signatures (id:status) we've already chimed for.
  // Seeded on the first poll so we don't play a sound for pre-existing notifications.
  const heardNotifSigsRef = useRef<Set<string> | null>(null);
  // Track which incoming-request toasts the user has dismissed from view (not from notifications)
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);

  // Comment system state
  const [comments, setComments] = useState<BulletinComment[]>([]);
  const [draftPin, setDraftPin] = useState<{ rx: number; ry: number } | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentDraftText, setCommentDraftText] = useState("");
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
  const [spacePanning, setSpacePanning] = useState(false);
  const spaceHeld = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const spacePointer = useRef<{ x: number; y: number } | null>(null);
  const canvasModeRef = useRef<CanvasMode>("grab");
  const interactionMode: CanvasMode = spacePanning ? "grab" : canvasMode;

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

  const postLockAction = useCallback(async (
    action: "acquire" | "release" | "heartbeat" | "takeover",
    language: BulletinLanguage,
  ) => {
    const response = await fetch("/api/locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, lang:language, sessionId:sessionId.current, userName:presenceMyNameRef.current || "Editor" }),
      keepalive: action === "release",
    });
    return response.json() as Promise<{ ok: boolean; lock?: LanguageLock }>;
  }, []);

  const releaseActiveAccess = useCallback(() => {
    void postLockAction("release", activeLangRef.current).catch(() => undefined);
  }, [postLockAction]);

  const loadLanguage = useCallback(async (language: BulletinLanguage): Promise<BulletinMeta> => {
    const response = await fetch(`/api/bulletin/${language}`, { cache:"no-store" });
    if (!response.ok) throw new Error(`Unable to load ${language} bulletin`);
    const payload = await response.json() as BulletinApiResponse;
    const bulletin = payload.data;

    if (language === "en" && bulletin.date) {
      try {
        const autoResponse = await fetch(`/api/auto-populate?date=${encodeURIComponent(bulletin.date)}`);
        if (autoResponse.ok) {
          const { dates, reading1, reading2 } = await autoResponse.json();
          bulletin.bibleReadingDates = dates;
          bulletin.bibleReading1 = reading1;
          bulletin.bibleReading2 = reading2;
        }
      } catch {}
    }

    setData(bulletin);
    setMeta(payload.meta);
    setMetaByLanguage((current) => ({ ...current, [language]: payload.meta }));
    historyStack.current = [bulletin];
    historyPos.current = 0;
    setHistoryStamp((stamp) => stamp + 1);

    const [calendarMonth, calendarYear] = String(bulletin.calendarMonth ?? "").split("/").map(Number);
    const initialMonth = calendarMonth && calendarYear
      ? `${calendarYear}-${String(calendarMonth).padStart(2, "0")}`
      : monthFromBulletinDate(bulletin.date ?? "");
    if (initialMonth) {
      setSelectedMonth(initialMonth);
      const [month, day, year] = String(bulletin.date).split("/").map(Number);
      const selectedDate = new Date(year, month - 1, day);
      const sunday = addLocalDays(selectedDate, -selectedDate.getDay());
      const weekIndex = getBulletinWeeks(initialMonth).findIndex((week) => week.startIso === localIso(sunday));
      setSelectedWeekIndex(Math.max(0, weekIndex));
    }

    return payload.meta;
  }, []);

  const refreshLanguageStatus = useCallback(async () => {
    try {
      const [locksResponse, ...languageResponses] = await Promise.all([
        fetch("/api/locks", { cache:"no-store" }),
        ...BULLETIN_LANGUAGES.map((language) => fetch(`/api/bulletin/${language}`, { cache:"no-store" })),
      ]);
      if (locksResponse.ok) setLocks(await locksResponse.json());
      const updates: Partial<Record<BulletinLanguage, BulletinMeta>> = {};
      for (let index = 0; index < BULLETIN_LANGUAGES.length; index += 1) {
        if (!languageResponses[index].ok) continue;
        const payload = await languageResponses[index].json() as BulletinApiResponse;
        const language = BULLETIN_LANGUAGES[index];
        updates[language] = payload.meta;
        if (language === activeLangRef.current) setMeta(payload.meta);
      }
      setMetaByLanguage((current) => ({ ...current, ...updates }));
    } catch {}
  }, []);

  const buildSectionNotificationId = useCallback((language: BulletinLanguage, sectionKey: string) => {
    const hash = metaByLanguage[language]?.sections?.[sectionKey]?.enContentHash ?? "pending";
    return `${language}:${sectionKey}:${hash}`;
  }, [metaByLanguage]);

  const markSectionNotificationSeen = useCallback((notificationId: string) => {
    setSeenSectionNotifications((current) => (current.includes(notificationId) ? current : [...current, notificationId]));
  }, []);

  // Wait for presence name before acquiring lock — presence POST evicts old same-name
  // sessions and releases their locks, so acquiring before that causes a false conflict.
  useEffect(() => {
    if (!presenceMyName) return;
    let cancelled = false;
    (async () => {
      const acquisition = await postLockAction("acquire", "en");
      if (cancelled) return;
      if (!acquisition.ok && acquisition.lock) setLockConflict({ language:"en", lock:acquisition.lock });
      await loadLanguage("en");
      await refreshLanguageStatus();
    })().catch(() => setSavedMsg("Unable to load bulletin"));
    return () => { cancelled = true; };
  }, [presenceMyName, loadLanguage, postLockAction, refreshLanguageStatus]);

  useEffect(() => {
    const interval = window.setInterval(refreshLanguageStatus, 30_000);
    return () => window.clearInterval(interval);
  }, [refreshLanguageStatus]);

  useEffect(() => {
    const pendingIds = new Set<string>();
    for (const language of BULLETIN_LANGUAGES) {
      const sections = metaByLanguage[language]?.sections ?? {};
      for (const [sectionKey, state] of Object.entries(sections)) {
        if (state.status === "pending") pendingIds.add(`${language}:${sectionKey}:${state.enContentHash}`);
      }
    }
    setSeenSectionNotifications((current) => {
      const next = current.filter((id) => pendingIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [metaByLanguage]);

  const pollNotifications = useCallback(async () => {
    const res = await fetch(`/api/notifications?sessionId=${sessionId.current}`, { cache:"no-store" });
    if (!res.ok) return;
    const fresh = await res.json() as AppNotification[];
    setNotifications(fresh);

    // Play a chime for anything freshly arriving that concerns me: an incoming
    // request/transfer aimed at me, or a resolution (accept/decline) of a request
    // I sent. Signature includes status so a status change re-triggers the sound.
    const forMe = fresh.filter(
      (n) =>
        n.targetSessionId === sessionId.current ||
        (n.fromSessionId === sessionId.current && n.status !== "pending"),
    );
    const sigs = forMe.map((n) => `${n.id}:${n.status}`);
    if (heardNotifSigsRef.current === null) {
      heardNotifSigsRef.current = new Set(sigs); // seed on first poll — no sound on load
    } else {
      const heard = heardNotifSigsRef.current;
      if (sigs.some((s) => !heard.has(s))) playNotificationChime();
      for (const s of sigs) heard.add(s);
    }

    // Auto-acquire lock when a takeover request we sent gets accepted.
    // Works for both viewers and collaborators requesting full control.
    const takeoverAccepted = fresh.find(
      (n) => n.type === "takeover_request" && n.fromSessionId === sessionId.current && n.status === "accepted",
    );
    if (takeoverAccepted && (readOnly || isCollaborator) && activeLangRef.current === takeoverAccepted.lang) {
      const acquisition = await postLockAction("acquire", takeoverAccepted.lang);
      if (acquisition.ok) {
        setReadOnly(false);
        setIsCollaborator(false);
        await loadLanguage(takeoverAccepted.lang);
        await refreshLanguageStatus();
      }
    }

    // When a join_request we sent gets accepted, become a collaborator
    const joinAccepted = fresh.find(
      (n) => n.type === "join_request" && n.fromSessionId === sessionId.current && n.status === "accepted",
    );
    if (joinAccepted && readOnly && activeLangRef.current === joinAccepted.lang) {
      await fetch("/api/locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-collaborator", lang: joinAccepted.lang, sessionId: sessionId.current }),
      });
      setIsCollaborator(true);
      setReadOnly(false);
    }
    // The editor handed the role to me — claim the lock and become the editor.
    const editorGranted = fresh.find(
      (n) => n.type === "editor_transferred" && n.targetSessionId === sessionId.current && n.status === "pending",
    );
    if (editorGranted && activeLangRef.current === editorGranted.lang) {
      const acquisition = await postLockAction("acquire", editorGranted.lang);
      if (acquisition.ok) {
        setReadOnly(false);
        setIsCollaborator(false);
        await loadLanguage(editorGranted.lang);
        await refreshLanguageStatus();
      }
      // Mark consumed so it isn't reprocessed on the next poll.
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editorGranted.id, status: "accepted", sessionId: sessionId.current }),
      });
    }

    // Declined requests surface inline on the AccessControlBar — no forced panel.
  }, [loadLanguage, postLockAction, readOnly, isCollaborator, refreshLanguageStatus]);

  useEffect(() => {
    pollNotifications();
    const interval = window.setInterval(pollNotifications, 5_000);
    return () => window.clearInterval(interval);
  }, [pollNotifications]);

  // When the notification panel opens, mark everything currently visible as seen so the
  // bell badge clears — access requests (as sender or target) and pending section updates.
  useEffect(() => {
    if (!notifPanelOpen) return;
    const requestIds = notifications
      .filter((n) => isAccessRequestNotification(n) && (n.fromSessionId === sessionId.current || n.targetSessionId === sessionId.current))
      .map((n) => n.id);
    setSeenNotifIds((prev) => {
      const newIds = requestIds.filter((id) => !prev.includes(id));
      return newIds.length > 0 ? [...prev, ...newIds] : prev;
    });
    if (activeLang !== "en" && activeLang !== "ko") {
      const sectionIds = Object.entries(metaByLanguage[activeLang]?.sections ?? {})
        .filter(([, state]) => state.status === "pending")
        .map(([sectionKey]) => buildSectionNotificationId(activeLang, sectionKey));
      setSeenSectionNotifications((prev) => {
        const newIds = sectionIds.filter((id) => !prev.includes(id));
        return newIds.length > 0 ? [...prev, ...newIds] : prev;
      });
    }
  }, [notifPanelOpen, notifications, activeLang, metaByLanguage, buildSectionNotificationId]);

  const pollComments = useCallback(async () => {
    const res = await fetch("/api/comments", { cache: "no-store" });
    if (res.ok) setComments(await res.json());
  }, []);

  useEffect(() => {
    pollComments();
    const interval = window.setInterval(pollComments, 10_000);
    return () => window.clearInterval(interval);
  }, [pollComments]);

  useEffect(() => {
    if (readOnly || isCollaborator) return;
    const interval = window.setInterval(() => {
      postLockAction("heartbeat", activeLang).catch(() => undefined);
    }, 45_000);
    return () => window.clearInterval(interval);
  }, [activeLang, isCollaborator, postLockAction, readOnly]);

  useEffect(() => {
    const handlePageExit = () => {
      // sendBeacon is guaranteed to fire even as the tab closes; fetch/keepalive is not.
      const payload = JSON.stringify({
        action: "release",
        lang: activeLangRef.current,
        sessionId: sessionId.current,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/locks", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/locks", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
      }
    };
    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);
    return () => {
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
    };
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

  // Mobile browsers can report a desktop-like layout width during startup and
  // then settle on the real visual viewport. Refit after resize/orientation
  // changes so the bulletin never remains cropped at the stale zoom level.
  useEffect(() => {
    const handleResize = () => {
      if (activeTab) return;
      window.requestAnimationFrame(fitToScreen);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab, fitToScreen]);

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
      el.style.cursor = canvasMode === "grab" ? "grab" : canvasMode === "comment" ? "crosshair" : "default";
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
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) {
          spaceHeld.current = true;
          spacePointer.current = lastPointer.current;
          setSpacePanning(true);
        }
      }
      // Undo / Redo — only when not in an editable element
      if (!editing && (e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyPos.current > 0) {
          historyPos.current--;
          setData(historyStack.current[historyPos.current]);
          setHistoryStamp(s => s + 1);
        }
        return;
      }
      if (!editing && (e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (historyPos.current < historyStack.current.length - 1) {
          historyPos.current++;
          setData(historyStack.current[historyPos.current]);
          setHistoryStamp(s => s + 1);
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "v" || e.key === "V") setCanvasMode("select");
        if (e.key === "h" || e.key === "H") setCanvasMode("grab");
        if (e.key === "c" || e.key === "C") setCanvasMode("comment");
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceHeld.current = false;
      spacePointer.current = null;
      setSpacePanning(false);
    };
    const blurHandler = () => {
      spaceHeld.current = false;
      spacePointer.current = null;
      setSpacePanning(false);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", upHandler);
    window.addEventListener("blur", blurHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", upHandler);
      window.removeEventListener("blur", blurHandler);
    };
  }, [applyTransform, fitToScreen]);

  const canUndo = historyPos.current > 0;
  const canRedo = historyPos.current < historyStack.current.length - 1;

  const patch = useCallback((p: Partial<BulletinData>) => {
    if (readOnly) return;
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      historyStack.current = historyStack.current.slice(0, historyPos.current + 1);
      historyStack.current.push(next);
      if (historyStack.current.length > 60) historyStack.current = historyStack.current.slice(-60);
      historyPos.current = historyStack.current.length - 1;
      return next;
    });
    setHistoryStamp(s => s + 1);
  }, [readOnly]);

  const submitComment = async () => {
    if (!draftPin || !commentDraftText.trim()) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rx: draftPin.rx, ry: draftPin.ry, author: presenceMyName || "Editor", text: commentDraftText }),
    });
    if (res.ok) {
      const created = await res.json() as BulletinComment;
      setComments(prev => [...prev, created]);
      setActiveCommentId(created.id);
      setDraftPin(null);
      setCommentDraftText("");
    }
  };

  const submitReply = async (commentId: string, text: string) => {
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId, reply: { author: presenceMyName || "Editor", text } }),
    });
    if (res.ok) {
      const updated = await res.json() as BulletinComment;
      setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
    }
  };

  const resolveComment = async (commentId: string) => {
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId, resolved: true }),
    });
    if (res.ok) {
      const updated = await res.json() as BulletinComment;
      setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (activeCommentId === commentId) setActiveCommentId(null);
    }
  };

  const dismissPendingSection = async (sectionKey: string) => {
    setMeta(m => ({
      ...m,
      sections: { ...m.sections, [sectionKey]: { ...m.sections[sectionKey], status: "dismissed" as const } },
    }));
    await fetch(`/api/bulletin/${activeLang}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionKey, action: "dismiss" }),
    });
  };

  const undo = useCallback(() => {
    if (historyPos.current <= 0) return;
    historyPos.current--;
    setData(historyStack.current[historyPos.current]);
    setHistoryStamp(s => s + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyPos.current >= historyStack.current.length - 1) return;
    historyPos.current++;
    setData(historyStack.current[historyPos.current]);
    setHistoryStamp(s => s + 1);
  }, []);

  const switchLanguage = async (language: BulletinLanguage) => {
    if (language === activeLang) return;
    if (!readOnly) await postLockAction("release", activeLang).catch(() => undefined);

    activeLangRef.current = language;
    setActiveLang(language);
    setActiveTab(null);
    setSyncPreviewSection(null);
    setReadOnly(false);
    setIsCollaborator(false);
    const loadedMeta = await loadLanguage(language);

    if (language !== "en" && !loadedMeta.initializedFromEn) {
      setTranslating(true);
      try {
        await fetch(`/api/bulletin/${language}/translate`, { method:"POST" });
        await loadLanguage(language);
      } finally {
        setTranslating(false);
      }
    }

    const acquisition = await postLockAction("acquire", language);
    if (!acquisition.ok && acquisition.lock) {
      setLockConflict({ language, lock:acquisition.lock });
    }
    await refreshLanguageStatus();
  };

  const takeOverLanguage = async (language: BulletinLanguage = activeLang) => {
    const takeover = await postLockAction("takeover", language);
    if (!takeover.ok) return;
    activeLangRef.current = language;
    setActiveLang(language);
    setReadOnly(false);
    setLockConflict(null);
    await loadLanguage(language);
    await refreshLanguageStatus();
  };

  const requestTakeover = async (language: BulletinLanguage, lock: LanguageLock) => {
    setReadOnly(true);
    setLockConflict(null);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "takeover_request",
        lang: language,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyName || "Editor",
        targetSessionId: lock.sessionId,
      }),
    });
    setNotifPanelOpen(true);
    await pollNotifications();
  };

  const requestJoin = async (language: BulletinLanguage, lock: LanguageLock) => {
    setLockConflict(null);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "join_request",
        lang: language,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyName || "Editor",
        targetSessionId: lock.sessionId,
      }),
    });
    setReadOnly(true);
    setNotifPanelOpen(true);
    await pollNotifications();
  };

  // Fire an access request from the persistent AccessControlBar (no panel auto-open).
  const sendAccessRequest = async (type: "takeover_request" | "join_request") => {
    const holder = locks[activeLang];
    if (!holder) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        lang: activeLang,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyNameRef.current || "Editor",
        targetSessionId: holder.sessionId,
      }),
    });
    await pollNotifications();
  };

  // Withdraw a pending request I sent.
  const cancelAccessRequest = async (id: string) => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sessionId: sessionId.current }),
    });
    await pollNotifications();
  };

  // Leave collaboration — drop back to view-only without closing the tab.
  const leaveCollaboration = async () => {
    await postLockAction("release", activeLang); // removes me from the lock's collaborators
    setIsCollaborator(false);
    setReadOnly(true);
    await refreshLanguageStatus();
  };

  // Hand the editor role to another present user in the same language.
  // The lock is reassigned to them; I drop to view-only. A notification tells
  // them to promote themselves immediately (rather than wait for the 30s poll).
  const transferEditor = async (target: { sessionId: string; name: string }) => {
    const res = await fetch("/api/locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "transfer",
        lang: activeLang,
        sessionId: sessionId.current,
        targetSessionId: target.sessionId,
        targetUserName: target.name,
      }),
    });
    const data = await res.json() as { ok: boolean };
    if (!data.ok) {
      await refreshLanguageStatus();
      return;
    }
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "editor_transferred",
        lang: activeLang,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyNameRef.current || "Editor",
        targetSessionId: target.sessionId,
      }),
    });
    setReadOnly(true);
    setIsCollaborator(false);
    await refreshLanguageStatus();
    await pollNotifications();
  };

  const grantLockAccess = async (notif: AppNotification) => {
    if (notif.type === "join_request") {
      // Add requester as collaborator — don't release own lock
      await fetch("/api/locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-collaborator",
          lang: notif.lang,
          sessionId: sessionId.current,
          targetSessionId: notif.fromSessionId,
        }),
      });
    } else {
      // takeover_request — release own lock and drop to read-only for that language
      await postLockAction("release", notif.lang);
      if (notif.lang === activeLangRef.current) {
        setReadOnly(true);
        setIsCollaborator(false);
      }
    }
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notif.id, status: "accepted", sessionId: sessionId.current }),
    });
    await pollNotifications();
    await refreshLanguageStatus();
  };

  const declineTakeover = async (notif: AppNotification) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notif.id, status: "declined", sessionId: sessionId.current }),
    });
    await pollNotifications();
  };

  const applyEnglishSection = async (sectionKey: string) => {
    if (readOnly || activeLang === "en" || activeLang === "ko") return;
    const response = await fetch(`/api/bulletin/${activeLang}/apply`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ sectionKey }),
    });
    if (!response.ok) return;
    const payload = await response.json() as BulletinApiResponse;
    setData(payload.data);
    setMeta(payload.meta);
    setMetaByLanguage((current) => ({ ...current, [activeLang]:payload.meta }));
    historyStack.current = [payload.data];
    historyPos.current = 0;
    setSyncPreviewSection(null);
  };

  const dismissEnglishSection = async (sectionKey: string) => {
    if (readOnly || activeLang === "en" || activeLang === "ko") return;
    const response = await fetch(`/api/bulletin/${activeLang}/dismiss`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ sectionKey }),
    });
    if (!response.ok) return;
    const payload = await response.json() as { meta: BulletinMeta };
    setMeta(payload.meta);
    setMetaByLanguage((current) => ({ ...current, [activeLang]:payload.meta }));
    setSyncPreviewSection(null);
  };

  const save = async () => {
    if (!data || readOnly) return;
    setSaving(true);
    const sectionKey = activeTab ? TAB_SECTION_KEY[activeTab] : undefined;
    const res = await fetch(`/api/bulletin/${activeLang}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, sectionKey }),
    });
    setSaving(false);
    setSavedMsg(res.ok ? "Saved!" : "Error saving");
    if (res.ok) await refreshLanguageStatus();
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const handleGenerateWeek = async () => {
    if (readOnly) return;
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
    await loadLanguage(activeLang);
    loadMgmt();
  };

  function handleSectionClick(id: TabId) {
    const isClosing = activeTab === id;
    setActiveTab(isClosing ? null : id);
    setMobileSetupOpen(false);
    if (isClosing) return;

    const sectionKey = TAB_SECTION_KEY[id];
    const sectionMeta = metaByLanguage[activeLang]?.sections?.[sectionKey];
    if (sectionMeta?.status === "pending") {
      markSectionNotificationSeen(buildSectionNotificationId(activeLang, sectionKey));
    }

    // Wait for the editor panel to take up its final width before centering the
    // selected bulletin section in the remaining canvas.
    window.requestAnimationFrame(() => {
      const target = SECTION_ZOOM[id];
      const el = canvasRef.current;
      if (!el) return;
      const cW = el.clientWidth, cH = el.clientHeight;
      const targetZ = Math.min(Math.max((cH * 0.60) / target.h, 0.35), 2.8);
      applyTransform(cW / 2 - target.cx * targetZ, cH / 2 - target.cy * targetZ, targetZ, true);
    });
  }

  // Drag / zoom / select handlers — behaviour depends on canvasMode
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (spaceHeld.current) return;
    const effective = canvasModeRef.current;
    if (effective === "grab") {
      dragging.current = true;
      dragOrigin.current = { mx: e.clientX, my: e.clientY, tx: transformRef.current.x, ty: transformRef.current.y };
      (e.currentTarget as HTMLDivElement).style.cursor = "grabbing";
    }
    // select mode: do nothing — let clicks propagate to BulletinPreview
  }
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const pointer = { x: e.clientX, y: e.clientY };
    lastPointer.current = pointer;
    if (spaceHeld.current) {
      const previous = spacePointer.current;
      spacePointer.current = pointer;
      if (previous) {
        applyTransform(
          transformRef.current.x + pointer.x - previous.x,
          transformRef.current.y + pointer.y - previous.y,
          transformRef.current.z,
        );
      }
      return;
    }
    if (!dragging.current) return;
    const { mx, my, tx, ty } = dragOrigin.current;
    applyTransform(tx + e.clientX - mx, ty + e.clientY - my, transformRef.current.z);
  }
  function onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    dragging.current = false;
    if (e.type === "mouseleave") {
      lastPointer.current = null;
      spacePointer.current = null;
    }
    const m = spaceHeld.current ? "grab" : canvasModeRef.current;
    (e.currentTarget as HTMLDivElement).style.cursor =
      m === "grab" ? "grab" : "default";
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
    <div className="editor-shell" style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Global liquid glass SVG filter (shared by toolbar, nav, panel header) ── */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <filter id="radio-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
            <feGaussianBlur {...{"in": "turbulence"}} stdDeviation="2" result="blurredNoise" />
            <feDisplacementMap {...{"in": "SourceGraphic", "in2": "blurredNoise"}} scale="30" xChannelSelector="R" yChannelSelector="B" result="displaced" />
            <feGaussianBlur {...{"in": "displaced"}} stdDeviation="2" result="finalBlur" />
            <feComposite {...{"in": "finalBlur", "in2": "finalBlur"}} operator="over" />
          </filter>
        </defs>
      </svg>

      <PresenceModal
        currentLanguage={activeLang}
        currentSection={activeTab ?? ""}
        onUsersChange={(all, myName, mySessionId) => {
          // Deduplicate by name — prefer the current session's own entry so self is always shown once
          const self = all.filter(u => u.sessionId === mySessionId);
          const others = all.filter(u => u.sessionId !== mySessionId);
          const seen = new Set<string>(self.map(u => u.name));
          const deduped = [...self, ...others.filter(u => !seen.has(u.name) && seen.add(u.name))];
          setPresenceUsers(deduped);
          setPresenceMyName(myName);
          presenceMyNameRef.current = myName;
        }}
      />

      {/* Floating request toasts — visible without opening the notification panel */}
      <NotificationToast
        notifications={notifications}
        sessionId={sessionId.current}
        dismissedToastIds={dismissedToastIds}
        onGrant={grantLockAccess}
        onDecline={declineTakeover}
        onDismissToast={(id) => setDismissedToastIds((prev) => [...prev, id])}
      />

      {uploadTarget && (
        <UploadModal
          name={uploadTarget === "reading" ? "Year Reading Plan" : "Monthly Schedule"}
          uploadType={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSaved={() => { setUploadTarget(null); refreshBulletin(); }}
        />
      )}

      {/* ── Figma-style layers sidebar (always visible) ── */}
      <LanguageTabBar
        activeLanguage={activeLang}
        metaByLanguage={metaByLanguage}
        locks={locks}
        sessionId={sessionId.current}
        onSelect={switchLanguage}
        presenceUsers={presenceUsers}
        mySessionId={sessionId.current}
      />

      {lockConflict && (
        <LockModal
          language={lockConflict.language}
          lock={lockConflict.lock}
          onViewOnly={() => { setReadOnly(true); setLockConflict(null); }}
          onRequestTakeover={() => requestTakeover(lockConflict.language, lockConflict.lock)}
          onRequestJoin={() => requestJoin(lockConflict.language, lockConflict.lock)}
        />
      )}

      {notifPanelOpen && (
        <NotificationPanel
          notifications={notifications}
          metaByLanguage={metaByLanguage}
          activeLang={activeLang}
          sessionId={sessionId.current}
          seenSectionNotifications={new Set(seenSectionNotifications)}
          onGrant={grantLockAccess}
          onDecline={declineTakeover}
          onSwitchToSection={(lang, sectionKey, notificationId) => {
            markSectionNotificationSeen(notificationId);
            void switchLanguage(lang);
            setActiveTab(Object.entries(TAB_SECTION_KEY).find(([, k]) => k === sectionKey)?.[0] as TabId ?? null);
            setNotifPanelOpen(false);
          }}
          onClose={() => setNotifPanelOpen(false)}
        />
      )}

      {translating && (
        <div className="multilang-modal-backdrop" role="status" aria-live="polite">
          <div className="multilang-modal-card" style={{ width:"min(380px, calc(100vw - 32px))", textAlign:"center" }}>
            <div style={{ fontSize:34, marginBottom:12 }} aria-hidden>{LANGUAGE_CONFIG[activeLang]?.flag}</div>
            <div style={{ color:"#fff", fontSize:16, fontWeight:700, marginBottom:8 }}>
              {LANGUAGE_CONFIG[activeLang]?.name} Bulletin
            </div>
            <div style={{ color:"rgba(255,255,255,0.72)", fontSize:13 }}>Translating…</div>
          </div>
        </div>
      )}

      {syncPreviewSection && data && (
        <SyncPreviewModal
          sectionKey={syncPreviewSection}
          currentData={data}
          meta={meta}
          onClose={() => setSyncPreviewSection(null)}
          onKeepMine={() => dismissEnglishSection(syncPreviewSection)}
          onUseEnglish={() => applyEnglishSection(syncPreviewSection)}
        />
      )}

      <div className="mobile-toolbar">
        <div className="mobile-toolbar-row">
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ width:30, height:30, objectFit:"contain", flexShrink:0 }} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:900, color:"#1E3A8A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>NEW YORK CHURCH</div>
              <div style={{ fontSize:10.5, color:"#64748B" }}>{data?.date ?? "Loading…"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
            <button type="button" onClick={() => setMobileSetupOpen(true)} className="mobile-top-button">Setup</button>
            <button type="button" onClick={save} disabled={saving || !data || readOnly} className="mobile-top-button mobile-save-button">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div className="mobile-section-tabs" aria-label="Bulletin sections">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button type="button" key={section.id} onClick={() => handleSectionClick(section.id)} className={activeTab === section.id ? "mobile-section-tab active" : "mobile-section-tab"}>
                <Icon size={14} strokeWidth={2} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={mobileSetupOpen ? "editor-sidebar mobile-setup-open" : "editor-sidebar"} style={{
        width: 264, flexShrink: 0, height: "100%",
        background: "#fff",
        borderRight: "1px solid #E2E8F0",
        display: "flex", flexDirection: "column",
        overflow: "hidden", zIndex: 30,
      }}>
        {/* Logo header */}
        <div style={{ flexShrink: 0, borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 16px", gap: 11 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#1E3A8A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>NEW YORK CHURCH</div>
              <div style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap" }}>Bulletin Editor</div>
            </div>
            <button type="button" className="mobile-setup-close" onClick={() => setMobileSetupOpen(false)} aria-label="Close setup">×</button>
          </div>
          {/* Online users strip */}
          {presenceUsers.length > 0 && (
            <div style={{ padding: "5px 16px 8px", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              {presenceUsers.map((u) => {
                const isSelf = u.sessionId === sessionId.current;
                const c = presenceColorFor(u.name);
                return (
                  <div
                    key={u.sessionId}
                    title={isSelf ? `${u.name} (you)` : u.name}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: c.bg, color: c.text,
                      border: `1.5px solid ${isSelf ? c.text + "55" : "transparent"}`,
                      borderRadius: 99, padding: "3px 8px 3px 4px",
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: c.text, color: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, flexShrink: 0 }}>
                      {presenceInitials(u.name)}
                    </div>
                    {u.name}{isSelf ? " ✏" : ""}
                  </div>
                );
              })}
            </div>
          )}
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
              disabled={!selectedWeek || generatingWeek || readOnly}
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
            <div key={sec.id}>
              <NavItem
                icon={sec.icon}
                label={sec.label}
                isActive={activeTab === sec.id}
                onClick={() => handleSectionClick(sec.id)}
              />
            </div>
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
            disabled={saving || !data || readOnly}
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
      {activeTab && data && (
        <SectionEditorPanel
          activeTab={activeTab}
          data={data}
          set={patch}
          onClose={() => setActiveTab(null)}
          language={activeLang}
          meta={meta}
          readOnly={readOnly}
          onTakeOver={() => { const lock = locks[activeLang]; if (lock) requestTakeover(activeLang, lock); else takeOverLanguage(activeLang); }}
          onPreviewSync={setSyncPreviewSection}
          onApplySync={applyEnglishSection}
          onDismissSync={dismissEnglishSection}
          presenceUsers={presenceUsers}
          mySessionId={sessionId.current}
        />
      )}

      <div
        className="editor-canvas"
        ref={canvasRef}
        style={{ flex: 1, minWidth: 0, height: "100%", background: "#1C1C2B", overflow: "hidden", position: "relative", cursor: interactionMode === "grab" ? "grab" : interactionMode === "comment" ? "crosshair" : "default", userSelect: interactionMode === "select" ? "auto" : "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={() => { /* comment clicks handled by overlay inside pdfZoomRef */ }}
      >
        {data ? (
          /* Pan layer — translate only */
          <div ref={pdfPanRef} style={{ position: "absolute", left: 0, top: 0, willChange: "transform" }}>
            {/* Zoom layer — CSS zoom for crisp text re-rasterize */}
            <div ref={pdfZoomRef} style={{ width: PAGE_W, transformOrigin: "0 0", pointerEvents: interactionMode === "grab" ? "none" : "auto", position: "relative" }}>
              <BulletinPreview
                data={data}
                onUpdate={interactionMode === "grab" || readOnly ? undefined : patch}
                pendingDiffs={
                  activeLang !== "en" && activeLang !== "ko"
                    ? Object.fromEntries(
                        Object.entries(meta.sections)
                          .filter(([, s]) => s.status === "pending" && s.pendingEnContent)
                          .map(([k, s]) => [k, s.pendingEnContent!])
                      )
                    : undefined
                }
                onDismissPending={activeLang !== "en" && activeLang !== "ko" ? dismissPendingSection : undefined}
              />
              <BulletinFitController fitKey={JSON.stringify(data)} />

              {/* Comment mode click-capture overlay — must be inside zoom layer for correct coordinates */}
              {interactionMode === "comment" && (
                <div
                  style={{ position: "absolute", top: 0, left: 0, width: PAGE_W, height: PAGE_H * 2 + 4, zIndex: 19, cursor: "crosshair" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const zoomEl = pdfZoomRef.current;
                    if (!zoomEl) return;
                    const rect = zoomEl.getBoundingClientRect();
                    // Use the scale that is actually rendered at click time.
                    // style.zoom is the animation target and can briefly differ
                    // from the scale visible under the pointer.
                    const renderedZoom = rect.width / PAGE_W || 1;
                    const localX = (e.clientX - rect.left) / renderedZoom;
                    const localY = (e.clientY - rect.top) / renderedZoom;
                    const TOTAL_H = PAGE_H * 2 + 4;
                    setDraftPin({ rx: Math.max(0, Math.min(1, localX / PAGE_W)), ry: Math.max(0, Math.min(1, localY / TOTAL_H)) });
                    setActiveCommentId(null);
                    setCommentDraftText("");
                  }}
                />
              )}

              {/* Comment pins overlay — lives inside zoom layer so pins scale with content */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: PAGE_W, height: PAGE_H * 2 + 4,
                pointerEvents: "none", zIndex: 20,
              }}>
                {/* Draft pin being placed */}
                {draftPin && (
                  <CommentPin
                    x={draftPin.rx * PAGE_W}
                    y={draftPin.ry * (PAGE_H * 2 + 4)}
                  />
                )}
                {/* Existing pins — resolved ones are hidden */}
                {comments.filter(c => !c.resolved).map(c => (
                  <CommentPin
                    key={c.id}
                    x={c.rx * PAGE_W}
                    y={c.ry * (PAGE_H * 2 + 4)}
                    label={c.author.charAt(0).toUpperCase()}
                    active={activeCommentId === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCommentId(c.id === activeCommentId ? null : c.id);
                      setDraftPin(null);
                    }}
                  />
                ))}
              </div>

              {/* Active comment thread panel */}
              {activeCommentId && (() => {
                const c = comments.find(x => x.id === activeCommentId);
                if (!c) return null;
                const TOTAL_H = PAGE_H * 2 + 4;
                const pinX = c.rx * PAGE_W;
                const pinY = c.ry * TOTAL_H;
                const panelLeft = Math.min(pinX + 20, PAGE_W - 270);
                const panelTop = Math.min(pinY - 10, TOTAL_H - 200);
                return (
                  <CommentThreadPanel
                    comment={c}
                    style={{ position: "absolute", left: panelLeft, top: panelTop, zIndex: 30, pointerEvents: "all" }}
                    onReply={(text) => submitReply(c.id, text)}
                    onResolve={() => resolveComment(c.id)}
                    onClose={() => setActiveCommentId(null)}
                  />
                );
              })()}

              {/* Draft comment input box */}
              {draftPin && (
                <div style={{
                  position: "absolute",
                  left: Math.min(draftPin.rx * PAGE_W + 20, PAGE_W - 270),
                  top: Math.min(draftPin.ry * (PAGE_H * 2 + 4) - 10, (PAGE_H * 2 + 4) - 140),
                  zIndex: 30, pointerEvents: "all",
                  width: 240,
                  background: "rgba(10,15,30,0.92)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  <textarea
                    autoFocus
                    value={commentDraftText}
                    onChange={e => setCommentDraftText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submitComment();
                      if (e.key === "Escape") { setDraftPin(null); setCommentDraftText(""); }
                    }}
                    placeholder="Leave a comment…"
                    rows={3}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, color: "#fff", fontSize: 12.5, padding: "8px 10px",
                      resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 8 }}>
                    <button type="button" onClick={() => { setDraftPin(null); setCommentDraftText(""); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 11.5, cursor: "pointer" }}>Cancel</button>
                    <button type="button" onClick={() => void submitComment()} disabled={!commentDraftText.trim()} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#4472C4", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", opacity: commentDraftText.trim() ? 1 : 0.5 }}>Post</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: "50%", border: "2.5px solid #3A3A52", borderTopColor: "#4472C4", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        <FloatingToolbar mode={canvasMode} onMode={setCanvasMode} onFit={fitToScreen} onExport={exportPDF} exporting={exporting} disabled={!data} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} notifCount={
  notifications.filter(n => isAccessRequestNotification(n) && (n.targetSessionId === sessionId.current || n.fromSessionId === sessionId.current) && !seenNotifIds.includes(n.id)).length +
  (activeLang !== "en" && activeLang !== "ko"
    ? Object.entries(metaByLanguage[activeLang]?.sections ?? {}).filter(([sectionKey, state]) =>
        state.status === "pending" && !seenSectionNotifications.includes(buildSectionNotificationId(activeLang, sectionKey))
      ).length
    : 0)
} onBell={() => setNotifPanelOpen((v) => !v)} />

        {/* Persistent access bar — centered over the canvas, directly above the toolbar */}
        <AnimatePresence>
          {locks[activeLang] && !lockConflict && (
            <AccessControlBar
              role={roleForSession(locks[activeLang], sessionId.current)}
              lock={locks[activeLang]!}
              language={activeLang}
              notifications={notifications}
              sessionId={sessionId.current}
              candidates={presenceUsers.filter((u) => u.language === activeLang && u.sessionId !== sessionId.current)}
              onRequestTakeover={() => sendAccessRequest("takeover_request")}
              onRequestJoin={() => sendAccessRequest("join_request")}
              onLeave={leaveCollaboration}
              onCancelRequest={cancelAccessRequest}
              onTransferEditor={transferEditor}
            />
          )}
        </AnimatePresence>
        {exportError && (
          <div style={{ position: "absolute", bottom: 80, right: 16, fontSize: 11, color: "#F87171", background: "#2A1A1A", border: "1px solid #7F1D1D", borderRadius: 6, padding: "5px 10px", pointerEvents: "all" }}>
            {exportError}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Pulsing glow for the "live — someone is editing" red dot */
        @keyframes livePulse {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(239,68,68,0.22), 0 0 4px 1px rgba(239,68,68,0.55);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(239,68,68,0.10), 0 0 10px 3px rgba(239,68,68,0.9);
          }
        }

        .mobile-toolbar,
        .mobile-setup-close {
          display: none;
        }

        .language-tab-bar {
          position: fixed;
          top: 10px;
          right: 16px;
          z-index: 80;
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 6px 8px;
          border: 1px solid rgba(226,232,240,0.9);
          border-radius: 999px;
          background: rgba(255,255,255,0.86);
          box-shadow: 0 8px 28px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
        }

        .multilang-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(7,10,24,0.72);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .multilang-modal-card {
          max-height: calc(100dvh - 32px);
          overflow: auto;
          padding: 22px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 18px;
          background: rgba(18,20,36,0.88);
          color: #fff;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.16);
          backdrop-filter: blur(28px) saturate(2) brightness(1.08);
          -webkit-backdrop-filter: blur(28px) saturate(2) brightness(1.08);
        }

        .glass-primary-button,
        .glass-secondary-button,
        .glass-icon-button,
        .sync-banner-button {
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .glass-primary-button,
        .glass-secondary-button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 13px;
        }

        .glass-primary-button {
          border: 1px solid rgba(147,197,253,0.35);
          background: rgba(68,114,196,0.88);
          color: #fff;
        }

        .glass-secondary-button {
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .glass-icon-button {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 20px;
        }

        .sync-banner-button {
          min-height: 28px;
          padding: 0 9px;
          border: 1px solid rgba(146,64,14,0.2);
          background: rgba(255,255,255,0.65);
          color: #92400E;
        }

        .sync-preview-card { width: min(900px, calc(100vw - 32px)); }
        .sync-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sync-column-title { margin-bottom: 8px; color: rgba(255,255,255,0.78); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
        .sync-field { margin-bottom: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; background: rgba(255,255,255,0.04); }
        .sync-field-label { margin-bottom: 5px; color: #93C5FD; font-size: 10px; font-weight: 900; }
        .sync-field pre { margin: 0; color: rgba(255,255,255,0.82); font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }

        @media (max-width: 720px) {
          .editor-shell {
            height: 100dvh !important;
            flex-direction: column !important;
          }

          .notification-panel {
            top: 165px !important;
            bottom: 90px !important;
            border-radius: 12px 0 0 12px !important;
          }

          .mobile-toolbar {
            display: flex;
            width: 100%;
            height: 108px;
            flex: 0 0 108px;
            flex-direction: column;
            overflow: hidden;
            background: #fff;
            border-bottom: 1px solid #CBD5E1;
            z-index: 40;
          }

          .language-tab-bar {
            top: 114px;
            left: 8px;
            right: 8px;
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .language-tab-bar::-webkit-scrollbar { display: none; }

          .sync-preview-grid { grid-template-columns: 1fr; }

          .mobile-toolbar-row {
            height: 58px;
            flex: 0 0 58px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 0 10px;
          }

          .mobile-top-button {
            height: 34px;
            padding: 0 11px;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            background: #fff;
            color: #1E3A8A;
            font-size: 11.5px;
            font-weight: 800;
          }

          .mobile-save-button {
            border-color: #1E3A8A;
            background: #1E3A8A;
            color: #fff;
          }

          .mobile-section-tabs {
            height: 50px;
            flex: 0 0 50px;
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 6px 10px 8px;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .mobile-section-tabs::-webkit-scrollbar { display: none; }

          .mobile-section-tab {
            height: 34px;
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 0 10px;
            border: 1px solid #E2E8F0;
            border-radius: 999px;
            background: #F8FAFC;
            color: #475569;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          }

          .mobile-section-tab.active {
            border-color: #4472C4;
            background: #EEF3FB;
            color: #1E3A8A;
          }

          .editor-sidebar {
            display: none !important;
          }

          .editor-sidebar.mobile-setup-open {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            width: 100vw !important;
            height: 100dvh !important;
            min-height: 0 !important;
            border: none !important;
            z-index: 90 !important;
          }

          .mobile-setup-close {
            margin-left: auto;
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            place-items: center;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            background: #fff;
            color: #64748B;
            font-size: 21px;
            line-height: 1;
          }

          .editor-canvas {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            flex: 1 1 auto !important;
          }

          .section-editor-panel {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            min-width: 0 !important;
            max-width: none !important;
            height: 100dvh !important;
            z-index: 100 !important;
          }

          .floating-toolbar-shell {
            left: 8px !important;
            right: 8px !important;
            bottom: 8px !important;
            width: auto !important;
            justify-content: center !important;
            transform: none !important;
          }

          .floating-main-pill { zoom: 0.78; }

          .floating-export-button {
            width: 38px !important;
            height: 38px !important;
            justify-content: center !important;
            padding: 0 !important;
            font-size: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
