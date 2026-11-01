"use client";
import { useEffect, useMemo, useState } from "react";

const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";
const RED  = "#C00000";

type Entry = { theme: string; themeKorean: string; reference: string };

/**
 * Edit the weekly memory-verse list: each week's verse and the theme shown after it on the
 * bulletin (Hope, Peace, …). Saving replaces the saved list with what is shown here.
 */
export function VerseThemeEditor({ onSaved }: { onSaved: () => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [nextWeek, setNextWeek] = useState(0);
  const [filter, setFilter] = useState("");
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/memory-verse?list=1");
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? "Could not load the memory verse list");
        if (cancelled) return;
        setEntries(json.entries as Entry[]);
        setNextWeek(json.nextWeekIndex ?? 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const themes = useMemo(() => [...new Set((entries ?? []).map((e) => e.theme))], [entries]);
  const koreanOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of entries ?? []) if (e.themeKorean && !m[e.theme]) m[e.theme] = e.themeKorean;
    return m;
  }, [entries]);

  function update(i: number, patch: Partial<Entry>) {
    setEntries((es) => (es ? es.map((e, j) => (j === i ? { ...e, ...patch } : e)) : es));
    setDirty(true);
  }

  function setTheme(i: number, theme: string) {
    // Picking a known theme brings its Korean name along.
    update(i, { theme, ...(koreanOf[theme] ? { themeKorean: koreanOf[theme] } : {}) });
  }

  async function save() {
    if (!entries) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/memory-verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveList", entries }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  if (!entries) {
    return error
      ? <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: RED }}>⚠️ {error}</div>
      : <div style={{ textAlign: "center", padding: "32px 0", fontWeight: 700, fontSize: 15, color: "#1E3A8A" }}>Loading the memory verse list…</div>;
  }

  const field = { padding: "5px 7px", fontSize: 13, borderRadius: 6, outline: "none", border: "1.5px solid #E2E8F0", color: "#1E293B", background: "#fff", minWidth: 0 } as const;
  const rows = entries.map((e, i) => ({ e, i })).filter(({ e }) => !filter || e.theme === filter);

  return (
    <>
      <div style={{ background: BL_L, border: `1px solid ${BL_M}`, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "#1E3A8A", fontWeight: 700 }}>Theme:</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...field, flex: 1, fontWeight: 700, color: "#1E3A8A" }}>
          <option value="">All themes ({entries.length} verses)</option>
          {themes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <datalist id="verse-themes">{themes.map((t) => <option key={t} value={t} />)}</datalist>

      <div style={{ overflow: "auto", maxHeight: 360, marginBottom: 12, border: `1px solid ${BL_M}`, borderRadius: 12 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <thead>
            <tr style={{ background: BL_L, position: "sticky", top: 0, zIndex: 1 }}>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "#1E3A8A" }}>#</th>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "#1E3A8A" }}>Theme</th>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "#1E3A8A" }}>Korean</th>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "#1E3A8A" }}>Verse <span style={{ fontWeight: 400, color: "#94A3B8" }}>(Korean book name, e.g. 요 3:16)</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, i }) => (
              <tr key={i} style={{ borderTop: `1px solid ${BL_M}`, background: i === nextWeek ? "#FEF9C3" : undefined }}>
                <td style={{ padding: "3px 10px", color: "#94A3B8", whiteSpace: "nowrap" }} title={i === nextWeek ? "Next week's verse" : undefined}>{i + 1}{i === nextWeek ? " ◀" : ""}</td>
                <td style={{ padding: 2 }}><input list="verse-themes" value={e.theme} onChange={(ev) => setTheme(i, ev.target.value)} style={{ ...field, width: 120 }} /></td>
                <td style={{ padding: 2 }}><input value={e.themeKorean} onChange={(ev) => update(i, { themeKorean: ev.target.value })} style={{ ...field, width: 110 }} /></td>
                <td style={{ padding: 2 }}><input value={e.reference} onChange={(ev) => update(i, { reference: ev.target.value })} style={{ ...field, width: "100%", boxSizing: "border-box" }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 12 }}>
        The highlighted row is next week&apos;s verse. Ko/zh/ru/es bulletins translate the standard themes automatically; a new theme name is shown as typed.
      </div>

      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: RED, marginBottom: 12 }}>⚠️ {error}</div>}

      <button
        onClick={save}
        disabled={saving || !dirty}
        style={{ width: "100%", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, cursor: saving || !dirty ? "not-allowed" : "pointer", background: BL, color: "#fff", border: "none", opacity: saving || !dirty ? 0.5 : 1 }}
      >
        {saving ? "Saving…" : "Save verses & themes"}
      </button>
    </>
  );
}
