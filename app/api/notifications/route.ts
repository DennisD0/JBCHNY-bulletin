import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isBulletinLanguage, type BulletinLanguage } from "@/lib/bulletin-languages";

const PATH = join(process.cwd(), "data", "notifications.json");
const MAX_AGE_MS = 60 * 60 * 1000; // prune notifications older than 1 hour

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
// Returns notifications relevant to the caller (as sender or target)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const all = read();
  const relevant = all.filter(
    (n) => n.fromSessionId === sessionId || n.targetSessionId === sessionId,
  );
  return NextResponse.json(relevant);
}

// POST /api/notifications — create a takeover request
export async function POST(request: Request) {
  const body = await request.json() as Partial<AppNotification>;
  if (
    body.type !== "takeover_request" ||
    !body.lang || !isBulletinLanguage(body.lang) ||
    !body.fromSessionId || !body.targetSessionId
  ) {
    return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
  }

  const notifications = read();

  // De-dup: only one pending request per (from, lang) pair
  const existing = notifications.find(
    (n) => n.fromSessionId === body.fromSessionId && n.lang === body.lang && n.status === "pending",
  );
  if (existing) return NextResponse.json(existing);

  const notification: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "takeover_request",
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
