"use client";

import { Fragment, useState } from "react";
import type { CalendarBanner } from "@/lib/bulletin-types";
import { B, BL, GR, SAT, RULE } from "@/app/components/preview/theme";
import { E } from "@/app/components/preview/Editable";

export const BANNER_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  retreat:    { bg: "#D6E8F7", border: "#4472C4", text: "#4472C4" },
  seminar:    { bg: "#EDE9FE", border: "#7C3AED", text: "#7C3AED" },
  camp:       { bg: "#DCFCE7", border: "#16A34A", text: "#16A34A" },
  conference: { bg: "#FEF3C7", border: "#D97706", text: "#D97706" },
  other:      { bg: "#F1F5F9", border: "#64748B", text: "#64748B" },
};

export function CalGrid({ month, year, events, banners, weeklyRecurring = [], onUpdate }: {
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
        // Banners that share a column go on separate lanes, stacked upward from the
        // bottom of the row, so one never covers (and visually cuts) another.
        const laneOf = new Map<number, number>();
        const spanOf = new Map<number, { startCol: number; count: number }>();
        const lanes: boolean[][] = [];
        for (const { banner, index } of activeBanners) {
          let startCol = week.findIndex((cell) => inBanner(banner, cell));
          let count = week.filter((cell) => inBanner(banner, cell)).length;
          // A one-day banner with a long label borrows the column before it.
          if (count === 1 && banner.label.length > 12 && startCol > 0) { startCol -= 1; count = 2; }
          let lane = 0;
          while (lanes[lane]?.slice(startCol, startCol + count).some(Boolean)) lane++;
          lanes[lane] ??= [];
          for (let c = startCol; c < startCol + count; c++) lanes[lane][c] = true;
          laneOf.set(index, lane);
          spanOf.set(index, { startCol, count });
        }
        return (
          <Fragment key={`${week[0].month}-${week[0].day}`}>
            {week.map((cell, di) => {
              const key = `${cell.month}/${cell.day}`;
              const evts = events[key] ?? [];
              const evtSet = new Set(evts.map(e => e.trim().toLowerCase()));
              const recurringLabelsForDay = cell.outside ? [] : weeklyRecurring
                .filter(r => r.dayOfWeek === di)
                .map(r => r.label);
              const recurringLabelSet = new Set(recurringLabelsForDay.map(l => l.trim().toLowerCase()));
              const recurring = recurringLabelsForDay
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
                    const isRecurringDup = recurringLabelSet.has(e.trim().toLowerCase());
                    return (
                      <div key={ei} style={{ display:"flex", alignItems:"flex-start", gap:1 }}>
                        <E block
                          value={"•" + e}
                          autoFocus={isNew}
                          style={{
                            fontSize:evtFs,
                            color:GR,
                            lineHeight:1.18,
                            overflowWrap:"break-word",
                            wordBreak:"normal",
                            flex:1,
                            minWidth:0,
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
                        {onUpdate && !isRecurringDup && (
                          <button
                            type="button"
                            aria-label={`Remove ${e}`}
                            title="Remove event"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation();
                              const newEvts = evts.filter((_, j) => j !== ei);
                              const next = { ...events };
                              if (newEvts.length === 0) delete next[key];
                              else next[key] = newEvts;
                              onUpdate({ calendarEvents: next });
                            }}
                            style={{
                              position:"relative", zIndex:2,
                              flexShrink:0, width:8, height:8, padding:0, border:0,
                              background:"transparent", color:"#9CA3AF", cursor:"pointer",
                              fontSize:8, fontWeight:700, lineHeight:"8px", textAlign:"center",
                            }}
                          >×</button>
                        )}
                      </div>
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
              const { startCol, count } = spanOf.get(bannerIndex)!;
              const lane = laneOf.get(bannerIndex) ?? 0;
              // A label longer than its columns (Russian runs long) would be clipped at both
              // ends, so shrink it to fit: ~62px per day column; CJK glyphs are about twice as wide.
              const labelEm = [...banner.label].reduce((sum, ch) => sum + (/[⺀-鿿가-힯]/.test(ch) ? 1 : 0.56), 0);
              const bannerFs = Math.min(10, Math.max(6.5, (count * 62 - 12) / Math.max(1, labelEm)));
              return (
                <div key={`${bannerIndex}-${banner.startDate}`} title="Clear the label and click away to remove this banner" style={{
                  gridRow, gridColumn: `${startCol + 1} / span ${count}`,
                  position:"relative", alignSelf:"end", zIndex:1,
                  marginBottom: lane * 16,
                  height:17, boxSizing:"border-box", overflow:"hidden",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: (BANNER_PALETTE[banner.type ?? "retreat"] ?? BANNER_PALETTE.retreat).bg,
                  border:`${RULE}px solid ${(BANNER_PALETTE[banner.type ?? "retreat"] ?? BANNER_PALETTE.retreat).border}`,
                }}>
                  <span style={{ fontSize:bannerFs, color:(BANNER_PALETTE[banner.type ?? "retreat"] ?? BANNER_PALETTE.retreat).text, fontWeight:700, whiteSpace:"nowrap" }}>
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
