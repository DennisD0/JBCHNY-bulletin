"use client";


// ── Inline-editable text primitive ────────────────────────────────────────────
// Renders as contenteditable when onSave is provided, with a blue focus ring.
// dangerouslySetInnerHTML prevents React from resetting the cursor while typing.
export function E({
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

// ── Pending section diff badge + popup ─────────────────────────────────────────
