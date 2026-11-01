"use client";

import { motion } from "framer-motion";
import { Users, Lock, Eye, UserCheck } from "lucide-react";
import type { BulletinData } from "@/lib/bulletin-types";
import { BULLETIN_LANGUAGES, type BulletinLanguage, type BulletinMeta, type LanguageLock, type LanguageLocks } from "@/lib/bulletin-languages";
import { SECTION_FIELD_MAP } from "@/lib/section-field-map";
import { LANGUAGE_CONFIG, ROLE_META, roleForSession } from "@/app/components/editor/constants";
import { presenceColorFor, presenceInitials } from "@/app/components/editor/AccessControl";

export function LanguageTabBar({
  activeLanguage,
  metaByLanguage,
  locks,
  sessionId,
  onSelect,
  presenceUsers,
  mySessionId,
}: {
  activeLanguage: BulletinLanguage;
  metaByLanguage: Record<BulletinLanguage, BulletinMeta>;
  locks: LanguageLocks;
  sessionId: string;
  onSelect: (language: BulletinLanguage) => void;
  presenceUsers: Array<{ name: string; sessionId: string; language?: string }>;
  mySessionId: string;
}) {
  return (
    <div className="language-tab-bar" aria-label="Bulletin languages">
      {BULLETIN_LANGUAGES.map((language) => {
        const config = LANGUAGE_CONFIG[language];
        const active = activeLanguage === language;
        const pendingCount = Object.values(metaByLanguage[language].sections)
          .filter((s) => s.status === "pending").length;
        const lockedByOther = Boolean(locks[language] && locks[language]?.sessionId !== sessionId);
        const editorsHere = presenceUsers.filter((u) => u.language === language);
        const shownEditors = editorsHere.slice(0, 5);
        const extraCount = editorsHere.length - shownEditors.length;
        return (
          <button
            type="button"
            key={language}
            onClick={() => onSelect(language)}
            title={language === "ko" ? "Korean is isolated from English sync" : config.name}
            style={{
              position: "relative",
              height: 42,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 13px",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: active ? "#fff" : "#475569",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 800,
              whiteSpace: "nowrap",
              transition: "color 0.18s",
            }}
          >
            {active && (
              <motion.div
                layoutId="lang-active-pill"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                style={{
                  position: "absolute", inset: 0, borderRadius: 999,
                  background: "linear-gradient(180deg, #4E80D9 0%, #3E68BF 100%)",
                  boxShadow: "0 4px 14px rgba(62,104,191,0.42), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              />
            )}
            <span aria-hidden style={{ position: "relative", zIndex: 1, fontSize: 15, lineHeight: 1 }}>{config.flag}</span>
            <span style={{ position: "relative", zIndex: 1 }}>{config.code}</span>
            {language === "ko" && (
              <Lock size={10} aria-label="Korean is isolated" style={{ position: "relative", zIndex: 1 }} />
            )}
            {language !== "en" && language !== "ko" && pendingCount > 0 && (
              <span style={{ position: "relative", zIndex: 1, minWidth: 15, height: 15, padding: "0 4px", display: "grid", placeItems: "center", borderRadius: 99, background: "#F59E0B", color: "#111827", fontSize: 9, fontWeight: 900 }}>
                {pendingCount}
              </span>
            )}
            {lockedByOther && (
              <span aria-label="Locked by another editor" style={{ position: "relative", zIndex: 1, width: 6, height: 6, borderRadius: 99, background: "#EF4444", animation: "livePulse 1.6s ease-in-out infinite" }} />
            )}
            {/* Presence avatars with role badges */}
            {shownEditors.length > 0 && (
              <div style={{ position: "relative", zIndex: 1, display: "flex", marginLeft: 3 }}>
                {shownEditors.map((u, i) => {
                  const isSelf = u.sessionId === mySessionId;
                  const c = presenceColorFor(u.name);
                  const role = roleForSession(locks[language], u.sessionId);
                  const meta = ROLE_META[role];
                  const separator = active ? "#4472C4" : "#fff";
                  return (
                    <div
                      key={u.sessionId}
                      title={`${u.name}${isSelf ? " (you)" : ""} — ${meta.label}`}
                      style={{
                        position: "relative",
                        marginLeft: i > 0 ? -7 : 0,
                        zIndex: shownEditors.length - i,
                        flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: c.bg,
                        color: c.text,
                        border: `2px solid ${separator}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 900, letterSpacing: "0.02em",
                        boxShadow: isSelf
                          ? `0 0 0 2px ${separator}, 0 0 0 3.5px ${meta.solid}, 0 2px 6px rgba(0,0,0,0.22)`
                          : "0 1px 5px rgba(0,0,0,0.18)",
                      }}>
                        {presenceInitials(u.name)}
                      </div>
                      {/* Role badge */}
                      <div style={{
                        position: "absolute", bottom: -3, right: -3,
                        width: 14, height: 14, borderRadius: "50%",
                        background: meta.solid,
                        border: "2px solid #fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                        pointerEvents: "none",
                      }}>
                        <meta.Icon size={8} strokeWidth={2.75} color="#fff" />
                      </div>
                    </div>
                  );
                })}
                {extraCount > 0 && (
                  <div
                    title={`${extraCount} more`}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", marginLeft: -7, flexShrink: 0,
                      background: "#EEF2F7",
                      color: "#475569",
                      border: `2px solid ${active ? "#4472C4" : "#fff"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900,
                      position: "relative", zIndex: 0,
                      boxShadow: "0 1px 5px rgba(0,0,0,0.15)",
                    }}
                  >+{extraCount}</div>
                )}
              </div>
            )}
          </button>
        );
      })}

      {/* My Role chip — far right of tab bar, separated by a hairline divider */}
      {(() => {
        const myRole = roleForSession(locks[activeLanguage], mySessionId);
        const meta = ROLE_META[myRole];
        return (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span aria-hidden style={{ width: 1, height: 22, background: "#E2E8F0", borderRadius: 1 }} />
            <div
              title={`Your role on ${LANGUAGE_CONFIG[activeLanguage].name}: ${meta.label}`}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: meta.tint,
                border: `1px solid ${meta.ring}`,
                borderRadius: 999,
                padding: "5px 12px 5px 8px",
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: meta.solid,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 1px 4px ${meta.ring}`,
              }}>
                <meta.Icon size={11} strokeWidth={2.75} color="#fff" />
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: meta.ink, letterSpacing: "0.02em" }}>
                {meta.label}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export function LockModal({
  language,
  lock,
  onViewOnly,
  onRequestTakeover,
  onRequestJoin,
}: {
  language: BulletinLanguage;
  lock: LanguageLock;
  onViewOnly: () => void;
  onRequestTakeover: () => void;
  onRequestJoin: () => void;
}) {
  const minutes = Math.max(0, Math.floor((Date.now() - lock.acquiredAt) / 60000));
  return (
    <div className="multilang-modal-backdrop" role="dialog" aria-modal="true" aria-label="Language bulletin locked">
      <div className="multilang-modal-card" style={{ width:"min(360px, calc(100vw - 32px))", padding:"22px 24px 18px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <Lock size={15} color="#F59E0B" />
          <span style={{ fontSize:14, fontWeight:800, color:"#fff", letterSpacing:"-0.01em" }}>Currently being edited</span>
        </div>
        <p style={{ margin:"0 0 18px", color:"rgba(255,255,255,0.6)", fontSize:12.5, lineHeight:1.6 }}>
          <strong style={{ color: "#fff" }}>{lock.userName}</strong> is editing the {LANGUAGE_CONFIG[language].name} bulletin
          {minutes > 0 ? ` (${minutes}m ago)` : " right now"}. Choose how you&apos;d like to proceed:
        </p>
        {/* Request to Take Over */}
        <button
          type="button"
          onClick={onRequestTakeover}
          style={{
            display:"block", width:"100%", textAlign:"left",
            background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.28)",
            borderRadius:10, padding:"11px 14px", marginBottom:8, cursor:"pointer", color:"#fff",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <UserCheck size={14} color="#FCA5A5" />
            <span style={{ fontSize:13, fontWeight:700 }}>Request to Take Over</span>
          </div>
          <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.45)", paddingLeft:22 }}>
            Ask them to hand over full editing access
          </div>
        </button>
        {/* Request to Collaborate */}
        <button
          type="button"
          onClick={onRequestJoin}
          style={{
            display:"block", width:"100%", textAlign:"left",
            background:"rgba(68,114,196,0.12)", border:"1px solid rgba(68,114,196,0.3)",
            borderRadius:10, padding:"11px 14px", marginBottom:16, cursor:"pointer", color:"#fff",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <Users size={14} color="#93B4F0" />
            <span style={{ fontSize:13, fontWeight:700 }}>Request to Collaborate</span>
          </div>
          <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.45)", paddingLeft:22 }}>
            Ask to edit alongside them simultaneously
          </div>
        </button>
        {/* View Only */}
        <button
          type="button"
          onClick={onViewOnly}
          style={{
            display:"block", width:"100%", textAlign:"left",
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"11px 14px", cursor:"pointer", color:"#fff",
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
            <Eye size={14} color="rgba(255,255,255,0.5)" />
            <span style={{ fontSize:13, fontWeight:700 }}>View Only</span>
          </div>
          <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.38)", paddingLeft:22 }}>
            Browse without making changes
          </div>
        </button>
      </div>
    </div>
  );
}

export function TranslationInitOverlay({ language, onInitialize, loading }: { language: Exclude<BulletinLanguage, "en">; onInitialize: () => void; loading: boolean }) {
  const config = LANGUAGE_CONFIG[language];
  const korean = language === "ko";
  return (
    <div className="multilang-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Initialize ${config.name} bulletin`}>
      <div className="multilang-modal-card" style={{ width:"min(500px, calc(100vw - 32px))", textAlign:"center" }}>
        <div style={{ fontSize:34 }} aria-hidden>{config.flag}</div>
        <h2 style={{ margin:"8px 0 0", color:"#fff", fontSize:20 }}>{config.name} Bulletin</h2>
        <p style={{ margin:"18px auto", maxWidth:390, color:"rgba(255,255,255,0.72)", fontSize:13, lineHeight:1.65 }}>
          No translated {config.name} content yet. Translate the English bulletin now to create the first edition.
          {korean
            ? " After translation, Korean is fully isolated—future English changes will never affect it."
            : " Future English updates will appear as section notifications and translate when applied."}
        </p>
        <button type="button" className="glass-primary-button" onClick={onInitialize} disabled={loading} style={{ margin:"0 auto" }}>
          {loading ? "Translating…" : `Translate into ${config.name}`}
        </button>
      </div>
    </div>
  );
}

export function SyncPreviewModal({
  sectionKey,
  currentData,
  meta,
  onKeepMine,
  onUseEnglish,
  onClose,
}: {
  sectionKey: string;
  currentData: BulletinData;
  meta: BulletinMeta;
  onKeepMine: () => void;
  onUseEnglish: () => void;
  onClose: () => void;
}) {
  const pending = meta.sections[sectionKey]?.pendingEnContent ?? {};
  const fields = SECTION_FIELD_MAP[sectionKey] ?? [];
  const displayValue = (value: unknown) => typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div className="multilang-modal-backdrop" role="dialog" aria-modal="true" aria-label="English section update preview">
      <div className="multilang-modal-card sync-preview-card">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:14 }}>
          <div style={{ color:"#fff", fontSize:16, fontWeight:900 }}>Section: {sectionKey}</div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="glass-icon-button">×</button>
        </div>
        <div className="sync-preview-grid">
          <div>
            <div className="sync-column-title">English (updated)</div>
            {fields.map((field) => {
              const changed = JSON.stringify(pending[field]) !== JSON.stringify(currentData[field]);
              return (
                <div key={field} className="sync-field" style={{ background:changed ? "rgba(251,191,36,0.13)" : "rgba(255,255,255,0.04)" }}>
                  <div className="sync-field-label">{field}</div>
                  <pre>{displayValue(pending[field])}</pre>
                </div>
              );
            })}
          </div>
          <div>
            <div className="sync-column-title">Your current translation</div>
            {fields.map((field) => (
              <div key={field} className="sync-field">
                <div className="sync-field-label">{field}</div>
                <pre>{displayValue(currentData[field])}</pre>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", gap:10, marginTop:16 }}>
          <button type="button" className="glass-secondary-button" onClick={onKeepMine}>Keep mine</button>
          <button type="button" className="glass-primary-button" onClick={onUseEnglish}>Translate &amp; Apply</button>
        </div>
      </div>
    </div>
  );
}
