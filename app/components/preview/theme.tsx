"use client";


// ── Design tokens ──────────────────────────────────────────────────────────────
export const B   = "#4472C4"; // reference blue - section titles, rules, contact text
export const BL  = "#4472C4"; // accent blue — table col-headers, service names
export const GR  = "#000000"; // reference body text is black
export const LG  = "#4472C4"; // reference table and fold rules are blue
export const SUN = "#C00000"; // Sunday red
export const SAT = "#2E74B5"; // Saturday blue

// ── Page: US Legal landscape 14" × 8.5" @ 96 dpi ─────────────────────────────
export const PAGE_W = 1344;
export const PAGE_H = 816;
export const PM_V = 32;
export const RULE = 4 / 3; // one PDF point at 96 dpi

// ── Typography (all in px at render resolution) ────────────────────────────────
export const F = {
  title:    48.067, // 36.05 pt Book Antiqua Bold
  quote:    19.027, // 14.27 pt Book Antiqua Bold
  quoteRef: 16,
  pastor:   19.027,
  secHead:  16.027,
  body:     13,
  small:    12,
  contact:  16.033,
};

// ── Shared primitives ──────────────────────────────────────────────────────────

export const BASE_STYLE: React.CSSProperties = {
  fontFamily: "Calibri, 'Malgun Gothic', Arial, sans-serif",
  fontSize: F.body,
  lineHeight: 1.35,
  color: "#000",
};
