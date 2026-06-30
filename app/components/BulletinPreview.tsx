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
}: {
  title: string;
  size?: number;
  fontFamily?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, lineHeight: 1 }}>
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

function CalGrid({ month, year, events, banners }: {
  month: number; year: number;
  events: Record<string, string[]>;
  banners: CalendarBanner[];
}) {
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

  const bVal = (value: string) => {
    const [bannerMonth, day] = value.split("/").map(Number);
    return bannerMonth * 100 + day;
  };
  const inBanner = (banner: CalendarBanner, cell: CalendarDay) => {
    const current = cell.month * 100 + cell.day;
    return current >= bVal(banner.startDate) && current <= bVal(banner.endDate);
  };

  // Each day cell ≈ (32% of 1280 − 13px padding − 6px total gap) / 7
  const CW = 59.7;

  return (
    <div>
      {/* Day-of-week header */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(7,${CW}px)`, gap:1, marginBottom:1 }}>
        {DOW.map((d,i) => (
          <div key={d} style={{
            textAlign:"center", fontWeight:700, fontSize:9,
            color: i===0 ? SUN : i===6 ? SAT : B,
            paddingBottom:2, lineHeight:1,
          }}>{d}</div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week) => {
        const activeBanners = banners.filter((banner) =>
          week.some((cell) => cell.month * 100 + cell.day === bVal(banner.startDate))
        );
        return (
          <div key={`${week[0].month}-${week[0].day}`} style={{ marginBottom:1 }}>

            {/* Banner strips */}
            {/* Day cells */}
            <div style={{ display:"grid", gridTemplateColumns:`repeat(7,${CW}px)`, gap:1 }}>
              {week.map((cell,di) => {
                const key = `${cell.month}/${cell.day}`;
                const evts = events[key] ?? [];
                return (
                  <div key={di} style={{
                    height:93, border:`${RULE}px solid ${BL}`,
                    background:"#fff",
                    padding:"1px 2px", overflow:"hidden",
                  }}>
                    <div style={{
                      fontWeight:700, fontSize:11, lineHeight:1.2,
                      color: "#222",
                    }}>{cell.day === 1 ? `${cell.month}/1` : cell.day}</div>
                    {evts.map((e,ei) => (
                      <div key={ei} style={{ fontSize:10, color:GR, lineHeight:1.2 }}>•{e}</div>
                    ))}
                  </div>
                );
              })}
            </div>

            {activeBanners.map((banner, bi) => {
              let startColumn = week.findIndex((cell) => inBanner(banner, cell));
              let count = week.filter((cell) => inBanner(banner, cell)).length;
              if (count === 1 && banner.label.length > 12 && startColumn > 0) {
                startColumn -= 1;
                count = 2;
              }
              return (
                <div key={bi} style={{ position:"relative", height:17 }}>
                  <div style={{
                    position:"absolute",
                    left:startColumn * (CW + 1),
                    width:count * (CW + 1) - 1,
                    height:16,
                    border:`${RULE}px solid ${BL}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    overflow:"hidden",
                  }}>
                    <span style={{ fontSize:11, color:BL, whiteSpace:"nowrap" }}>
                      {banner.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BulletinPreview({ data }: { data: BulletinData }) {
  const [mm, yyyy] = data.calendarMonth.split("/").map(Number);

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

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div id="bulletin-preview" style={{ width:PAGE_W, background:"#F0F0F0" }}>

      {/* ════════════ PAGE 1 ════════════ */}
      <div className="bulletin-page" style={{ ...page, marginBottom:2 }}>

        {/* ╔══ COL 1: Bible Reading · Memory Verses · Cleaning ══╗ */}
        <div style={col(0)}>

          {/* Bible Reading */}
          <div data-fit-section="bible-reading" style={{ height:176, overflow:"hidden" }}>
            <SecHead title="Bible Reading" />
            <div data-fit-body>
            <table style={{ ...tbl, marginBottom:0 }}>
              <thead>
                <tr>
                  <TH w={28}>Date</TH>
                  {data.bibleReadingDates.map((d,i) => <TH key={i} center>{d}</TH>)}
                </tr>
              </thead>
              <tbody>
                {([
                  ["1\nReading",  data.bibleReading1],
                  ["2\nReadings", data.bibleReading2],
                ] as [string,string[]][]).map(([lbl,vals]) => (
                  <tr key={lbl}>
                    <td style={{
                      color:BL, fontWeight:700, fontSize:F.small,
                      padding:"2px 3px 2px 0", whiteSpace:"pre-line",
                      verticalAlign:"top", lineHeight:1.2,
                      borderBottom:`0.5px solid ${LG}`, width:28,
                    }}>{lbl}</td>
                    {vals.map((v,i) => (
                      <td key={i} style={{
                        fontSize:F.small, textAlign:"center", verticalAlign:"top",
                        padding:"2px 2px 2px 0", whiteSpace:"pre-line",
                        borderBottom:`0.5px solid ${LG}`, color:GR, lineHeight:1.25,
                      }}>{v}</td>
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
                <VerseRow label={v.label} date={v.date} reference={v.reference} theme={v.theme} />
                <p style={{ fontSize:F.body, color:GR, lineHeight:1.35, marginTop:2 }}>
                  {v.text}
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
                    <TD xs>{r.location}</TD>
                    <TD xs>{r.group}</TD>
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
                  ["Title",         data.sermonTitle],
                  ["Main verse",    data.sermonVerse],
                  ["Speaker",       data.sermonSpeaker],
                  ["Ending praise", data.sermonEndingPraise],
                ] as [string,string][]).map(([lbl,val]) => (
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
                    }}>{val}</td>
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
                    {[r.date, r.usherSun, r.lunchDuty, r.childCare, r.usherWed].map((v,j) => (
                      <TD key={j} top xs>
                        <span style={{ whiteSpace:"pre-line" }}>{v}</span>
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
                    <TD noWrap xs>{r.date}</TD>
                    <TD xs>{r.church}</TD>
                    <TD xs>{r.speaker}</TD>
                    <TD xs>{r.language}</TD>
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
                    <td style={{
                      color:BL, fontWeight:700, fontSize:F.body,
                      padding:"2px 8px 2px 0", whiteSpace:"nowrap",
                      borderBottom:`0.5px solid ${LG}`,
                    }}>{r.name}</td>
                    <td style={{ fontSize:F.body, color:GR, padding:"2px 8px 2px 0", borderBottom:`0.5px solid ${LG}` }}>{r.day}</td>
                    <td style={{ fontSize:F.body, color:GR, padding:"2px 8px 2px 0", whiteSpace:"nowrap", borderBottom:`0.5px solid ${LG}` }}>{r.time}</td>
                    <td style={{ fontSize:F.body, color:GR, padding:"2px 0", borderBottom:`0.5px solid ${LG}` }}>{r.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Contact — pinned to bottom */}
          <div style={{ marginTop:"auto", paddingTop:6, borderTop:`${RULE}px solid ${B}` }}>
            <p style={{ color:B, fontWeight:700, fontSize:F.contact, lineHeight:1.5, margin:0 }}>
              Pastor {data.phone}&nbsp;&nbsp;&nbsp;&nbsp;{data.email}
            </p>
            <p style={{ color:B, fontWeight:700, fontSize:F.contact, lineHeight:1.5, margin:0 }}>
              Address {data.address}
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
            <span>No. {data.number}</span>
            <span>{data.date}</span>
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
              {data.quote}
            </p>
            <p style={{ fontWeight:700, fontSize:F.quoteRef, marginTop:0, marginBottom:0 }}>
              {data.quoteRef}
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
              style={{ width:"100%", height:"100%", objectFit:"fill" }}
            />
          </div>

          {/* Pastor */}
          <p style={{
            position:"absolute", left:0, right:0, top:669,
            textAlign:"center", fontSize:F.pastor, lineHeight:1, margin:0,
          }}>
            Pastor <strong style={{ fontWeight:700 }}>{data.pastor}</strong>
          </p>

          {/* Full logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-full.png"
            alt="Jesus Baptist U.S.A. Conference — New York Church"
            style={{ position:"absolute", left:96, top:725, width:243, height:55, objectFit:"fill" }}
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
              <CalGrid month={mm} year={yyyy} events={data.calendarEvents} banners={data.calendarBanners} />
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
                {data.seminarInfo.title}
              </p>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <tbody>
                  {([
                    ["DATE",    data.seminarInfo.date],
                    ["SPEAKER", data.seminarInfo.speaker],
                  ] as [string,string][]).map(([lbl,val]) => (
                    <tr key={lbl}>
                      <td style={{ color:BL, fontWeight:700, fontSize:F.body, paddingRight:8, paddingBottom:2, width:54, whiteSpace:"nowrap" }}>{lbl}</td>
                      <td style={{ fontSize:F.body, color:GR, paddingBottom:2 }}>{val}</td>
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
              <tbody>
                {data.weekSchedule.flatMap((day,di) =>
                  day.items.map((item,ii) => (
                    <tr key={`${di}-${ii}`}>
                      {ii===0 && (
                        <td rowSpan={day.items.length} style={{
                          fontWeight:700, fontSize:F.body,
                          padding:"2px 6px 2px 0",
                          verticalAlign:"top", whiteSpace:"nowrap",
                          borderBottom:`0.5px solid ${LG}`, color:"#000",
                        }}>
                          {day.date}
                        </td>
                      )}
                      <TD top xs>{item.name}</TD>
                      <TD top xs>{item.location}</TD>
                      <TD top xs noWrap>{item.time}</TD>
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
                  {i+1}. {item.title}
                </p>
                {item.body.split("\n").filter(Boolean).map((line,li) => (
                  <p key={li} style={{
                    fontSize:F.small, color:GR,
                    paddingLeft:10, lineHeight:1.45, margin:0,
                  }}>
                    {"- "+line.replace(/^[-–•]\s*/,"")}
                  </p>
                ))}
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
              <thead>
                <tr>
                  <TH grid center>Who</TH><TH grid center>Whom</TH><TH grid center>Relation</TH>
                  <TH grid center>Who</TH><TH grid center>Whom</TH><TH grid center>Relation</TH>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(10, Math.ceil(data.prayerRequests.length/2)) }, (_,i) => {
                  const L = data.prayerRequests[i*2];
                  const R = data.prayerRequests[i*2+1];
                  return (
                    <tr key={i} style={{ height:23 }}>
                      <TD xs center>{L?.who}</TD>
                      <TD xs center>{L?.whom}</TD>
                      <TD xs center pr={10}>{L?.relation}</TD>
                      <TD xs grid center>{R?.who??""}</TD>
                      <TD xs center>{R?.whom??""}</TD>
                      <TD xs center>{R?.relation??""}</TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div data-fit-section="joint-prayer" style={{ flex:1, overflow:"hidden" }}>
            <SecHead title="Joint Prayer" />
            <div data-fit-body>
            {data.jointPrayer.map((item,i) => (
              <div key={i} style={{ marginBottom:7 }}>
                <p style={{ fontWeight:700, fontSize:F.body, lineHeight:1.3, margin:"0 0 1px" }}>
                  {i+1}. {item.title}
                </p>
                <p style={{ fontSize:F.small, color:GR, paddingLeft:10, lineHeight:1.45, margin:0 }}>
                  {"- "+item.body}
                </p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
