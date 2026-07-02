"use client";
import { Fragment, useState, useEffect } from "react";
import type { BulletinData, CalendarBanner } from "@/lib/bulletin-types";

// ── Design tokens ──────────────────────────────────────────────────────────────
const B   = "#4472C4"; // reference blue - section titles, rules, contact text
const BL  = "#4472C4"; // accent blue — table col-headers, service names
const GR  = "#000000"; // reference body text is black
const LG  = "#4472C4"; // reference table and fold rules are blue
const SUN = "#C00000"; // Sunday red
const SAT = "#2E74B5"; // Saturday blue

// ── Page: US Legal landscape 14" × 8.5" @ 96 dpi ─────────────────────────────
export const PAGE_W = 1344;
export const PAGE_H = 816;
const PM_V = 32;
const RULE = 4 / 3; // one PDF point at 96 dpi

// ── Typography (all in px at render resolution) ────────────────────────────────
const F = {
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

const BASE_STYLE: React.CSSProperties = {
  fontFamily: "Calibri, 'Malgun Gothic', Arial, sans-serif",
  fontSize: F.body,
  lineHeight: 1.35,
  color: "#000",
};

/** Bold section label + full-width rule in navy */
function SecHead({
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
function TH({ children, center, w, grid }: { children?: React.ReactNode; center?: boolean; w?: number; grid?: boolean }) {
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
function TD({
  children, center, top, bold, color, noWrap, span, xs, grid, pr = 4,
}: {
  children?: React.ReactNode;
  center?: boolean; top?: boolean; bold?: boolean;
  color?: string; noWrap?: boolean;
  span?: number; xs?: boolean; grid?: boolean; pr?: number;
}) {
  return (
    <td rowSpan={span} style={{
      fontSize: xs ? F.small : F.body,
      lineHeight: 1.3,
      padding: `1.5px ${pr}px 1.5px 0`,
      borderBottom: `0.75px solid ${LG}`,
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
function VerseRow({ label, date, reference, theme }: {
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

const BANNER_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  retreat:    { bg: "#D6E8F7", border: "#4472C4", text: "#4472C4" },
  seminar:    { bg: "#EDE9FE", border: "#7C3AED", text: "#7C3AED" },
  camp:       { bg: "#DCFCE7", border: "#16A34A", text: "#16A34A" },
  conference: { bg: "#FEF3C7", border: "#D97706", text: "#D97706" },
  other:      { bg: "#F1F5F9", border: "#64748B", text: "#64748B" },
};

function CalGrid({ month, year, events, banners, weeklyRecurring = [], onUpdate }: {
  month: number; year: number;
  events: Record<string, string[]>;
  banners: CalendarBanner[];
  weeklyRecurring?: { dayOfWeek: number; label: string }[];
  onUpdate?: (patch: { calendarEvents?: Record<string,string[]>; calendarBanners?: CalendarBanner[] }) => void;
}) {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const previousMonthDays = new Date(year, month - 1, 0).getDate();

  type CalendarDay = { day: number; month: number; outside: boolean };
  const flat: CalendarDay[] = [];
  for (let index = first - 1; index >= 0; index--) {
    flat.push({ day: previousMonthDays - index, month: month - 1 || 12, outside: true });
  }
  for (let day = 1; day <= days; day++) {
    flat.push({ day, month, outside: false });
  }
  let nextDay = 1;
  while (flat.length % 7 !== 0) {
    flat.push({ day: nextDay++, month: month === 12 ? 1 : month + 1, outside: true });
  }
  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < flat.length; index += 7) {
    weeks.push(flat.slice(index, index + 7));
  }

  // Keep typography consistent across the calendar. The longest unbroken
  // event controls the shared base size; only unusually crowded days go lower.
  const longestEventWord = Math.max(
    1,
    ...Object.values(events).flatMap((items) =>
      items.flatMap((item) => item.split(/\s+/).map((word) => word.length))
    ),
  );
  const calendarFontSize = Math.max(8, Math.min(9, 12.5 - longestEventWord * 0.32));
  const calendarHeight = 516;
  const calendarHeaderHeight = 22;

  const bVal = (value: string) => {
    const [bannerMonth, day] = value.split("/").map(Number);
    return bannerMonth * 100 + day;
  };
  const inBanner = (banner: CalendarBanner, cell: CalendarDay) => {
    const current = cell.month * 100 + cell.day;
    return current >= bVal(banner.startDate) && current <= bVal(banner.endDate);
  };

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"repeat(7, minmax(0, 1fr))",
      gridTemplateRows:`${calendarHeaderHeight}px repeat(${weeks.length}, minmax(0, 1fr))`,
      height:calendarHeight,
    }}>
      {DOW.map((d,i) => (
        <div key={d} style={{
          gridRow:1, textAlign:"center", fontWeight:700, fontSize:9,
          color: i===6 ? SAT : B,
          boxSizing:"border-box", padding:"5px 0 3px", lineHeight:1,
          borderTop:`${RULE}px solid ${BL}`,
          borderBottom:`${RULE}px solid ${BL}`,
          borderLeft: i===0 ? `${RULE}px solid ${BL}` : "none",
          borderRight:`${RULE}px solid ${BL}`,
        }}>{d}</div>
      ))}
      {weeks.map((week, wi) => {
        const gridRow = wi + 2;
        const activeBanners = banners
          .map((banner, index) => ({ banner, index }))
          .filter(({ banner }) =>
            week.some((cell) => cell.month * 100 + cell.day === bVal(banner.startDate))
          );
        return (
          <Fragment key={`${week[0].month}-${week[0].day}`}>
            {week.map((cell, di) => {
              const key = `${cell.month}/${cell.day}`;
              const evts = events[key] ?? [];
              const evtSet = new Set(evts.map(e => e.trim().toLowerCase()));
              const recurring = cell.outside ? [] : weeklyRecurring
                .filter(r => r.dayOfWeek === di)
                .map(r => r.label)
                .filter(label => !evtSet.has(label.trim().toLowerCase()));
              const totalCount = evts.length + recurring.length;
              // shrink font as events accumulate: 10px for ≤3, down to 7px minimum
              const evtFs = Math.max(7, calendarFontSize - Math.max(0, totalCount - 3) * 0.5);
              return (
                <div key={di}
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest('[contenteditable]') && onUpdate) {
                      const newKey = `${key}-${evts.length}`;
                      onUpdate({ calendarEvents: { ...events, [key]: [...evts, ""] } });
                      setFocusKey(newKey);
                    }
                  }}
                  style={{
                    gridRow, gridColumn: di + 1,
                    minWidth:0, minHeight:0, boxSizing:"border-box", background:"#fff",
                    padding:"2px", overflow:"hidden",
                    borderBottom:`${RULE}px solid ${BL}`,
                    borderLeft: di===0 ? `${RULE}px solid ${BL}` : "none",
                    borderRight:`${RULE}px solid ${BL}`,
                    cursor: onUpdate ? "text" : "default",
                  }}>
                  <div style={{ fontWeight:700, fontSize:9, lineHeight:1.15, color:"#222" }}>
                    {cell.day === 1 ? `${cell.month}/1` : cell.day}
                  </div>
                  {evts.map((e,ei) => {
                    const itemKey = `${key}-${ei}`;
                    const isNew = focusKey === itemKey;
                    return (
                      <E key={ei} block
                        value={"•" + e}
                        autoFocus={isNew}
                        style={{
                          fontSize:evtFs,
                          color:GR,
                          lineHeight:1.18,
                          overflowWrap:"break-word",
                          wordBreak:"normal",
                        }}
                        onSave={onUpdate ? (v) => {
                          if (isNew) setFocusKey(null);
                          const clean = v.replace(/^•\s*/, "").trim();
                          const newEvts = clean
                            ? evts.map((ev,j) => j===ei ? clean : ev)
                            : evts.filter((_,j) => j!==ei);
                          onUpdate({ calendarEvents: { ...events, [key]: newEvts } });
                        } : undefined}
                      />
                    );
                  })}
                  {recurring.map((label, ri) => (
                    <div key={`r-${ri}`} style={{
                      fontSize: evtFs,
                      color: GR,
                      lineHeight: 1.18,
                      overflowWrap: "break-word",
                      wordBreak: "normal",
                    }}>•{label}</div>
                  ))}
                </div>
              );
            })}
            {activeBanners.map(({ banner, index: bannerIndex }) => {
              let startCol = week.findIndex((cell) => inBanner(banner, cell));
              let count = week.filter((cell) => inBanner(banner, cell)).length;
              if (count === 1 && banner.label.length > 12 && startCol > 0) {
                startCol -= 1; count = 2;
              }
              return (
                <div key={`${bannerIndex}-${banner.startDate}`} title="Clear the label and click away to remove this banner" style={{
                  gridRow, gridColumn: `${startCol + 1} / span ${count}`,
                  position:"relative", alignSelf:"end", zIndex:1,
                  height:17, boxSizing:"border-box", overflow:"hidden",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: (BANNER_PALETTE[banner.type ?? "retreat"] ?? BANNER_PALETTE.retreat).bg,
                  border:`${RULE}px solid ${(BANNER_PALETTE[banner.type ?? "retreat"] ?? BANNER_PALETTE.retreat).border}`,
                }}>
                  <span style={{ fontSize:10, color:(BANNER_PALETTE[banner.type ?? "retreat"] ?? BANNER_PALETTE.retreat).text, fontWeight:700, whiteSpace:"nowrap" }}>
                    <E
                      value={banner.label}
                      onSave={onUpdate ? (v) => {
                        const label = v.trim();
                        onUpdate({
                          calendarBanners: label
                            ? banners.map((b,j) => j === bannerIndex ? { ...b, label } : b)
                            : banners.filter((_,j) => j !== bannerIndex),
                        });
                      } : undefined}
                    />
                  </span>
                  {onUpdate && (
                    <button
                      type="button"
                      aria-label={`Remove ${banner.label}`}
                      title="Remove banner"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdate({
                          calendarBanners: banners.filter((_,j) => j !== bannerIndex),
                        });
                      }}
                      style={{
                        position:"absolute", right:2, top:"50%", transform:"translateY(-50%)",
                        width:13, height:13, padding:0, border:0, background:"rgba(255,255,255,0.72)",
                        color:BL, borderRadius:2, cursor:"pointer", fontSize:10, fontWeight:700,
                        lineHeight:"13px", textAlign:"center",
                      }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Inline-editable text primitive ────────────────────────────────────────────
// Renders as contenteditable when onSave is provided, with a blue focus ring.
// dangerouslySetInnerHTML prevents React from resetting the cursor while typing.
function E({
  value, onSave, block = false, multi = false, autoFocus = false, style: extraStyle,
}: {
  value: string;
  onSave?: (v: string) => void;
  block?: boolean;
  multi?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}) {
  if (!onSave) {
    const readOnlyStyle: React.CSSProperties = {
      whiteSpace: multi ? "pre-wrap" : undefined,
      ...extraStyle,
    };
    return block
      ? <div style={readOnlyStyle}>{value}</div>
      : <span style={readOnlyStyle}>{value}</span>;
  }
  const html = value
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const onFocus = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.background = "rgba(68,114,196,0.09)";
    e.currentTarget.style.boxShadow = "0 0 0 1.5px rgba(68,114,196,0.45)";
    e.currentTarget.style.borderRadius = "2px";
  };
  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.background = "";
    e.currentTarget.style.boxShadow = "";
    e.currentTarget.style.borderRadius = "";
    const v = multi
      ? (e.currentTarget as HTMLElement).innerText
      : (e.currentTarget.textContent ?? "");
    if (v !== value) onSave(v);
  };
  const shared = {
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    dangerouslySetInnerHTML: { __html: html },
    autoFocus,
    onFocus, onBlur,
    style: { outline: "none", cursor: "text", whiteSpace: multi ? "pre-wrap" as const : undefined, ...extraStyle },
  };
  return block ? <div {...shared} /> : <span {...shared} />;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BulletinPreview({
  data,
  onUpdate,
}: {
  data: BulletinData;
  onUpdate?: (patch: Partial<BulletinData>) => void;
}) {
  const [mm, yyyy] = data.calendarMonth.split("/").map(Number);

  // When the fit-controller shrinks the bible-reading section, bold the cell
  // text so it remains readable at the reduced scale.
  useEffect(() => {
    const handler = (e: Event) => {
      const scales = (e as CustomEvent).detail?.scales as Record<string, number> | undefined;
      const scale = scales?.["bible-reading"] ?? 1;
      const preview = document.getElementById("bulletin-preview");
      if (!preview) return;
      const section = preview.querySelector<HTMLElement>('[data-fit-section="bible-reading"]');
      const body = section?.querySelector<HTMLElement>("[data-fit-body]");
      if (!body) return;
      const fw = scale < 0.99 ? "700" : "";
      body.querySelectorAll<HTMLElement>("td").forEach((cell) => { cell.style.fontWeight = fw; });
    };
    window.addEventListener("bulletin-fit", handler);
    return () => window.removeEventListener("bulletin-fit", handler);
  }, []);

  // Reading 1 is always a single short block split into exactly 2 lines
  // (book + chapter range) — it never needs to shrink, so its font size
  // stays fixed.
  const primaryFontSize = 11;
  // Reading 2 can carry a much longer single line than Reading 1 (e.g. a
  // combined-book day like "Titus 1-3 / Phlm 1"), and it must always stay
  // within 2 lines total — one per block, never wrapped into more — since
  // the table row height is fixed. Shrink font size further as lines get
  // longer; cell padding is tightened separately as a second lever.
  const secondaryLines = data.bibleReading2.flatMap((value) => value.split("\n"));
  const longestSecondaryLine = Math.max(1, ...secondaryLines.map((line) => line.length));
  const secondaryFontSize = Math.max(7, Math.min(11, 15.44 - longestSecondaryLine * 0.444));
  const formatPrimaryReading = (value: string) => {
    const clean = value.replace(/\s+/g, " ").trim();
    const splitAt = clean.lastIndexOf(" ");
    return splitAt > 0
      ? `${clean.slice(0, splitAt)}\n${clean.slice(splitAt + 1)}`
      : clean;
  };
  // Reading 2 is always already exactly the (up to) two "\n"-joined blocks
  // computed by the auto-populate route — one line per block, shown as-is.
  const formatSecondaryReading = (value: string) => value;

  const page: React.CSSProperties = {
    ...BASE_STYLE,
    width: PAGE_W, height: PAGE_H,
    background: "#fff",
    display: "flex", flexDirection: "row",
    padding: 0,
    boxSizing: "border-box", overflow: "hidden",
  };

  // Column widths in px, computed off the page's CONTENT box (not the padded outer box) —
  // percentage widths on flex children resolve against the outer box in some renderers,
  // which silently overflowed the rightmost (cover) column by ~60px during PDF export.
  const COL_WS = [449, 448, 447];
  const COL_PADDING = [
    { left: 30, right: 15 },
    { left: 18, right: 14 },
    { left: 18, right: 17 },
  ];

  // Column container — each is a flex column
  const col = (i: 0|1|2): React.CSSProperties => ({
    display: "flex", flexDirection: "column", flexShrink: 0,
    boxSizing: "border-box", overflow: "hidden",
    width: COL_WS[i],
    height: PAGE_H,
    paddingTop: PM_V,
    paddingBottom: 28,
    paddingLeft: COL_PADDING[i].left,
    paddingRight: COL_PADDING[i].right,
    borderRight: i < 2 ? `0.67px solid ${LG}` : "none",
  });

  const tbl: React.CSSProperties = { width:"100%", borderCollapse:"collapse", marginBottom:9 };

  // Helper: update a top-level string field
  const upK = (key: keyof BulletinData) =>
    onUpdate ? (val: string) => onUpdate({ [key]: val } as Partial<BulletinData>) : undefined;

  // Helper: update one field inside an array item
  const upA = <T extends object>(
    arr: T[],
    key: keyof BulletinData,
    idx: number,
    field: keyof T,
  ) =>
    onUpdate
      ? (val: string) =>
          onUpdate({
            [key]: arr.map((item, i) =>
              i === idx ? { ...item, [field]: val } : item,
            ),
          } as Partial<BulletinData>)
      : undefined;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div id="bulletin-preview" style={{ width:PAGE_W, background:"#F0F0F0" }}>

      {/* ════════════ PAGE 1 ════════════ */}
      <div className="bulletin-page" style={{ ...page, marginBottom:2 }}>

        {/* ╔══ COL 1: Bible Reading · Memory Verses · Cleaning ══╗ */}
        <div style={col(0)}>

          {/* Bible Reading */}
          <div data-fit-section="bible-reading" style={{ height:176, paddingTop:1, boxSizing:"border-box", overflow:"visible" }}>
            <SecHead title="Bible Reading" gap={16} />
            <div data-fit-body>
            <table style={{
              ...tbl,
              width:"100%",
              marginLeft:0,
              marginTop:14,
              marginBottom:0,
              tableLayout:"fixed",
            }}>
              <colgroup>
                <col style={{ width:39 }} />
                {data.bibleReadingDates.map((_, i) => <col key={i} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={{
                    color:BL, fontWeight:700, fontSize:11,
                    position:"relative", overflow:"visible",
                    textAlign:"left", padding:"3px 2px 12px 0",
                    borderBottom:`${RULE}px solid ${BL}`,
                    lineHeight:1.1,
                  }}>
                    Date
                    <span aria-hidden style={{ position:"absolute", left:-14, bottom:-RULE, width:14, height:RULE, background:BL }} />
                  </th>
                  {data.bibleReadingDates.map((d,i) => (
                    <th key={i} style={{
                      color:GR, fontWeight:700, fontSize:11,
                      textAlign:"center", padding:"3px 1px 12px",
                      borderBottom:`${RULE}px solid ${BL}`,
                      lineHeight:1.1, whiteSpace:"nowrap",
                    }}>
                      <E value={d} onSave={onUpdate ? (v) => onUpdate({ bibleReadingDates: data.bibleReadingDates.map((x,j) => j===i ? v : x) }) : undefined} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ["1\nReading",  data.bibleReading1,  "bibleReading1"  ],
                  ["2\nReadings", data.bibleReading2,  "bibleReading2"  ],
                ] as [string, string[], "bibleReading1"|"bibleReading2"][]).map(([lbl, vals, key], rowIndex) => (
                  <tr key={lbl}>
                    <td style={{
                      color:BL, fontWeight:400, fontSize:11,
                      position:"relative", overflow:"visible",
                      padding:rowIndex === 0 ? "5px 2px 2.2px" : "0 2px 3px",
                      whiteSpace:"pre-line", textAlign:"center",
                      verticalAlign:rowIndex === 0 ? "middle" : "top", lineHeight:1.15,
                      borderBottom:rowIndex === 0 ? `${RULE}px solid ${LG}` : undefined,
                    }}>
                      <span style={{
                        position:"relative",
                        left:-8,
                        lineHeight:rowIndex === 0 ? 1.35 : 1.7,
                      }}>{lbl}</span>
                      {rowIndex === 0 && (
                        <span aria-hidden style={{ position:"absolute", left:-14, bottom:-RULE, width:14, height:RULE, background:LG }} />
                      )}
                    </td>
                    {vals.map((v,i) => (
                      <td key={i} style={{
                        fontSize:rowIndex === 0 ? primaryFontSize : secondaryFontSize, textAlign:"center",
                        padding:rowIndex === 0 ? "5px 2px 2.2px" : "3px 1px",
                        // Reading 2 must never wrap past its two "\n"-joined
                        // blocks — "pre" keeps each block on its own single
                        // line (may overflow horizontally on rare long
                        // combined-book days) rather than wrapping into a
                        // 3rd/4th row that collides with the section below.
                        whiteSpace:rowIndex === 0 ? "pre-line" : "pre",
                        overflowWrap:"normal", wordBreak:"normal",
                        borderBottom:rowIndex === 0 ? `${RULE}px solid ${LG}` : undefined,
                        color:GR,
                        lineHeight:rowIndex === 0 ? 1.4 : 1.5,
                        verticalAlign:rowIndex === 0 ? "bottom" : "middle",
                      }}>
                        <E
                          value={key === "bibleReading1"
                            ? formatPrimaryReading(v)
                            : formatSecondaryReading(v)}
                          onSave={onUpdate ? (nv) => onUpdate({
                            [key]: vals.map((x,j) => j===i
                              ? (key === "bibleReading1" ? nv.replace(/\s+/g, " ").trim() : nv)
                              : x),
                          }) : undefined}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Memory Verses */}
          <div data-fit-section="memory-verses" style={{ height:372, overflow:"hidden" }}>
            <SecHead title="Memory Verses" />
            <div data-fit-body>
            {data.memoryVerses.map((v,i) => (
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: F.body, whiteSpace: "nowrap" }}>
                    <E value={v.label}     onSave={upA(data.memoryVerses,"memoryVerses",i,"label")} />{" "}
                    (<E value={v.date}     onSave={upA(data.memoryVerses,"memoryVerses",i,"date")} />){" "}
                    <E value={v.reference} onSave={upA(data.memoryVerses,"memoryVerses",i,"reference")} />
                  </span>
                  <span style={{ flex:1, borderBottom:`1px dotted ${GR}`, margin:"0 3px 1.5px", minWidth:6 }} />
                  <span style={{ fontWeight: 700, fontSize: F.body, whiteSpace: "nowrap" }}>
                    <E value={v.theme} onSave={upA(data.memoryVerses,"memoryVerses",i,"theme")} />
                  </span>
                </div>
                <p style={{ fontSize:F.body, color:GR, lineHeight:1.35, marginTop:2 }}>
                  <E value={v.text} onSave={upA(data.memoryVerses,"memoryVerses",i,"text")} multi />
                </p>
              </div>
            ))}
            </div>
          </div>

          {/* Lord's Day Cleaning Area */}
          <div data-fit-section="cleaning-area" style={{ flex:1, overflow:"hidden" }}>
            <SecHead title="Lord's Day Cleaning Area" size={14} fontFamily="'Malgun Gothic', Calibri, sans-serif" />
            <div data-fit-body>
            <table style={{ ...tbl, marginBottom:0 }}>
              <thead>
                <tr><TH>Location</TH><TH>Group</TH></tr>
              </thead>
              <tbody>
                {data.cleaningAreas.map((r,i) => (
                  <tr key={i}>
                    <TD xs><E value={r.location} onSave={upA(data.cleaningAreas,"cleaningAreas",i,"location")} /></TD>
                    <TD xs><E value={r.group}    onSave={upA(data.cleaningAreas,"cleaningAreas",i,"group")} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* ╔══ COL 2: Sermon · Services · Seminar · Fellowship · Contact ══╗ */}
        <div style={col(1)}>

          {/* Lord's Day Sermon */}
          <div data-fit-section="sermon" style={{ height:140, overflow:"hidden", flexShrink:0 }}>
            <SecHead title="Lord's Day Sermon" />
            <div data-fit-body>
            <table style={{ ...tbl }}>
              <tbody>
                {([
                  ["Title",         data.sermonTitle,        "sermonTitle"],
                  ["Main verse",    data.sermonVerse,        "sermonVerse"],
                  ["Speaker",       data.sermonSpeaker,      "sermonSpeaker"],
                  ["Ending praise", data.sermonEndingPraise, "sermonEndingPraise"],
                ] as [string, string, keyof BulletinData][]).map(([lbl, val, key]) => (
                  <tr key={lbl}>
                    <td style={{
                      color:BL, fontWeight:700, fontSize:F.body,
                      padding:"1.5px 8px 1.5px 0",
                      whiteSpace:"nowrap", verticalAlign:"top",
                      lineHeight:1.3, width:78,
                    }}>{lbl}</td>
                    <td style={{
                      fontSize:F.body, color:GR,
                      padding:"1.5px 0", verticalAlign:"top", lineHeight:1.3,
                    }}><E value={val} onSave={upK(key)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Services */}
          <div data-fit-section="services" style={{ height:157, overflow:"hidden", flexShrink:0 }}>
            <SecHead title="Services" />
            <div data-fit-body>
            <table style={tbl}>
              <thead>
                <tr>
                  {["Sunday","Usher (SUN)","Lunch Duty","Child Care","Usher (WED)"].map(h => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.services.map((r,i) => (
                  <tr key={i}>
                    {(["date","usherSun","lunchDuty","childCare","usherWed"] as const).map((field,j) => (
                      <TD key={j} xs center>
                        <span style={{ whiteSpace:"pre-line" }}>
                          <E value={r[field]} onSave={upA(data.services,"services",i,field)} />
                        </span>
                      </TD>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* US East Coast Bible Seminar */}
          <div data-fit-section="east-coast-seminar" style={{ height:201, overflow:"hidden", flexShrink:0 }}>
            <SecHead title="US East Coast Bible Seminar" />
            <div data-fit-body>
            <table style={tbl}>
              <thead>
                <tr>
                  {["Date","Church","Speaker","Language"].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {data.eastCoastSeminar.map((r,i) => (
                  <tr key={i}>
                    <TD noWrap xs><E value={r.date}     onSave={upA(data.eastCoastSeminar,"eastCoastSeminar",i,"date")} /></TD>
                    <TD xs>       <E value={r.church}   onSave={upA(data.eastCoastSeminar,"eastCoastSeminar",i,"church")} /></TD>
                    <TD xs>       <E value={r.speaker}  onSave={upA(data.eastCoastSeminar,"eastCoastSeminar",i,"speaker")} /></TD>
                    <TD xs>       <E value={r.language} onSave={upA(data.eastCoastSeminar,"eastCoastSeminar",i,"language")} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Services & Fellowship */}
          <div data-fit-section="fellowship" style={{ height:209, overflow:"hidden", flexShrink:0 }}>
            <SecHead title="Services &amp; Fellowship" />
            <div data-fit-body>
            <table style={{ ...tbl, marginBottom:0 }}>
              <tbody>
                {data.fellowship.map((r,i) => (
                  <tr key={i}>
                    <td style={{ color:BL, fontWeight:700, fontSize:F.body, padding:"2px 8px 2px 0", whiteSpace:"nowrap", borderBottom:`0.5px solid ${LG}` }}>
                      <E value={r.name}     onSave={upA(data.fellowship,"fellowship",i,"name")} />
                    </td>
                    <td style={{ fontSize:F.body, color:GR, padding:"2px 8px 2px 0", borderBottom:`0.5px solid ${LG}` }}>
                      <E value={r.day}      onSave={upA(data.fellowship,"fellowship",i,"day")} />
                    </td>
                    <td style={{ fontSize:F.body, color:GR, padding:"2px 8px 2px 0", whiteSpace:"nowrap", borderBottom:`0.5px solid ${LG}` }}>
                      <E value={r.time}     onSave={upA(data.fellowship,"fellowship",i,"time")} />
                    </td>
                    <td style={{ fontSize:F.body, color:GR, padding:"2px 0", borderBottom:`0.5px solid ${LG}` }}>
                      <E value={r.location} onSave={upA(data.fellowship,"fellowship",i,"location")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Contact — pinned to bottom */}
          <div style={{ marginTop:"auto", paddingTop:6, borderTop:`${RULE}px solid ${B}` }}>
            <p style={{ color:B, fontWeight:700, fontSize:F.contact, lineHeight:1.5, margin:0 }}>
              Pastor <E value={data.phone} onSave={upK("phone")} />&nbsp;&nbsp;&nbsp;&nbsp;<E value={data.email} onSave={upK("email")} />
            </p>
            <p style={{ color:B, fontWeight:700, fontSize:F.contact, lineHeight:1.5, margin:0 }}>
              Address <E value={data.address} onSave={upK("address")} />
            </p>
          </div>
        </div>

        {/* ╔══ COL 3: Cover panel ══╗ */}
        <div style={{ ...col(2), padding:0, position:"relative", alignItems:"center" }}>

          {/* No. / Date */}
          <div style={{
            position:"absolute", left:18, right:18, top:32,
            display:"flex", justifyContent:"space-between",
            fontFamily:"'Nanum Gothic', 'Malgun Gothic', Calibri, sans-serif",
            fontSize:15, fontWeight:700, lineHeight:1,
          }}>
            <span>No. <E value={data.number} onSave={upK("number")} /></span>
            <span><E value={data.date} onSave={upK("date")} /></span>
          </div>

          {/* "Church Bulletin" — forced two-line break, matches original's stacked title */}
          <h1 style={{
            position:"absolute", left:0, right:0, top:136,
            fontFamily:"'Book Antiqua', 'Palatino Linotype', serif",
            fontSize:F.title, fontWeight:700,
            textAlign:"center", letterSpacing:0, lineHeight:1,
            color:"#000", margin:0, whiteSpace:"nowrap",
          }}>
            Church Bulletin
          </h1>

          {/* Quote */}
          <div style={{
            position:"absolute", left:0, right:0, top:242,
            textAlign:"center", fontFamily:"'Book Antiqua', 'Palatino Linotype', serif",
          }}>
            <p style={{
              fontWeight:700, fontSize:F.quote,
              lineHeight:"23px", whiteSpace:"pre-line", margin:0,
            }}>
              <E value={data.quote} onSave={upK("quote")} multi />
            </p>
            <p style={{ fontWeight:700, fontSize:F.quoteRef, marginTop:0, marginBottom:0 }}>
              <E value={data.quoteRef} onSave={upK("quoteRef")} />
            </p>
          </div>

          {/* Church photo */}
          <div style={{
            position:"absolute", left:35, top:363,
            width:366, height:259,
            background:"#E2EAF4", overflow:"hidden",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/church.jpg"
              alt="New York Church building"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width:"100%", height:"100%", objectFit:"fill", WebkitUserDrag:"none" } as React.CSSProperties}
            />
          </div>

          {/* Pastor */}
          <p style={{
            position:"absolute", left:0, right:0, top:669,
            textAlign:"center", fontSize:F.pastor, lineHeight:1, margin:0,
          }}>
            Pastor <strong style={{ fontWeight:700 }}><E value={data.pastor} onSave={upK("pastor")} /></strong>
          </p>

          {/* Full logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-full.png"
            alt="Jesus Baptist U.S.A. Conference — New York Church"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{ position:"absolute", left:80, top:726, width:290, height:47, objectFit:"fill", WebkitUserDrag:"none" } as React.CSSProperties}
          />
        </div>
      </div>

      {/* ════════════ PAGE 2 ════════════ */}
      <div className="bulletin-page" style={page}>

        {/* ╔══ COL 1: Calendar · Bible Seminar Info ══╗ */}
        <div style={{ ...col(0), paddingTop:28.5, paddingLeft:16, paddingRight:7 }}>
          <div data-fit-section="monthly-calendar" style={{ height:560, overflow:"hidden" }}>
            <SecHead title={`Monthly Schedule ${data.calendarMonth}`} />
            <div data-fit-body>
              <CalGrid month={mm} year={yyyy} events={data.calendarEvents} banners={data.calendarBanners} weeklyRecurring={data.weeklyRecurring ?? []} onUpdate={onUpdate} />
            </div>
          </div>

          <div data-fit-section="seminar-info" style={{ flex:1, overflow:"hidden" }}>
            <SecHead title="Bible Seminar Info" />
            <div data-fit-body>
            <div style={{ padding:"7px 12px" }}>
              <p style={{
                textAlign:"center", fontWeight:700, color:BL,
                fontSize:16, margin:"0 0 8px", paddingBottom:5,
                lineHeight:1.3, borderBottom:`${RULE}px solid ${BL}`,
              }}>
                <E value={data.seminarInfo.title} onSave={onUpdate ? (v) => onUpdate({ seminarInfo: { ...data.seminarInfo, title: v } }) : undefined} />
              </p>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {([
                    ["DATE",    data.seminarInfo.date,    "date"],
                    ["SPEAKER", data.seminarInfo.speaker, "speaker"],
                  ] as [string, string, "date"|"speaker"][]).map(([lbl, val, field]) => (
                    <tr key={lbl}>
                      <td style={{ color:BL, fontWeight:700, fontSize:F.body, paddingRight:8, paddingBottom:2, width:54, whiteSpace:"nowrap" }}>{lbl}</td>
                      <td style={{ fontSize:F.body, color:GR, paddingBottom:2 }}>
                        <E value={val} onSave={onUpdate ? (v) => onUpdate({ seminarInfo: { ...data.seminarInfo, [field]: v } }) : undefined} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </div>

        {/* ╔══ COL 2: This week's schedule · NY Church News ══╗ */}
        <div style={{ ...col(1), paddingTop:28.5 }}>

          <div data-fit-section="weekly-schedule" style={{ height:299, overflow:"hidden" }}>
            <SecHead title="This week's schedule" />
            <div data-fit-body>
            <table style={tbl}>
              <thead>
                <tr>
                  {["Date","Event","Location","Time"].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {data.weekSchedule.flatMap((day,di) =>
                  day.items.map((item,ii) => (
                    <tr key={`${di}-${ii}`}>
                      {ii===0 && (
                        <td rowSpan={day.items.length} style={{
                          fontWeight:700, fontSize:F.body,
                          padding:"2px 6px 2px 0",
                          verticalAlign:"middle", whiteSpace:"nowrap",
                          borderBottom:`0.5px solid ${LG}`, color:"#000",
                        }}>
                          <E value={day.date} onSave={onUpdate ? (v) => onUpdate({ weekSchedule: data.weekSchedule.map((d,x) => x===di ? {...d, date:v} : d) }) : undefined} />
                        </td>
                      )}
                      <TD xs><E value={item.name}     onSave={onUpdate ? (v) => onUpdate({ weekSchedule: data.weekSchedule.map((d,x) => x===di ? {...d, items: d.items.map((it,y) => y===ii ? {...it, name:v} : it)} : d) }) : undefined} /></TD>
                      <TD xs><E value={item.location} onSave={onUpdate ? (v) => onUpdate({ weekSchedule: data.weekSchedule.map((d,x) => x===di ? {...d, items: d.items.map((it,y) => y===ii ? {...it, location:v} : it)} : d) }) : undefined} /></TD>
                      <TD xs noWrap><E value={item.time} onSave={onUpdate ? (v) => onUpdate({ weekSchedule: data.weekSchedule.map((d,x) => x===di ? {...d, items: d.items.map((it,y) => y===ii ? {...it, time:v} : it)} : d) }) : undefined} /></TD>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div data-fit-section="church-news" style={{ flex:1, overflow:"hidden" }}>
            <SecHead title="NY Church News" />
            <div data-fit-body>
            {data.news.map((item,i) => (
              <div key={i} style={{ marginBottom:7 }}>
                <p style={{ fontWeight:700, fontSize:F.body, lineHeight:1.3, margin:"0 0 1px" }}>
                  {i+1}. <E value={item.title} onSave={upA(data.news,"news",i,"title")} />
                </p>
                <p style={{ fontSize:F.small, color:GR, paddingLeft:10, lineHeight:1.45, margin:0, whiteSpace:"pre-wrap" }}>
                  <E value={item.body} onSave={upA(data.news,"news",i,"body")} multi />
                </p>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* ╔══ COL 3: Prayer Request · Joint Prayer ══╗ */}
        <div style={{ ...col(2), paddingTop:28.5, paddingLeft:19.5 }}>

          <div data-fit-section="prayer-requests" style={{ height:299, overflow:"hidden" }}>
            <SecHead title="Prayer Request" />
            <div data-fit-body>
            <table style={{ ...tbl, tableLayout: "fixed", border:`${RULE}px solid ${BL}` }}>
              <colgroup>
                <col style={{ width: "20%" }} /><col style={{ width: "17%" }} /><col style={{ width: "13%" }} />
                <col style={{ width: "20%" }} /><col style={{ width: "17%" }} /><col style={{ width: "13%" }} />
              </colgroup>
              <tbody>
                {Array.from({ length: Math.max(10, Math.ceil(data.prayerRequests.length/2)) }, (_,i) => {
                  const L = data.prayerRequests[i*2];
                  const R = data.prayerRequests[i*2+1];
                  return (
                    <tr key={i} style={{ height:23 }}>
                      <TD xs center><E value={L?.who??""} onSave={L ? upA(data.prayerRequests,"prayerRequests",i*2,"who") : undefined} /></TD>
                      <TD xs center><E value={L?.whom??""} onSave={L ? upA(data.prayerRequests,"prayerRequests",i*2,"whom") : undefined} /></TD>
                      <TD xs center pr={10}><E value={L?.relation??""} onSave={L ? upA(data.prayerRequests,"prayerRequests",i*2,"relation") : undefined} /></TD>
                      <TD xs grid center><E value={R?.who??""} onSave={R ? upA(data.prayerRequests,"prayerRequests",i*2+1,"who") : undefined} /></TD>
                      <TD xs center><E value={R?.whom??""} onSave={R ? upA(data.prayerRequests,"prayerRequests",i*2+1,"whom") : undefined} /></TD>
                      <TD xs center><E value={R?.relation??""} onSave={R ? upA(data.prayerRequests,"prayerRequests",i*2+1,"relation") : undefined} /></TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div data-fit-section="joint-prayer" style={{
            flex: data.retreatInfo?.enabled ? undefined : 1,
            height: data.retreatInfo?.enabled ? 190 : undefined,
            overflow:"hidden",
          }}>
            <SecHead title="Joint Prayer" />
            <div data-fit-body>
            {data.jointPrayer.map((item,i) => (
              <div key={i} style={{ marginBottom:7 }}>
                <p style={{ fontWeight:700, fontSize:F.body, lineHeight:1.3, margin:"0 0 1px" }}>
                  {i+1}. <E value={item.title} onSave={upA(data.jointPrayer,"jointPrayer",i,"title")} />
                </p>
                <p style={{ fontSize:F.small, color:GR, paddingLeft:10, lineHeight:1.45, margin:0 }}>
                  {"- "}<E value={item.body} onSave={upA(data.jointPrayer,"jointPrayer",i,"body")} multi />
                </p>
              </div>
            ))}
            </div>
          </div>

          {data.retreatInfo?.enabled && (
            <div data-fit-section="retreat-info" style={{ flex:1, overflow:"hidden" }}>
              <SecHead title="Retreat Schedule" />
              <div data-fit-body>
              <div style={{ padding:"2px 0 4px" }}>
                <p style={{
                  textAlign:"center", fontWeight:700, color:BL,
                  fontSize:13, margin:"0 0 5px", paddingBottom:4,
                  lineHeight:1.3, borderBottom:`${RULE}px solid ${BL}`,
                }}>
                  <E value={data.retreatInfo.title} onSave={onUpdate ? (v) => onUpdate({ retreatInfo: { ...data.retreatInfo, title: v, enabled: true } }) : undefined} />
                </p>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ color:BL, fontWeight:700, fontSize:F.body, paddingRight:8, paddingBottom:3, width:56, whiteSpace:"nowrap", verticalAlign:"middle" }}>Date</td>
                      <td style={{ fontSize:F.body, color:GR, paddingBottom:3 }}>
                        <E value={data.retreatInfo.date} onSave={onUpdate ? (v) => onUpdate({ retreatInfo: { ...data.retreatInfo, date: v, enabled: true } }) : undefined} />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color:BL, fontWeight:700, fontSize:F.body, paddingRight:8, paddingBottom:3, whiteSpace:"nowrap", verticalAlign:"middle" }}>Location</td>
                      <td style={{ fontSize:F.body, color:GR, paddingBottom:3 }}>
                        <E value={data.retreatInfo.location} onSave={onUpdate ? (v) => onUpdate({ retreatInfo: { ...data.retreatInfo, location: v, enabled: true } }) : undefined} />
                      </td>
                    </tr>
                    {(data.retreatInfo.fees?.length ?? 0) > 0 && (
                      <tr>
                        <td style={{ color:BL, fontWeight:700, fontSize:F.body, paddingRight:8, whiteSpace:"nowrap", verticalAlign:"top", paddingTop:2 }}>Fee</td>
                        <td style={{ paddingBottom:2 }}>
                          <table style={{ width:"100%", borderCollapse:"collapse", border:`${RULE}px solid ${BL}` }}>
                            <tbody>
                              {Array.from({ length: Math.ceil((data.retreatInfo.fees?.length ?? 0) / 2) }, (_, row) => {
                                const L = data.retreatInfo.fees?.[row * 2];
                                const R = data.retreatInfo.fees?.[row * 2 + 1];
                                return (
                                  <tr key={row} style={{ borderBottom:`${RULE}px solid ${BL}` }}>
                                    <td style={{ fontSize:F.small, padding:"2px 5px", borderRight:`${RULE}px solid ${BL}`, color:GR }}>
                                      {L ? <E value={L.label} onSave={onUpdate ? (v) => onUpdate({ retreatInfo: { ...data.retreatInfo, fees: data.retreatInfo.fees.map((f,i) => i===row*2 ? {...f, label:v} : f), enabled:true } }) : undefined} /> : null}
                                    </td>
                                    <td style={{ fontSize:F.small, padding:"2px 5px", fontWeight:700, color:BL, borderRight:`${RULE}px solid ${BL}`, whiteSpace:"nowrap" }}>
                                      {L ? <E value={L.amount} onSave={onUpdate ? (v) => onUpdate({ retreatInfo: { ...data.retreatInfo, fees: data.retreatInfo.fees.map((f,i) => i===row*2 ? {...f, amount:v} : f), enabled:true } }) : undefined} /> : null}
                                    </td>
                                    <td style={{ fontSize:F.small, padding:"2px 5px", borderRight:`${RULE}px solid ${BL}`, color:GR }}>
                                      {R ? <E value={R.label} onSave={onUpdate ? (v) => onUpdate({ retreatInfo: { ...data.retreatInfo, fees: data.retreatInfo.fees.map((f,i) => i===row*2+1 ? {...f, label:v} : f), enabled:true } }) : undefined} /> : null}
                                    </td>
                                    <td style={{ fontSize:F.small, padding:"2px 5px", fontWeight:700, color:BL, whiteSpace:"nowrap" }}>
                                      {R ? <E value={R.amount} onSave={onUpdate ? (v) => onUpdate({ retreatInfo: { ...data.retreatInfo, fees: data.retreatInfo.fees.map((f,i) => i===row*2+1 ? {...f, amount:v} : f), enabled:true } }) : undefined} /> : null}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
