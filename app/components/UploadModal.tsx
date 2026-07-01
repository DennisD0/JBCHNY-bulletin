"use client";
import { useState } from "react";

const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";
const GN   = "#2A7D4B";
const RED  = "#C00000";

type Stage = "idle" | "parsing" | "review" | "saving" | "done" | "error";

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
  const [parsedData, setParsedData] = useState<unknown>(null);
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
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Parse failed");
      setPreview(json.preview ?? []);
      setRawText(json.rawText ?? "");
      setParsedData(json.data);
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
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", uploadType);
      fd.append("year", String(year));
      fd.append("save", "true");
      const res  = await fetch("/api/manage/upload", { method: "POST", body: fd });
      const json = await res.json();
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
          padding: "28px 24px", maxWidth: 480, width: "100%",
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
