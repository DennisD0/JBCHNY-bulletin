"use client";
import { useEffect, useState } from "react";
import {
  EAST_ROWS, formatCell, parseCellInput,
  type BandEvent, type GridChurch,
} from "@/lib/schedule-grid-shared";

interface GridData {
  coverageStart: string; coverageEnd: string; quarter: string;
  churches: GridChurch[]; events: BandEvent[];
}

const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";
const GN   = "#2A7D4B";
const RED  = "#C00000";

type Stage = "idle" | "parsing" | "review" | "saving" | "done" | "error";

// The server (or the nginx proxy in front of it) can answer with an HTML error page
// — e.g. a 504 when OCR runs past the proxy timeout — which res.json() chokes on
// with "Unexpected token '<'". Read as text first and explain what happened.
async function readUploadResponse(res: Response): Promise<{ error?: string; [k: string]: unknown }> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413) return { error: "File is too large for the server. Try a smaller image or PDF." };
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return { error: "The server took too long to read this file (or restarted). Try again, or upload a smaller/cropped image." };
    }
    return { error: `Server returned an unexpected response (HTTP ${res.status}).` };
  }
}

export function UploadModal({
  name,
  uploadType,
  onClose,
  onSaved,
  startInEdit = false,
}: {
  name: string;
  uploadType: "reading" | "schedule";
  onClose: () => void;
  onSaved?: () => void;
  /** Open straight into the saved schedule (schedule only) instead of the file picker. */
  startInEdit?: boolean;
}) {
  const [editing, setEditing] = useState(startInEdit && uploadType === "schedule"); // reviewing the saved schedule, not a fresh upload
  const [stage, setStage]     = useState<Stage>(startInEdit && uploadType === "schedule" ? "parsing" : "idle");
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [rawText, setRawText] = useState("");
  const [grid, setGrid]     = useState<GridData | null>(null);
  const [error, setError]     = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [year, setYear]       = useState(new Date().getFullYear());

  // Re-open what is already saved, with the same review window as a fresh upload.
  async function fetchSavedData(): Promise<GridData> {
    const res = await fetch("/api/manage/upload");
    const json = await readUploadResponse(res);
    if (!res.ok || json.error) throw new Error(json.error ?? "Could not load the saved schedule");
    return json as unknown as GridData;
  }
  function showSaved(d: GridData) {
    const fmt = (x: string) => `${Number(x.slice(5, 7))}/${Number(x.slice(8))}`;
    setGrid(d);
    setPreview([`${d.quarter || "Saved schedule"}: ${fmt(d.coverageStart)} – ${fmt(d.coverageEnd)} · ${d.churches.length} churches`]);
    setRawText("");
    setStage("review");
  }
  function failSaved(e: unknown) {
    setEditing(false);
    setError(e instanceof Error ? e.message : String(e));
    setStage("error");
  }
  function loadSaved() {
    setStage("parsing");
    setError("");
    setEditing(true);
    fetchSavedData().then(showSaved).catch(failSaved);
  }
  useEffect(() => {
    // The initial state already shows "loading" when startInEdit is set.
    if (startInEdit && uploadType === "schedule") fetchSavedData().then(showSaved).catch(failSaved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(f: File) {
    setEditing(false);
    setFile(f);
    setStage("parsing");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("type", uploadType);
      fd.append("year", String(year));
      fd.append("save", "false");
      const res  = await fetch("/api/manage/upload", { method: "POST", body: fd });
      const json = await readUploadResponse(res);
      if (!res.ok || json.error) throw new Error(json.error ?? "Parse failed");
      setPreview((json.preview as string[]) ?? []);
      setRawText((json.rawText as string) ?? "");
      const d = json.data as GridData | undefined;
      setGrid(d && Array.isArray(d.churches) ? d : null);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  }

  async function handleSave() {
    if (!file && !editing) return;
    setStage("saving");
    try {
      // A reviewed grid is saved as-is (with the user's corrections), not re-read from the file.
      let res: Response;
      if (grid) {
        res = await fetch("/api/manage/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "schedule", data: grid, replaceEvents: editing }),
        });
      } else if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", uploadType);
        fd.append("year", String(year));
        fd.append("save", "true");
        res = await fetch("/api/manage/upload", { method: "POST", body: fd });
      } else {
        return;
      }
      const json = await readUploadResponse(res);
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      setStage("done");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  }

  // Everything the reader wasn't sure about, recomputed live as the user fixes cells.
  const doubleCheck: Array<{ key: string; text: string; cell?: [number, number]; confirmable?: boolean }> = [];
  if (grid) {
    const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
    grid.churches.forEach((ch, ci) => ch.sundays.forEach((cell, si) => {
      if (cell.status === "unknown") {
        doubleCheck.push({ key: `u-${ci}-${si}`, cell: [ci, si], text: `${ch.ko} · ${md(cell.date)} — couldn't read the name${cell.raw ? ` (OCR saw “${cell.raw}”)` : ""}. Type it in the table.` });
      } else if (cell.status === "corrected") {
        const read = (cell.raw ?? "").replace(/[^가-힣]/g, "").slice(0, 3);
        doubleCheck.push({ key: `c-${ci}-${si}`, cell: [ci, si], confirmable: true, text: `${ch.ko} · ${md(cell.date)} — read “${read}”, used ${cell.name}${cell.title}.` });
      }
    }));
    if (grid.events.length === 0) doubleCheck.push({ key: "no-events", text: "No events were found in the bands above the table. Add any events from the sheet below." });
    grid.events.forEach((ev) => {
      if (!ev.label.trim() || !ev.startDate || !ev.endDate || ev.endDate < ev.startDate) {
        doubleCheck.push({ key: `e-${ev.id}`, text: `Event “${ev.label || "(no name)"}” needs a name and a valid start and end date.` });
      }
    });
  }
  const unreadable = doubleCheck.filter((d) => d.key.startsWith("u-") || d.key.startsWith("e-")).length;

  function focusCell(ci: number, si: number) {
    const el = document.getElementById(`cell-${ci}-${si}`) as HTMLInputElement | null;
    el?.scrollIntoView({ block: "center", inline: "center" });
    el?.focus();
  }
  function confirmCell(ci: number, si: number) {
    if (!grid) return;
    setGrid({ ...grid, churches: grid.churches.map((c, i) => i !== ci ? c : { ...c, sundays: c.sundays.map((x, j) => j === si ? { ...x, status: "ok" } : x) }) });
  }
  function updateEvent(id: string, patch: Partial<BandEvent>) {
    if (!grid) return;
    setGrid({ ...grid, events: grid.events.map((ev) => ev.id === id ? { ...ev, ...patch } : ev) });
  }
  function addEvent() {
    if (!grid) return;
    const start = grid.coverageStart;
    setGrid({ ...grid, events: [...grid.events, { id: `custom-${Date.now()}`, type: "other", label: "", startDate: start, endDate: start, location: "" }] });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function browsePicker() {
    const el = document.createElement("input");
    el.type = "file";
    el.accept = ".pdf,.png,.jpg,.jpeg";
    el.onchange = (ev) => {
      const f = (ev.target as HTMLInputElement).files?.[0];
      if (f) handleFile(f);
    };
    el.click();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 24,
          padding: "28px 24px", maxWidth: grid && stage === "review" ? 980 : 480, width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          maxHeight: "90vh", overflowY: "auto",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1E3A8A" }}>
              {stage === "done" ? "✅ Saved!" : `${editing ? "Edit" : "Upload"} ${name}`}
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Accepts PDF, PNG, or JPG</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748B" }}
          >
            ✕
          </button>
        </div>

        {/* Year selector */}
        {(stage === "idle" || stage === "error") && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, background: BL_L, border: `1.5px solid ${BL_M}`, borderRadius: 12, padding: "10px 14px" }}>
            <span style={{ fontSize: 13, color: "#1E3A8A", fontWeight: 700 }}>Plan year:</span>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2024} max={2040}
              style={{ width: 80, border: `1.5px solid ${BL_M}`, borderRadius: 8, padding: "4px 8px", fontSize: 14, color: "#1E3A8A", fontWeight: 700, outline: "none", background: "#fff" }}
            />
          </div>
        )}

        {/* Drop zone */}
        {(stage === "idle" || stage === "error") && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={browsePicker}
              style={{ border: `2px dashed ${BL}`, borderRadius: 16, padding: "28px 16px", textAlign: "center", background: BL_L, marginBottom: 16, cursor: "pointer" }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 15, color: BL, fontWeight: 700 }}>Drop a file here, or click to browse</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>PDF · PNG · JPG &nbsp;·&nbsp; Korean or English</div>
              {file && <div style={{ marginTop: 10, fontSize: 12, color: BL, fontWeight: 600 }}>Selected: {file.name}</div>}
            </div>
            {uploadType === "schedule" && (
              <button
                onClick={loadSaved}
                style={{ width: "100%", marginBottom: 16, borderRadius: 12, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#fff", color: BL, border: `1.5px solid ${BL_M}` }}
              >
                ✏️ Edit the saved schedule instead
              </button>
            )}
            {stage === "error" && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: RED, marginBottom: 14 }}>
                ⚠️ {error}
              </div>
            )}
          </>
        )}

        {/* Parsing */}
        {stage === "parsing" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1E3A8A", marginBottom: 6 }}>{editing ? "Loading the saved schedule…" : "Reading the file…"}</div>
            {!editing && <div style={{ fontSize: 13, color: "#64748B" }}>Running OCR and extracting data. This may take 10–30 seconds.</div>}
          </div>
        )}

        {/* Review */}
        {stage === "review" && (
          <>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: GN, marginBottom: 14, display: "flex", gap: 8 }}>
              <span>✅</span>
              <span>{editing ? <>Saved schedule loaded. Change anything below, then click <strong>Save</strong>.</> : <>Parsed successfully. Review below, then click <strong>Save</strong>.</>}</span>
            </div>
            {doubleCheck.length > 0 && (
              <div style={{ background: "#FFF7ED", border: "1.5px solid #FDBA74", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#C2410C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  ⚠ Double-check ({doubleCheck.length})
                </div>
                <div style={{ fontSize: 12, color: "#9A3412", marginBottom: 8 }}>
                  {unreadable > 0
                    ? `${unreadable} item${unreadable === 1 ? "" : "s"} could not be read — fix ${unreadable === 1 ? "it" : "them"} below or leave ${unreadable === 1 ? "it" : "them"} as is. The rest were auto-corrected and are probably right.`
                    : "Nothing is blocking, but these were auto-corrected or guessed — worth a quick look."}
                </div>
                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                  {doubleCheck.map((d) => (
                    <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: d.key.startsWith("u-") || d.key.startsWith("e-") ? "#B91C1C" : "#9A3412", padding: "4px 0", borderTop: "1px solid #FED7AA" }}>
                      <span style={{ flex: 1 }}>{d.text}</span>
                      {d.cell && (
                        <button onClick={() => focusCell(d.cell![0], d.cell![1])} style={{ border: "1px solid #FDBA74", background: "#fff", color: "#C2410C", borderRadius: 6, padding: "2px 8px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Go to cell</button>
                      )}
                      {d.confirmable && d.cell && (
                        <button onClick={() => confirmCell(d.cell![0], d.cell![1])} style={{ border: "none", background: "#EA580C", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Looks right</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ background: BL_L, border: `1px solid ${BL_M}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {uploadType === "reading" ? "Parsed Readings (first 10)" : editing ? "Saved schedule" : "Parsed Events"}
              </div>
              {preview.map((line, i) => (
                <div key={i} style={{ fontSize: 13, color: "#1E3A8A", padding: "3px 0", borderBottom: i < preview.length - 1 ? `1px solid ${BL_M}` : "none" }}>
                  {line}
                </div>
              ))}
              {preview.length === 0 && <div style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>Nothing detected — check raw OCR text below.</div>}
            </div>
            {grid && (
              <>
                <div style={{ border: `1px solid ${BL_M}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    Events — edit, remove or add
                  </div>
                  {grid.events.map((ev) => {
                    const bad = !ev.label.trim() || !ev.startDate || !ev.endDate || ev.endDate < ev.startDate;
                    const field = { padding: "5px 7px", fontSize: 13, borderRadius: 6, outline: "none", border: `1.5px solid ${bad ? "#FCA5A5" : "#E2E8F0"}`, color: "#1E293B", background: "#fff", minWidth: 0 } as const;
                    return (
                      <div key={ev.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "4px 0" }}>
                        <input value={ev.label} placeholder="Event name" onChange={(e) => updateEvent(ev.id, { label: e.target.value })} style={{ ...field, flex: "2 1 200px" }} />
                        <input type="date" value={ev.startDate} onChange={(e) => updateEvent(ev.id, { startDate: e.target.value, ...(ev.endDate < e.target.value ? { endDate: e.target.value } : {}) })} style={{ ...field, width: 140 }} />
                        <span style={{ color: "#94A3B8" }}>–</span>
                        <input type="date" value={ev.endDate} min={ev.startDate} onChange={(e) => updateEvent(ev.id, { endDate: e.target.value })} style={{ ...field, width: 140 }} />
                        <input value={ev.location} placeholder="Location (optional)" onChange={(e) => updateEvent(ev.id, { location: e.target.value })} style={{ ...field, flex: "1 1 130px" }} />
                        <button
                          title="Remove this event"
                          onClick={() => setGrid({ ...grid, events: grid.events.filter((x) => x.id !== ev.id) })}
                          style={{ border: "none", background: "#F1F5F9", borderRadius: 6, cursor: "pointer", color: "#64748B", width: 26, height: 26 }}
                        >✕</button>
                      </div>
                    );
                  })}
                  <button onClick={addEvent} style={{ marginTop: 6, border: `1.5px dashed ${BL}`, background: BL_L, color: BL, borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>＋ Add event</button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  Preachers by church — fix any cell, then save <span style={{ fontWeight: 600, textTransform: "none", color: "#94A3B8" }}>(top 9 rows feed the East Coast table, only the bold names marked * — add or remove the * after a name to match the sheet's bold speakers · → = same as last week · amber = auto-corrected · red = not recognised)</span>
                </div>
                <div style={{ overflow: "auto", maxHeight: 360, marginBottom: 14, border: `1px solid ${BL_M}`, borderRadius: 12 }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: BL_L, position: "sticky", top: 0, zIndex: 1 }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", position: "sticky", left: 0, background: BL_L }}>Church</th>
                        {grid.churches[0]?.sundays.map((c) => (
                          <th key={c.date} style={{ padding: "6px 4px", color: "#1E3A8A", fontWeight: 700 }}>{Number(c.date.slice(5, 7))}/{Number(c.date.slice(8))}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.churches.map((ch, ci) => (
                        <tr key={ch.no} style={{ borderTop: ch.no === EAST_ROWS + 1 ? `2px solid ${BL}` : `1px solid ${BL_M}` }}>
                          <td style={{ padding: "4px 8px", whiteSpace: "nowrap", fontWeight: 700, color: "#1E3A8A", position: "sticky", left: 0, background: "#fff" }}>{ch.ko}</td>
                          {ch.sundays.map((cell, si) => (
                            <td key={cell.date} style={{ padding: 2 }}>
                              <input
                                id={`cell-${ci}-${si}`}
                                key={`${cell.status}-${formatCell(cell)}`}
                                defaultValue={formatCell(cell)}
                                title={cell.raw ? `OCR read: ${cell.raw}` : undefined}
                                disabled={cell.status === "retreat"}
                                onBlur={(e) => {
                                  const next = parseCellInput(e.target.value, cell.date);
                                  if (formatCell(next) === formatCell(cell)) return;
                                  setGrid({
                                    ...grid,
                                    churches: grid.churches.map((c, i) => i !== ci ? c : {
                                      ...c, sundays: c.sundays.map((x, j) => j === si ? { ...next, raw: cell.raw, status: next.status === "unknown" ? "unknown" : "ok" } : x),
                                    }),
                                  });
                                }}
                                style={{
                                  width: 66, padding: "4px 5px", fontSize: 12, borderRadius: 6, outline: "none", textAlign: "center",
                                  border: `1.5px solid ${cell.status === "unknown" ? "#FCA5A5" : cell.status === "corrected" ? "#FCD34D" : "#E2E8F0"}`,
                                  background: cell.status === "unknown" ? "#FEF2F2" : cell.status === "corrected" ? "#FFFBEB" : cell.status === "retreat" ? "#F1F5F9" : "#fff",
                                  color: cell.status === "same" ? "#94A3B8" : "#1E293B",
                                  fontWeight: cell.seminar ? 800 : 400,
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {!editing && <button onClick={() => setShowRaw((v) => !v)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer", padding: "0 0 10px", textDecoration: "underline" }}>
              {showRaw ? "Hide" : "Show"} raw OCR text
            </button>}
            {showRaw && !editing && (
              <pre style={{ fontSize: 11, color: "#374151", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", maxHeight: 180, overflowY: "auto", marginBottom: 14, whiteSpace: "pre-wrap" }}>
                {rawText || "(empty)"}
              </pre>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStage("idle"); setPreview([]); setEditing(false); setGrid(null); }} style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0" }}>
                {editing ? "Upload new file" : "Re-upload"}
              </button>
              <button onClick={handleSave} style={{ flex: 2, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", background: BL, color: "#fff", border: "none" }}>
                Save to Bulletin
              </button>
            </div>
          </>
        )}

        {/* Saving */}
        {stage === "saving" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1E3A8A" }}>Saving…</div>
          </div>
        )}

        {/* Done */}
        {stage === "done" && (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1E3A8A", marginBottom: 6 }}>Plan saved successfully!</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 24, lineHeight: 1.6 }}>
              The bulletin will auto-fill from this new plan starting next Sunday.
            </div>
            <button onClick={onClose} style={{ background: BL, color: "#fff", border: "none", borderRadius: 14, padding: "12px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
