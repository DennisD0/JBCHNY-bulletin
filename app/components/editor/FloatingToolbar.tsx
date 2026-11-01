"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TextCursor, Hand, Maximize2, Download, RefreshCw, Undo2, Redo2, AlertTriangle, Bell, CheckCircle, MessageCircle, type LucideIcon } from "lucide-react";

export type CanvasMode = "grab" | "select" | "comment";

export const CANVAS_TOOLS: { id: CanvasMode; label: string; shortcut: string; Icon: LucideIcon }[] = [
  { id: "select",  label: "Select & Edit", shortcut: "V", Icon: TextCursor },
  { id: "grab",    label: "Grab & Pan",   shortcut: "H", Icon: Hand },
  { id: "comment", label: "Comment",      shortcut: "C", Icon: MessageCircle },
];

export function ToolbarTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          /* Span full button width, use flex centering — no transform needed */
          <div style={{
            position: "absolute", bottom: "calc(100% + 10px)",
            left: 0, right: 0,
            display: "flex", justifyContent: "center",
            pointerEvents: "none", zIndex: 9999,
          }}>
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              style={{
                background: "rgba(10,10,18,0.96)",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: 8,
                padding: "5px 9px",
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              {text}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FloatingToolbar({
  mode, onMode, onFit, onExport, exporting, disabled,
  canUndo, canRedo, onUndo, onRedo,
  notifCount, onBell, autoSaveStatus,
}: {
  mode: CanvasMode;
  onMode: (m: CanvasMode) => void;
  onFit: () => void;
  onExport: () => void;
  exporting: boolean;
  disabled?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  notifCount: number;
  onBell: () => void;
  autoSaveStatus: "idle" | "pending" | "saving" | "saved" | "error";
}) {
  const pillStyle: React.CSSProperties = {
    position: "relative", zIndex: 1,
    display: "inline-flex", alignItems: "center",
    borderRadius: 14, padding: "5px 7px", gap: 2,
    background: "transparent",
    userSelect: "none", overflow: "visible",
  };

  const btnBase: React.CSSProperties = {
    position: "relative", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    width: 44, height: 40, borderRadius: 9,
    border: "none", background: "transparent",
    cursor: "pointer", gap: 2, flexShrink: 0,
  };

  return (
    <div className="floating-toolbar-shell" style={{
      position: "absolute", bottom: 20, left: "50%",
      transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 8,
      zIndex: 32, pointerEvents: "all",
    }}>
      {/* Main pill — layered frosted glass */}
      <div style={{ position: "relative", display: "inline-flex", borderRadius: 14 }}>
        {/* Frosted white glass base */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          background: "rgba(255,255,255,0.95)",
        }} />
        {/* Top-edge sheen */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          background: "linear-gradient(175deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.0) 55%)",
          pointerEvents: "none",
        }} />
        {/* Border + shadow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05)",
          pointerEvents: "none",
        }} />
        <div className="floating-main-pill" style={pillStyle}>
        {/* Mode tools */}
        {CANVAS_TOOLS.map(({ id, label, shortcut, Icon }) => {
          const active = mode === id;
          return (
            <ToolbarTooltip key={id} text={`${label}  ${shortcut}`}>
              <button
                onClick={() => onMode(id)}
                style={{ ...btnBase, color: active ? "#fff" : "#64748B" }}
                aria-label={label}
                aria-pressed={active}
              >
                {active && (
                  <motion.div
                    layoutId="toolbar-active"
                    transition={{ type: "spring", stiffness: 520, damping: 36 }}
                    style={{
                      position: "absolute", inset: 0,
                      borderRadius: 9,
                      background: "#4472C4",
                      boxShadow: "0 2px 8px rgba(68,114,196,0.35)",
                    }}
                  />
                )}
                <Icon size={16} strokeWidth={2} style={{ position: "relative", zIndex: 1, flexShrink: 0 }} />
                <span style={{
                  position: "relative", zIndex: 1,
                  fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.04em", lineHeight: 1,
                  color: active ? "rgba(255,255,255,0.9)" : "#94A3B8",
                }}>
                  {shortcut}
                </span>
              </button>
            </ToolbarTooltip>
          );
        })}

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />

        {/* Fit to screen */}
        <ToolbarTooltip text="Fit to Screen  ⌃0">
          <button
            onClick={onFit}
            style={{ ...btnBase, color: "#64748B", width: 36 }}
            aria-label="Fit to screen"
          >
            <Maximize2 size={15} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        </ToolbarTooltip>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />

        {/* Undo */}
        <ToolbarTooltip text="Undo  Ctrl+Z">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{ ...btnBase, color: canUndo ? "#475569" : "#CBD5E1", width: 36, cursor: canUndo ? "pointer" : "not-allowed" }}
            aria-label="Undo"
          >
            <Undo2 size={15} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        </ToolbarTooltip>

        {/* Redo */}
        <ToolbarTooltip text="Redo  Ctrl+Y">
          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{ ...btnBase, color: canRedo ? "#475569" : "#CBD5E1", width: 36, cursor: canRedo ? "pointer" : "not-allowed" }}
            aria-label="Redo"
          >
            <Redo2 size={15} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
          </button>
        </ToolbarTooltip>
        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />

        {/* Notifications bell */}
        <ToolbarTooltip text="Notifications">
          <button
            onClick={onBell}
            style={{ ...btnBase, color: notifCount > 0 ? "#F59E0B" : "#64748B", width: 40, position: "relative" }}
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={2} style={{ position: "relative", zIndex: 1 }} />
            {notifCount > 0 && (
              <span style={{
                position: "absolute", top: 5, right: 5,
                minWidth: 15, height: 15, padding: "0 3px",
                borderRadius: 99, background: "#EF4444",
                color: "#fff", fontSize: 9, fontWeight: 900,
                display: "grid", placeItems: "center",
                lineHeight: 1, zIndex: 2,
              }}>{notifCount > 9 ? "9+" : notifCount}</span>
            )}
          </button>
        </ToolbarTooltip>
        {/* Auto-save status */}
        <AnimatePresence>
          {autoSaveStatus !== "idle" && (
            <>
              <div style={{ width: 1, height: 24, background: "#E2E8F0", margin: "0 4px", flexShrink: 0 }} />
              <motion.div
                key="autosave-pill"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                title={autoSaveStatus === "saved" ? "Auto-saved" : autoSaveStatus === "saving" ? "Auto-saving…" : autoSaveStatus === "pending" ? "Changes pending…" : "Auto-save failed"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "0 10px", height: 40,
                  fontSize: 11, fontWeight: 700,
                  color: autoSaveStatus === "saved" ? "#16A34A" : autoSaveStatus === "error" ? "#DC2626" : "#64748B",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                {(autoSaveStatus === "saving" || autoSaveStatus === "pending") && (
                  <RefreshCw size={12} strokeWidth={2.5} style={{ flexShrink: 0, animation: autoSaveStatus === "saving" ? "spin 1s linear infinite" : "pulse 1.5s ease-in-out infinite" }} />
                )}
                {autoSaveStatus === "saved" && <CheckCircle size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                {autoSaveStatus === "error" && <AlertTriangle size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                <span>
                  {autoSaveStatus === "saved" ? "Auto-saved"
                    : autoSaveStatus === "saving" ? "Auto-saving…"
                    : autoSaveStatus === "pending" ? "Pending…"
                    : "Save failed"}
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        </div>{/* /floating-main-pill */}
      </div>{/* /glass wrapper */}

      {/* Export button — separate accent pill */}
      <ToolbarTooltip text="Export PDF">
        <motion.button
          className="floating-export-button"
          onClick={onExport}
          disabled={exporting || disabled}
          whileHover={!exporting && !disabled ? { scale: 1.04 } : undefined}
          whileTap={!exporting && !disabled ? { scale: 0.97 } : undefined}
          transition={{ duration: 0.13 }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: exporting || disabled ? "rgba(68,114,196,0.5)" : "#4472C4",
            color: "#fff", border: "none", borderRadius: 11,
            padding: "9px 16px",
            fontSize: 13, fontWeight: 800, cursor: exporting || disabled ? "not-allowed" : "pointer",
            boxShadow: exporting || disabled ? "none" : "0 4px 18px rgba(68,114,196,0.45)",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
          aria-label="Export PDF"
        >
          {exporting
            ? <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
            : <Download size={14} strokeWidth={2.5} />}
          {exporting ? "Generating…" : "Export PDF"}
        </motion.button>
      </ToolbarTooltip>
    </div>
  );
}
