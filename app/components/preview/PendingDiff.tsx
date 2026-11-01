"use client";

import { useState, useEffect, useLayoutEffect, useRef, ReactNode } from "react";
import type { BulletinData } from "@/lib/bulletin-types";

export const SECTION_DIFF_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  sermon:       [{ key:"sermonTitle", label:"Title" }, { key:"sermonVerse", label:"Verse" }, { key:"sermonSpeaker", label:"Speaker" }, { key:"sermonEndingPraise", label:"Ending Praise" }],
  services:     [{ key:"services", label:"Service Schedule" }],
  bibleReading: [{ key:"bibleReading1", label:"Reading 1" }, { key:"bibleReading2", label:"Reading 2" }],
  memoryVerses: [{ key:"memoryVerses", label:"Memory Verses" }],
  cleaning:     [{ key:"cleaningAreas", label:"Areas" }],
  calendar:     [{ key:"calendarMonth", label:"Month" }, { key:"calendarEvents", label:"Events" }],
  seminarInfo:  [{ key:"seminarInfo", label:"Bible Seminar Info" }],
  weekSchedule: [{ key:"weekSchedule", label:"Schedule" }],
  news:         [{ key:"news", label:"Items" }],
  prayer:       [{ key:"prayerRequests", label:"Prayer Requests" }, { key:"jointPrayer", label:"Joint Prayer" }],
  retreatInfo:  [{ key:"retreatInfo", label:"Retreat Info" }],
};

export function fmtDiffVal(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string") return val.length > 55 ? `${val.slice(0, 52)}…` : val || "—";
  if (Array.isArray(val)) {
    if (!val.length) return "(empty)";
    const first = val[0] as Record<string, unknown> | string;
    if (typeof first === "string") return `${first.slice(0, 45)}${val.length > 1 ? ` (+${val.length - 1})` : ""}`;
    const preview = first?.title ?? first?.name ?? first?.text ?? first?.who;
    if (typeof preview === "string") return `${preview.slice(0, 45)}${val.length > 1 ? ` (+${val.length - 1})` : ""}`;
    return `${val.length} items`;
  }
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    if (typeof o.title === "string") return o.title.slice(0, 55);
    return "Updated";
  }
  return String(val);
}

export function SectionDiffPopup({ sectionKey, enContent, onClose }: {
  sectionKey: string;
  enContent: Partial<BulletinData>;
  onClose: () => void;
}) {
  const fields = SECTION_DIFF_FIELDS[sectionKey] ?? [];
  const changes = fields
    .map(({ key, label }) => ({ label, val: enContent[key as keyof BulletinData] }))
    .filter(({ val }) => val !== undefined);

  return (
    <div
      style={{
        position: "absolute", top: 30, right: 0, zIndex: 50,
        width: 228,
        background: "rgba(8,12,26,0.97)",
        backdropFilter: "blur(20px) saturate(1.6)",
        border: "1px solid rgba(245,158,11,0.32)",
        borderRadius: 11,
        padding: "12px 13px 10px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.07)",
        animation: "diffPopIn 0.16s cubic-bezier(0.34,1.5,0.64,1) both",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`@keyframes diffPopIn{from{opacity:0;transform:scale(0.88) translateY(-5px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      {/* Arrow */}
      <div style={{ position:"absolute", top:-6, right:16, width:10, height:10, background:"rgba(8,12,26,0.97)", border:"1px solid rgba(245,158,11,0.32)", borderRight:"none", borderBottom:"none", transform:"rotate(45deg)" }} />
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9, paddingBottom:8, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:"#F59E0B", flexShrink:0 }} />
        <span style={{ color:"rgba(255,255,255,0.92)", fontWeight:800, fontSize:10.5, letterSpacing:"0.02em" }}>English content updated</span>
      </div>
      {/* Diffs */}
      {changes.length === 0
        ? <p style={{ color:"rgba(255,255,255,0.4)", fontSize:10, margin:0 }}>No preview available</p>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {changes.map(({ label, val }) => (
              <div key={label}>
                <div style={{ color:"rgba(255,255,255,0.38)", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>{label}</div>
                <div style={{ background:"rgba(245,158,11,0.88)", color:"#1a0e00", borderRadius:5, padding:"3px 7px", fontSize:10, lineHeight:1.45, fontWeight:600, wordBreak:"break-word" }}>
                  {fmtDiffVal(val)}
                </div>
              </div>
            ))}
          </div>
        )
      }
      <button
        type="button"
        onClick={onClose}
        style={{ marginTop:11, width:"100%", background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"rgba(255,255,255,0.4)", fontSize:9.5, padding:"4px 0", cursor:"pointer", letterSpacing:"0.03em" }}
      >
        Dismiss
      </button>
    </div>
  );
}

export function FitTd({ children, baseSize, style, colSpan, value }: {
  children: ReactNode; baseSize: number; style?: React.CSSProperties; colSpan?: number; value: string;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let s = baseSize;
    el.style.fontSize = s + "px";
    while (el.scrollWidth > el.clientWidth + 1 && s > 6) {
      s -= 0.5;
      el.style.fontSize = s + "px";
    }
  }, [value, baseSize]);
  return <td ref={ref} colSpan={colSpan} style={{ ...style, fontSize: baseSize }}>{children}</td>;
}

export function PendingBadge({ sectionKey, enContent, show, onDismiss }: {
  sectionKey: string;
  enContent?: Partial<BulletinData>;
  show: boolean;
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!show) return null;
  return (
    <>
      <div
        style={{
          position: "absolute", top: 4, right: 4, zIndex: 11,
          display: "flex", alignItems: "center",
          background: open ? "rgba(245,158,11,1)" : "rgba(245,158,11,0.92)",
          color: "#1a0e00", borderRadius: 99,
          fontSize: 9, fontWeight: 900, letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          boxShadow: open ? "0 0 0 2px rgba(245,158,11,0.35)" : "none",
          transition: "box-shadow 0.12s",
          overflow: "hidden",
        }}
      >
        {/* Main badge button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 6px 2px 7px",
            background: "none", border: "none", cursor: "pointer",
            color: "#1a0e00", fontSize: 9, fontWeight: 900, letterSpacing: "0.04em",
          }}
        >
          ● EN UPDATED
          <span style={{ fontSize: 8, opacity: 0.7 }}>{open ? "▴" : "▾"}</span>
        </button>
        {/* Dismiss × */}
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 16, height: "100%", minHeight: 16,
              background: "rgba(0,0,0,0.18)", border: "none", borderLeft: "1px solid rgba(0,0,0,0.15)",
              cursor: "pointer", color: "#1a0e00", fontSize: 10, fontWeight: 900,
              padding: "0 3px",
            }}
            title="Dismiss"
          >
            ×
          </button>
        )}
      </div>
      {open && enContent && (
        <SectionDiffPopup sectionKey={sectionKey} enContent={enContent} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
