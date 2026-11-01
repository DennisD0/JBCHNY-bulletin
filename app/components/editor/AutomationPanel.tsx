"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadModal } from "@/app/components/UploadModal";

export type ManageData = {
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
    events: Array<{ label: string; startDate: string; endDate: string; type: string; pastor?: string; location?: string }>;
    eastCoastSeminars?: Array<{ date: string; church: string; speaker: string; speakerKo: string; language: string }>;
  } | null;
  today?: string;
};

export function AutomationPanel({ onDataRefreshed }: { onDataRefreshed?: () => void }) {
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
