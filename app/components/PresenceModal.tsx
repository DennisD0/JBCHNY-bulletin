"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const STORAGE_KEY = "bulletin-user-name";
const SESSION_KEY = "bulletin-session-id";
const PING_MS = 30_000;

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "";
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export interface PresenceUser {
  name: string;
  sessionId: string;
  lastSeen: number;
  language?: string;
  section?: string;
}

export default function PresenceModal({
  currentLanguage,
  currentSection,
  onUsersChange,
}: {
  currentLanguage?: string;
  currentSection?: string;
  onUsersChange?: (all: PresenceUser[], myName: string, mySessionId: string) => void;
}) {
  const [userName, setUserName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const sessionId = useRef(getSessionId());
  const inputRef = useRef<HTMLInputElement>(null);

  // Use refs so the interval closure always sees the latest values
  const onUsersChangeRef = useRef(onUsersChange);
  const currentLanguageRef = useRef(currentLanguage);
  const currentSectionRef = useRef(currentSection);
  useEffect(() => { onUsersChangeRef.current = onUsersChange; }, [onUsersChange]);
  useEffect(() => { currentLanguageRef.current = currentLanguage; }, [currentLanguage]);
  useEffect(() => { currentSectionRef.current = currentSection; }, [currentSection]);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setUserName(saved);
  }, []);

  const register = useCallback(async (name: string) => {
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sessionId: sessionId.current,
          language: currentLanguageRef.current,
          section: currentSectionRef.current,
        }),
      });
    } catch { /* ignore */ }
  }, []);

  const fetchOthers = useCallback(async (myName: string) => {
    try {
      const res = await fetch("/api/presence");
      if (!res.ok) return;
      const all = (await res.json()) as PresenceUser[];
      onUsersChangeRef.current?.(all, myName, sessionId.current);
    } catch { /* ignore */ }
  }, []);

  // Re-register immediately when language/section changes so others see the update
  useEffect(() => {
    if (!userName) return;
    void register(userName).then(() => fetchOthers(userName));
  }, [currentLanguage, currentSection, userName, register, fetchOthers]);

  // Heartbeat loop
  useEffect(() => {
    if (!userName) return;
    void register(userName);
    void fetchOthers(userName);
    const interval = setInterval(() => {
      void register(userName);
      void fetchOthers(userName);
    }, PING_MS);
    const leave = () => {
      // Blob with JSON type so the presence route parses it; POST-only beacon is
      // treated as a "leave" (no name) which removes the entry and frees locks.
      const blob = new Blob([JSON.stringify({ sessionId: sessionId.current })], { type: "application/json" });
      navigator.sendBeacon?.("/api/presence", blob);
    };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, [userName, register, fetchOthers]);

  useEffect(() => {
    if (!userName) setTimeout(() => inputRef.current?.focus(), 60);
  }, [userName]);

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    sessionStorage.setItem(STORAGE_KEY, name);
    setUserName(name);
  };

  // Name prompt modal
  if (!userName) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}>
        <div style={{
          background: "#fff", borderRadius: 20,
          boxShadow: "0 24px 80px rgba(15,23,42,0.22)",
          padding: "36px 40px", width: 360, maxWidth: "calc(100vw - 32px)",
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 6 }}>Welcome</div>
            <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
              Enter your name so others can see who&apos;s editing the bulletin.
            </div>
          </div>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Your name"
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1.5px solid #E2E8F0", borderRadius: 10,
              padding: "11px 14px", fontSize: 15, color: "#0F172A",
              outline: "none", background: "#F8FAFC",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4472C4")}
            onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            style={{
              width: "100%", padding: "12px 0",
              borderRadius: 10, border: "none",
              background: draft.trim() ? "#1E3A8A" : "#E2E8F0",
              color: draft.trim() ? "#fff" : "#94A3B8",
              fontSize: 14, fontWeight: 700,
              cursor: draft.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  // After name is set: heartbeat runs in effects above; parent handles all display
  return null;
}
