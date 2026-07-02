import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

const PATH = join(process.cwd(), "data", "comments.json");

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
  const body = await req.json() as Partial<BulletinComment>;
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
  const body = await req.json() as { id: string; reply?: { author: string; text: string }; resolved?: boolean };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const all = read();
  const idx = all.findIndex(c => c.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.reply) {
    all[idx].replies.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, author: body.reply.author, text: body.reply.text.trim(), createdAt: Date.now() });
  }
  if (typeof body.resolved === "boolean") all[idx].resolved = body.resolved;
  write(all);
  return NextResponse.json(all[idx]);
}

export async function DELETE(req: Request) {
  const { id } = await req.json() as { id: string };
  const all = read().filter(c => c.id !== id);
  write(all);
  return NextResponse.json({ ok: true });
}
