"use client";
import { useState } from "react";
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
}: {
  name: string;
  uploadType: "reading" | "schedule";
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [stage, setStage]     = useState<Stage>("idle");
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [rawText, setRawText] = useState("");
  const [grid, setGrid]     = useState<GridData | null>(null);
  const [error, setError]     = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [year, setYear]       = useState(new Date().getFullYear());

  async function handleFile(f: File) {
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
    if (!file) return;
    setStage("saving");
    try {
      // A reviewed grid is saved as-is (with the user's corrections), not re-read from the file.
      let res: Response;
      if (grid) {
        res = await fetch("/api/manage/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "schedule", data: grid }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("type", uploadType);
        fd.append("year", String(year));
        fd.append("save", "true");
        res = await fetch("/api/manage/upload", { method: "POST", body: fd });
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
              {stage === "done" ? "✅ Saved!" : `Upload ${name}`}
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
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1E3A8A", marginBottom: 6 }}>Reading the file…</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Running OCR and extracting data. This may take 10–30 seconds.</div>
          </div>
        )}

        {/* Review */}
        {stage === "review" && (
          <>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: GN, marginBottom: 14, display: "flex", gap: 8 }}>
              <span>✅</span>
              <span>Parsed successfully. Review below, then click <strong>Save</strong>.</span>
            </div>
            <div style={{ background: BL_L, border: `1px solid ${BL_M}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {uploadType === "reading" ? "Parsed Readings (first 10)" : "Parsed Events"}
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
                {grid.events.length > 0 && (
                  <div style={{ border: `1px solid ${BL_M}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Events found</div>
                    {grid.events.map((ev) => (
                      <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1E3A8A", padding: "2px 0" }}>
                        <span style={{ flex: 1 }}>{ev.label} · {ev.startDate.slice(5)} – {ev.endDate.slice(5)}{ev.location ? ` · ${ev.location}` : ""}</span>
                        <button
                          title="Remove this event"
                          onClick={() => setGrid({ ...grid, events: grid.events.filter((x) => x.id !== ev.id) })}
                          style={{ border: "none", background: "#F1F5F9", borderRadius: 6, cursor: "pointer", color: "#64748B", width: 22, height: 22 }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 900, color: BL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  Preachers by church — fix any cell, then save <span style={{ fontWeight: 600, textTransform: "none", color: "#94A3B8" }}>(top 9 rows feed the East Coast table · → = same as last week · amber = auto-corrected · red = not recognised)</span>
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
            <button onClick={() => setShowRaw((v) => !v)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer", padding: "0 0 10px", textDecoration: "underline" }}>
              {showRaw ? "Hide" : "Show"} raw OCR text
            </button>
            {showRaw && (
              <pre style={{ fontSize: 11, color: "#374151", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", maxHeight: 180, overflowY: "auto", marginBottom: 14, whiteSpace: "pre-wrap" }}>
                {rawText || "(empty)"}
              </pre>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setStage("idle"); setPreview([]); }} style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0" }}>
                Re-upload
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
