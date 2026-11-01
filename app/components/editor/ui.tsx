"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const sharedStyle: React.CSSProperties = {
    width: "100%", border: "none", outline: "none",
    background: "transparent", fontSize: 13.5, color: "#0F172A",
    padding: "9px 12px", fontFamily: "inherit", resize: "vertical",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", userSelect: "none",
        color: focused ? "#4472C4" : "#94A3B8",
        transition: "color 0.15s",
      }}>{label}</div>
      <div style={{
        borderRadius: 10,
        border: `1.5px solid ${focused ? "#4472C4" : "#E2E8F0"}`,
        background: focused ? "#fff" : "#F8FAFC",
        boxShadow: focused ? "0 0 0 3px rgba(68,114,196,0.13)" : "none",
        transition: "all 0.18s ease",
        overflow: "hidden",
      }}>
        {multiline ? (
          <textarea rows={rows} value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...sharedStyle, display: "block" }}
          />
        ) : (
          <input value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={sharedStyle}
          />
        )}
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{ width: 3, height: 15, borderRadius: 99, background: "linear-gradient(180deg,#4472C4,#1E3A8A)", flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#1E3A8A" }}>{children}</span>
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16, border: "1px solid #EEF2FF", background: "#fff",
      boxShadow: "0 2px 16px rgba(68,114,196,0.08), 0 1px 3px rgba(15,23,42,0.04)",
      padding: 20, display: "flex", flexDirection: "column", gap: 16,
    }}>
      {children}
    </div>
  );
}

export function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button onClick={onClick}
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      style={{
        alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 99,
        border: "1.5px dashed #93C5FD", background: "#EFF6FF",
        fontSize: 12, fontWeight: 700, color: "#2563EB", cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1, marginTop: -1 }}>+</span>{label}
    </motion.button>
  );
}

export function RemoveBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, flexShrink: 0,
        display: "grid", placeItems: "center", borderRadius: 8,
        border: `1px solid ${hov ? "#FECACA" : "#F1F5F9"}`,
        background: hov ? "#FEF2F2" : "#F8FAFC",
        color: hov ? "#EF4444" : "#CBD5E1",
        fontSize: 18, lineHeight: 1, cursor: "pointer", transition: "all 0.15s",
      }}
    >×</button>
  );
}

// ---------------------------------------------------------------------------
// Tab: Header
// ---------------------------------------------------------------------------
