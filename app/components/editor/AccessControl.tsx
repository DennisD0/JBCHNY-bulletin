"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronLeft, ChevronRight, XCircle, UserCheck, Pencil, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import type { AppNotification } from "@/app/api/notifications/route";
import { type BulletinLanguage, type LanguageLock } from "@/lib/bulletin-languages";
import { LANGUAGE_CONFIG, PresenceRole, ROLE_META, isAccessRequestNotification } from "@/app/components/editor/constants";

// ── Presence colour / initials helpers ────────────────────────────────────────
export const PRESENCE_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#DCF5E4", text: "#166534" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#F3E8FF", text: "#6B21A8" },
  { bg: "#FFE4E6", text: "#9F1239" },
  { bg: "#CCFBF1", text: "#0F766E" },
];
export function presenceColorFor(name: string) {
  return PRESENCE_COLORS[(name.charCodeAt(0) || 0) % PRESENCE_COLORS.length];
}
export function presenceInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ── Persistent access-control bar (viewer & collaborator) ─────────────────────
// A pill-shaped dark bar pinned bottom-center that lets non-editors request more
// access at any time — Collaborate / Take over for viewers, Request full control /
// Leave for collaborators — plus live pending/declined status with a cancel option.
export function AccessControlBar({
  role, lock, language, notifications, sessionId, candidates,
  onRequestTakeover, onRequestJoin, onLeave, onCancelRequest, onTransferEditor,
}: {
  role: PresenceRole;
  lock: LanguageLock;
  language: BulletinLanguage;
  notifications: AppNotification[];
  sessionId: string;
  candidates: Array<{ name: string; sessionId: string }>;
  onRequestTakeover: () => void;
  onRequestJoin: () => void;
  onLeave: () => void;
  onCancelRequest: (id: string) => void;
  onTransferEditor: (target: { sessionId: string; name: string }) => void;
}) {
  const config = LANGUAGE_CONFIG[language];
  const meta = ROLE_META[role];
  const mine = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.lang === language,
  );
  const pending = mine.find((n) => n.status === "pending");
  const declined = mine.filter((n) => n.status === "declined").sort((a, b) => b.createdAt - a.createdAt)[0];

  const pendingLabel = pending
    ? pending.type === "takeover_request"
      ? (role === "collaborator" ? "Requesting full control" : "Take-over request sent")
      : "Collaborate request sent"
    : null;

  const RoleIcon = meta.Icon;
  const [collapsed, setCollapsed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isEditor = role === "editor";

  // Collapsed: a compact role chip you can expand back into the full bar.
  if (collapsed) {
    const hasStatus = !isEditor && Boolean(pending || declined);
    return (
      <motion.button
        type="button"
        onClick={() => setCollapsed(false)}
        onMouseDown={(e) => e.stopPropagation()}
        title="Show access options"
        initial={{ y: 16, opacity: 0, x: "-50%" }}
        animate={{ y: 0, opacity: 1, x: "-50%" }}
        exit={{ y: 16, opacity: 0, x: "-50%" }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        style={{
          position: "absolute", bottom: 84, left: "50%",
          zIndex: 31, display: "flex", alignItems: "center", gap: 8,
          background: "rgba(10,15,30,0.9)",
          backdropFilter: "blur(20px) saturate(1.7)",
          WebkitBackdropFilter: "blur(20px) saturate(1.7)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 999, padding: "6px 12px 6px 6px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
          cursor: "pointer", pointerEvents: "all",
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: meta.solid, borderRadius: 999, padding: "4px 10px 4px 8px",
          boxShadow: `0 2px 8px ${meta.solid}66`,
        }}>
          <RoleIcon size={12} strokeWidth={2.75} color="#fff" />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{meta.label}</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{isEditor ? "Pass role" : "Request access"}</span>
        {hasStatus && (
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: pending ? "#93C5FD" : "#FCA5A5", flexShrink: 0,
          }} />
        )}
        <ChevronRight size={14} strokeWidth={2.4} color="rgba(255,255,255,0.55)" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ y: 16, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      exit={{ y: 16, opacity: 0, x: "-50%" }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute", bottom: 84, left: "50%",
        zIndex: 31, display: "flex", alignItems: "center", gap: 12,
        background: "rgba(10,15,30,0.9)",
        backdropFilter: "blur(20px) saturate(1.7)",
        WebkitBackdropFilter: "blur(20px) saturate(1.7)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 999, padding: "8px 10px 8px 14px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
        maxWidth: "calc(100% - 24px)",
        whiteSpace: "nowrap", pointerEvents: "all",
      }}
    >
      {/* Role chip */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: meta.solid, borderRadius: 999, padding: "4px 10px 4px 8px",
        flexShrink: 0, boxShadow: `0 2px 8px ${meta.solid}66`,
      }}>
        <RoleIcon size={12} strokeWidth={2.75} color="#fff" />
        <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>{meta.label}</span>
      </span>

      {/* Status text */}
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis" }}>
        {isEditor ? (
          <>
            Editing <span aria-hidden>{config.flag}</span> {config.name}
          </>
        ) : (
          <>
            {role === "collaborator" ? "Collaborating on " : "Viewing "}
            <span aria-hidden>{config.flag}</span> {config.name}
            <span style={{ color: "rgba(255,255,255,0.4)" }}> · </span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{role === "collaborator" ? "with" : ""}</span>{" "}
            <strong style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{lock.userName}</strong>
            {role === "viewer" && " is editing"}
          </>
        )}
      </span>

      {/* Editor: hand the role off to another present user */}
      {isEditor && (
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span aria-hidden style={{ width: 1, height: 20, background: "rgba(255,255,255,0.14)", flexShrink: 0 }} />
          <button
            onClick={() => candidates.length > 0 && setPickerOpen((v) => !v)}
            disabled={candidates.length === 0}
            title={candidates.length === 0 ? "No one else is in this language" : "Hand the editor role to someone here"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: candidates.length === 0 ? "rgba(255,255,255,0.05)" : "rgba(245,158,11,0.22)",
              color: candidates.length === 0 ? "rgba(255,255,255,0.35)" : "#FCD34D",
              border: `1px solid ${candidates.length === 0 ? "rgba(255,255,255,0.1)" : "rgba(245,158,11,0.4)"}`,
              borderRadius: 999, padding: "6px 13px", fontSize: 12, fontWeight: 700,
              cursor: candidates.length === 0 ? "default" : "pointer",
            }}
          >
            <UserCheck size={13} strokeWidth={2.4} />
            {candidates.length === 0 ? "No one else here" : "Pass editor role"}
            {candidates.length > 0 && (pickerOpen ? <ChevronDown size={13} strokeWidth={2.6} /> : <ChevronUp size={13} strokeWidth={2.6} />)}
          </button>

          {/* Pop-up list of present users to hand off to */}
          <AnimatePresence>
            {pickerOpen && candidates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
                style={{
                  position: "absolute", bottom: "calc(100% + 10px)", right: 0,
                  minWidth: 210, maxHeight: 240, overflowY: "auto",
                  background: "rgba(17,24,39,0.98)",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.14)", borderRadius: 14,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5)", padding: 6, zIndex: 40,
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", padding: "6px 10px 4px" }}>
                  Hand off to
                </div>
                {candidates.map((u) => {
                  const c = presenceColorFor(u.name);
                  return (
                    <button
                      key={u.sessionId}
                      onClick={() => { setPickerOpen(false); onTransferEditor({ sessionId: u.sessionId, name: u.name }); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        background: "transparent", border: "none", borderRadius: 9,
                        padding: "7px 10px", cursor: "pointer", textAlign: "left",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        background: c.bg, color: c.text, fontSize: 11, fontWeight: 800,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {presenceInitials(u.name)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.name}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </span>
      )}

      {/* Pending state */}
      {!isEditor && pending && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#93C5FD", fontSize: 12, fontWeight: 600 }}>
            <span style={{
              width: 13, height: 13, borderRadius: "50%",
              border: "2px solid rgba(147,197,253,0.3)", borderTopColor: "#93C5FD",
              animation: "spin 0.8s linear infinite", flexShrink: 0,
            }} />
            {pendingLabel}…
          </span>
          <button
            onClick={() => onCancelRequest(pending.id)}
            title="Cancel request"
            style={{
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999,
              padding: "5px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </span>
      )}

      {/* Action buttons (hidden while a request is pending) */}
      {!isEditor && !pending && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {declined && (
            <span style={{ color: "#FCA5A5", fontSize: 11.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <XCircle size={13} strokeWidth={2.4} /> Last request declined
            </span>
          )}
          {/* Divider */}
          <span aria-hidden style={{ width: 1, height: 20, background: "rgba(255,255,255,0.14)", flexShrink: 0 }} />
          {/* "Request to:" label makes the buttons read as requests */}
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
            Request to:
          </span>
          {role === "viewer" && (
            <button
              onClick={onRequestJoin}
              title="Ask to edit alongside them at the same time"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(139,92,246,0.22)", color: "#C4B5FD",
                border: "1px solid rgba(139,92,246,0.4)", borderRadius: 999,
                padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <Users size={13} strokeWidth={2.4} /> Edit together
            </button>
          )}
          <button
            onClick={onRequestTakeover}
            title="Ask them to hand over full editing control to you"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(239,68,68,0.22)", color: "#FCA5A5",
              border: "1px solid rgba(239,68,68,0.45)", borderRadius: 999,
              padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            <Pencil size={12} strokeWidth={2.4} /> Take full control
          </button>
          {role === "collaborator" && (
            <>
              <span aria-hidden style={{ width: 1, height: 20, background: "rgba(255,255,255,0.14)", flexShrink: 0 }} />
              <button
                onClick={onLeave}
                title="Stop collaborating and go back to view-only"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "transparent", color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                <LogOut size={12} strokeWidth={2.4} /> Leave
              </button>
            </>
          )}
        </span>
      )}

      {/* Minimize to a compact chip */}
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        title="Minimize"
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, flexShrink: 0,
          background: "transparent", color: "rgba(255,255,255,0.5)",
          border: "1px solid rgba(255,255,255,0.14)", borderRadius: "50%",
          cursor: "pointer",
        }}
      >
        <ChevronLeft size={15} strokeWidth={2.4} />
      </button>
    </motion.div>
  );
}
