"use client";
import { useState } from "react";
import type { BulletinData, CalendarBanner, WeeklyRecurringEvent } from "@/lib/bulletin-types";
import type { MonthSheetResult } from "@/lib/month-sheet";
import { seminarsFromBanners } from "@/lib/month-seminars";

const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";
const GN   = "#2A7D4B";
const RED  = "#C00000";
const DOW  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MD   = /^\d{1,2}\/\d{1,2}$/;

type Stage = "idle" | "reading" | "review" | "error";
type NoteRow = { id: number; date: string; text: string };

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

// "m/d" keys, earliest first (a month and its edge weeks).
const byDay = (a: string, b: string) => {
  const [am, ad] = a.split("/").map(Number), [bm, bd] = b.split("/").map(Number);
  return (am === 12 && bm === 1 ? -1 : am === 1 && bm === 12 ? 1 : am - bm) || ad - bd;
};

const toRows = (events: Record<string, string[]>): NoteRow[] =>
  Object.keys(events).sort(byDay).map((date, id) => ({ id, date, text: events[date].join("\n") }));

const normDay = (s: string) => { const [m, d] = s.trim().split("/").map(Number); return `${m}/${d}`; };

export function MonthCalendarModal({
  currentMonth,
  current,
  buildPatch,
  onApply,
  onClose,
}: {
  /** The bulletin's calendarMonth ("MM/YYYY"), used to preselect a matching sheet. */
  currentMonth?: string;
  /** The calendar already in the bulletin, so it can be edited without a file. */
  current?: Pick<BulletinData, "calendarMonth" | "calendarEvents" | "calendarBanners" | "weeklyRecurring">;
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
  // What the review is showing and editing (a copy of the picked sheet, or of the bulletin's calendar).
  const [edit, setEdit]     = useState<MonthSheetResult | null>(null);
  const [notes, setNotes]   = useState<NoteRow[]>([]);
  const [editing, setEditing] = useState(false); // the bulletin's own calendar, not a file

  function open(sheet: MonthSheetResult, fromCurrent: boolean) {
    setEdit({ ...sheet, calendarBanners: sheet.calendarBanners.map((b) => ({ ...b })), weeklyRecurring: sheet.weeklyRecurring.map((r) => ({ ...r })) });
    setNotes(toRows(sheet.calendarEvents));
    setEditing(fromCurrent);
    setStage("review");
  }

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
      const i = pickDefault(json.sheets, currentMonth);
      setSheets(json.sheets);
      setPicked(i);
      open(json.sheets[i], false);
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

  function editCurrent() {
    if (!current?.calendarMonth) return;
    setSheets([]);
    open({
      sheetName: "Current bulletin",
      calendarMonth: current.calendarMonth,
      calendarBanners: current.calendarBanners ?? [],
      calendarEvents: current.calendarEvents ?? {},
      weeklyRecurring: current.weeklyRecurring ?? [],
      seminars: [],
      skipped: [],
      warnings: [],
    }, true);
  }

  const source = sheets[picked]; // the file's own reading, for its warnings and seminar speakers

  // The edited calendar as a sheet result: day notes from the table, seminars from the banners.
  function edited(): MonthSheetResult | null {
    if (!edit) return null;
    const calendarEvents: Record<string, string[]> = {};
    for (const row of notes) {
      if (!MD.test(row.date.trim())) continue;
      const items = row.text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (items.length === 0) continue;
      const key = normDay(row.date);
      calendarEvents[key] = [...(calendarEvents[key] ?? []), ...items];
    }
    const calendarBanners = edit.calendarBanners.map((b) => ({ ...b, startDate: MD.test(b.startDate.trim()) ? normDay(b.startDate) : b.startDate, endDate: MD.test(b.endDate.trim()) ? normDay(b.endDate) : b.endDate }));
    const weeklyRecurring = edit.weeklyRecurring.filter((r) => r.label.trim());
    // Editing the bulletin's own calendar leaves Bible Seminar Info alone (it has its own section).
    const pastors = Object.fromEntries((source?.seminars ?? []).map((s) => [s.label, s.pastor]));
    const seminars = editing ? [] : seminarsFromBanners(calendarBanners, edit.calendarMonth, pastors);
    return { ...edit, calendarEvents, calendarBanners, weeklyRecurring, seminars };
  }

  const problems: string[] = [];
  if (edit) {
    edit.calendarBanners.forEach((b, i) => {
      if (!b.label.trim() || !MD.test(b.startDate.trim()) || !MD.test(b.endDate.trim())) problems.push(`Banner ${i + 1} needs a name and dates like 10/19.`);
    });
    notes.forEach((r) => {
      if (r.text.trim() && !MD.test(r.date.trim())) problems.push(`A day note has no valid date (use m/d, like 10/4).`);
    });
  }

  const result = edited();
  const patch = result ? buildPatch(result) : null;

  function apply() {
    if (!patch || problems.length > 0) return;
    onApply(patch);
    onClose();
  }

  const setBanner = (i: number, p: Partial<CalendarBanner>) => edit && setEdit({ ...edit, calendarBanners: edit.calendarBanners.map((b, j) => (j === i ? { ...b, ...p } : b)) });
  const setRecurring = (i: number, p: Partial<WeeklyRecurringEvent>) => edit && setEdit({ ...edit, weeklyRecurring: edit.weeklyRecurring.map((r, j) => (j === i ? { ...r, ...p } : r)) });

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 };
  const card: React.CSSProperties = { background: BL_L, border: `1px solid ${BL_M}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 };
  const field = (bad = false): React.CSSProperties => ({ padding: "5px 7px", fontSize: 13, borderRadius: 6, outline: "none", border: `1.5px solid ${bad ? "#FCA5A5" : "#E2E8F0"}`, color: "#1E293B", background: "#fff", minWidth: 0 });
  const xBtn: React.CSSProperties = { border: "none", background: "#fff", borderRadius: 6, cursor: "pointer", color: "#64748B", width: 26, height: 26, flexShrink: 0 };
  const addBtn: React.CSSProperties = { marginTop: 6, border: `1.5px dashed ${BL}`, background: "#fff", color: BL, borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", maxWidth: 620, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto", fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1E3A8A" }}>{editing ? "Edit the monthly calendar" : "Fill the monthly calendar"}</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{editing ? "The calendar now in this bulletin" : "From a one-month calendar sheet (.xlsx)"}</div>
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
            {current?.calendarMonth && (
              <button
                onClick={editCurrent}
                style={{ width: "100%", marginBottom: 16, borderRadius: 12, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#fff", color: BL, border: `1.5px solid ${BL_M}` }}
              >
                ✏️ Edit the calendar in this bulletin instead ({monthName(current.calendarMonth)})
              </button>
            )}
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

        {stage === "review" && edit && (
          <>
            {sheets.length > 1 && (
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#1E3A8A", fontWeight: 700 }}>Sheet:</span>
                <select
                  value={picked}
                  onChange={(e) => { const i = Number(e.target.value); setPicked(i); open(sheets[i], false); }}
                  style={{ flex: 1, border: `1.5px solid ${BL_M}`, borderRadius: 8, padding: "5px 8px", fontSize: 14, color: "#1E3A8A", fontWeight: 700, background: "#fff" }}
                >
                  {sheets.map((s, i) => <option key={i} value={i}>{s.sheetName} — {monthName(s.calendarMonth)}</option>)}
                </select>
              </div>
            )}

            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: GN, marginBottom: 12 }}>
              ✅ {editing ? "Editing" : "Found"} <strong>{monthName(edit.calendarMonth)}</strong>. Change anything below, then click <strong>{editing ? "Save changes" : "Fill the calendar"}</strong>.
            </div>

            {problems.length > 0 && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: RED, marginBottom: 12 }}>
                {[...new Set(problems)].map((p) => <div key={p}>⚠️ {p}</div>)}
              </div>
            )}

            {source && !editing && (source.warnings.length > 0 || source.skipped.length > 0) && (
              <div style={{ background: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#C2410C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>⚠ Worth a look</div>
                {source.warnings.map((w, i) => <div key={`w${i}`} style={{ fontSize: 13, color: "#9A3412", padding: "2px 0" }}>{w}</div>)}
                {source.skipped.map((s, i) => <div key={`s${i}`} style={{ fontSize: 13, color: "#9A3412", padding: "2px 0" }}>Left off the calendar: {s}</div>)}
              </div>
            )}

            {!editing && (
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
            )}

            <div style={card}>
              <div style={label}>Banners — name, first day, last day</div>
              {edit.calendarBanners.map((b, i) => {
                const bad = !b.label.trim() || !MD.test(b.startDate.trim()) || !MD.test(b.endDate.trim());
                return (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "3px 0" }}>
                    <input value={b.label} placeholder="Banner name" onChange={(e) => setBanner(i, { label: e.target.value })} style={{ ...field(!b.label.trim()), flex: "2 1 180px" }} />
                    <input value={b.startDate} placeholder="m/d" onChange={(e) => setBanner(i, { startDate: e.target.value })} style={{ ...field(bad && !MD.test(b.startDate.trim())), width: 64, textAlign: "center" }} />
                    <span style={{ color: "#94A3B8" }}>–</span>
                    <input value={b.endDate} placeholder="m/d" onChange={(e) => setBanner(i, { endDate: e.target.value })} style={{ ...field(bad && !MD.test(b.endDate.trim())), width: 64, textAlign: "center" }} />
                    <button title="Remove this banner" onClick={() => setEdit({ ...edit, calendarBanners: edit.calendarBanners.filter((_, j) => j !== i) })} style={xBtn}>✕</button>
                  </div>
                );
              })}
              <button onClick={() => setEdit({ ...edit, calendarBanners: [...edit.calendarBanners, { label: "", startDate: "", endDate: "" }] })} style={addBtn}>＋ Add banner</button>
            </div>

            <div style={card}>
              <div style={label}>Every week</div>
              {edit.weeklyRecurring.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                  <select value={r.dayOfWeek} onChange={(e) => setRecurring(i, { dayOfWeek: Number(e.target.value) })} style={{ ...field(), width: 76 }}>
                    {DOW.map((d, n) => <option key={d} value={n}>{d}</option>)}
                  </select>
                  <input value={r.label} placeholder="Meeting" onChange={(e) => setRecurring(i, { label: e.target.value })} style={{ ...field(!r.label.trim()), flex: 1 }} />
                  <button title="Remove" onClick={() => setEdit({ ...edit, weeklyRecurring: edit.weeklyRecurring.filter((_, j) => j !== i) })} style={xBtn}>✕</button>
                </div>
              ))}
              <button onClick={() => setEdit({ ...edit, weeklyRecurring: [...edit.weeklyRecurring, { dayOfWeek: 0, label: "" }] })} style={addBtn}>＋ Add weekly meeting</button>
            </div>

            <div style={card}>
              <div style={label}>Day notes — one per line</div>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {notes.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "3px 0", borderTop: `1px solid ${BL_M}` }}>
                    <input value={r.date} placeholder="m/d" onChange={(e) => setNotes(notes.map((n) => (n.id === r.id ? { ...n, date: e.target.value } : n)))} style={{ ...field(!!r.text.trim() && !MD.test(r.date.trim())), width: 64, textAlign: "center" }} />
                    <textarea value={r.text} rows={Math.max(1, r.text.split("\n").length)} onChange={(e) => setNotes(notes.map((n) => (n.id === r.id ? { ...n, text: e.target.value } : n)))} style={{ ...field(), flex: 1, resize: "vertical", fontFamily: "inherit" }} />
                    <button title="Remove this day" onClick={() => setNotes(notes.filter((n) => n.id !== r.id))} style={xBtn}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setNotes([...notes, { id: Math.max(-1, ...notes.map((n) => n.id)) + 1, date: "", text: "" }])} style={addBtn}>＋ Add day</button>
            </div>

            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
              {editing
                ? "Saving replaces this bulletin's banners, day notes and weekly meetings with the lists above. You can undo it afterwards."
                : "Applying replaces this bulletin's calendar month, banners, day notes, weekly meetings and Bible Seminar Info. You can still edit them afterwards or undo."}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStage("idle"); setSheets([]); setFile(null); setEdit(null); setEditing(false); }} style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0" }}>
                {editing ? "Upload a sheet" : "Choose another file"}
              </button>
              <button
                onClick={apply}
                disabled={problems.length > 0}
                style={{ flex: 2, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, cursor: problems.length > 0 ? "not-allowed" : "pointer", background: BL, color: "#fff", border: "none", opacity: problems.length > 0 ? 0.5 : 1 }}
              >
                {editing ? "Save changes" : "Fill the calendar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
