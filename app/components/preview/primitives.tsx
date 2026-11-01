"use client";

import { B, BL, GR, LG, RULE, F } from "@/app/components/preview/theme";

/** Bold section label + full-width rule in navy */
export function SecHead({
  title,
  size = F.secHead,
  fontFamily,
  gap = 7,
}: {
  title: string;
  size?: number;
  fontFamily?: string;
  gap?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap, marginBottom: 5, lineHeight: 1 }}>
      <span style={{ color:B, fontWeight:700, fontSize:size, fontFamily, whiteSpace:"nowrap" }}>
        {title}
      </span>
      <div style={{ flex: 1, height: RULE, background: B }} />
    </div>
  );
}

/** Table column-header cell — blue, top+bottom rule */
export function TH({ children, center, w, grid }: { children?: React.ReactNode; center?: boolean; w?: number; grid?: boolean }) {
  return (
    <th style={{
      color: BL, fontWeight: 700, fontSize: F.small,
      textAlign: center ? "center" : "left",
      padding: "2px 4px 2px 0",
      borderTop: `${RULE}px solid ${BL}`,
      borderBottom: `${RULE}px solid ${BL}`,
      borderLeft: grid ? `${RULE}px solid ${BL}` : undefined,
      whiteSpace: "nowrap", lineHeight: 1.25,
      width: w,
    }}>
      {children}
    </th>
  );
}

/** Table data cell */
export function TD({
  children, center, top, bold, color, noWrap, span, xs, grid, pr = 4, noBorder,
}: {
  children?: React.ReactNode;
  center?: boolean; top?: boolean; bold?: boolean;
  color?: string; noWrap?: boolean;
  span?: number; xs?: boolean; grid?: boolean; pr?: number; noBorder?: boolean;
}) {
  return (
    <td rowSpan={span} style={{
      fontSize: xs ? F.small : F.body,
      lineHeight: 1.3,
      padding: `1.5px ${pr}px 1.5px 0`,
      borderBottom: noBorder ? "none" : `0.75px solid ${LG}`,
      borderLeft: grid ? `${RULE}px solid ${BL}` : undefined,
      textAlign: center ? "center" : "left",
      verticalAlign: top ? "top" : "middle",
      fontWeight: bold ? 700 : 400,
      color: color ?? GR,
      whiteSpace: noWrap ? "nowrap" : undefined,
    }}>
      {children}
    </td>
  );
}

/** Memory-verse header: "Label (date) Reference ··· Theme" */
export function VerseRow({ label, date, reference, theme }: {
  label: string; date: string; reference: string; theme: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      <span style={{ fontWeight: 700, fontSize: F.body, whiteSpace: "nowrap" }}>
        {label} ({date}) {reference}
      </span>
      <span style={{
        flex: 1, borderBottom: `1px dotted ${GR}`,
        margin: "0 3px 1.5px", minWidth: 6,
      }} />
      <span style={{ fontWeight: 700, fontSize: F.body, whiteSpace: "nowrap" }}>
        {theme}
      </span>
    </div>
  );
}

// ── Monthly calendar grid ──────────────────────────────────────────────────────
