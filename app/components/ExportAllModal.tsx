"use client";
import { useState } from "react";

const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";

type Status = "waiting" | "working" | "done" | { error: string };

/**
 * Exports several languages' bulletins as separate PDFs, one after another (the server
 * prints one at a time). `exportOne` downloads a language and returns an error message, or null.
 */
export function ExportAllModal({
  languages,
  initial,
  exportOne,
  onClose,
}: {
  languages: Array<{ code: string; name: string }>;
  /** Languages ticked when the dialog opens. */
  initial: string[];
  exportOne: (code: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [picked, setPicked]   = useState<string[]>(initial);
  const [status, setStatus]   = useState<Record<string, Status>>({});
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const toggle = (code: string) =>
    setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  async function run() {
    const queue = languages.filter((l) => picked.includes(l.code));
    setRunning(true);
    setFinished(false);
    setStatus(Object.fromEntries(queue.map((l) => [l.code, "waiting" as Status])));
    for (const lang of queue) {
      setStatus((s) => ({ ...s, [lang.code]: "working" }));
      let err: string | null;
      try { err = await exportOne(lang.code); } catch (e) { err = e instanceof Error ? e.message : String(e); }
      setStatus((s) => ({ ...s, [lang.code]: err ? { error: err } : "done" }));
    }
    setRunning(false);
    setFinished(true);
  }

  const failed = Object.values(status).filter((s) => typeof s === "object").length;

  return (
    <div
      onClick={() => { if (!running) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto", fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1E3A8A" }}>Export all languages</div>
          <button onClick={onClose} disabled={running} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: running ? "not-allowed" : "pointer", fontSize: 16, color: "#64748B" }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>
          One PDF per language, from the saved bulletins. Your browser may ask to allow multiple downloads.
        </div>

        <div style={{ background: BL_L, border: `1px solid ${BL_M}`, borderRadius: 12, padding: "8px 14px", marginBottom: 14 }}>
          {languages.map((l) => {
            const s = status[l.code];
            return (
              <label key={l.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: `1px solid ${BL_M}`, cursor: running ? "default" : "pointer" }}>
                <input type="checkbox" checked={picked.includes(l.code)} disabled={running} onChange={() => toggle(l.code)} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#1E3A8A" }}>{l.name}</span>
                <span style={{ fontSize: 12, color: typeof s === "object" ? "#C00000" : s === "done" ? "#2A7D4B" : "#94A3B8", textAlign: "right", maxWidth: 200 }}>
                  {s === "working" ? "Generating…" : s === "done" ? "✓ Downloaded" : s === "waiting" ? "Waiting" : typeof s === "object" ? `✕ ${s.error}` : ""}
                </span>
              </label>
            );
          })}
        </div>

        {finished && (
          <div style={{ fontSize: 13, marginBottom: 12, color: failed ? "#C00000" : "#2A7D4B", fontWeight: 700 }}>
            {failed ? `${failed} of ${Object.keys(status).length} failed — you can run it again.` : "All done."}
          </div>
        )}

        <button
          onClick={run}
          disabled={running || picked.length === 0}
          style={{ width: "100%", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, cursor: running || picked.length === 0 ? "not-allowed" : "pointer", background: BL, color: "#fff", border: "none", opacity: running || picked.length === 0 ? 0.5 : 1 }}
        >
          {running ? "Exporting…" : `Export ${picked.length} PDF${picked.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
