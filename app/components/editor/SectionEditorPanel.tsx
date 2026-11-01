"use client";

import { Eye, AlertTriangle, UserCheck } from "lucide-react";
import type { BulletinData } from "@/lib/bulletin-types";
import { type BulletinLanguage, type BulletinMeta } from "@/lib/bulletin-languages";
import { HeaderTab, SermonTab, ServicesTab, BibleReadingTab } from "@/app/components/editor/BasicTabs";
import { MemoryVersesSidebarPanel } from "@/app/components/editor/SidebarPanels";
import { CalendarTab, SeminarInfoPanel, WeeklyScheduleTab } from "@/app/components/editor/CalendarTabs";
import { NewsTab, PrayerTab } from "@/app/components/editor/NewsPrayerTabs";
import { SeminarServicePanel, RetreatInfoPanel, CleaningTab } from "@/app/components/editor/SectionPanels";
import { SECTIONS, TabId, TAB_SECTION_KEY, LANGUAGE_CONFIG } from "@/app/components/editor/constants";
import { presenceColorFor, presenceInitials } from "@/app/components/editor/AccessControl";

export function SectionEditorPanel({
  activeTab,
  data,
  set,
  onClose,
  language,
  meta,
  readOnly,
  onTakeOver,
  onPreviewSync,
  onApplySync,
  onDismissSync,
  presenceUsers,
  mySessionId,
}: {
  activeTab: TabId;
  data: BulletinData;
  set: (patch: Partial<BulletinData>) => void;
  onClose: () => void;
  language: BulletinLanguage;
  meta: BulletinMeta;
  readOnly: boolean;
  onTakeOver: () => void;
  onPreviewSync: (sectionKey: string) => void;
  onApplySync: (sectionKey: string) => void;
  onDismissSync: (sectionKey: string) => void;
  presenceUsers: Array<{ name: string; sessionId: string; language?: string }>;
  mySessionId: string;
}) {
  const section = SECTIONS.find((item) => item.id === activeTab);
  const sectionKey = TAB_SECTION_KEY[activeTab];
  const pendingSync = language !== "en" && language !== "ko" && meta.sections[sectionKey]?.status === "pending";

  const editor = (() => {
    switch (activeTab) {
      case "header":
        return <HeaderTab data={data} set={set} />;
      case "sermon":
        return <SermonTab data={data} set={set} />;
      case "services":
        return <ServicesTab data={data} set={set} />;
      case "bible":
        return <BibleReadingTab data={data} set={set} />;
      case "memory":
        return <MemoryVersesSidebarPanel data={data} set={set} lang={language} />;
      case "cleaning":
        return <CleaningTab data={data} set={set} />;
      case "calendar":
        return <CalendarTab data={data} set={set} />;
      case "seminar-info":
        return <SeminarInfoPanel data={data} set={set} />;
      case "schedule":
        return <WeeklyScheduleTab data={data} set={set} />;
      case "news":
        return <NewsTab data={data} set={set} />;
      case "prayer":
        return <PrayerTab data={data} set={set} />;
      case "retreat":
        return <RetreatInfoPanel data={data} set={set} />;
      case "seminar-service":
        return <SeminarServicePanel data={data} set={set} />;
    }
  })();

  return (
    <aside
      className="section-editor-panel"
      aria-label={`${section?.label ?? "Section"} editor`}
      style={{
        width: "min(420px, calc(100vw - 264px))",
        minWidth: 0,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#F8FAFC",
        borderRight: "1px solid #CBD5E1",
        boxShadow: "6px 0 18px rgba(15,23,42,0.08)",
        zIndex: 20,
      }}
    >
      <div style={{
        flexShrink: 0, height: 68, position: "relative",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "0 16px 0 18px",
      }}>
        {/* Blur + gradient tint layer */}
        <div style={{
          position: "absolute", inset: 0,
          backdropFilter: "blur(28px) saturate(2) brightness(1.08)",
          WebkitBackdropFilter: "blur(28px) saturate(2) brightness(1.08)",
          background: "linear-gradient(135deg,rgba(26,51,112,0.92) 0%,rgba(45,85,170,0.88) 55%,rgba(68,114,196,0.85) 100%)",
        }} />
        {/* Top-edge highlight gradient — glass surface gloss */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(175deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 45%, transparent 100%)",
          pointerEvents: "none",
        }} />
        {/* Bottom border + inner glow */}
        <div style={{
          position: "absolute", inset: 0,
          borderBottom: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          pointerEvents: "none",
        }} />
        {/* Content — sits above glass layers */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {section && (
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "grid", placeItems: "center",
              border: "1px solid rgba(255,255,255,0.2)",
            }}>
              <section.icon size={18} color="#fff" strokeWidth={2} />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Editing
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {section?.label}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close section editor"
          style={{
            position: "relative", zIndex: 1,
            width: 32, height: 32, flexShrink: 0,
            display: "grid", placeItems: "center", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.12)",
            color: "#fff", fontSize: 20, lineHeight: 1, cursor: "pointer",
            transition: "background 0.15s",
          }}
        >×</button>
      </div>
      {/* Presence viewers bar — shows others on this language */}
      {(() => {
        const viewers = presenceUsers.filter((u) => u.language === language && u.sessionId !== mySessionId);
        if (viewers.length === 0) return null;
        return (
          <div style={{ flexShrink: 0, padding: "5px 18px", background: "#EFF6FF", borderBottom: "1px solid #DBEAFE", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Eye size={11} color="#60A5FA" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: "#3B82F6", fontWeight: 600 }}>Also here:</span>
            {viewers.map((u) => {
              const c = presenceColorFor(u.name);
              return (
                <div key={u.sessionId} style={{ display: "flex", alignItems: "center", gap: 4, background: c.bg, color: c.text, borderRadius: 99, padding: "2px 8px 2px 4px", fontSize: 10.5, fontWeight: 700 }}>
                  <div style={{ width: 15, height: 15, borderRadius: "50%", background: c.text, color: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, flexShrink: 0 }}>
                    {presenceInitials(u.name)}
                  </div>
                  {u.name}
                </div>
              );
            })}
          </div>
        );
      })()}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "16px", background: "#F2F5FB" }}>
        {readOnly && (
          <div style={{ position:"sticky", top:0, zIndex:3, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:12, padding:"10px 12px", borderRadius:10, background:"rgba(30,58,138,0.92)", color:"#fff", boxShadow:"0 8px 24px rgba(15,23,42,0.18)" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:11.5, fontWeight:700 }}><Eye size={14} /> Viewing only — {LANGUAGE_CONFIG[language].name} is being edited</span>
            <button type="button" className="glass-secondary-button" onClick={onTakeOver}><UserCheck size={13} /> Request to Take Over</button>
          </div>
        )}
        {pendingSync && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:12, padding:"11px 12px", borderRadius:10, borderLeft:"3px solid #F59E0B", background:"rgba(251,191,36,0.15)", color:"#78350F" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:11.5, fontWeight:800 }}><AlertTriangle size={15} /> English updated this section</span>
            <div style={{ display:"flex", gap:7 }}>
              <button type="button" className="sync-banner-button" onClick={() => onPreviewSync(sectionKey)}>Preview ↗</button>
              <button type="button" className="sync-banner-button" onClick={() => onApplySync(sectionKey)} disabled={readOnly}>Apply</button>
              <button type="button" className="sync-banner-button" onClick={() => onDismissSync(sectionKey)} disabled={readOnly}>Dismiss</button>
            </div>
          </div>
        )}
        <div aria-disabled={readOnly} style={{ pointerEvents:readOnly ? "none" : "auto", opacity:readOnly ? 0.72 : 1 }}>
          {editor}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Comment thread panel component
// ---------------------------------------------------------------------------
