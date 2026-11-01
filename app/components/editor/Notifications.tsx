"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle, XCircle, UserCheck } from "lucide-react";
import type { AppNotification } from "@/app/api/notifications/route";
import { type BulletinLanguage, type BulletinMeta } from "@/lib/bulletin-languages";
import { LANGUAGE_CONFIG, isAccessRequestNotification } from "@/app/components/editor/constants";
import { presenceColorFor, presenceInitials } from "@/app/components/editor/AccessControl";

// ── Floating toast for incoming access requests ────────────────────────────────
export function NotificationToast({
  notifications,
  sessionId,
  dismissedToastIds,
  onGrant,
  onDecline,
  onDismissToast,
}: {
  notifications: AppNotification[];
  sessionId: string;
  dismissedToastIds: string[];
  onGrant: (n: AppNotification) => void;
  onDecline: (n: AppNotification) => void;
  onDismissToast: (id: string) => void;
}) {
  const dismissedSet = new Set(dismissedToastIds);
  const toasts = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.targetSessionId === sessionId && n.status === "pending" && !dismissedSet.has(n.id),
  );
  if (toasts.length === 0) return null;
  return (
    <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 55, display: "flex", flexDirection: "column-reverse", gap: 8 }}>
      <AnimatePresence>
        {toasts.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
            style={{
              width: 300,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <div style={{ padding: "12px 14px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: presenceColorFor(n.fromUserName).bg,
                  color: presenceColorFor(n.fromUserName).text,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900,
                }}>
                  {presenceInitials(n.fromUserName)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>{n.fromUserName}</div>
                  <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4, marginTop: 1 }}>
                    {n.type === "join_request" ? "wants to collaborate on" : "wants to take over"}{" "}
                    {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismissToast(n.id)}
                aria-label="Dismiss"
                style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
              >
                ×
              </button>
            </div>
            {/* Action buttons */}
            <div style={{ padding: "8px 14px 12px", display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => { onGrant(n); onDismissToast(n.id); }}
                style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: "#22C55E", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              >
                <CheckCircle size={13} /> {n.type === "join_request" ? "Allow" : "Grant"}
              </button>
              <button
                type="button"
                onClick={() => { onDecline(n); onDismissToast(n.id); }}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <XCircle size={13} /> Decline
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function NotificationPanel({
  notifications,
  metaByLanguage,
  activeLang,
  sessionId,
  seenSectionNotifications,
  onGrant,
  onDecline,
  onSwitchToSection,
  onClose,
}: {
  notifications: AppNotification[];
  metaByLanguage: Record<BulletinLanguage, BulletinMeta>;
  activeLang: BulletinLanguage;
  sessionId: string;
  seenSectionNotifications: Set<string>;
  onGrant: (notif: AppNotification) => void;
  onDecline: (notif: AppNotification) => void;
  onSwitchToSection: (lang: BulletinLanguage, sectionKey: string, notificationId: string) => void;
  onClose: () => void;
}) {
  const incomingRequests = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.targetSessionId === sessionId && n.status === "pending",
  );
  const myPendingRequests = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.status === "pending",
  );
  const myAccepted = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.status === "accepted",
  );
  const myDeclined = notifications.filter(
    (n) => isAccessRequestNotification(n) && n.fromSessionId === sessionId && n.status === "declined",
  );

  // Only show section sync alerts for the currently active language
  const sectionUpdates: { lang: BulletinLanguage; sectionKey: string; notificationId: string }[] = [];
  if (activeLang !== "en" && activeLang !== "ko") {
    const sections = metaByLanguage[activeLang]?.sections ?? {};
    for (const [sectionKey, state] of Object.entries(sections)) {
      if (state.status !== "pending") continue;
      const notificationId = `${activeLang}:${sectionKey}:${state.enContentHash}`;
      if (seenSectionNotifications.has(notificationId)) continue;
      sectionUpdates.push({ lang: activeLang, sectionKey, notificationId });
    }
  }

  const hasNothing = incomingRequests.length === 0 && myPendingRequests.length === 0 && myAccepted.length === 0 && myDeclined.length === 0 && sectionUpdates.length === 0;

  return (
    <div className="notification-panel" style={{
      position: "fixed", top: 62, right: 0, bottom: 80, zIndex: 60,
      display: "flex", flexDirection: "column",
      width: "min(360px, 100vw)",
      background: "rgba(10,15,30,0.72)",
      backdropFilter: "blur(24px) saturate(1.8)",
      WebkitBackdropFilter: "blur(24px) saturate(1.8)",
      borderLeft: "1px solid rgba(255,255,255,0.10)",
      borderRadius: "16px 0 0 16px",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.45)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ flexShrink:0, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, color:"#fff", fontWeight:900, fontSize:15 }}>
          <Bell size={17} /> Notifications
        </div>
        <button type="button" onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:22, lineHeight:1, padding:"0 4px" }} aria-label="Close notifications">×</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:14 }}>
        {hasNothing && (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,0.38)", fontSize:13, marginTop:40 }}>
            No notifications
          </div>
        )}

        {/* Incoming takeover / join requests */}
        {incomingRequests.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Incoming Requests</div>
            {incomingRequests.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.22)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <UserCheck size={15} color="#FCA5A5" />
                  <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>
                    {n.fromUserName} {n.type === "join_request" ? "wants to join as collaborator" : "wants to edit"} {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}
                  </span>
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  <button type="button" onClick={() => onGrant(n)} style={{ flex:1, padding:"7px 0", borderRadius:8, border:"none", background:"rgba(34,197,94,0.85)", color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <CheckCircle size={13} /> {n.type === "join_request" ? "Allow" : "Grant Access"}
                  </button>
                  <button type="button" onClick={() => onDecline(n)} style={{ padding:"7px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"rgba(255,255,255,0.6)", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    <XCircle size={13} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* My pending outgoing requests */}
        {myPendingRequests.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Your Requests</div>
            {myPendingRequests.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(68,114,196,0.12)", border:"1px solid rgba(68,114,196,0.25)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:99, background:"#F59E0B", boxShadow:"0 0 6px rgba(245,158,11,0.6)", flexShrink:0 }} />
                  <span style={{ color:"rgba(255,255,255,0.8)", fontSize:12.5 }}>
                    Waiting for access to {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}…
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Access granted — requester sees this */}
        {myAccepted.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Access Granted</div>
            {myAccepted.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <CheckCircle size={15} color="#86EFAC" />
                  <span style={{ color:"#fff", fontSize:12.5, fontWeight:700 }}>
                    You now have access to {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Access declined — requester sees this */}
        {myDeclined.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>Request Declined</div>
            {myDeclined.map((n) => (
              <div key={n.id} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.28)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <XCircle size={15} color="#FCA5A5" />
                  <span style={{ color:"rgba(255,255,255,0.85)", fontSize:12.5 }}>
                    Your {n.type === "join_request" ? "collaboration" : "takeover"} request for {LANGUAGE_CONFIG[n.lang].flag} {LANGUAGE_CONFIG[n.lang].name} was declined.
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Section update notifications */}
        {sectionUpdates.length > 0 && (
          <section>
            <div style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.4)", marginBottom:8 }}>English Updates Pending</div>
            {sectionUpdates.map(({ lang, sectionKey, notificationId }) => (
              <button
                type="button"
                key={notificationId}
                onClick={() => onSwitchToSection(lang, sectionKey, notificationId)}
                style={{ width:"100%", textAlign:"left", padding:"11px 14px", borderRadius:12, background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.22)", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}
              >
                <AlertTriangle size={14} color="#FCD34D" style={{ flexShrink:0 }} />
                <div>
                  <span style={{ color:"#fff", fontSize:12.5, fontWeight:700 }}>{sectionKey}</span>
                  <span style={{ color:"rgba(255,255,255,0.5)", fontSize:11.5 }}> · {LANGUAGE_CONFIG[lang].flag} {LANGUAGE_CONFIG[lang].name}</span>
                  <div style={{ color:"rgba(255,255,255,0.45)", fontSize:11, marginTop:2 }}>English was updated — tap to review</div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
