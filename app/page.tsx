"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, BookMarked, CalendarRange, Save as SaveIcon, Download, ChevronRight } from "lucide-react";
import type { AppNotification } from "@/app/api/notifications/route";
import type { BulletinComment } from "@/app/api/comments/route";
import BulletinPreview, { PAGE_W, PAGE_H } from "@/app/components/BulletinPreview";
import BulletinFitController from "@/app/components/BulletinFitController";
import { UploadModal } from "@/app/components/UploadModal";
import { MonthCalendarModal } from "@/app/components/MonthCalendarModal";
import { ExportAllModal } from "@/app/components/ExportAllModal";
import { monthCalendarPatch } from "@/lib/month-calendar-patch";
import PresenceModal from "@/app/components/PresenceModal";
import type { BulletinData } from "@/lib/bulletin-types";
import { BULLETIN_LANGUAGES, defaultBulletinMeta, type BulletinApiResponse, type BulletinLanguage, type BulletinMeta, type LanguageLock, type LanguageLocks } from "@/lib/bulletin-languages";
import { buildEastCoastRows, buildSeminarInfo, buildServiceRows, buildWeekSchedule } from "@/lib/week-generation";
import { ManageData } from "@/app/components/editor/AutomationPanel";
import { CanvasMode, FloatingToolbar } from "@/app/components/editor/FloatingToolbar";
import { SECTIONS, TabId, TAB_SECTION_KEY, FIELD_TO_TAB, LANGUAGE_CONFIG, roleForSession, isAccessRequestNotification, playNotificationChime, SECTION_ZOOM, localIso, addLocalDays, displayCoverageDate, getBulletinWeeks, monthFromBulletinDate, monthProgress } from "@/app/components/editor/constants";
import { NavItem, SidebarSourceProgress } from "@/app/components/editor/Sidebar";
import { LanguageTabBar, LockModal, SyncPreviewModal } from "@/app/components/editor/LanguageBar";
import { presenceColorFor, presenceInitials, AccessControlBar } from "@/app/components/editor/AccessControl";
import { NotificationToast, NotificationPanel } from "@/app/components/editor/Notifications";
import { SectionEditorPanel } from "@/app/components/editor/SectionEditorPanel";
import { CommentPin, CommentThreadPanel } from "@/app/components/editor/Comments";

export default function Home() {
  const historyStack = useRef<BulletinData[]>([]);
  const historyPos   = useRef(-1);
  const [historyStamp, setHistoryStamp] = useState(0);
  // Persist sessionId in sessionStorage so page refreshes reuse the same
  // identity and don't see their own lock as a conflict.
  const sessionId = useRef(
    (() => {
      const KEY = "bulletin-session-id";
      const stored = typeof sessionStorage !== "undefined" && sessionStorage.getItem(KEY);
      if (stored) return stored;
      const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(KEY, id);
      return id;
    })(),
  );
  const activeLangRef = useRef<BulletinLanguage>("en");
  const dataRef        = useRef<BulletinData | null>(null);
  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [data, setData]           = useState<BulletinData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [activeLang, setActiveLang] = useState<BulletinLanguage>("en");
  const [meta, setMeta] = useState<BulletinMeta>(() => defaultBulletinMeta("en"));
  const [metaByLanguage, setMetaByLanguage] = useState<Record<BulletinLanguage, BulletinMeta>>(() => ({
    en: defaultBulletinMeta("en"),
    es: defaultBulletinMeta("es"),
    ko: defaultBulletinMeta("ko"),
    zh: defaultBulletinMeta("zh"),
    ru: defaultBulletinMeta("ru"),
  }));
  const [locks, setLocks] = useState<LanguageLocks>({ en:null, es:null, ko:null, zh:null, ru:null });
  const [lockConflict, setLockConflict] = useState<{ language: BulletinLanguage; lock: LanguageLock } | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [syncPreviewSection, setSyncPreviewSection] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [mobileSetupOpen, setMobileSetupOpen] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [seenSectionNotifications, setSeenSectionNotifications] = useState<string[]>([]);
  // IDs of access-request notifications the user has already seen (panel opened while visible)
  const [seenNotifIds, setSeenNotifIds] = useState<string[]>([]);

  // Presence: list of all active users (including self), updated via PresenceModal callback
  const [presenceUsers, setPresenceUsers] = useState<Array<{ name: string; sessionId: string; language?: string; section?: string }>>([]);
  const [presenceMyName, setPresenceMyName] = useState("");
  const presenceMyNameRef = useRef("");
  // Notification-sound bookkeeping: signatures (id:status) we've already chimed for.
  // Seeded on the first poll so we don't play a sound for pre-existing notifications.
  const heardNotifSigsRef = useRef<Set<string> | null>(null);
  // Track which incoming-request toasts the user has dismissed from view (not from notifications)
  const [dismissedToastIds, setDismissedToastIds] = useState<string[]>([]);

  // Comment system state
  const [comments, setComments] = useState<BulletinComment[]>([]);
  const [draftPin, setDraftPin] = useState<{ rx: number; ry: number } | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentDraftText, setCommentDraftText] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [savedMsg, setSavedMsg]   = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [changedSections, setChangedSections] = useState<Set<TabId>>(new Set());
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [generationNotice, setGenerationNotice] = useState("");
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [showExportAll, setShowExportAll] = useState(false);
  // Real clock for the Monthly Calendar meter: how much of its month has gone by.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const calendarProgress = monthProgress(data?.calendarMonth, clock);

  const [mgmt, setMgmt]           = useState<ManageData | null>(null);
  const [uploadTarget, setUploadTarget] = useState<null | "reading" | "schedule">(null);

  // Canvas refs — transform applied directly to DOM for smooth drag perf
  const canvasRef   = useRef<HTMLDivElement>(null);
  const pdfDivRef   = useRef<HTMLDivElement>(null);
  const transformRef = useRef({ x: 0, y: 0, z: 0.5 });
  const dragging    = useRef(false);
  const dragOrigin  = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const initialized = useRef(false);

  const [exporting, setExporting]     = useState(false);
  const [exportError, setExportError] = useState("");
  const [canvasMode, setCanvasMode]   = useState<CanvasMode>("grab");
  const [spacePanning, setSpacePanning] = useState(false);
  const spaceHeld = useRef(false);
  const canvasModeRef = useRef<CanvasMode>("grab");
  const interactionMode: CanvasMode = spacePanning ? "grab" : canvasMode;

  // Two-layer transform: outer div pans via translate, inner div scales.
  // Not CSS zoom: WebKit (iPad/iPhone Safari) lays text out at a different size
  // than its boxes under zoom, so bulletin text overflowed and overlapped there.
  const pdfPanRef  = useRef<HTMLDivElement>(null);
  const pdfZoomRef = useRef<HTMLDivElement>(null);

  const applyTransform = useCallback((x: number, y: number, z: number, animate = false) => {
    transformRef.current = { x, y, z };
    const pan  = pdfPanRef.current;
    const zoom = pdfZoomRef.current;
    if (!pan || !zoom) return;
    const easing = "cubic-bezier(0.4,0,0.2,1)";
    pan.style.transition  = animate ? `transform 0.42s ${easing}` : "none";
    zoom.style.transition = animate ? `transform 0.42s ${easing}` : "none";
    pan.style.transform   = `translate(${x}px,${y}px)`;
    zoom.style.transform  = `scale(${z})`;
  }, []);

  const postLockAction = useCallback(async (
    action: "acquire" | "release" | "heartbeat" | "takeover",
    language: BulletinLanguage,
  ) => {
    const response = await fetch("/api/locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, lang:language, sessionId:sessionId.current, userName:presenceMyNameRef.current || "Editor" }),
      keepalive: action === "release",
    });
    return response.json() as Promise<{ ok: boolean; lock?: LanguageLock }>;
  }, []);

  const releaseActiveAccess = useCallback(() => {
    void postLockAction("release", activeLangRef.current).catch(() => undefined);
  }, [postLockAction]);

  const loadLanguage = useCallback(async (language: BulletinLanguage): Promise<BulletinMeta> => {
    const response = await fetch(`/api/bulletin/${language}`, { cache:"no-store" });
    if (!response.ok) throw new Error(`Unable to load ${language} bulletin`);
    const payload = await response.json() as BulletinApiResponse;
    const bulletin = payload.data;

    if (language === "en" && bulletin.date) {
      try {
        const autoResponse = await fetch(`/api/auto-populate?date=${encodeURIComponent(bulletin.date)}`);
        if (autoResponse.ok) {
          const { dates, reading1, reading2 } = await autoResponse.json();
          bulletin.bibleReadingDates = dates;
          bulletin.bibleReading1 = reading1;
          bulletin.bibleReading2 = reading2;
        }
      } catch {}
    }

    setData(bulletin);
    setMeta(payload.meta);
    setMetaByLanguage((current) => ({ ...current, [language]: payload.meta }));
    historyStack.current = [bulletin];
    historyPos.current = 0;
    setHistoryStamp((stamp) => stamp + 1);

    const [calendarMonth, calendarYear] = String(bulletin.calendarMonth ?? "").split("/").map(Number);
    const initialMonth = calendarMonth && calendarYear
      ? `${calendarYear}-${String(calendarMonth).padStart(2, "0")}`
      : monthFromBulletinDate(bulletin.date ?? "");
    if (initialMonth) {
      setSelectedMonth(initialMonth);
      const [month, day, year] = String(bulletin.date).split("/").map(Number);
      const selectedDate = new Date(year, month - 1, day);
      const sunday = addLocalDays(selectedDate, -selectedDate.getDay());
      const weekIndex = getBulletinWeeks(initialMonth).findIndex((week) => week.startIso === localIso(sunday));
      setSelectedWeekIndex(Math.max(0, weekIndex));
    }

    return payload.meta;
  }, []);

  const refreshLanguageStatus = useCallback(async () => {
    try {
      const [locksResponse, ...languageResponses] = await Promise.all([
        fetch("/api/locks", { cache:"no-store" }),
        ...BULLETIN_LANGUAGES.map((language) => fetch(`/api/bulletin/${language}`, { cache:"no-store" })),
      ]);
      if (locksResponse.ok) setLocks(await locksResponse.json());
      const updates: Partial<Record<BulletinLanguage, BulletinMeta>> = {};
      for (let index = 0; index < BULLETIN_LANGUAGES.length; index += 1) {
        if (!languageResponses[index].ok) continue;
        const payload = await languageResponses[index].json() as BulletinApiResponse;
        const language = BULLETIN_LANGUAGES[index];
        updates[language] = payload.meta;
        if (language === activeLangRef.current) setMeta(payload.meta);
      }
      setMetaByLanguage((current) => ({ ...current, ...updates }));
    } catch {}
  }, []);

  const buildSectionNotificationId = useCallback((language: BulletinLanguage, sectionKey: string) => {
    const hash = metaByLanguage[language]?.sections?.[sectionKey]?.enContentHash ?? "pending";
    return `${language}:${sectionKey}:${hash}`;
  }, [metaByLanguage]);

  const markSectionNotificationSeen = useCallback((notificationId: string) => {
    setSeenSectionNotifications((current) => (current.includes(notificationId) ? current : [...current, notificationId]));
  }, []);

  // Wait for presence name before acquiring lock — presence POST evicts old same-name
  // sessions and releases their locks, so acquiring before that causes a false conflict.
  useEffect(() => {
    if (!presenceMyName) return;
    let cancelled = false;
    (async () => {
      const acquisition = await postLockAction("acquire", "en");
      if (cancelled) return;
      if (!acquisition.ok && acquisition.lock) setLockConflict({ language:"en", lock:acquisition.lock });
      await loadLanguage("en");
      await refreshLanguageStatus();
    })().catch(() => setSavedMsg("Unable to load bulletin"));
    return () => { cancelled = true; };
  }, [presenceMyName, loadLanguage, postLockAction, refreshLanguageStatus]);

  useEffect(() => {
    const interval = window.setInterval(refreshLanguageStatus, 30_000);
    return () => window.clearInterval(interval);
  }, [refreshLanguageStatus]);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    const pendingIds = new Set<string>();
    for (const language of BULLETIN_LANGUAGES) {
      const sections = metaByLanguage[language]?.sections ?? {};
      for (const [sectionKey, state] of Object.entries(sections)) {
        if (state.status === "pending") pendingIds.add(`${language}:${sectionKey}:${state.enContentHash}`);
      }
    }
    setSeenSectionNotifications((current) => {
      const next = current.filter((id) => pendingIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [metaByLanguage]);

  const pollNotifications = useCallback(async () => {
    const res = await fetch(`/api/notifications?sessionId=${sessionId.current}`, { cache:"no-store" });
    if (!res.ok) return;
    const fresh = await res.json() as AppNotification[];
    setNotifications(fresh);

    // Play a chime for anything freshly arriving that concerns me: an incoming
    // request/transfer aimed at me, or a resolution (accept/decline) of a request
    // I sent. Signature includes status so a status change re-triggers the sound.
    const forMe = fresh.filter(
      (n) =>
        n.targetSessionId === sessionId.current ||
        (n.fromSessionId === sessionId.current && n.status !== "pending"),
    );
    const sigs = forMe.map((n) => `${n.id}:${n.status}`);
    if (heardNotifSigsRef.current === null) {
      heardNotifSigsRef.current = new Set(sigs); // seed on first poll — no sound on load
    } else {
      const heard = heardNotifSigsRef.current;
      if (sigs.some((s) => !heard.has(s))) playNotificationChime();
      for (const s of sigs) heard.add(s);
    }

    // Auto-acquire lock when a takeover request we sent gets accepted.
    // Works for both viewers and collaborators requesting full control.
    const takeoverAccepted = fresh.find(
      (n) => n.type === "takeover_request" && n.fromSessionId === sessionId.current && n.status === "accepted",
    );
    if (takeoverAccepted && (readOnly || isCollaborator) && activeLangRef.current === takeoverAccepted.lang) {
      const acquisition = await postLockAction("acquire", takeoverAccepted.lang);
      if (acquisition.ok) {
        setReadOnly(false);
        setIsCollaborator(false);
        await loadLanguage(takeoverAccepted.lang);
        await refreshLanguageStatus();
      }
    }

    // When a join_request we sent gets accepted, become a collaborator
    const joinAccepted = fresh.find(
      (n) => n.type === "join_request" && n.fromSessionId === sessionId.current && n.status === "accepted",
    );
    if (joinAccepted && readOnly && activeLangRef.current === joinAccepted.lang) {
      await fetch("/api/locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-collaborator", lang: joinAccepted.lang, sessionId: sessionId.current }),
      });
      setIsCollaborator(true);
      setReadOnly(false);
    }
    // The editor handed the role to me — claim the lock and become the editor.
    const editorGranted = fresh.find(
      (n) => n.type === "editor_transferred" && n.targetSessionId === sessionId.current && n.status === "pending",
    );
    if (editorGranted && activeLangRef.current === editorGranted.lang) {
      const acquisition = await postLockAction("acquire", editorGranted.lang);
      if (acquisition.ok) {
        setReadOnly(false);
        setIsCollaborator(false);
        await loadLanguage(editorGranted.lang);
        await refreshLanguageStatus();
        // Only mark consumed once the lock is actually held — otherwise a failed
        // acquisition would silently swallow the transfer. Leaving it pending lets
        // the next poll retry the handoff.
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editorGranted.id, status: "accepted", sessionId: sessionId.current }),
        });
      }
    }

    // Declined requests surface inline on the AccessControlBar — no forced panel.
  }, [loadLanguage, postLockAction, readOnly, isCollaborator, refreshLanguageStatus]);

  useEffect(() => {
    pollNotifications();
    const interval = window.setInterval(pollNotifications, 5_000);
    return () => window.clearInterval(interval);
  }, [pollNotifications]);

  // When the notification panel opens, mark everything currently visible as seen so the
  // bell badge clears — access requests (as sender or target) and pending section updates.
  useEffect(() => {
    if (!notifPanelOpen) return;
    const requestIds = notifications
      .filter((n) => isAccessRequestNotification(n) && (n.fromSessionId === sessionId.current || n.targetSessionId === sessionId.current))
      .map((n) => n.id);
    setSeenNotifIds((prev) => {
      const newIds = requestIds.filter((id) => !prev.includes(id));
      return newIds.length > 0 ? [...prev, ...newIds] : prev;
    });
    if (activeLang !== "en" && activeLang !== "ko") {
      const sectionIds = Object.entries(metaByLanguage[activeLang]?.sections ?? {})
        .filter(([, state]) => state.status === "pending")
        .map(([sectionKey]) => buildSectionNotificationId(activeLang, sectionKey));
      setSeenSectionNotifications((prev) => {
        const newIds = sectionIds.filter((id) => !prev.includes(id));
        return newIds.length > 0 ? [...prev, ...newIds] : prev;
      });
    }
  }, [notifPanelOpen, notifications, activeLang, metaByLanguage, buildSectionNotificationId]);

  const pollComments = useCallback(async () => {
    const res = await fetch("/api/comments", { cache: "no-store" });
    if (res.ok) setComments(await res.json());
  }, []);

  useEffect(() => {
    pollComments();
    const interval = window.setInterval(pollComments, 10_000);
    return () => window.clearInterval(interval);
  }, [pollComments]);

  useEffect(() => {
    if (readOnly || isCollaborator) return;
    const interval = window.setInterval(() => {
      postLockAction("heartbeat", activeLang).catch(() => undefined);
    }, 45_000);
    return () => window.clearInterval(interval);
  }, [activeLang, isCollaborator, postLockAction, readOnly]);

  useEffect(() => {
    const handlePageExit = () => {
      // sendBeacon is guaranteed to fire even as the tab closes; fetch/keepalive is not.
      const payload = JSON.stringify({
        action: "release",
        lang: activeLangRef.current,
        sessionId: sessionId.current,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/locks", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/locks", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
      }
    };
    window.addEventListener("beforeunload", handlePageExit);
    window.addEventListener("pagehide", handlePageExit);
    return () => {
      window.removeEventListener("beforeunload", handlePageExit);
      window.removeEventListener("pagehide", handlePageExit);
    };
  }, []);

  // Load auto-fill management data
  const loadMgmt = useCallback(async () => {
    try {
      const r = await fetch("/api/manage");
      if (r.ok) setMgmt(await r.json());
    } catch {}
  }, []);
  useEffect(() => { loadMgmt(); }, [loadMgmt]);

  const fitToScreen = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const totalH = PAGE_H * 2 + 4;
    const z = Math.min(el.clientWidth / (PAGE_W + 40), el.clientHeight / (totalH + 40)) * 0.90;
    applyTransform((el.clientWidth - PAGE_W * z) / 2, Math.max(16, (el.clientHeight - totalH * z) / 2), z, true);
  }, [applyTransform]);

  // Initialize PDF canvas to fit both pages after data loads
  useEffect(() => {
    if (!data || initialized.current) return;
    fitToScreen();
    initialized.current = true;
  }, [data, fitToScreen]);

  // Mobile browsers can report a desktop-like layout width during startup and
  // then settle on the real visual viewport. Refit after resize/orientation
  // changes so the bulletin never remains cropped at the stale zoom level.
  useEffect(() => {
    const handleResize = () => {
      if (activeTab) return;
      window.requestAnimationFrame(fitToScreen);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab, fitToScreen]);

  // Non-passive wheel listener for zoom-toward-cursor
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y, z } = transformRef.current;
      const factor = e.deltaY < 0 ? 1.08 : 0.925;
      const newZ = Math.min(4, Math.max(0.1, z * factor));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // With CSS zoom, pan coords are in un-zoomed space, so math is identical to scale()
      applyTransform(mx - (mx - x) * (newZ / z), my - (my - y) * (newZ / z), newZ);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyTransform]);

  // Sync mode ref whenever state changes + update cursor
  useEffect(() => {
    canvasModeRef.current = canvasMode;
    const el = canvasRef.current;
    if (el && !dragging.current) {
      el.style.cursor = canvasMode === "grab" ? "grab" : canvasMode === "comment" ? "crosshair" : "default";
    }
  }, [canvasMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editing = target.tagName === "INPUT" || target.tagName === "TEXTAREA"
        || target.tagName === "SELECT" || target.isContentEditable;

      if (e.key === "Escape") { setActiveTab(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        fitToScreen();
      }

      if (editing) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) {
          spaceHeld.current = true;
          setSpacePanning(true);
        }
      }
      // Undo / Redo — only when not in an editable element
      if (!editing && (e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyPos.current > 0) {
          historyPos.current--;
          setData(historyStack.current[historyPos.current]);
          setHistoryStamp(s => s + 1);
        }
        return;
      }
      if (!editing && (e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (historyPos.current < historyStack.current.length - 1) {
          historyPos.current++;
          setData(historyStack.current[historyPos.current]);
          setHistoryStamp(s => s + 1);
        }
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "v" || e.key === "V") setCanvasMode("select");
        if (e.key === "h" || e.key === "H") setCanvasMode("grab");
        if (e.key === "c" || e.key === "C") setCanvasMode("comment");
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceHeld.current = false;
      setSpacePanning(false);
    };
    const moveHandler = (e: MouseEvent) => {
      if (!spaceHeld.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      if (e.movementX === 0 && e.movementY === 0) return;
      applyTransform(
        transformRef.current.x + e.movementX,
        transformRef.current.y + e.movementY,
        transformRef.current.z,
      );
    };
    const blurHandler = () => {
      spaceHeld.current = false;
      setSpacePanning(false);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", upHandler);
    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("blur", blurHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", upHandler);
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("blur", blurHandler);
    };
  }, [applyTransform, fitToScreen]);

  const canUndo = historyPos.current > 0;
  const canRedo = historyPos.current < historyStack.current.length - 1;

  const patch = useCallback((p: Partial<BulletinData>) => {
    if (readOnly) return;
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      historyStack.current = historyStack.current.slice(0, historyPos.current + 1);
      historyStack.current.push(next);
      if (historyStack.current.length > 60) historyStack.current = historyStack.current.slice(-60);
      historyPos.current = historyStack.current.length - 1;
      return next;
    });
    setChangedSections((prev) => {
      const next = new Set(prev);
      for (const key of Object.keys(p) as (keyof BulletinData)[]) {
        const tab = FIELD_TO_TAB[key];
        if (tab) next.add(tab);
      }
      return next;
    });
    setHistoryStamp(s => s + 1);
    setAutoSaveStatus("pending");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void doAutoSaveRef.current(); }, 2000);
  }, [readOnly]);

  const submitComment = async () => {
    if (!draftPin || !commentDraftText.trim()) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rx: draftPin.rx, ry: draftPin.ry, author: presenceMyName || "Editor", text: commentDraftText }),
    });
    if (res.ok) {
      const created = await res.json() as BulletinComment;
      setComments(prev => [...prev, created]);
      setActiveCommentId(created.id);
      setDraftPin(null);
      setCommentDraftText("");
    }
  };

  const submitReply = async (commentId: string, text: string) => {
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId, reply: { author: presenceMyName || "Editor", text } }),
    });
    if (res.ok) {
      const updated = await res.json() as BulletinComment;
      setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
    }
  };

  const resolveComment = async (commentId: string) => {
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: commentId, resolved: true }),
    });
    if (res.ok) {
      const updated = await res.json() as BulletinComment;
      setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (activeCommentId === commentId) setActiveCommentId(null);
    }
  };

  const dismissPendingSection = async (sectionKey: string) => {
    setMeta(m => ({
      ...m,
      sections: { ...m.sections, [sectionKey]: { ...m.sections[sectionKey], status: "dismissed" as const } },
    }));
    await fetch(`/api/bulletin/${activeLang}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionKey, action: "dismiss" }),
    });
  };

  const undo = useCallback(() => {
    if (historyPos.current <= 0) return;
    historyPos.current--;
    setData(historyStack.current[historyPos.current]);
    setHistoryStamp(s => s + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyPos.current >= historyStack.current.length - 1) return;
    historyPos.current++;
    setData(historyStack.current[historyPos.current]);
    setHistoryStamp(s => s + 1);
  }, []);

  const switchLanguage = async (language: BulletinLanguage) => {
    if (language === activeLang) return;
    if (!readOnly) await postLockAction("release", activeLang).catch(() => undefined);

    activeLangRef.current = language;
    setActiveLang(language);
    setActiveTab(null);
    setSyncPreviewSection(null);
    setReadOnly(false);
    setIsCollaborator(false);
    const loadedMeta = await loadLanguage(language);

    if (language !== "en" && !loadedMeta.initializedFromEn) {
      setTranslating(true);
      try {
        await fetch(`/api/bulletin/${language}/translate`, { method:"POST" });
        await loadLanguage(language);
      } finally {
        setTranslating(false);
      }
    }

    const acquisition = await postLockAction("acquire", language);
    if (!acquisition.ok && acquisition.lock) {
      setLockConflict({ language, lock:acquisition.lock });
    }
    await refreshLanguageStatus();
  };

  const takeOverLanguage = async (language: BulletinLanguage = activeLang) => {
    const takeover = await postLockAction("takeover", language);
    if (!takeover.ok) return;
    activeLangRef.current = language;
    setActiveLang(language);
    setReadOnly(false);
    setLockConflict(null);
    await loadLanguage(language);
    await refreshLanguageStatus();
  };

  const requestTakeover = async (language: BulletinLanguage, lock: LanguageLock) => {
    setReadOnly(true);
    setLockConflict(null);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "takeover_request",
        lang: language,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyName || "Editor",
        targetSessionId: lock.sessionId,
      }),
    });
    setNotifPanelOpen(true);
    await pollNotifications();
  };

  const requestJoin = async (language: BulletinLanguage, lock: LanguageLock) => {
    setLockConflict(null);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "join_request",
        lang: language,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyName || "Editor",
        targetSessionId: lock.sessionId,
      }),
    });
    setReadOnly(true);
    setNotifPanelOpen(true);
    await pollNotifications();
  };

  // Fire an access request from the persistent AccessControlBar (no panel auto-open).
  const sendAccessRequest = async (type: "takeover_request" | "join_request") => {
    const holder = locks[activeLang];
    if (!holder) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        lang: activeLang,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyNameRef.current || "Editor",
        targetSessionId: holder.sessionId,
      }),
    });
    await pollNotifications();
  };

  // Withdraw a pending request I sent.
  const cancelAccessRequest = async (id: string) => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sessionId: sessionId.current }),
    });
    await pollNotifications();
  };

  // Leave collaboration — drop back to view-only without closing the tab.
  const leaveCollaboration = async () => {
    await postLockAction("release", activeLang); // removes me from the lock's collaborators
    setIsCollaborator(false);
    setReadOnly(true);
    await refreshLanguageStatus();
  };

  // Hand the editor role to another present user in the same language.
  // The lock is reassigned to them; I drop to view-only. A notification tells
  // them to promote themselves immediately (rather than wait for the 30s poll).
  const transferEditor = async (target: { sessionId: string; name: string }) => {
    const res = await fetch("/api/locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "transfer",
        lang: activeLang,
        sessionId: sessionId.current,
        targetSessionId: target.sessionId,
        targetUserName: target.name,
      }),
    });
    const data = await res.json() as { ok: boolean };
    if (!data.ok) {
      await refreshLanguageStatus();
      return;
    }
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "editor_transferred",
        lang: activeLang,
        fromSessionId: sessionId.current,
        fromUserName: presenceMyNameRef.current || "Editor",
        targetSessionId: target.sessionId,
      }),
    });
    setReadOnly(true);
    setIsCollaborator(false);
    await refreshLanguageStatus();
    await pollNotifications();
  };

  const grantLockAccess = async (notif: AppNotification) => {
    if (notif.type === "join_request") {
      // Add requester as collaborator — don't release own lock
      await fetch("/api/locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-collaborator",
          lang: notif.lang,
          sessionId: sessionId.current,
          targetSessionId: notif.fromSessionId,
        }),
      });
    } else {
      // takeover_request — release own lock and drop to read-only for that language
      await postLockAction("release", notif.lang);
      if (notif.lang === activeLangRef.current) {
        setReadOnly(true);
        setIsCollaborator(false);
      }
    }
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notif.id, status: "accepted", sessionId: sessionId.current }),
    });
    await pollNotifications();
    await refreshLanguageStatus();
  };

  const declineTakeover = async (notif: AppNotification) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notif.id, status: "declined", sessionId: sessionId.current }),
    });
    await pollNotifications();
  };

  const applyEnglishSection = async (sectionKey: string) => {
    if (readOnly || activeLang === "en" || activeLang === "ko") return;
    const response = await fetch(`/api/bulletin/${activeLang}/apply`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ sectionKey }),
    });
    if (!response.ok) return;
    const payload = await response.json() as BulletinApiResponse;
    setData(payload.data);
    setMeta(payload.meta);
    setMetaByLanguage((current) => ({ ...current, [activeLang]:payload.meta }));
    historyStack.current = [payload.data];
    historyPos.current = 0;
    setSyncPreviewSection(null);
  };

  const dismissEnglishSection = async (sectionKey: string) => {
    if (readOnly || activeLang === "en" || activeLang === "ko") return;
    const response = await fetch(`/api/bulletin/${activeLang}/dismiss`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ sectionKey }),
    });
    if (!response.ok) return;
    const payload = await response.json() as { meta: BulletinMeta };
    setMeta(payload.meta);
    setMetaByLanguage((current) => ({ ...current, [activeLang]:payload.meta }));
    setSyncPreviewSection(null);
  };

  const doAutoSave = async () => {
    const d = dataRef.current;
    const lang = activeLangRef.current;
    if (!d || readOnly) return;
    setAutoSaveStatus("saving");
    try {
      const res = await fetch(`/api/bulletin/${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: d }),
      });
      if (res.ok) {
        setAutoSaveStatus("saved");
        setChangedSections(new Set());
        void refreshLanguageStatus();
        setTimeout(() => setAutoSaveStatus(s => s === "saved" ? "idle" : s), 3000);
      } else {
        setAutoSaveStatus("error");
        setTimeout(() => setAutoSaveStatus(s => s === "error" ? "idle" : s), 4000);
      }
    } catch {
      setAutoSaveStatus("error");
      setTimeout(() => setAutoSaveStatus(s => s === "error" ? "idle" : s), 4000);
    }
  };
  const doAutoSaveRef = useRef(doAutoSave);
  doAutoSaveRef.current = doAutoSave;

  const save = async () => {
    if (!data || readOnly) return;
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    setAutoSaveStatus("idle");
    setSaving(true);
    const sectionKey = activeTab ? TAB_SECTION_KEY[activeTab] : undefined;
    const res = await fetch(`/api/bulletin/${activeLang}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, sectionKey }),
    });
    setSaving(false);
    setSavedMsg(res.ok ? "Saved!" : "Error saving");
    if (res.ok) {
      setChangedSections(new Set());
      await refreshLanguageStatus();
    }
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const handleGenerateWeek = async () => {
    if (readOnly) return;
    const week = getBulletinWeeks(selectedMonth)[selectedWeekIndex];
    if (!week) return;

    setGeneratingWeek(true);
    setGenerationNotice("");
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = `${String(week.start.getMonth() + 1).padStart(2, "0")}/${String(week.start.getDate()).padStart(2, "0")}/${week.start.getFullYear()}`;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = localIso(new Date(year, month, 0));
    const calendarBanners = (schedule?.events ?? [])
      // Online-only events (e.g. the EC online teacher retreat) aren't drawn on the printed calendar.
      .filter((event) => event.endDate >= monthStart && event.startDate <= monthEnd && event.location !== "Online")
      .map((event) => {
        const [, startMonth, startDay] = event.startDate.split("-").map(Number);
        const [, endMonth, endDay] = event.endDate.split("-").map(Number);
        const pastorSuffix = event.type === "grand-bible-seminar" && event.pastor
          ? ` (p.${event.pastor.split(" ").pop()})`
          : "";
        return {
          label: event.label + pastorSuffix,
          startDate: `${startMonth}/${startDay}`,
          endDate: `${endMonth}/${endDay}`,
          type: undefined,
        };
      });

    const doy = Math.floor((week.start.getTime() - new Date(week.start.getFullYear(), 0, 0).getTime()) / 86400000);
    const bulletinNumber = `${week.start.getFullYear()}-${String(Math.floor(doy / 7)).padStart(2, "0")}`;

    const DOW_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const bValLocal = (v: string) => { const [bm, bd] = v.split("/").map(Number); return bm * 100 + bd; };
    // Day notes for the new month: a month change clears them (see nextPatch), so don't read the old month's.
    const calendarEventsForWeek = data?.calendarMonth === `${String(month).padStart(2, "0")}/${year}` ? (data?.calendarEvents ?? {}) : {};
    // English prints the full wording with place and time; other languages keep their own labels.
    const generatedWeekSchedule = activeLang === "en"
      ? buildWeekSchedule({
          sundayIso: localIso(week.start),
          recurring: data?.weeklyRecurring ?? [],
          events: calendarEventsForWeek,
          banners: calendarBanners,
        })
      : Array.from({ length: 7 }, (_, i) => {
      const d = new Date(week.start.getFullYear(), week.start.getMonth(), week.start.getDate() + i);
      const m = d.getMonth() + 1;
      const dayNum = d.getDate();
      const current = m * 100 + dayNum;
      const items: Array<{ name: string; location: string; time: string }> = [];
      for (const banner of calendarBanners) {
        if (current >= bValLocal(banner.startDate) && current <= bValLocal(banner.endDate)) {
          items.push({ name: banner.label, location: "", time: "" });
        }
      }
      for (const r of (data?.weeklyRecurring ?? [])) {
        if (r.dayOfWeek === i) {
          // The language-group fellowship has no fixed room yet; print TBA in every language.
          const tba = /fellowship by lang|fel\.? by lang|언어\s*(권)?별\s*(교제|모임)|por idioma|语言|по\s+язык/i.test(r.label);
          items.push({ name: r.label, location: tba ? "TBA" : "", time: "" });
        }
      }
      return { date: `${m}/${dayNum}(${DOW_SHORT[i]})`, items };
    }).filter(day => day.items.length > 0);

    // Build East Coast Seminar rows: upcoming entries from bulletin Sunday onward, sorted ascending
    const bulletinIso = `${week.start.getFullYear()}-${String(week.start.getMonth() + 1).padStart(2,"0")}-${String(week.start.getDate()).padStart(2,"0")}`;
    const upcomingEastCoast = buildEastCoastRows(schedule?.eastCoastSeminars ?? [], bulletinIso, activeLang);
    const seminarInfo = buildSeminarInfo(schedule?.events ?? [], bulletinIso);

    const nextPatch: Partial<BulletinData> = {
      date,
      number: bulletinNumber,
      calendarMonth: `${String(month).padStart(2, "0")}/${year}`,
      calendarBanners,
      // Day notes are keyed "m/d" with no year, so a new month must not inherit the old month's.
      ...(data?.calendarMonth !== `${String(month).padStart(2, "0")}/${year}` ? { calendarEvents: {} } : {}),
      weekSchedule: generatedWeekSchedule,
      ...(activeLang === "en" ? { services: buildServiceRows(bulletinIso, data?.services) } : {}),
      ...(activeLang === "en" && seminarInfo ? {
        seminarInfo: {
          title: seminarInfo.title,
          date: seminarInfo.date,
          // Bible seminars are led by the church's own pastor unless the event names someone else.
          speaker: seminarInfo.speaker ?? (data?.pastor ? `Pastor ${data.pastor}` : data?.seminarInfo?.speaker ?? ""),
        },
      } : {}),
      // Always an array (never `undefined`, which would wipe it and crash the preview):
      // a week with no seminar clears last week's rows instead of keeping them.
      eastCoastSeminar: upcomingEastCoast,
    };

    try {
      const [autoRes, verseRes] = await Promise.all([
        fetch(`/api/auto-populate?date=${encodeURIComponent(date)}`),
        fetch("/api/memory-verse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "roll", bulletinDate: date, lang: activeLang }),
        }),
      ]);

      if (autoRes.ok) {
        const result = await autoRes.json();
        nextPatch.bibleReadingDates = result.dates;
        nextPatch.bibleReading1 = result.reading1;
        nextPatch.bibleReading2 = result.reading2;
        setGenerationNotice(result.complete === false
          ? "Week generated, but some Bible-reading dates are outside the loaded plan."
          : "Bulletin week generated from the available auto-fill data.");
      } else {
        setGenerationNotice("Date generated. Bible-reading data is unavailable for this week.");
      }

      if (verseRes.ok) {
        const verseResult = await verseRes.json();
        nextPatch.memoryVerses = verseResult.memoryVerses;
      }
    } catch {
      setGenerationNotice("Date generated. Bible-reading data could not be loaded.");
    } finally {
      patch(nextPatch);
      setGeneratingWeek(false);
    }
  };

  // Prints one language's saved bulletin and downloads it. Returns an error message, or null.
  async function downloadPdf(lang: BulletinLanguage): Promise<string | null> {
    const res = await fetch(`/api/export-pdf?lang=${lang}`);
    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      return `Export failed: ${result.error ?? `HTTP ${res.status}`}`;
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const langName = LANGUAGE_CONFIG[lang].name;
    const bulletinDate = data?.date ?? "00/00/0000";
    const filename = `${langName} Bulletin_${bulletinDate}.pdf`;
    // iOS Safari ignores the `download` attribute and just navigates to the
    // blob URL, so open it directly there instead of faking an <a> click.
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      window.open(url, "_blank");
    } else {
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // Revoking right after click() races the (often async on mobile) blob
    // load and can hand the viewer a dangling URL, which renders as a
    // broken/blank PDF. Give it time to finish loading before freeing it.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return null;
  }

  async function exportPDF() {
    setExporting(true);
    setExportError("");
    try {
      const err = await downloadPdf(activeLang);
      if (err) setExportError(err);
    } finally { setExporting(false); }
  }

  const refreshBulletin = async () => {
    await loadLanguage(activeLang);
    loadMgmt();
  };

  function handleSectionClick(id: TabId) {
    const isClosing = activeTab === id;
    setActiveTab(isClosing ? null : id);
    setMobileSetupOpen(false);
    if (isClosing) return;

    const sectionKey = TAB_SECTION_KEY[id];
    const sectionMeta = metaByLanguage[activeLang]?.sections?.[sectionKey];
    if (sectionMeta?.status === "pending") {
      markSectionNotificationSeen(buildSectionNotificationId(activeLang, sectionKey));
    }

    // Wait for the editor panel to take up its final width before centering the
    // selected bulletin section in the remaining canvas.
    window.requestAnimationFrame(() => {
      const target = SECTION_ZOOM[id];
      const el = canvasRef.current;
      if (!el) return;
      const cW = el.clientWidth, cH = el.clientHeight;
      const targetZ = Math.min(Math.max((cH * 0.60) / target.h, 0.35), 2.8);
      applyTransform(cW / 2 - target.cx * targetZ, cH / 2 - target.cy * targetZ, targetZ, true);
    });
  }

  // Drag / zoom / select handlers — behaviour depends on canvasMode
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if (spaceHeld.current) return;
    const effective = canvasModeRef.current;
    if (effective === "grab") {
      dragging.current = true;
      dragOrigin.current = { mx: e.clientX, my: e.clientY, tx: transformRef.current.x, ty: transformRef.current.y };
      (e.currentTarget as HTMLDivElement).style.cursor = "grabbing";
    }
    // select mode: do nothing — let clicks propagate to BulletinPreview
  }
  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (spaceHeld.current) return;
    if (!dragging.current) return;
    const { mx, my, tx, ty } = dragOrigin.current;
    applyTransform(tx + e.clientX - mx, ty + e.clientY - my, transformRef.current.z);
  }
  function onMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    dragging.current = false;
    const m = spaceHeld.current ? "grab" : canvasModeRef.current;
    (e.currentTarget as HTMLDivElement).style.cursor =
      spaceHeld.current ? "grabbing" : m === "grab" ? "grab" : m === "comment" ? "crosshair" : "default";
  }

  const reading  = mgmt?.readingSources?.[0];
  const schedule = mgmt?.scheduleSrc;
  const bulletinWeeks = getBulletinWeeks(selectedMonth);
  const selectedWeek = bulletinWeeks[selectedWeekIndex] ?? bulletinWeeks[0];
  const coverageEnds = [
    reading?.autoEnabled && reading.endDate ? reading.endDate : null,
    schedule?.planFile && schedule.endDate ? schedule.endDate : null,
  ].filter((value): value is string => Boolean(value)).sort();
  const fullAutoFillEnd = coverageEnds[0] ?? null;
  const [selectedYear, selectedMonthNumber] = selectedMonth.split("-").map(Number);
  const selectedMonthStart = selectedYear && selectedMonthNumber
    ? `${selectedYear}-${String(selectedMonthNumber).padStart(2, "0")}-01`
    : "";
  const selectedMonthEnd = selectedYear && selectedMonthNumber
    ? localIso(new Date(selectedYear, selectedMonthNumber, 0))
    : "";
  const readingReady = Boolean(
    selectedWeek && reading?.startDate && reading.endDate &&
    selectedWeek.startIso >= reading.startDate && selectedWeek.endIso <= reading.endDate
  );
  const scheduleReady = Boolean(
    selectedMonthStart && selectedMonthEnd && schedule?.startDate && schedule.endDate &&
    selectedMonthStart >= schedule.startDate && selectedMonthEnd <= schedule.endDate
  );
  const lowSources = [
    reading && (reading.percentUsed >= 75 || reading.status === "warning" || reading.status === "expired")
      ? `Reading plan: ${reading.daysRemaining} days left` : null,
    schedule && (schedule.percentUsed >= 75 || schedule.status === "warning" || schedule.status === "expired")
      ? `Schedule: ${schedule.daysRemaining} days left` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="editor-shell" style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Global liquid glass SVG filter (shared by toolbar, nav, panel header) ── */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <filter id="radio-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
            <feGaussianBlur {...{"in": "turbulence"}} stdDeviation="2" result="blurredNoise" />
            <feDisplacementMap {...{"in": "SourceGraphic", "in2": "blurredNoise"}} scale="30" xChannelSelector="R" yChannelSelector="B" result="displaced" />
            <feGaussianBlur {...{"in": "displaced"}} stdDeviation="2" result="finalBlur" />
            <feComposite {...{"in": "finalBlur", "in2": "finalBlur"}} operator="over" />
          </filter>
        </defs>
      </svg>

      <PresenceModal
        currentLanguage={activeLang}
        currentSection={activeTab ?? ""}
        onUsersChange={(all, myName, mySessionId) => {
          // Deduplicate by name — prefer the current session's own entry so self is always shown once
          const self = all.filter(u => u.sessionId === mySessionId);
          const others = all.filter(u => u.sessionId !== mySessionId);
          const seen = new Set<string>(self.map(u => u.name));
          const deduped = [...self, ...others.filter(u => !seen.has(u.name) && seen.add(u.name))];
          setPresenceUsers(deduped);
          setPresenceMyName(myName);
          presenceMyNameRef.current = myName;
        }}
      />

      {/* Floating request toasts — visible without opening the notification panel */}
      <NotificationToast
        notifications={notifications}
        sessionId={sessionId.current}
        dismissedToastIds={dismissedToastIds}
        onGrant={grantLockAccess}
        onDecline={declineTakeover}
        onDismissToast={(id) => setDismissedToastIds((prev) => [...prev, id])}
      />

      {uploadTarget && (
        <UploadModal
          name={uploadTarget === "reading" ? "Year Reading Plan" : "Monthly Schedule"}
          uploadType={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSaved={() => { setUploadTarget(null); refreshBulletin(); }}
        />
      )}
      {showExportAll && (
        <ExportAllModal
          languages={BULLETIN_LANGUAGES.map((code) => ({ code, name: LANGUAGE_CONFIG[code].name }))}
          initial={[...BULLETIN_LANGUAGES]}
          exportOne={(code) => downloadPdf(code as BulletinLanguage)}
          onClose={() => setShowExportAll(false)}
        />
      )}
      {showMonthCalendar && (
        <MonthCalendarModal
          currentMonth={data?.calendarMonth}
          current={data ?? undefined}
          buildPatch={(sheet) => monthCalendarPatch(sheet, { bulletinDate: data?.date, pastor: data?.pastor, seminarInfo: data?.seminarInfo })}
          onApply={patch}
          onClose={() => setShowMonthCalendar(false)}
        />
      )}

      {/* ── Figma-style layers sidebar (always visible) ── */}
      <LanguageTabBar
        activeLanguage={activeLang}
        metaByLanguage={metaByLanguage}
        locks={locks}
        sessionId={sessionId.current}
        onSelect={switchLanguage}
        presenceUsers={presenceUsers}
        mySessionId={sessionId.current}
      />

      {lockConflict && (
        <LockModal
          language={lockConflict.language}
          lock={lockConflict.lock}
          onViewOnly={() => { setReadOnly(true); setLockConflict(null); }}
          onRequestTakeover={() => requestTakeover(lockConflict.language, lockConflict.lock)}
          onRequestJoin={() => requestJoin(lockConflict.language, lockConflict.lock)}
        />
      )}

      {notifPanelOpen && (
        <NotificationPanel
          notifications={notifications}
          metaByLanguage={metaByLanguage}
          activeLang={activeLang}
          sessionId={sessionId.current}
          seenSectionNotifications={new Set(seenSectionNotifications)}
          onGrant={grantLockAccess}
          onDecline={declineTakeover}
          onSwitchToSection={(lang, sectionKey, notificationId) => {
            markSectionNotificationSeen(notificationId);
            void switchLanguage(lang);
            setActiveTab(Object.entries(TAB_SECTION_KEY).find(([, k]) => k === sectionKey)?.[0] as TabId ?? null);
            setNotifPanelOpen(false);
          }}
          onClose={() => setNotifPanelOpen(false)}
        />
      )}

      {translating && (
        <div className="multilang-modal-backdrop" role="status" aria-live="polite">
          <div className="multilang-modal-card" style={{ width:"min(380px, calc(100vw - 32px))", textAlign:"center" }}>
            <div style={{ fontSize:34, marginBottom:12 }} aria-hidden>{LANGUAGE_CONFIG[activeLang]?.flag}</div>
            <div style={{ color:"#fff", fontSize:16, fontWeight:700, marginBottom:8 }}>
              {LANGUAGE_CONFIG[activeLang]?.name} Bulletin
            </div>
            <div style={{ color:"rgba(255,255,255,0.72)", fontSize:13 }}>Translating…</div>
          </div>
        </div>
      )}

      {syncPreviewSection && data && (
        <SyncPreviewModal
          sectionKey={syncPreviewSection}
          currentData={data}
          meta={meta}
          onClose={() => setSyncPreviewSection(null)}
          onKeepMine={() => dismissEnglishSection(syncPreviewSection)}
          onUseEnglish={() => applyEnglishSection(syncPreviewSection)}
        />
      )}

      <div className="mobile-toolbar">
        <div className="mobile-toolbar-row">
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ width:30, height:30, objectFit:"contain", flexShrink:0 }} />
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:900, color:"#1E3A8A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>NEW YORK CHURCH</div>
              <div style={{ fontSize:10.5, color:"#64748B" }}>{data?.date ?? "Loading…"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
            <button type="button" onClick={() => setMobileSetupOpen(true)} className="mobile-top-button">Setup</button>
            <button type="button" onClick={save} disabled={saving || !data || readOnly} className="mobile-top-button mobile-save-button">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div className="mobile-section-tabs" aria-label="Bulletin sections">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button type="button" key={section.id} onClick={() => handleSectionClick(section.id)} className={activeTab === section.id ? "mobile-section-tab active" : "mobile-section-tab"}>
                <Icon size={14} strokeWidth={2} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Retractable sidebar wrapper ── */}
      <div style={{ position: "relative", flexShrink: 0, height: "100%" }}>
        {/* Collapse / expand tab — sticks to right edge, always reachable */}
        <motion.button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          whileHover={{ x: sidebarCollapsed ? 2 : -2 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "absolute", right: -13, top: 22, zIndex: 35,
            width: 13, height: 40,
            background: "#fff",
            border: "1px solid #E2E8F0", borderLeft: "none",
            borderRadius: "0 6px 6px 0",
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#94A3B8",
            boxShadow: "2px 2px 6px rgba(15,23,42,0.07)",
            padding: 0,
          }}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronRight size={10} strokeWidth={2.5} />
          </motion.div>
        </motion.button>

        <motion.div
          className={mobileSetupOpen ? "editor-sidebar mobile-setup-open" : "editor-sidebar"}
          initial={false}
          animate={{ width: sidebarCollapsed ? 52 : 264 }}
          transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
          style={{
            height: "100%",
            background: "#fff",
            borderRight: "1px solid #E2E8F0",
            display: "flex", flexDirection: "column",
            overflow: "hidden", zIndex: 30,
          }}
        >
        {/* Logo header */}
        <div style={{ flexShrink: 0, borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 10px 0 14px", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="New York Church" style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }} />
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.div
                  key="header-text"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ flex: 1, minWidth: 0, overflow: "hidden" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#1E3A8A", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>NEW YORK CHURCH</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap" }}>Bulletin Editor</div>
                </motion.div>
              )}
            </AnimatePresence>
            <button type="button" className="mobile-setup-close" onClick={() => setMobileSetupOpen(false)} aria-label="Close setup">×</button>
          </div>
          {/* Online users strip — hidden when collapsed */}
          {presenceUsers.length > 0 && !sidebarCollapsed && (
            <div style={{ padding: "5px 16px 8px", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              {presenceUsers.map((u) => {
                const isSelf = u.sessionId === sessionId.current;
                const c = presenceColorFor(u.name);
                return (
                  <div
                    key={u.sessionId}
                    title={isSelf ? `${u.name} (you)` : u.name}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: c.bg, color: c.text,
                      border: `1.5px solid ${isSelf ? c.text + "55" : "transparent"}`,
                      borderRadius: 99, padding: "3px 8px 3px 4px",
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: c.text, color: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 900, flexShrink: 0 }}>
                      {presenceInitials(u.name)}
                    </div>
                    {u.name}{isSelf ? " ✏" : ""}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Layers nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0", scrollbarWidth: "none" }}>

          {/* Bulletin date generator — hidden when collapsed */}
          <div style={{ display: sidebarCollapsed ? "none" : undefined, padding:"4px 12px 12px", borderBottom:"1px solid #F1F5F9", marginBottom:7 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:10.5, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Bulletin date
            </span>
              <span style={{ fontSize:11, fontWeight:700, color:"#1E3A8A" }}>{data?.date ?? "—"}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:7 }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setSelectedWeekIndex(0);
                  setGenerationNotice("");
                }}
                style={{
                  width:"100%", minWidth:0, padding:"8px 9px", borderRadius:8,
                  border:"1px solid #CBD5E1", background:"#fff", color:"#1E3A8A",
                  fontSize:12.5, fontWeight:700, outline:"none",
                  transition:"border-color 150ms ease-out, box-shadow 150ms ease-out",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#4472C4"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,114,196,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <select
                value={selectedWeekIndex}
                onChange={(event) => {
                  setSelectedWeekIndex(Number(event.target.value));
                  setGenerationNotice("");
                }}
                disabled={!bulletinWeeks.length}
                style={{
                  width:"100%", minWidth:0, padding:"8px 9px", borderRadius:8,
                  border:"1px solid #CBD5E1", background:"#fff", color:"#1E3A8A",
                  fontSize:12.5, fontWeight:700, outline:"none",
                  transition:"border-color 150ms ease-out, box-shadow 150ms ease-out",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#4472C4"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,114,196,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {bulletinWeeks.map((week, index) => (
                  <option key={week.startIso} value={index}>{week.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop:8, padding:"8px 9px", borderRadius:8, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
              <div style={{ fontSize:10.5, color:"#64748B", lineHeight:1.4 }}>
                Full auto-fill through{" "}
                <strong style={{ color:fullAutoFillEnd ? "#1E3A8A" : "#DC2626" }}>
                  {displayCoverageDate(fullAutoFillEnd)}
                </strong>
              </div>
              {selectedWeek && (
                <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                  <span style={{
                    display:"inline-flex", alignItems:"center", gap:4,
                    fontSize:10, fontWeight:700, color:readingReady ? "#15803D" : "#C2410C",
                  }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:readingReady ? "#16A34A" : "#EA580C", flexShrink:0 }} />
                    {readingReady ? "Reading ready" : "Reading partial"}
                  </span>
                  <span style={{
                    display:"inline-flex", alignItems:"center", gap:4,
                    fontSize:10, fontWeight:700, color:scheduleReady ? "#15803D" : "#C2410C",
                  }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:scheduleReady ? "#16A34A" : "#EA580C", flexShrink:0 }} />
                    {scheduleReady ? "Schedule ready" : "Schedule partial"}
                  </span>
                </div>
              )}
            </div>

            {lowSources.length > 0 && (
              <div style={{ marginTop:7, padding:"7px 9px", borderRadius:8, background:"#FFF7ED", border:"1px solid #FED7AA" }}>
                <div style={{ fontSize:10.5, fontWeight:800, color:"#C2410C", marginBottom:2 }}>Data running low</div>
                {lowSources.map((message) => (
                  <div key={message} style={{ fontSize:10, color:"#9A3412", lineHeight:1.4 }}>{message}</div>
                ))}
              </div>
            )}

            <motion.button
              onClick={handleGenerateWeek}
              disabled={!selectedWeek || generatingWeek || readOnly}
              whileHover={selectedWeek && !generatingWeek ? { scale: 1.015 } : undefined}
              whileTap={selectedWeek && !generatingWeek ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                width:"100%", marginTop:8, padding:"9px 10px", borderRadius:8,
                background:"#1E3A8A", color:"#fff", border:0,
                fontSize:12.5, fontWeight:800, cursor:selectedWeek && !generatingWeek ? "pointer" : "not-allowed",
                opacity:selectedWeek && !generatingWeek ? 1 : 0.5,
              }}
            >
              {generatingWeek ? "Generating…" : "Generate selected week"}
            </motion.button>
            <AnimatePresence>
              {generationNotice && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ marginTop:6, fontSize:10.5, lineHeight:1.4, color:generationNotice.includes("unavailable") || generationNotice.includes("outside") ? "#C2410C" : "#15803D" }}
                >
                  {generationNotice}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Page 1 group ── */}
          {!sidebarCollapsed && (
            <div style={{ padding: "8px 16px 4px", fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              Page 1
            </div>
          )}
          {SECTIONS.filter((sec) => sec.page === 1).map((sec) => (
            <div key={sec.id}>
              <NavItem
                icon={sec.icon}
                label={sec.label}
                isActive={activeTab === sec.id}
                onClick={() => handleSectionClick(sec.id)}
                collapsed={sidebarCollapsed}
                dirty={changedSections.has(sec.id)}
              />
            </div>
          ))}

          {/* ── Page 2 group ── */}
          {!sidebarCollapsed && (
          <div style={{ padding: "12px 16px 4px", fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Page 2
          </div>
          )}
          {SECTIONS.filter((sec) => sec.page === 2).map((sec) => (
            <div key={sec.id}>
              <NavItem
                icon={sec.icon}
                label={sec.label}
                isActive={activeTab === sec.id}
                onClick={() => handleSectionClick(sec.id)}
                collapsed={sidebarCollapsed}
                dirty={changedSections.has(sec.id)}
              />
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: "#F1F5F9", margin: "12px 0" }} />

          {/* ── Auto-fill group ── */}
          {!sidebarCollapsed && (
            <div style={{ padding: "0 16px 6px", fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Auto-fill
            </div>
          )}
          <SidebarSourceProgress
            icon={BookMarked}
            label="Reading Plan"
            detail={reading?.endDate ? `Through ${displayCoverageDate(reading.endDate)}` : "Upload a reading plan"}
            percentUsed={reading?.percentUsed ?? 100}
            status={reading?.status ?? "missing"}
            daysRemaining={reading?.daysRemaining ?? 0}
            onClick={() => setUploadTarget("reading")}
            collapsed={sidebarCollapsed}
          />
          <SidebarSourceProgress
            icon={CalendarRange}
            label={schedule?.quarter ?? "Schedule"}
            detail={schedule?.endDate ? `Through ${displayCoverageDate(schedule.endDate)}` : "Upload a schedule"}
            percentUsed={schedule?.percentUsed ?? 100}
            status={schedule?.status ?? "missing"}
            daysRemaining={schedule?.daysRemaining ?? 0}
            onClick={() => setUploadTarget("schedule")}
            collapsed={sidebarCollapsed}
          />
          <SidebarSourceProgress
            icon={CalendarDays}
            label="Monthly Calendar"
            detail={calendarProgress ? calendarProgress.label : "Fill one month from a sheet"}
            percentUsed={calendarProgress?.percentUsed ?? 100}
            status={calendarProgress ? (calendarProgress.expired ? "expired" : "active") : "missing"}
            daysRemaining={calendarProgress?.daysRemaining ?? 0}
            onClick={() => { if (data && !readOnly) setShowMonthCalendar(true); }}
            collapsed={sidebarCollapsed}
          />
          {!sidebarCollapsed && (
            <div style={{ padding:"0 13px 6px", fontSize:9.5, color:"#94A3B8", lineHeight:1.4 }}>
              Usage: <span style={{ color:"#16A34A", fontWeight:700 }}>green</span> → <span style={{ color:"#D6A400", fontWeight:700 }}>yellow</span> → <span style={{ color:"#EA580C", fontWeight:700 }}>orange</span> → <span style={{ color:"#DC2626", fontWeight:700 }}>red</span>
            </div>
          )}
        </nav>

        {/* Footer: save */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #F1F5F9", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <motion.button
            onClick={save}
            disabled={saving || !data || readOnly}
            title={sidebarCollapsed ? (savedMsg || (saving ? "Saving…" : "Save")) : undefined}
            whileHover={!saving && data ? { scale: 1.015 } : undefined}
            whileTap={!saving && data ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "11px 10px", borderRadius: 8, background: "#1E3A8A", color: "#fff", border: "none", cursor: "pointer", opacity: saving || !data ? 0.5 : 1 }}
          >
            <SaveIcon size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.span
                  key="save-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap" }}
                >
                  {savedMsg || (saving ? "Saving…" : "Save")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          <button
            onClick={() => setShowExportAll(true)}
            disabled={!data}
            title={sidebarCollapsed ? "Export all languages" : undefined}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 8, background: "#fff", color: "#1E3A8A", border: "1.5px solid #CBD5E1", cursor: data ? "pointer" : "not-allowed", opacity: data ? 1 : 0.5, fontSize: 13, fontWeight: 700 }}
          >
            <Download size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap" }}>Export all languages</span>}
          </button>
        </div>
        </motion.div>
      </div>

      {/* ── PDF canvas — Miro-like pan & zoom ── */}
      {activeTab && data && (
        <SectionEditorPanel
          activeTab={activeTab}
          data={data}
          set={patch}
          onClose={() => setActiveTab(null)}
          language={activeLang}
          meta={meta}
          readOnly={readOnly}
          onTakeOver={() => { const lock = locks[activeLang]; if (lock) requestTakeover(activeLang, lock); else takeOverLanguage(activeLang); }}
          onPreviewSync={setSyncPreviewSection}
          onApplySync={applyEnglishSection}
          onDismissSync={dismissEnglishSection}
          presenceUsers={presenceUsers}
          mySessionId={sessionId.current}
        />
      )}

      <div
        className="editor-canvas"
        ref={canvasRef}
        style={{ flex: 1, minWidth: 0, height: "100%", background: "#1C1C2B", overflow: "hidden", position: "relative", cursor: spacePanning ? "grabbing" : interactionMode === "grab" ? "grab" : interactionMode === "comment" ? "crosshair" : "default", userSelect: interactionMode === "select" ? "auto" : "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={() => { /* comment clicks handled by overlay inside pdfZoomRef */ }}
      >
        {data ? (
          /* Pan layer — translate only */
          <div ref={pdfPanRef} style={{ position: "absolute", left: 0, top: 0, willChange: "transform" }}>
            {/* Zoom layer — scaled via transform in applyTransform */}
            <div ref={pdfZoomRef} style={{ width: PAGE_W, transformOrigin: "0 0", pointerEvents: interactionMode === "grab" ? "none" : "auto", position: "relative" }}>
              <BulletinPreview
                data={data}
                onUpdate={interactionMode === "grab" || readOnly ? undefined : patch}
                pendingDiffs={
                  activeLang !== "en" && activeLang !== "ko"
                    ? Object.fromEntries(
                        Object.entries(meta.sections)
                          .filter(([, s]) => s.status === "pending" && s.pendingEnContent)
                          .map(([k, s]) => [k, s.pendingEnContent!])
                      )
                    : undefined
                }
                onDismissPending={activeLang !== "en" && activeLang !== "ko" ? dismissPendingSection : undefined}
              />
              <BulletinFitController fitKey={JSON.stringify(data)} />

              {/* Comment mode click-capture overlay — must be inside zoom layer for correct coordinates */}
              {interactionMode === "comment" && (
                <div
                  style={{ position: "absolute", top: 0, left: 0, width: PAGE_W, height: PAGE_H * 2 + 4, zIndex: 19, cursor: "crosshair" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const zoomEl = pdfZoomRef.current;
                    if (!zoomEl) return;
                    const rect = zoomEl.getBoundingClientRect();
                    // Use the scale that is actually rendered at click time.
                    // style.transform is the animation target and can briefly differ
                    // from the scale visible under the pointer.
                    const renderedZoom = rect.width / PAGE_W || 1;
                    const localX = (e.clientX - rect.left) / renderedZoom;
                    const localY = (e.clientY - rect.top) / renderedZoom;
                    const TOTAL_H = PAGE_H * 2 + 4;
                    setDraftPin({ rx: Math.max(0, Math.min(1, localX / PAGE_W)), ry: Math.max(0, Math.min(1, localY / TOTAL_H)) });
                    setActiveCommentId(null);
                    setCommentDraftText("");
                  }}
                />
              )}

              {/* Comment pins overlay — lives inside zoom layer so pins scale with content */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: PAGE_W, height: PAGE_H * 2 + 4,
                pointerEvents: "none", zIndex: 20,
              }}>
                {/* Draft pin being placed */}
                {draftPin && (
                  <CommentPin
                    x={draftPin.rx * PAGE_W}
                    y={draftPin.ry * (PAGE_H * 2 + 4)}
                  />
                )}
                {/* Existing pins — resolved ones are hidden */}
                {comments.filter(c => !c.resolved).map(c => (
                  <CommentPin
                    key={c.id}
                    x={c.rx * PAGE_W}
                    y={c.ry * (PAGE_H * 2 + 4)}
                    label={c.author.charAt(0).toUpperCase()}
                    active={activeCommentId === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCommentId(c.id === activeCommentId ? null : c.id);
                      setDraftPin(null);
                    }}
                  />
                ))}
              </div>

              {/* Active comment thread panel */}
              {activeCommentId && (() => {
                const c = comments.find(x => x.id === activeCommentId);
                if (!c) return null;
                const TOTAL_H = PAGE_H * 2 + 4;
                const pinX = c.rx * PAGE_W;
                const pinY = c.ry * TOTAL_H;
                const panelLeft = Math.min(pinX + 20, PAGE_W - 270);
                const panelTop = Math.min(pinY - 10, TOTAL_H - 200);
                return (
                  <CommentThreadPanel
                    comment={c}
                    style={{ position: "absolute", left: panelLeft, top: panelTop, zIndex: 30, pointerEvents: "all" }}
                    onReply={(text) => submitReply(c.id, text)}
                    onResolve={() => resolveComment(c.id)}
                    onClose={() => setActiveCommentId(null)}
                  />
                );
              })()}

              {/* Draft comment input box */}
              {draftPin && (
                <div style={{
                  position: "absolute",
                  left: Math.min(draftPin.rx * PAGE_W + 20, PAGE_W - 270),
                  top: Math.min(draftPin.ry * (PAGE_H * 2 + 4) - 10, (PAGE_H * 2 + 4) - 140),
                  zIndex: 30, pointerEvents: "all",
                  width: 240,
                  background: "rgba(10,15,30,0.92)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  <textarea
                    autoFocus
                    value={commentDraftText}
                    onChange={e => setCommentDraftText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submitComment();
                      if (e.key === "Escape") { setDraftPin(null); setCommentDraftText(""); }
                    }}
                    placeholder="Leave a comment…"
                    rows={3}
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8, color: "#fff", fontSize: 12.5, padding: "8px 10px",
                      resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 8 }}>
                    <button type="button" onClick={() => { setDraftPin(null); setCommentDraftText(""); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 11.5, cursor: "pointer" }}>Cancel</button>
                    <button type="button" onClick={() => void submitComment()} disabled={!commentDraftText.trim()} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#4472C4", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", opacity: commentDraftText.trim() ? 1 : 0.5 }}>Post</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ display: "inline-block", width: 22, height: 22, borderRadius: "50%", border: "2.5px solid #3A3A52", borderTopColor: "#4472C4", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        <FloatingToolbar mode={canvasMode} onMode={setCanvasMode} onFit={fitToScreen} onExport={exportPDF} exporting={exporting} disabled={!data} canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} notifCount={
  notifications.filter(n => isAccessRequestNotification(n) && (n.targetSessionId === sessionId.current || n.fromSessionId === sessionId.current) && !seenNotifIds.includes(n.id)).length +
  (activeLang !== "en" && activeLang !== "ko"
    ? Object.entries(metaByLanguage[activeLang]?.sections ?? {}).filter(([sectionKey, state]) =>
        state.status === "pending" && !seenSectionNotifications.includes(buildSectionNotificationId(activeLang, sectionKey))
      ).length
    : 0)
} onBell={() => setNotifPanelOpen((v) => !v)} autoSaveStatus={autoSaveStatus} />

        {/* Persistent access bar — centered over the canvas, directly above the toolbar */}
        <AnimatePresence>
          {locks[activeLang] && !lockConflict && (
            <AccessControlBar
              role={roleForSession(locks[activeLang], sessionId.current)}
              lock={locks[activeLang]!}
              language={activeLang}
              notifications={notifications}
              sessionId={sessionId.current}
              candidates={presenceUsers.filter((u) => u.language === activeLang && u.sessionId !== sessionId.current)}
              onRequestTakeover={() => sendAccessRequest("takeover_request")}
              onRequestJoin={() => sendAccessRequest("join_request")}
              onLeave={leaveCollaboration}
              onCancelRequest={cancelAccessRequest}
              onTransferEditor={transferEditor}
            />
          )}
        </AnimatePresence>
        {exportError && (
          <div style={{ position: "absolute", bottom: 80, right: 16, fontSize: 11, color: "#F87171", background: "#2A1A1A", border: "1px solid #7F1D1D", borderRadius: 6, padding: "5px 10px", pointerEvents: "all" }}>
            {exportError}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Pulsing glow for the "live — someone is editing" red dot */
        @keyframes livePulse {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(239,68,68,0.22), 0 0 4px 1px rgba(239,68,68,0.55);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(239,68,68,0.10), 0 0 10px 3px rgba(239,68,68,0.9);
          }
        }

        .mobile-toolbar,
        .mobile-setup-close {
          display: none;
        }

        .language-tab-bar {
          position: fixed;
          top: 10px;
          right: 16px;
          z-index: 80;
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 6px 8px;
          border: 1px solid rgba(226,232,240,0.9);
          border-radius: 999px;
          background: rgba(255,255,255,0.86);
          box-shadow: 0 8px 28px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
        }

        .multilang-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(7,10,24,0.72);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .multilang-modal-card {
          max-height: calc(100dvh - 32px);
          overflow: auto;
          padding: 22px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 18px;
          background: rgba(18,20,36,0.88);
          color: #fff;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.16);
          backdrop-filter: blur(28px) saturate(2) brightness(1.08);
          -webkit-backdrop-filter: blur(28px) saturate(2) brightness(1.08);
        }

        .glass-primary-button,
        .glass-secondary-button,
        .glass-icon-button,
        .sync-banner-button {
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .glass-primary-button,
        .glass-secondary-button {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 13px;
        }

        .glass-primary-button {
          border: 1px solid rgba(147,197,253,0.35);
          background: rgba(68,114,196,0.88);
          color: #fff;
        }

        .glass-secondary-button {
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .glass-icon-button {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          color: #fff;
          font-size: 20px;
        }

        .sync-banner-button {
          min-height: 28px;
          padding: 0 9px;
          border: 1px solid rgba(146,64,14,0.2);
          background: rgba(255,255,255,0.65);
          color: #92400E;
        }

        .sync-preview-card { width: min(900px, calc(100vw - 32px)); }
        .sync-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sync-column-title { margin-bottom: 8px; color: rgba(255,255,255,0.78); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
        .sync-field { margin-bottom: 8px; padding: 10px; border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; background: rgba(255,255,255,0.04); }
        .sync-field-label { margin-bottom: 5px; color: #93C5FD; font-size: 10px; font-weight: 900; }
        .sync-field pre { margin: 0; color: rgba(255,255,255,0.82); font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }

        @media (max-width: 720px) {
          .editor-shell {
            height: 100dvh !important;
            flex-direction: column !important;
          }

          .notification-panel {
            top: 165px !important;
            bottom: 90px !important;
            border-radius: 12px 0 0 12px !important;
          }

          .mobile-toolbar {
            display: flex;
            width: 100%;
            height: 108px;
            flex: 0 0 108px;
            flex-direction: column;
            overflow: hidden;
            background: #fff;
            border-bottom: 1px solid #CBD5E1;
            z-index: 40;
          }

          .language-tab-bar {
            top: 114px;
            left: 8px;
            right: 8px;
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .language-tab-bar::-webkit-scrollbar { display: none; }

          .sync-preview-grid { grid-template-columns: 1fr; }

          .mobile-toolbar-row {
            height: 58px;
            flex: 0 0 58px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 0 10px;
          }

          .mobile-top-button {
            height: 34px;
            padding: 0 11px;
            border: 1px solid #CBD5E1;
            border-radius: 8px;
            background: #fff;
            color: #1E3A8A;
            font-size: 11.5px;
            font-weight: 800;
          }

          .mobile-save-button {
            border-color: #1E3A8A;
            background: #1E3A8A;
            color: #fff;
          }

          .mobile-section-tabs {
            height: 50px;
            flex: 0 0 50px;
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 6px 10px 8px;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .mobile-section-tabs::-webkit-scrollbar { display: none; }

          .mobile-section-tab {
            height: 34px;
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 0 10px;
            border: 1px solid #E2E8F0;
            border-radius: 999px;
            background: #F8FAFC;
            color: #475569;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          }

          .mobile-section-tab.active {
            border-color: #4472C4;
            background: #EEF3FB;
            color: #1E3A8A;
          }

          .editor-sidebar {
            display: none !important;
          }

          .editor-sidebar.mobile-setup-open {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            width: 100vw !important;
            height: 100dvh !important;
            min-height: 0 !important;
            border: none !important;
            z-index: 90 !important;
          }

          .mobile-setup-close {
            margin-left: auto;
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            place-items: center;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            background: #fff;
            color: #64748B;
            font-size: 21px;
            line-height: 1;
          }

          .editor-canvas {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            flex: 1 1 auto !important;
          }

          .section-editor-panel {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            min-width: 0 !important;
            max-width: none !important;
            height: 100dvh !important;
            z-index: 100 !important;
          }

          .floating-toolbar-shell {
            left: 8px !important;
            right: 8px !important;
            bottom: 8px !important;
            width: auto !important;
            justify-content: center !important;
            transform: none !important;
          }

          .floating-main-pill { zoom: 0.78; }

          .floating-export-button {
            width: 38px !important;
            height: 38px !important;
            justify-content: center !important;
            padding: 0 !important;
            font-size: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
