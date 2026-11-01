"use client";
import { useState } from "react";
import type { BulletinData } from "@/lib/bulletin-types";
import type { MonthSheetResult } from "@/lib/month-sheet";

const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";
const GN   = "#2A7D4B";
const RED  = "#C00000";
const DOW  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Stage = "idle" | "reading" | "review" | "error";

const monthIndex = (m: string) => { const [mm, yyyy] = m.split("/").map(Number); return yyyy * 12 + mm; };
const monthName = (m: string) =>
  new Date(Number(m.slice(3)), Number(m.slice(0, 2)) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

/** The sheet for the month being edited, else the latest month in the workbook. */
function pickDefault(sheets: MonthSheetResult[], currentMonth?: string): number {
  if (currentMonth && /^\d{2}\/\d{4}$/.test(currentMonth)) {
    const exact = sheets.findIndex((s) => s.calendarMonth === currentMonth);
    if (exact >= 0) return exact;
  }
  let best = 0;
  sheets.forEach((s, i) => { if (monthIndex(s.calendarMonth) > monthIndex(sheets[best].calendarMonth)) best = i; });
  return best;
}

// Sorted "m/d" keys, earliest first (day notes of the month and its edge weeks).
const byDay = (a: string, b: string) => {
  const [am, ad] = a.split("/").map(Number), [bm, bd] = b.split("/").map(Number);
  return (am === 12 && bm === 1 ? -1 : am === 1 && bm === 12 ? 1 : am - bm) || ad - bd;
};

export function MonthCalendarModal({
  currentMonth,
  buildPatch,
  onApply,
  onClose,
}: {
  /** The bulletin's calendarMonth ("MM/YYYY"), used to preselect a matching sheet. */
  currentMonth?: string;
  /** What applying a sheet changes in the bulletin (shown in the review, then applied). */
  buildPatch: (sheet: MonthSheetResult) => Partial<BulletinData>;
  onApply: (patch: Partial<BulletinData>) => void;
  onClose: () => void;
}) {
  const [stage, setStage]   = useState<Stage>("idle");
  const [file, setFile]     = useState<File | null>(null);
  const [error, setError]   = useState("");
  const [sheets, setSheets] = useState<MonthSheetResult[]>([]);
  const [picked, setPicked] = useState(0);

  async function handleFile(f: File) {
    setFile(f);
    setStage("reading");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/manage/month-calendar", { method: "POST", body: fd });
      const text = await res.text();
      let json: { error?: string; sheets?: MonthSheetResult[] };
      try { json = JSON.parse(text); } catch { throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`); }
      if (!res.ok || json.error || !json.sheets?.length) throw new Error(json.error ?? "Could not read this file.");
      setSheets(json.sheets);
      setPicked(pickDefault(json.sheets, currentMonth));
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  }

  function browse() {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = ".xlsx";
    el.onchange = () => { const f = el.files?.[0]; if (f) void handleFile(f); };
    el.click();
  }

  const sheet = sheets[picked];

  const patch = sheet ? buildPatch(sheet) : null;

  function apply() {
    if (!patch) return;
    onApply(patch);
    onClose();
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 };
  const card: React.CSSProperties = { background: BL_L, border: `1px solid ${BL_M}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", maxWidth: 560, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto", fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1E3A8A" }}>Fill the monthly calendar</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>From a one-month calendar sheet (.xlsx)</div>
          </div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748B" }}>✕</button>
        </div>

        {(stage === "idle" || stage === "error") && (
          <>
            <div
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFile(f); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={browse}
              style={{ border: `2px dashed ${BL}`, borderRadius: 16, padding: "28px 16px", textAlign: "center", background: BL_L, marginBottom: 16, cursor: "pointer" }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: 15, color: BL, fontWeight: 700 }}>Drop the calendar sheet here, or click to browse</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>Excel .xlsx · Google Sheets: File → Download → Microsoft Excel</div>
              {file && <div style={{ marginTop: 10, fontSize: 12, color: BL, fontWeight: 600 }}>Selected: {file.name}</div>}
            </div>
            {stage === "error" && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: RED }}>⚠️ {error}</div>
            )}
          </>
        )}

        {stage === "reading" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1E3A8A" }}>Reading the calendar…</div>
          </div>
        )}

        {stage === "review" && sheet && (
          <>
            {sheets.length > 1 && (
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#1E3A8A", fontWeight: 700 }}>Sheet:</span>
                <select
                  value={picked}
                  onChange={(e) => setPicked(Number(e.target.value))}
                  style={{ flex: 1, border: `1.5px solid ${BL_M}`, borderRadius: 8, padding: "5px 8px", fontSize: 14, color: "#1E3A8A", fontWeight: 700, background: "#fff" }}
                >
                  {sheets.map((s, i) => <option key={i} value={i}>{s.sheetName} — {monthName(s.calendarMonth)}</option>)}
                </select>
              </div>
            )}

            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: GN, marginBottom: 12 }}>
              ✅ Found <strong>{monthName(sheet.calendarMonth)}</strong>: {sheet.calendarBanners.length} banner{sheet.calendarBanners.length === 1 ? "" : "s"},{" "}
              {Object.keys(sheet.calendarEvents).length} days with notes, {sheet.weeklyRecurring.length} weekly meeting{sheet.weeklyRecurring.length === 1 ? "" : "s"}.
            </div>

            {(sheet.warnings.length > 0 || sheet.skipped.length > 0) && (
              <div style={{ background: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#C2410C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>⚠ Worth a look</div>
                {sheet.warnings.map((w, i) => <div key={`w${i}`} style={{ fontSize: 13, color: "#9A3412", padding: "2px 0" }}>{w}</div>)}
                {sheet.skipped.map((s, i) => <div key={`s${i}`} style={{ fontSize: 13, color: "#9A3412", padding: "2px 0" }}>Left off the calendar: {s}</div>)}
              </div>
            )}

            <div style={card}>
              <div style={label}>Bible Seminar Info</div>
              {patch?.seminarInfo ? (
                <div style={{ fontSize: 13, color: "#1E3A8A" }}>
                  <div style={{ fontWeight: 700 }}>{patch.seminarInfo.title}</div>
                  <div>{patch.seminarInfo.date}</div>
                  <div style={{ color: "#64748B" }}>{patch.seminarInfo.speaker}</div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#64748B" }}>No Bible Seminar on or after the bulletin date in this sheet — left as it is.</div>
              )}
            </div>

            {sheet.calendarBanners.length > 0 && (
              <div style={card}>
                <div style={label}>Banners</div>
                {sheet.calendarBanners.map((b, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#1E3A8A", padding: "3px 0", display: "flex", gap: 8 }}>
                    <span style={{ color: "#64748B", flexShrink: 0, minWidth: 84 }}>{b.startDate === b.endDate ? b.startDate : `${b.startDate} – ${b.endDate}`}</span>
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            )}

            {sheet.weeklyRecurring.length > 0 && (
              <div style={card}>
                <div style={label}>Every week</div>
                {sheet.weeklyRecurring.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#1E3A8A", padding: "3px 0", display: "flex", gap: 8 }}>
                    <span style={{ color: "#64748B", flexShrink: 0, minWidth: 84 }}>{DOW[r.dayOfWeek]}</span>
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={card}>
              <div style={label}>Day notes</div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {Object.keys(sheet.calendarEvents).sort(byDay).map((k) => (
                  <div key={k} style={{ fontSize: 13, color: "#1E3A8A", padding: "3px 0", display: "flex", gap: 8, borderTop: `1px solid ${BL_M}` }}>
                    <span style={{ color: "#64748B", flexShrink: 0, minWidth: 84 }}>{k}</span>
                    <span>{sheet.calendarEvents[k].join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
              Applying replaces this bulletin&apos;s calendar month, banners, day notes, weekly meetings and Bible Seminar Info. You can still edit them afterwards or undo.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStage("idle"); setSheets([]); setFile(null); }} style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0" }}>
                Choose another file
              </button>
              <button onClick={apply} style={{ flex: 2, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", background: BL, color: "#fff", border: "none" }}>
                Fill the calendar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
