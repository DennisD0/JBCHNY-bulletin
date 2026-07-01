"use client";
import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import type { DataSource, ScheduleSource, ScheduleEvent } from "../api/manage/route";

// ── Design tokens ──────────────────────────────────────────
const BL   = "#4472C4";
const BL_L = "#EEF3FB";
const BL_M = "#DBEAFE";
const RED  = "#C00000";
const WARN = "#CC7000";
const GN   = "#2A7D4B";

const PDF_BL   = "#4472C4";
const PDF_GR   = "#000000";
const PDF_RULE = 4 / 3;
const PDF_FONT = "Calibri, 'Malgun Gothic', Arial, sans-serif";
const PDF_FS   = 12;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Helpers ────────────────────────────────────────────────
function fmtShort(iso: string)  { const [,m,d] = iso.split("-").map(Number); return `${MONTHS[m-1]} ${d}`; }
function fmtFull(iso: string)   { const [y,m,d] = iso.split("-").map(Number); return `${MONTHS[m-1]} ${d}, ${y}`; }
function toMMDDYYYY(iso: string){ const [y,m,d] = iso.split("-"); return `${m}/${d}/${y}`; }
function addDays(iso: string, n: number){ const d=new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function getSunday(iso: string){ const d=new Date(iso); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10); }
function isoToBanner(iso: string){ const [,m,d]=iso.split("-").map(Number); return `${m}/${d}`; }
function humanDays(days: number){
  if(days<=0) return "Expired";
  if(days<14) return `${days} day${days!==1?"s":""}`;
  if(days<60) return `${Math.round(days/7)} weeks`;
  if(days<365) return `${Math.round(days/30)} months`;
  return "1 year+";
}
function refillMonth(end: string|null){
  if(!end) return null;
  const d=new Date(end); d.setMonth(d.getMonth()-1);
  return d.toLocaleString("en-US",{month:"long"});
}

const EVENT_CFG: Record<string,{icon:string;color:string;bg:string}> = {
  "grand-bible-seminar": { icon:"✝️", color:"#1D4ED8", bg:"#EFF6FF" },
  "ec-youth-camp":       { icon:"⛺", color:"#15803D", bg:"#F0FDF4" },
  "ya-officer-retreat":  { icon:"🏕️", color:"#7C3AED", bg:"#F5F3FF" },
};

// ── Shared sub-components ──────────────────────────────────
function StatusPill({ status }: { status: DataSource["status"] }) {
  const cfg = {
    active:  { bg:"#DCFCE7", color:GN,       label:"Active" },
    warning: { bg:"#FEF9C3", color:WARN,      label:"Expiring Soon" },
    expired: { bg:"#FEE2E2", color:RED,       label:"Expired" },
    missing: { bg:BL_M,      color:"#1E40AF", label:"Not Set Up" },
  }[status];
  return (
    <span style={{ background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:700,
      padding:"3px 10px", borderRadius:99, whiteSpace:"nowrap" }}>
      {cfg.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status==="active" ? GN : status==="warning" ? WARN : RED;
  return (
    <span style={{ width:8, height:8, borderRadius:"50%", background:color,
      display:"inline-block", flexShrink:0 }} />
  );
}

function ProgressBar({ pct, status }: { pct:number; status:string }) {
  const color = status==="expired" ? RED : status==="warning" ? WARN : BL;
  return (
    <div style={{ background:"#DBEAFE", borderRadius:99, height:6, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,pct)}%`, height:"100%", background:color, borderRadius:99 }} />
    </div>
  );
}

function LiveDot({ color }: { color: string }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:10, height:10, flexShrink:0 }}>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, opacity:0.35,
        animation: color===GN ? "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" : undefined }} />
      <span style={{ position:"relative", width:10, height:10, borderRadius:"50%", background:color }} />
    </span>
  );
}

type UploadStage = "idle" | "parsing" | "review" | "saving" | "done" | "error";

function UploadModal({ name, uploadType, onClose, onSaved }: {
  name: string;
  uploadType: "reading" | "schedule";
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [stage, setStage]       = useState<UploadStage>("idle");
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState<string[]>([]);
  const [rawText, setRawText]   = useState("");
  const [parsedData, setParsedData] = useState<unknown>(null);
  const [error, setError]       = useState("");
  const [showRaw, setShowRaw]   = useState(false);
  const [year, setYear]         = useState(new Date().getFullYear());
  const inputRef = useState<HTMLInputElement | null>(null);

  const ACCEPT = ".pdf,.png,.jpg,.jpeg";

  async function handleFile(f: File) {
    setFile(f);
    setStage("parsing");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("type", uploadType);
      fd.append("year", String(year));
      fd.append("save", "false");
      const res = await fetch("/api/manage/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Parse failed");
      setPreview(json.preview ?? []);
      setRawText(json.rawText ?? "");
      setParsedData(json.data);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  }

  async function handleSave() {
    if (!file || !parsedData) return;
    setStage("saving");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", uploadType);
      fd.append("year", String(year));
      fd.append("save", "true");
      const res = await fetch("/api/manage/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      setStage("done");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:24,
        padding:"28px 24px", maxWidth:480, width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)", maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:"#1E3A8A" }}>
              {stage==="done" ? "✅ Saved!" : `Upload ${name}`}
            </div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>
              Accepts PDF, PNG, or JPG
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#F1F5F9", border:"none", borderRadius:8,
            width:32, height:32, cursor:"pointer", fontSize:16, color:"#64748B" }}>✕</button>
        </div>

        {/* Year selector */}
        {(stage === "idle" || stage === "error") && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16,
            background:BL_L, border:`1.5px solid ${BL_M}`, borderRadius:12, padding:"10px 14px" }}>
            <span style={{ fontSize:13, color:"#1E3A8A", fontWeight:700 }}>Plan year:</span>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              min={2024} max={2040}
              style={{ width:80, border:`1.5px solid ${BL_M}`, borderRadius:8, padding:"4px 8px",
                fontSize:14, color:"#1E3A8A", fontWeight:700, outline:"none", background:"#fff" }} />
          </div>
        )}

        {/* Drop zone — only shown when idle/error */}
        {(stage === "idle" || stage === "error") && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => {
                const el = document.createElement("input");
                el.type = "file"; el.accept = ACCEPT;
                el.onchange = (ev) => {
                  const f = (ev.target as HTMLInputElement).files?.[0];
                  if (f) handleFile(f);
                };
                el.click();
              }}
              style={{ border:`2px dashed ${BL}`, borderRadius:16, padding:"28px 16px",
                textAlign:"center", background:BL_L, marginBottom:16, cursor:"pointer" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
              <div style={{ fontSize:15, color:BL, fontWeight:700 }}>
                Drop a file here, or click to browse
              </div>
              <div style={{ fontSize:12, color:"#94A3B8", marginTop:6 }}>
                PDF · PNG · JPG &nbsp;·&nbsp; Korean or English
              </div>
              {file && (
                <div style={{ marginTop:10, fontSize:12, color:BL, fontWeight:600 }}>
                  Selected: {file.name}
                </div>
              )}
            </div>
            {stage === "error" && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:12,
                padding:"10px 14px", fontSize:13, color:RED, marginBottom:14 }}>
                ⚠️ {error}
              </div>
            )}
          </>
        )}

        {/* Parsing spinner */}
        {stage === "parsing" && (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#1E3A8A", marginBottom:6 }}>
              Reading the file…
            </div>
            <div style={{ fontSize:13, color:"#64748B" }}>
              Running OCR and extracting data. This may take 10–30 seconds.
            </div>
          </div>
        )}

        {/* Review */}
        {stage === "review" && (
          <>
            <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12,
              padding:"10px 14px", fontSize:13, color:GN, marginBottom:14,
              display:"flex", alignItems:"flex-start", gap:8 }}>
              <span>✅</span>
              <span>File parsed successfully. Review what was found below, then click <strong>Save</strong> to apply.</span>
            </div>

            <div style={{ background:BL_L, border:`1px solid ${BL_M}`, borderRadius:12,
              padding:"12px 14px", marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:900, color:BL, textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:8 }}>
                {uploadType === "reading" ? "Parsed Readings (first 10)" : "Parsed Events"}
              </div>
              {preview.map((line, i) => (
                <div key={i} style={{ fontSize:13, color:"#1E3A8A", padding:"3px 0",
                  borderBottom: i < preview.length - 1 ? `1px solid ${BL_M}` : "none" }}>
                  {line}
                </div>
              ))}
              {preview.length === 0 && (
                <div style={{ fontSize:13, color:"#94A3B8", fontStyle:"italic" }}>
                  Nothing detected — try the raw OCR text below to debug.
                </div>
              )}
            </div>

            {/* Raw OCR toggle */}
            <button onClick={() => setShowRaw(v => !v)} style={{
              background:"none", border:"none", color:"#94A3B8", fontSize:12,
              cursor:"pointer", padding:"0 0 10px", textDecoration:"underline" }}>
              {showRaw ? "Hide" : "Show"} raw OCR text
            </button>
            {showRaw && (
              <pre style={{ fontSize:11, color:"#374151", background:"#F8FAFC",
                border:"1px solid #E2E8F0", borderRadius:10, padding:"10px 12px",
                maxHeight:180, overflowY:"auto", marginBottom:14, whiteSpace:"pre-wrap" }}>
                {rawText || "(empty)"}
              </pre>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setStage("idle"); setPreview([]); }} style={{
                flex:1, borderRadius:12, padding:"11px 0", fontSize:14, fontWeight:700,
                cursor:"pointer", background:"#F1F5F9", color:"#475569",
                border:"1.5px solid #E2E8F0" }}>
                Re-upload
              </button>
              <button onClick={handleSave} style={{
                flex:2, borderRadius:12, padding:"11px 0", fontSize:14, fontWeight:800,
                cursor:"pointer", background:BL, color:"#fff", border:"none" }}>
                Save to Bulletin
              </button>
            </div>
          </>
        )}

        {/* Saving */}
        {stage === "saving" && (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>💾</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#1E3A8A" }}>Saving…</div>
          </div>
        )}

        {/* Done */}
        {stage === "done" && (
          <div style={{ textAlign:"center", padding:"16px 0 8px" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:16, color:"#1E3A8A", marginBottom:6 }}>
              Plan saved successfully!
            </div>
            <div style={{ fontSize:13, color:"#64748B", marginBottom:24, lineHeight:1.6 }}>
              The bulletin will now auto-fill from this new plan starting next Sunday.
            </div>
            <button onClick={onClose} style={{ background:BL, color:"#fff", border:"none",
              borderRadius:14, padding:"12px 32px", fontSize:15, fontWeight:800, cursor:"pointer" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PDF-accurate components (mirrors BulletinPreview.tsx) ──
function PdfSecHead({ title }: { title: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6, lineHeight:1 }}>
      <span style={{ color:PDF_BL, fontWeight:700, fontSize:16, fontFamily:PDF_FONT, whiteSpace:"nowrap" }}>
        {title}
      </span>
      <div style={{ flex:1, height:PDF_RULE, background:PDF_BL }} />
    </div>
  );
}

function PdfTH({ children, w }: { children?: React.ReactNode; w?: number }) {
  return (
    <th style={{ color:PDF_BL, fontWeight:700, fontSize:PDF_FS, fontFamily:PDF_FONT,
      textAlign:"center", padding:"2px 3px",
      borderTop:`${PDF_RULE}px solid ${PDF_BL}`, borderBottom:`${PDF_RULE}px solid ${PDF_BL}`,
      whiteSpace:"nowrap", lineHeight:1.25, width:w }}>
      {children}
    </th>
  );
}

function PdfCalGrid({ month, year, banners }: {
  month: number; year: number;
  banners: { label: string; startDate: string; endDate: string }[];
}) {
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const first = new Date(year, month - 1, 1).getDay();
  const days  = new Date(year, month, 0).getDate();
  const prevDays = new Date(year, month - 1, 0).getDate();

  type Cell = { day: number; month: number; outside: boolean };
  const flat: Cell[] = [];
  for (let i = first-1; i >= 0; i--) flat.push({ day: prevDays-i, month: month-1||12, outside:true });
  for (let d = 1; d <= days; d++)    flat.push({ day: d, month, outside:false });
  let nd = 1;
  while (flat.length%7!==0) flat.push({ day: nd++, month: month===12?1:month+1, outside:true });
  const weeks: Cell[][] = [];
  for (let i=0; i<flat.length; i+=7) weeks.push(flat.slice(i,i+7));

  const bVal = (s: string) => { const [bm,bd]=s.split("/").map(Number); return bm*100+bd; };
  const inB  = (b: typeof banners[0], cell: Cell) => {
    const cur = cell.month*100+cell.day;
    return cur >= bVal(b.startDate) && cur <= bVal(b.endDate);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", fontFamily:PDF_FONT }}>
      {DOW.map((d,i) => (
        <div key={d} style={{ gridRow:1, textAlign:"center", fontWeight:700, fontSize:9,
          color: i===6 ? "#2E74B5" : PDF_BL, padding:"3px 0", lineHeight:1,
          borderTop:`${PDF_RULE}px solid ${PDF_BL}`, borderBottom:`${PDF_RULE}px solid ${PDF_BL}`,
          borderLeft: i===0 ? `${PDF_RULE}px solid ${PDF_BL}` : "none",
          borderRight:`${PDF_RULE}px solid ${PDF_BL}` }}>
          {d}
        </div>
      ))}
      {weeks.map((week, wi) => {
        const gridRow = wi+2;
        const seenBanners = new Set<typeof banners[0]>();
        const rowBanners = banners.filter(b => {
          if (seenBanners.has(b)) return false;
          if (week.some(cell => inB(b, cell))) { seenBanners.add(b); return true; }
          return false;
        });
        return (
          <Fragment key={`w${wi}`}>
            {week.map((cell, di) => (
              <div key={di} style={{ gridRow, gridColumn:di+1,
                height:72, padding:"2px 3px", overflow:"hidden",
                background: cell.outside ? "#FAFAFA" : "#fff",
                borderBottom:`${PDF_RULE}px solid ${PDF_BL}`,
                borderLeft: di===0 ? `${PDF_RULE}px solid ${PDF_BL}` : "none",
                borderRight:`${PDF_RULE}px solid ${PDF_BL}` }}>
                <div style={{ fontWeight:700, fontSize:10, lineHeight:1.2,
                  color: cell.outside ? "#ccc" : PDF_GR }}>
                  {cell.day===1 ? `${cell.month}/1` : cell.day}
                </div>
              </div>
            ))}
            {rowBanners.map((banner, bi) => {
              const startCol = week.findIndex(cell => inB(banner,cell));
              const count    = week.filter(cell => inB(banner,cell)).length;
              if (startCol<0||count===0) return null;
              return (
                <div key={bi} style={{ gridRow, gridColumn:`${startCol+1} / span ${count}`,
                  alignSelf:"end", zIndex:1, height:14, overflow:"hidden",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:"#D6E8F7", border:`${PDF_RULE}px solid ${PDF_BL}` }}>
                  <span style={{ fontSize:10, color:PDF_BL, fontWeight:700, whiteSpace:"nowrap" }}>
                    {banner.label}
                  </span>
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}

// ── Section: Overview ──────────────────────────────────────
function OverviewSection({ readingSrc, scheduleSrc, today, onNav }:{
  readingSrc: DataSource|null;
  scheduleSrc: ScheduleSource|null;
  today: string;
  onNav: (s: Section) => void;
}) {
  const allSrcs = [readingSrc, scheduleSrc].filter(Boolean) as (DataSource|ScheduleSource)[];
  const problems = allSrcs.filter(s => s.status==="warning"||s.status==="expired"||s.status==="missing");
  const allGood  = problems.length===0;

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:900, color:"#1E3A8A", margin:"0 0 4px" }}>Overview</h1>
      <p style={{ fontSize:13, color:"#64748B", margin:"0 0 24px" }}>
        Status of all automated data sources for the bulletin.
      </p>

      {/* Overall status banner */}
      <div style={{ background: allGood ? "#F0FDF4" : problems.some(p=>p.status==="expired"||p.status==="missing") ? "#FEF2F2" : "#FFFBEB",
        border:`1.5px solid ${allGood ? "#BBF7D0" : problems.some(p=>p.status==="expired"||p.status==="missing") ? "#FECACA" : "#FDE68A"}`,
        borderRadius:14, padding:"14px 18px", marginBottom:24,
        display:"flex", alignItems:"center", gap:14 }}>
        <span style={{ fontSize:28, flexShrink:0 }}>{allGood ? "🟢" : problems.some(p=>p.status==="expired"||p.status==="missing") ? "🔴" : "🟡"}</span>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:"#0F172A" }}>
            {allGood ? "Everything is running automatically"
              : `${problems.length} source${problems.length>1?"s":""} need${problems.length===1?"s":""} your attention`}
          </div>
          <div style={{ fontSize:13, color:"#64748B", marginTop:3, lineHeight:1.6 }}>
            {allGood ? "The bulletin updates on its own each week. No action needed right now."
              : "Review the sections below and upload any missing plans."}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background:BL, borderRadius:16, padding:"20px 22px", marginBottom:24 }}>
        <div style={{ fontWeight:900, fontSize:14, color:"#fff", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
          💡 How this works
        </div>
        {[
          { icon:"📅", title:"Updates automatically each week",
            desc:"Set the correct date in the Header tab — Bible readings and events fill in on their own." },
          { icon:"✍️", title:"You can always edit by hand",
            desc:"Go to the Bible Reading tab in the editor to change any entry. Automation is a starting point, not a lock." },
          { icon:"🔄", title:"Refill once a year (or per quarter)",
            desc:"Come back here when the countdown gets low and upload the next schedule." },
        ].map(it => (
          <div key={it.title} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:"rgba(255,255,255,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
              {it.icon}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#fff" }}>{it.title}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginTop:2, lineHeight:1.6 }}>{it.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {readingSrc && (
          <button onClick={()=>onNav("reading")} style={{ textAlign:"left", cursor:"pointer",
            background:"#fff", border:`1.5px solid ${BL_M}`, borderRadius:14,
            padding:"16px 18px", boxShadow:"0 1px 3px rgba(68,114,196,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:20 }}>📖</span>
              <StatusPill status={readingSrc.status} />
            </div>
            <div style={{ fontWeight:800, fontSize:14, color:"#1E3A8A", marginBottom:4 }}>Bible Reading</div>
            <div style={{ fontSize:12, color:"#64748B" }}>
              {readingSrc.status==="missing" ? "No plan loaded" :
               readingSrc.status==="expired" ? "Plan expired" :
               `${humanDays(readingSrc.daysRemaining)} remaining`}
            </div>
          </button>
        )}
        {scheduleSrc && (
          <button onClick={()=>onNav("schedule")} style={{ textAlign:"left", cursor:"pointer",
            background:"#fff", border:`1.5px solid ${BL_M}`, borderRadius:14,
            padding:"16px 18px", boxShadow:"0 1px 3px rgba(68,114,196,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:20 }}>🗓️</span>
              <StatusPill status={scheduleSrc.status} />
            </div>
            <div style={{ fontWeight:800, fontSize:14, color:"#1E3A8A", marginBottom:4 }}>Monthly Schedule</div>
            <div style={{ fontSize:12, color:"#64748B" }}>
              {scheduleSrc.status==="missing" ? "No schedule loaded" :
               scheduleSrc.status==="expired" ? "Schedule expired" :
               `${humanDays(scheduleSrc.daysRemaining)} remaining`}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section: Bible Reading ─────────────────────────────────
function ReadingSection({ src, onRefresh }: { src: DataSource; onRefresh: () => void }) {
  const [showUpload, setShowUpload] = useState(false);
  const rm = refillMonth(src.endDate);

  return (
    <>
      {showUpload && <UploadModal name="Bible Reading Plan" uploadType="reading" onClose={()=>setShowUpload(false)} onSaved={()=>{setShowUpload(false);onRefresh();}} />}
      <div>
        <h1 style={{ fontSize:22, fontWeight:900, color:"#1E3A8A", margin:"0 0 4px" }}>Bible Reading</h1>
        <p style={{ fontSize:13, color:"#64748B", margin:"0 0 24px", lineHeight:1.6 }}>
          The reading plan that auto-fills each week. Covers both reading speeds —
          <strong> 1 Reading</strong> (standard pace) and <strong>2 Readings</strong> (accelerated pace) — from the same plan file.
        </p>

        <div style={{ background:"#fff", border:`1.5px solid ${BL_M}`, borderRadius:16,
          overflow:"hidden", boxShadow:"0 1px 3px rgba(68,114,196,0.06)" }}>
          <div style={{ height:4, background: src.status==="missing" ? BL_M : src.status==="expired" ? RED : src.status==="warning" ? WARN : BL }} />
          <div style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:"#1E3A8A" }}>Year Reading Plan</div>
                <div style={{ fontSize:13, color:"#64748B", marginTop:2 }}>year_reading_plan.json</div>
              </div>
              <StatusPill status={src.status} />
            </div>

            {src.status==="missing" ? (
              <div style={{ background:BL_L, borderRadius:12, padding:"14px 16px",
                fontSize:13, color:"#3B5E9E", lineHeight:1.7, marginBottom:16 }}>
                No reading plan loaded yet. Once added, readings will fill in automatically each week for both the 1 Reading and 2 Readings rows.
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, color:"#64748B" }}>{fmtFull(src.startDate!)} → {fmtFull(src.endDate!)}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:BL }}>{src.percentUsed}% used</span>
                </div>
                <ProgressBar pct={src.percentUsed} status={src.status} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <LiveDot color={src.status==="active" ? GN : src.status==="warning" ? WARN : RED} />
                    <span style={{ fontSize:13, color:"#64748B" }}>
                      {src.status==="expired" ? "Plan expired" : "Refill in about"}
                    </span>
                  </div>
                  <span style={{ fontSize:18, fontWeight:900,
                    color:src.status==="expired" ? RED : src.status==="warning" ? WARN : GN }}>
                    {humanDays(src.daysRemaining)}
                  </span>
                </div>

                {src.status==="active" && rm && (
                  <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12,
                    padding:"10px 14px", fontSize:13, color:GN, display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                    <span>✅</span>
                    <span>All good — come back in <strong>{rm}</strong> to upload next year's plan.</span>
                  </div>
                )}
                {src.status==="warning" && (
                  <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12,
                    padding:"10px 14px", fontSize:13, color:WARN, display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                    <span>⏰</span>
                    <span>Plan ends {fmtFull(src.endDate!)}. Upload the next year's plan by <strong>{rm}</strong>.</span>
                  </div>
                )}
                {src.status==="expired" && (
                  <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:12,
                    padding:"10px 14px", fontSize:13, color:RED, display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                    <span>🚨</span>
                    <span>Plan expired — readings won't auto-update until a new plan is uploaded.</span>
                  </div>
                )}
              </>
            )}

            <button onClick={()=>setShowUpload(true)} style={{
              width:"100%", borderRadius:12, padding:"11px 16px",
              fontSize:14, fontWeight:700, cursor:"pointer",
              background: src.status==="missing" ? BL : BL_L,
              color: src.status==="missing" ? "#fff" : src.status==="expired" ? RED : BL,
              border:`1.5px solid ${src.status==="missing" ? BL : src.status==="expired" ? "#FECACA" : BL_M}`,
            }}>
              {src.status==="missing" ? "＋ Add Reading Plan" : src.status==="expired" ? "🔄 Upload New Plan Now" : "Upload Next Year's Plan"}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

// ── Section: Monthly Schedule ──────────────────────────────
function ScheduleSection({ src, today, onRefresh }: { src: ScheduleSource; today: string; onRefresh: () => void }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      {showUpload && <UploadModal name="Monthly Schedule" uploadType="schedule" onClose={()=>setShowUpload(false)} onSaved={()=>{setShowUpload(false);onRefresh();}} />}
      <div>
        <h1 style={{ fontSize:22, fontWeight:900, color:"#1E3A8A", margin:"0 0 4px" }}>Monthly Schedule</h1>
        <p style={{ fontSize:13, color:"#64748B", margin:"0 0 24px", lineHeight:1.6 }}>
          Quarterly event schedule — Grand Bible Seminar, EC Youth Camp, YA Officer Retreat.
          Events auto-populate the bulletin calendar each month.
        </p>

        <div style={{ background:"#fff", border:`1.5px solid ${BL_M}`, borderRadius:16,
          overflow:"hidden", boxShadow:"0 1px 3px rgba(68,114,196,0.06)", marginBottom:16 }}>
          <div style={{ height:4, background: src.status==="missing" ? BL_M : src.status==="expired" ? RED : src.status==="warning" ? WARN : BL }} />
          <div style={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:"#1E3A8A" }}>
                  {src.quarter ?? "Schedule"}
                </div>
                <div style={{ fontSize:13, color:"#64748B", marginTop:2 }}>monthly_schedule.json</div>
              </div>
              <StatusPill status={src.status} />
            </div>

            {src.status==="missing" ? (
              <div style={{ background:BL_L, borderRadius:12, padding:"14px 16px",
                fontSize:13, color:"#3B5E9E", lineHeight:1.7, marginBottom:16 }}>
                No monthly schedule uploaded yet. Once added, calendar events auto-populate each month.
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, color:"#64748B" }}>{fmtFull(src.startDate!)} → {fmtFull(src.endDate!)}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:BL }}>{src.percentUsed}% used</span>
                </div>
                <ProgressBar pct={src.percentUsed} status={src.status} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <LiveDot color={src.status==="active" ? GN : src.status==="warning" ? WARN : RED} />
                    <span style={{ fontSize:13, color:"#64748B" }}>
                      {src.status==="expired" ? "Schedule ended" : "Refill in about"}
                    </span>
                  </div>
                  <span style={{ fontSize:18, fontWeight:900,
                    color:src.status==="expired" ? RED : src.status==="warning" ? WARN : GN }}>
                    {humanDays(src.daysRemaining)}
                  </span>
                </div>
              </>
            )}

            <button onClick={()=>setShowUpload(true)} style={{
              width:"100%", borderRadius:12, padding:"11px 16px",
              fontSize:14, fontWeight:700, cursor:"pointer",
              background: src.status==="missing" ? BL : BL_L,
              color: src.status==="missing" ? "#fff" : src.status==="expired" ? RED : BL,
              border:`1.5px solid ${src.status==="missing" ? BL : src.status==="expired" ? "#FECACA" : BL_M}`,
            }}>
              {src.status==="missing" ? "＋ Add Monthly Schedule" : src.status==="expired" ? "🔄 Upload Next Quarter Now" : "Upload Next Quarter"}
            </button>
          </div>
        </div>

        {/* Events list */}
        {src.events.length > 0 && (
          <>
            <p style={{ fontSize:11, fontWeight:900, color:BL, textTransform:"uppercase",
              letterSpacing:"0.1em", marginBottom:10 }}>
              Events ({src.events.length})
            </p>
            {src.events.map(ev => {
              const cfg = EVENT_CFG[ev.type] ?? { icon:"📌", color:"#374151", bg:"#F9FAFB" };
              const isPast = today > ev.endDate;
              const isNow  = today >= ev.startDate && today <= ev.endDate;
              const daysUntil = Math.ceil((new Date(ev.startDate).getTime()-new Date(today).getTime())/86400000);
              return (
                <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"12px 14px", borderRadius:14, marginBottom:10,
                  background: isNow ? BL_M : "#fff",
                  border:`1.5px solid ${isNow ? "#93C5FD" : BL_M}`,
                  opacity: isPast ? 0.45 : 1 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:cfg.bg,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#1E3A8A" }}>{ev.label}</span>
                      {isNow && <span style={{ background:BL, color:"#fff", fontSize:10, fontWeight:800,
                        padding:"2px 8px", borderRadius:99 }}>HAPPENING NOW</span>}
                      {isPast && <span style={{ background:"#E2E8F0", color:"#94A3B8", fontSize:10, fontWeight:700,
                        padding:"2px 8px", borderRadius:99 }}>PAST</span>}
                    </div>
                    <div style={{ fontSize:12, color:BL, marginTop:2 }}>
                      {fmtShort(ev.startDate)} – {fmtShort(ev.endDate)}
                      {ev.location && <span style={{ color:"#94A3B8" }}> · {ev.location}</span>}
                      {ev.pastor && <span style={{ color:"#94A3B8" }}> · {ev.pastor}</span>}
                    </div>
                  </div>
                  {!isPast && !isNow && (
                    <span style={{ fontSize:13, fontWeight:700, flexShrink:0, color: daysUntil<=14 ? WARN : BL }}>
                      {daysUntil<=0 ? "Today" : `in ${humanDays(daysUntil)}`}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

// ── Section: Test Preview ──────────────────────────────────
function PreviewSection({ scheduleEvents }: { scheduleEvents: ScheduleEvent[] }) {
  const todayIso = new Date().toISOString().slice(0,10);
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [readings, setReadings] = useState<{dates:string[];reading1:string[]}|null>(null);
  const [loading, setLoading] = useState(false);

  const sundayIso = getSunday(selectedIso);
  const weekEnd   = addDays(sundayIso, 6);
  const [selYear, selMonth] = selectedIso.split("-").map(Number);

  const banners = scheduleEvents.map(ev => ({
    label: ev.label,
    startDate: isoToBanner(ev.startDate),
    endDate:   isoToBanner(ev.endDate),
  }));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/auto-populate?date=${encodeURIComponent(toMMDDYYYY(selectedIso))}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setReadings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedIso]);

  const jump = (n: number) => {
    const d = new Date(selectedIso); d.setDate(d.getDate()+n);
    setSelectedIso(d.toISOString().slice(0,10));
  };

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:900, color:"#1E3A8A", margin:"0 0 4px" }}>Test Preview</h1>
      <p style={{ fontSize:13, color:"#64748B", margin:"0 0 24px", lineHeight:1.6 }}>
        See exactly how the bulletin will look for any week — same layout as the real PDF.
      </p>

      {/* Date nav */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        {([["This week",0],["Next week",7],["+2 weeks",14],["+1 month",30]] as [string,number][]).map(([lbl,d]) => (
          <button key={lbl} onClick={()=> d===0 ? setSelectedIso(todayIso) : jump(d)}
            style={{ background:(d===0&&selectedIso===todayIso)?BL:BL_L,
              color:(d===0&&selectedIso===todayIso)?"#fff":BL,
              border:`1.5px solid ${(d===0&&selectedIso===todayIso)?BL:BL_M}`,
              borderRadius:10, padding:"7px 14px", fontSize:13, fontWeight:700,
              cursor:"pointer", whiteSpace:"nowrap" }}>
            {lbl}
          </button>
        ))}
        <input type="date" value={selectedIso} onChange={e => e.target.value && setSelectedIso(e.target.value)}
          style={{ border:`1.5px solid ${BL_M}`, borderRadius:10, padding:"7px 10px",
            fontSize:13, color:"#1E3A8A", background:BL_L, outline:"none" }} />
      </div>

      <div style={{ fontSize:11, fontWeight:800, color:BL, textTransform:"uppercase" as const,
        letterSpacing:"0.08em", marginBottom:18 }}>
        Week of {fmtShort(sundayIso)} – {fmtShort(weekEnd)}, {sundayIso.slice(0,4)}
      </div>

      {/* Bible Reading — PDF accurate */}
      <div style={{ background:"#fff", border:`1.5px solid ${BL_M}`, borderRadius:16,
        padding:"16px 18px", marginBottom:16, boxShadow:"0 1px 3px rgba(68,114,196,0.05)" }}>
        <PdfSecHead title="Bible Reading" />
        {loading ? (
          <div style={{ color:"#94A3B8", fontSize:13, padding:"8px 0" }}>Loading…</div>
        ) : readings ? (
          <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontFamily:PDF_FONT }}>
            <thead>
              <tr>
                <PdfTH w={38}>Date</PdfTH>
                {readings.dates.map((d,i) => <PdfTH key={i}>{d}</PdfTH>)}
              </tr>
            </thead>
            <tbody>
              {([["1\nReading", readings.reading1],
                 ["2\nReadings", Array(7).fill("")],
              ] as [string,string[]][]).map(([lbl,vals]) => (
                <tr key={lbl}>
                  <td style={{ color:PDF_BL, fontWeight:700, fontSize:PDF_FS,
                    padding:"2px 3px 2px 0", whiteSpace:"pre-line",
                    verticalAlign:"top", lineHeight:1.2, width:38,
                    borderBottom:`0.5px solid ${PDF_BL}`, fontFamily:PDF_FONT }}>
                    {lbl}
                  </td>
                  {vals.map((v,i) => (
                    <td key={i} style={{ fontSize:PDF_FS, textAlign:"center",
                      verticalAlign:"top", padding:"2px 2px 2px 0", whiteSpace:"pre-line",
                      borderBottom:`0.5px solid ${PDF_BL}`, color:PDF_GR,
                      lineHeight:1.25, fontFamily:PDF_FONT }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color:"#94A3B8", fontSize:13 }}>No reading plan loaded.</div>
        )}
      </div>

      {/* Monthly Calendar — PDF accurate */}
      <div style={{ background:"#fff", border:`1.5px solid ${BL_M}`, borderRadius:16,
        padding:"16px 18px", boxShadow:"0 1px 3px rgba(68,114,196,0.05)" }}>
        <PdfSecHead title={`${MONTHS[selMonth-1]} ${selYear}`} />
        <PdfCalGrid month={selMonth} year={selYear} banners={banners} />
        {banners.length===0 && (
          <div style={{ marginTop:8, fontSize:12, color:"#94A3B8", fontStyle:"italic" }}>
            No schedule loaded — upload a monthly schedule to see events here.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar nav ────────────────────────────────────────────
type Section = "overview" | "reading" | "schedule" | "preview";

function NavItem({ label, icon, active, onClick, dotStatus }:{
  label: string; icon: string; active: boolean;
  onClick: ()=>void; dotStatus?: string;
}) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:10, width:"100%",
      padding:"9px 12px", borderRadius:8, border:"none", cursor:"pointer",
      background: active ? BL_L : "transparent",
      borderLeft: `3px solid ${active ? BL : "transparent"}`,
      color: active ? BL : "#64748B",
      fontWeight: active ? 700 : 500, fontSize:14, textAlign:"left",
      transition:"background 0.15s, color 0.15s",
    }}>
      <span style={{ fontSize:16, width:22, textAlign:"center", flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
      {dotStatus && dotStatus!=="active" && <StatusDot status={dotStatus} />}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function ManagePage() {
  const [section, setSection]       = useState<Section>("overview");
  const [readingSrc, setReadingSrc] = useState<DataSource|null>(null);
  const [scheduleSrc, setScheduleSrc] = useState<ScheduleSource|null>(null);
  const [today, setToday]           = useState("");
  const [loading, setLoading]       = useState(true);

  function loadData() {
    setLoading(true);
    fetch("/api/manage")
      .then(r=>r.json())
      .then(({ readingSources, scheduleSrc, today }) => {
        setReadingSrc(readingSources[0] ?? null);
        setScheduleSrc(scheduleSrc);
        setToday(today);
        setLoading(false);
      });
  }

  useEffect(() => { loadData(); }, []);

  return (
    <>
      <style>{`
        @keyframes ping { 75%,100%{ transform:scale(2); opacity:0; } }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh",
        fontFamily:"'Segoe UI', system-ui, -apple-system, sans-serif",
        background:"#F8FAFD" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width:220, flexShrink:0, background:"#fff",
          borderRight:"1px solid #E2E8F0", display:"flex", flexDirection:"column",
          position:"sticky", top:0, height:"100vh", overflow:"hidden" }}>

          {/* Logo + title */}
          <div style={{ padding:"16px 16px 14px", borderBottom:"1px solid #F1F5F9", flexShrink:0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ height:32, width:32, objectFit:"contain", marginBottom:8 }} />
            <div style={{ fontWeight:900, fontSize:14, color:"#1E3A8A",
              letterSpacing:"-0.02em", lineHeight:1.2 }}>
              NEW YORK CHURCH
            </div>
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>Automation Manager</div>
          </div>

          {/* Nav items */}
          <nav style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:2, overflow:"auto" }}>
            <div style={{ fontSize:10, fontWeight:900, color:"#CBD5E1", textTransform:"uppercase",
              letterSpacing:"0.08em", padding:"8px 12px 4px" }}>
              General
            </div>
            <NavItem icon="🏠" label="Overview" active={section==="overview"} onClick={()=>setSection("overview")} />

            <div style={{ fontSize:10, fontWeight:900, color:"#CBD5E1", textTransform:"uppercase",
              letterSpacing:"0.08em", padding:"12px 12px 4px" }}>
              Data Sources
            </div>
            <NavItem icon="📖" label="Bible Reading" active={section==="reading"}
              onClick={()=>setSection("reading")} dotStatus={readingSrc?.status} />
            <NavItem icon="🗓️" label="Monthly Schedule" active={section==="schedule"}
              onClick={()=>setSection("schedule")} dotStatus={scheduleSrc?.status} />

            <div style={{ fontSize:10, fontWeight:900, color:"#CBD5E1", textTransform:"uppercase",
              letterSpacing:"0.08em", padding:"12px 12px 4px" }}>
              Tools
            </div>
            <NavItem icon="🧪" label="Test Preview" active={section==="preview"} onClick={()=>setSection("preview")} />
          </nav>

          {/* Back to editor */}
          <div style={{ padding:"12px 8px", borderTop:"1px solid #F1F5F9", flexShrink:0 }}>
            <Link href="/" style={{ display:"flex", alignItems:"center", gap:8,
              padding:"9px 12px", borderRadius:8, textDecoration:"none",
              color:"#64748B", fontSize:14, fontWeight:500,
              transition:"background 0.15s",
            }}
            onMouseEnter={e=>(e.currentTarget.style.background=BL_L)}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
              <span style={{ fontSize:16 }}>←</span>
              <span>Back to Editor</span>
            </Link>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex:1, padding:"36px 40px", overflowY:"auto", minHeight:"100vh" }}>
          {loading ? (
            <div style={{ color:"#94A3B8", fontSize:14, paddingTop:40 }}>Loading…</div>
          ) : (
            <>
              {section==="overview" && (
                <OverviewSection
                  readingSrc={readingSrc}
                  scheduleSrc={scheduleSrc}
                  today={today}
                  onNav={setSection}
                />
              )}
              {section==="reading" && readingSrc && <ReadingSection src={readingSrc} onRefresh={loadData} />}
              {section==="schedule" && scheduleSrc && <ScheduleSection src={scheduleSrc} today={today} onRefresh={loadData} />}
              {section==="preview" && <PreviewSection scheduleEvents={scheduleSrc?.events ?? []} />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
