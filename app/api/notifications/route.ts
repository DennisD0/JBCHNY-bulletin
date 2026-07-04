import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextResponse } from "next/server";
import { isBulletinLanguage, type BulletinLanguage, type LanguageLocks } from "@/lib/bulletin-languages";

const PATH = join(tmpdir(), "bulletin-notifications.json");
const LOCKS_PATH = join(tmpdir(), "bulletin-locks.json");
const MAX_AGE_MS = 60 * 60 * 1000; // prune notifications older than 1 hour

function readLocks(): LanguageLocks {
  try {
    return JSON.parse(readFileSync(LOCKS_PATH, "utf-8")) as LanguageLocks;
  } catch {
    return { en: null, ko: null, es: null, zh: null, ru: null };
  }
}

export type AppNotification = {
  id: string;
  type: "takeover_request" | "join_request";
  lang: BulletinLanguage;
  fromSessionId: string;
  fromUserName: string;
  targetSessionId: string;
  createdAt: number;
  status: "pending" | "accepted" | "declined";
};

function read(): AppNotification[] {
  try {
    return JSON.parse(readFileSync(PATH, "utf-8")) as AppNotification[];
  } catch {
    return [];
  }
}

function write(notifications: AppNotification[]) {
  const fresh = notifications.filter((n) => Date.now() - n.createdAt < MAX_AGE_MS);
  writeFileSync(PATH, `${JSON.stringify(fresh, null, 2)}\n`, "utf-8");
}

// GET /api/notifications?sessionId=xxx
// Returns notifications relevant to the caller (as sender or target).
// Auto-declines any pending request whose target session no longer holds the lock.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const all = read();
  const locks = readLocks();
  let dirty = false;

  for (const n of all) {
    if (n.status !== "pending") continue;
    const currentHolder = locks[n.lang]?.sessionId ?? null;
    if (currentHolder !== n.targetSessionId) {
      n.status = "declined";
      dirty = true;
    }
  }
  if (dirty) write(all);

  const relevant = all.filter(
    (n) => n.fromSessionId === sessionId || n.targetSessionId === sessionId,
  );
  return NextResponse.json(relevant);
}

// POST /api/notifications — create an access request
export async function POST(request: Request) {
  const body = await request.json() as Partial<AppNotification>;
  if (
    (body.type !== "takeover_request" && body.type !== "join_request") ||
    !body.lang || !isBulletinLanguage(body.lang) ||
    !body.fromSessionId || !body.targetSessionId
  ) {
    return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
  }

  const notifications = read();

  // De-dup: only one pending request per (from, lang) pair
  const existing = notifications.find(
    (n) =>
      n.type === body.type &&
      n.fromSessionId === body.fromSessionId &&
      n.lang === body.lang &&
      n.status === "pending",
  );
  if (existing) return NextResponse.json(existing);

  const notification: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: body.type,
    lang: body.lang,
    fromSessionId: body.fromSessionId,
    fromUserName: body.fromUserName?.trim() || "Editor",
    targetSessionId: body.targetSessionId,
    createdAt: Date.now(),
    status: "pending",
  };
  notifications.push(notification);
  write(notifications);
  return NextResponse.json(notification, { status: 201 });
}

// DELETE /api/notifications — a sender withdraws their own pending request
export async function DELETE(request: Request) {
  const { id, sessionId } = await request.json() as { id: string; sessionId: string };
  if (!id || !sessionId) {
    return NextResponse.json({ error: "id and sessionId required" }, { status: 400 });
  }
  const notifications = read();
  const next = notifications.filter((n) => !(n.id === id && n.fromSessionId === sessionId));
  write(next);
  return NextResponse.json({ ok: true });
}

// PATCH /api/notifications — update status (accept / decline / dismiss)
export async function PATCH(request: Request) {
  const { id, status, sessionId } = await request.json() as {
    id: string;
    status: AppNotification["status"];
    sessionId: string;
  };
  if (!id || !status || !sessionId) {
    return NextResponse.json({ error: "id, status, sessionId required" }, { status: 400 });
  }

  const notifications = read();
  const index = notifications.findIndex((n) => n.id === id);
  if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  notifications[index] = { ...notifications[index], status };
  write(notifications);
  return NextResponse.json(notifications[index]);
}
