"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import type { BulletinComment } from "@/app/api/comments/route";

export function CommentPin({
  x,
  y,
  label,
  active = false,
  onClick,
}: {
  x: number;
  y: number;
  label?: string;
  active?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const marker = (
    <svg aria-hidden="true" width="32" height="40" viewBox="0 0 32 40" style={{ display: "block", overflow: "visible" }}>
      <path
        d="M16 39C14.2 34.2 3 26.3 3 16A13 13 0 0 1 29 16C29 26.3 17.8 34.2 16 39Z"
        fill="#4472C4"
        stroke="#fff"
        strokeWidth="2"
        style={{
          filter: active
            ? "drop-shadow(0 0 4px rgba(68,114,196,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.45))"
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
        }}
      />
      {label && (
        <text x="16" y="16.5" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontWeight="900" fontFamily="inherit">
          {label}
        </text>
      )}
    </svg>
  );
  const sharedStyle: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: 32,
    height: 40,
    padding: 0,
    border: 0,
    background: "transparent",
    transform: "translate(-50%, -100%)",
  };

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={`Open comment by ${label || "Editor"}`}
        onClick={onClick}
        style={{ ...sharedStyle, cursor: "pointer", pointerEvents: "all" }}
      >
        {marker}
      </button>
    );
  }

  return <div style={{ ...sharedStyle, pointerEvents: "none" }}>{marker}</div>;
}

export function CommentThreadPanel({ comment, style, onReply, onResolve, onClose }: {
  comment: BulletinComment;
  style: React.CSSProperties;
  onReply: (text: string) => void;
  onResolve: () => void;
  onClose: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const submit = () => {
    if (!replyText.trim()) return;
    onReply(replyText);
    setReplyText("");
  };
  const fmt = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });

  return (
    <div style={{
      width: 260,
      background: "rgba(10,15,30,0.92)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      overflow: "hidden",
      ...style,
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px 8px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <span style={{ color:"rgba(255,255,255,0.5)", fontSize:10.5 }}>{fmt(comment.createdAt)}</span>
        <div style={{ display:"flex", gap:6 }}>
          {!comment.resolved && (
            <button type="button" onClick={onResolve} title="Resolve" style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, color:"rgba(255,255,255,0.6)", cursor:"pointer", padding:"2px 7px", fontSize:10.5, display:"flex", alignItems:"center", gap:4 }}>
              <Check size={11} /> Resolve
            </button>
          )}
          <button type="button" onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 2px" }}>×</button>
        </div>
      </div>
      {/* Thread */}
      <div style={{ maxHeight: 240, overflowY:"auto", padding:"10px 14px" }}>
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
            <div style={{ width:22, height:22, borderRadius:"50%", background:"#4472C4", display:"grid", placeItems:"center", fontSize:10, fontWeight:900, color:"#fff", flexShrink:0 }}>
              {comment.author.charAt(0).toUpperCase()}
            </div>
            <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{comment.author}</span>
          </div>
          <p style={{ color:"rgba(255,255,255,0.82)", fontSize:12.5, margin:"0 0 0 29px", lineHeight:1.5 }}>{comment.text}</p>
        </div>
        {comment.replies.map(r => (
          <div key={r.id} style={{ marginBottom:8, paddingLeft:29 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(68,114,196,0.5)", display:"grid", placeItems:"center", fontSize:9, fontWeight:900, color:"#fff", flexShrink:0 }}>
                {r.author.charAt(0).toUpperCase()}
              </div>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700 }}>{r.author}</span>
            </div>
            <p style={{ color:"rgba(255,255,255,0.72)", fontSize:12, margin:0, lineHeight:1.5 }}>{r.text}</p>
          </div>
        ))}
      </div>
      {/* Reply input */}
      {!comment.resolved && (
        <div style={{ padding:"8px 14px 12px", borderTop:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", gap:7, alignItems:"flex-end" }}>
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="Reply…"
              style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, color:"#fff", fontSize:12, padding:"6px 9px", outline:"none", fontFamily:"inherit" }}
            />
            <button type="button" onClick={submit} disabled={!replyText.trim()} style={{ padding:"6px 8px", borderRadius:7, border:"none", background:"#4472C4", color:"#fff", cursor:"pointer", opacity:replyText.trim()?1:0.5, display:"flex", alignItems:"center" }}>
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
      {comment.resolved && (
        <div style={{ padding:"8px 14px 10px", textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:11 }}>Resolved</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// Layout: [framer sidebar hover-expand] [slide-in form panel] [Miro canvas]
// ---------------------------------------------------------------------------
