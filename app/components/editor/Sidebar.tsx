"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { usageColor } from "@/app/components/editor/constants";

// Nav row for the sidebar's section list. The active state's highlight is a
// single shared-layout element (framer-motion layoutId) that slides smoothly
// between rows instead of popping instantly when the selection changes.
export function NavItem({
  icon: Icon, label, isActive, onClick, collapsed, dirty,
}: {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  collapsed?: boolean;
  dirty?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 11,
        width: "100%", padding: collapsed ? "10px 0" : "10px 16px 10px 22px",
        background: isActive ? "transparent" : hovered ? "#F8FAFC" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left",
        transition: "background-color 150ms ease-out",
      }}
    >
      {isActive && (
        <motion.div
          layoutId="nav-active-highlight"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
          style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        >
          {/* Blur + tint layer */}
          <div style={{
            position: "absolute", inset: 0,
            backdropFilter: "blur(12px) saturate(1.6) brightness(1.04)",
            WebkitBackdropFilter: "blur(12px) saturate(1.6) brightness(1.04)",
            background: "rgba(68,114,196,0.10)",
          }} />
          {/* Top-edge highlight gradient */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 40%, transparent 100%)",
            pointerEvents: "none",
          }} />
          {/* Left accent bar */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
            background: "linear-gradient(180deg, #4472C4, #1E3A8A)",
          }} />
          {/* Border + inner glow */}
          <div style={{
            position: "absolute", inset: 0,
            borderTop: "1px solid rgba(68,114,196,0.22)",
            borderBottom: "1px solid rgba(68,114,196,0.22)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
            pointerEvents: "none",
          }} />
        </motion.div>
      )}
      <div style={{ position: "relative", flexShrink: 0, display: "flex" }}>
        <Icon
          size={17} strokeWidth={2} style={{
            color: isActive ? "#1E3A8A" : "#64748B",
            transition: "color 150ms ease-out",
          }}
        />
        <AnimatePresence>
          {dirty && (
            <motion.span
              key="dirty-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              style={{
                position: "absolute", top: -4, right: -5,
                width: 8, height: 8, borderRadius: 99,
                background: "#EF4444",
                border: "1.5px solid #fff",
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "relative", fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "#1E3A8A" : "#334155",
              transition: "color 150ms ease-out",
              whiteSpace: "nowrap", overflow: "hidden",
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function SidebarSourceProgress({
  icon: Icon, label, detail, percentUsed, status, daysRemaining, onClick, collapsed,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  percentUsed: number;
  status?: string;
  daysRemaining: number;
  onClick: () => void;
  collapsed?: boolean;
}) {
  const color = usageColor(percentUsed, status);
  const missing = status === "missing";
  const [hovered, setHovered] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          width:36, height:36, margin:"0 auto 6px", borderRadius:10,
          background: hovered ? "#EEF3FB" : "#F8FAFC",
          border:`1px solid ${hovered ? "#4472C4" : "#E2E8F0"}`,
          cursor:"pointer", color: missing ? "#DC2626" : "#64748B",
          transition:"background 150ms ease-out, border-color 150ms ease-out",
        }}
      >
        <Icon size={16} strokeWidth={2} style={{ color: missing ? "#DC2626" : color }} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:"block", width:"calc(100% - 20px)", margin:"0 10px 8px", padding:"10px 12px",
        background:"#F8FAFC", border:`1px solid ${hovered ? "#CBD5E1" : "#E2E8F0"}`, borderRadius:10,
        cursor:"pointer", textAlign:"left", color:"#475569",
        transition:"border-color 150ms ease-out, box-shadow 150ms ease-out",
        boxShadow: hovered ? "0 2px 8px rgba(15,23,42,0.06)" : "none",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <Icon size={15} strokeWidth={2} style={{ color:"#64748B", flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:700, color:"#1E3A8A", flex:1 }}>{label}</span>
        <span style={{ fontSize:10.5, fontWeight:800, color }}>{missing ? "Missing" : `${percentUsed}%`}</span>
      </div>
      <div style={{ height:6, background:"#E2E8F0", borderRadius:99, overflow:"hidden", margin:"7px 0 5px" }}>
        <motion.div
          initial={false}
          animate={{ width: `${missing ? 100 : Math.min(100, percentUsed)}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ height:"100%", background:color, borderRadius:99 }}
        />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", gap:6, fontSize:10.5, color:"#94A3B8" }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{detail}</span>
        {!missing && <span style={{ flexShrink:0 }}>{daysRemaining}d left</span>}
      </div>
    </button>
  );
}
