"use client";
import { useEffect, useMemo, useState } from "react";

const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";
const RED  = "#C00000";
const DOW  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Plan = Record<string, string | null>;

const dowOf = (iso: string) => DOW[new Date(`${iso}T00:00:00`).getDay()];
const monthOf = (iso: string) => iso.slice(0, 7);
const monthLabel = (ym: string) =>
  new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

/**
 * Edit the saved Year Reading Plan day by day, like the quarterly schedule's review table.
 * Saving replaces the saved plan with what is shown here.
 */
export function ReadingPlanEditor({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [plan, setPlan]     = useState<Plan | null>(null);
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);
  const [month, setMonth]   = useState("");
  const [newDay, setNewDay] = useState("");
  const [dirty, setDirty]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manage/upload?type=reading");
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? "Could not load the saved reading plan");
        if (cancelled) return;
        const loaded = json.plan as Plan;
        setPlan(loaded);
        // Open on the current month when the plan covers it, else the first month it has.
        const months = [...new Set(Object.keys(loaded).map(monthOf))].sort();
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setMonth(months.includes(thisMonth) ? thisMonth : months[0] ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const months = useMemo(() => [...new Set(Object.keys(plan ?? {}).map(monthOf))].sort(), [plan]);
  const days = useMemo(() => Object.keys(plan ?? {}).filter((d) => monthOf(d) === month).sort(), [plan, month]);

  function setReading(day: string, text: string) {
    setPlan((p) => (p ? { ...p, [day]: text.trim() === "" ? null : text } : p));
    setDirty(true);
  }

  function addDay() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDay) || !plan || newDay in plan) return;
    setPlan({ ...plan, [newDay]: null });
    setMonth(monthOf(newDay));
    setNewDay("");
    setDirty(true);
  }

  async function save() {
    if (!plan) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/manage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reading", data: plan }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  if (!plan) {
    return error ? (
      <>
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: RED, marginBottom: 14 }}>⚠️ {error}</div>
        <button onClick={onCancel} style={{ width: "100%", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0" }}>Back</button>
      </>
    ) : (
      <div style={{ textAlign: "center", padding: "32px 0", fontWeight: 700, fontSize: 15, color: "#1E3A8A" }}>Loading the saved reading plan…</div>
    );
  }

  const field = { padding: "5px 7px", fontSize: 13, borderRadius: 6, outline: "none", border: "1.5px solid #E2E8F0", color: "#1E293B", background: "#fff", minWidth: 0 } as const;

  return (
    <>
      <div style={{ background: BL_L, border: `1px solid ${BL_M}`, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "#1E3A8A", fontWeight: 700 }}>Month:</span>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...field, flex: 1, fontWeight: 700, color: "#1E3A8A" }}>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{days.length} days</span>
      </div>

      <div style={{ overflow: "auto", maxHeight: 360, marginBottom: 12, border: `1px solid ${BL_M}`, borderRadius: 12 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <thead>
            <tr style={{ background: BL_L, position: "sticky", top: 0, zIndex: 1 }}>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "#1E3A8A" }}>Day</th>
              <th style={{ padding: "6px 10px", textAlign: "left", color: "#1E3A8A" }}>Reading <span style={{ fontWeight: 400, color: "#94A3B8" }}>(empty = no reading that day)</span></th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day} style={{ borderTop: `1px solid ${BL_M}` }}>
                <td style={{ padding: "3px 10px", whiteSpace: "nowrap", color: "#1E3A8A", fontWeight: 700 }}>
                  {Number(day.slice(5, 7))}/{Number(day.slice(8))} <span style={{ color: "#94A3B8", fontWeight: 400 }}>{dowOf(day)}</span>
                </td>
                <td style={{ padding: 2 }}>
                  <input
                    value={plan[day] ?? ""}
                    placeholder="e.g. Gen 1-3"
                    onChange={(e) => setReading(day, e.target.value)}
                    style={{ ...field, width: "100%", boxSizing: "border-box" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <input type="date" value={newDay} onChange={(e) => setNewDay(e.target.value)} style={{ ...field, width: 150 }} />
        <button
          onClick={addDay}
          disabled={!newDay || newDay in plan}
          style={{ border: `1.5px dashed ${BL}`, background: BL_L, color: BL, borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 700, cursor: !newDay || newDay in plan ? "not-allowed" : "pointer", opacity: !newDay || newDay in plan ? 0.5 : 1 }}
        >＋ Add a day</button>
        {newDay && newDay in plan && <span style={{ fontSize: 12, color: "#94A3B8" }}>already in the plan</span>}
      </div>

      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: RED, marginBottom: 12 }}>⚠️ {error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0" }}>
          Upload new file
        </button>
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{ flex: 2, borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 800, cursor: saving || !dirty ? "not-allowed" : "pointer", background: BL, color: "#fff", border: "none", opacity: saving || !dirty ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save reading plan"}
        </button>
      </div>
    </>
  );
}
