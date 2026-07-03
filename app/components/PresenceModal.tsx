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

interface PresenceUser { name: string; sessionId: string; lastSeen: number; }

// Soft pastel colours cycled by first char of name
const COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" },
  { bg: "#DCF5E4", text: "#166534" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#F3E8FF", text: "#6B21A8" },
  { bg: "#FFE4E6", text: "#9F1239" },
  { bg: "#CCFBF1", text: "#0F766E" },
];
function colorFor(name: string) {
  const idx = (name.charCodeAt(0) || 0) % COLORS.length;
  return COLORS[idx];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function PresenceModal() {
  const [userName, setUserName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const sessionId = useRef(getSessionId());
  const inputRef = useRef<HTMLInputElement>(null);

  // On mount: check localStorage for saved name
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setUserName(saved);
    }
  }, []);

  const register = useCallback(async (name: string) => {
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sessionId: sessionId.current }),
    });
  }, []);

  const fetchOthers = useCallback(async (myName: string) => {
    try {
      const res = await fetch("/api/presence");
      if (!res.ok) return;
      const all = (await res.json()) as PresenceUser[];
      setOthers(all.filter((u) => u.sessionId !== sessionId.current));
    } catch {
      // ignore
    }
  }, []);

  // Once we have a name: register, poll, and heartbeat
  useEffect(() => {
    if (!userName) return;
    register(userName);
    fetchOthers(userName);
    const interval = setInterval(() => {
      register(userName);
      fetchOthers(userName);
    }, PING_MS);

    const leave = () => {
      navigator.sendBeacon?.("/api/presence", JSON.stringify({ sessionId: sessionId.current }));
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", leave);
    };
  }, [userName, register, fetchOthers]);

  // Focus input when modal opens
  useEffect(() => {
    if (!userName) setTimeout(() => inputRef.current?.focus(), 60);
  }, [userName]);

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    localStorage.setItem(STORAGE_KEY, name);
    setUserName(name);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  // ── Name prompt modal ──────────────────────────────────────────────────────
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
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 6 }}>
              Welcome
            </div>
            <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
              Enter your name so others can see who&apos;s currently editing the bulletin.
            </div>
          </div>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
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

  // ── Active-users pill bar (top-right) ────────────────────────────────────
  const all = [{ name: userName, sessionId: sessionId.current, lastSeen: Date.now() }, ...others];
  return (
    <div style={{
      position: "fixed", top: 12, right: 16, zIndex: 9000,
      display: "flex", alignItems: "center", gap: 6,
      pointerEvents: "none",
    }}>
      {all.map((u) => {
        const isMe = u.sessionId === sessionId.current;
        const { bg, text } = colorFor(u.name);
        return (
          <div
            key={u.sessionId}
            title={isMe ? `${u.name} (you)` : u.name}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: bg, color: text,
              border: `1.5px solid ${text}33`,
              borderRadius: 99, padding: "4px 10px 4px 6px",
              fontSize: 12, fontWeight: 700,
              boxShadow: isMe ? `0 0 0 2px ${text}44` : "none",
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: text, color: bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 900, flexShrink: 0,
            }}>
              {initials(u.name)}
            </div>
            {u.name}{isMe ? " ✏️" : ""}
          </div>
        );
      })}
    </div>
  );
}
