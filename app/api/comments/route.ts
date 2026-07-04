import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextResponse } from "next/server";

const PATH = join(tmpdir(), "bulletin-comments.json");

export type CommentReply = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

export type BulletinComment = {
  id: string;
  rx: number;    // 0-1 fraction of PAGE_W (1344)
  ry: number;    // 0-1 fraction of total two-page height (816*2+4 = 1636)
  author: string;
  text: string;
  createdAt: number;
  replies: CommentReply[];
  resolved: boolean;
};

// NOTE: read()/write() are a non-atomic read-modify-write on a single JSON file.
// This is safe only because the app deploys to Cloud Run / a single VM with one
// Node process (--max-instances 1), so mutations are effectively serialized by the
// single-threaded event loop between awaits. Do NOT scale to multiple instances
// without moving comments to an atomic store.
function read(): BulletinComment[] {
  try { return JSON.parse(readFileSync(PATH, "utf-8")); } catch { return []; }
}
function write(c: BulletinComment[]) {
  writeFileSync(PATH, `${JSON.stringify(c, null, 2)}\n`, "utf-8");
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: Request) {
  let body: Partial<BulletinComment>;
  try {
    body = await req.json() as Partial<BulletinComment>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.rx !== "number" || typeof body.ry !== "number" || !body.text?.trim() || !body.author) {
    return NextResponse.json({ error: "rx, ry, text, author required" }, { status: 400 });
  }
  const comment: BulletinComment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rx: body.rx, ry: body.ry,
    author: body.author,
    text: body.text.trim(),
    createdAt: Date.now(),
    replies: [],
    resolved: false,
  };
  const all = read();
  all.push(comment);
  write(all);
  return NextResponse.json(comment, { status: 201 });
}

export async function PATCH(req: Request) {
  let body: { id: string; reply?: { author: string; text: string }; resolved?: boolean };
  try {
    body = await req.json() as { id: string; reply?: { author: string; text: string }; resolved?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const all = read();
  const idx = all.findIndex(c => c.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.reply) {
    if (!body.reply.author || !body.reply.text?.trim()) {
      return NextResponse.json({ error: "reply.author and reply.text required" }, { status: 400 });
    }
    all[idx].replies.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, author: body.reply.author, text: body.reply.text.trim(), createdAt: Date.now() });
  }
  if (typeof body.resolved === "boolean") all[idx].resolved = body.resolved;
  write(all);
  return NextResponse.json(all[idx]);
}

export async function DELETE(req: Request) {
  let id: string | undefined;
  try { ({ id } = await req.json() as { id: string }); } catch { /* malformed/empty body */ }
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const all = read().filter(c => c.id !== id);
  write(all);
  return NextResponse.json({ ok: true });
}
