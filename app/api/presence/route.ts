import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "data", "presence.json");
const STALE_MS = 90_000; // 90 seconds — users ping every 30s

export interface PresenceUser {
  name: string;
  sessionId: string;
  lastSeen: number;
}

function read(): PresenceUser[] {
  try {
    if (!existsSync(FILE)) return [];
    return JSON.parse(readFileSync(FILE, "utf8")) as PresenceUser[];
  } catch {
    return [];
  }
}

function write(users: PresenceUser[]) {
  writeFileSync(FILE, JSON.stringify(users, null, 2));
}

function active(users: PresenceUser[]): PresenceUser[] {
  const cutoff = Date.now() - STALE_MS;
  return users.filter((u) => u.lastSeen >= cutoff);
}

// GET — return list of currently active users
export async function GET() {
  return NextResponse.json(active(read()));
}

// POST — register / heartbeat  { name, sessionId }
export async function POST(req: Request) {
  const { name, sessionId } = (await req.json()) as { name: string; sessionId: string };
  if (!name?.trim() || !sessionId) return NextResponse.json({ ok: false }, { status: 400 });

  const users = read();
  const idx = users.findIndex((u) => u.sessionId === sessionId);
  const entry: PresenceUser = { name: name.trim(), sessionId, lastSeen: Date.now() };
  if (idx >= 0) users[idx] = entry;
  else users.push(entry);
  write(active(users));
  return NextResponse.json({ ok: true });
}

// DELETE — leave  { sessionId }
export async function DELETE(req: Request) {
  const { sessionId } = (await req.json()) as { sessionId: string };
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });
  const users = read().filter((u) => u.sessionId !== sessionId);
  write(users);
  return NextResponse.json({ ok: true });
}
