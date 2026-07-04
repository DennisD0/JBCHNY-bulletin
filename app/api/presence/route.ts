import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const FILE = join(tmpdir(), "bulletin-presence.json");
const LOCKS_FILE = join(tmpdir(), "bulletin-locks.json");
const STALE_MS = 45_000; // 45 seconds — users ping every 30s, so 1.5x margin

export interface PresenceUser {
  name: string;
  sessionId: string;
  lastSeen: number;
  language?: string;
  section?: string;
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

// POST — register / heartbeat  { name, sessionId, language?, section? }
export async function POST(req: Request) {
  const { name, sessionId, language, section } = (await req.json()) as { name: string; sessionId: string; language?: string; section?: string };
  if (!name?.trim() || !sessionId) return NextResponse.json({ ok: false }, { status: 400 });

  const trimmedName = name.trim().toLowerCase();
  const users = read();

  // Evict any previous sessions with the same name (e.g. old tab) and release their locks
  const evictedIds = users
    .filter((u) => u.name.trim().toLowerCase() === trimmedName && u.sessionId !== sessionId)
    .map((u) => u.sessionId);

  if (evictedIds.length > 0) {
    // Release locks held by evicted sessions
    try {
      const raw = existsSync(LOCKS_FILE) ? readFileSync(LOCKS_FILE, "utf-8") : null;
      if (raw) {
        const locks = JSON.parse(raw) as Record<string, { sessionId: string } | null>;
        let changed = false;
        for (const lang of Object.keys(locks)) {
          if (locks[lang] && evictedIds.includes(locks[lang]!.sessionId)) {
            locks[lang] = null;
            changed = true;
          }
        }
        if (changed) writeFileSync(LOCKS_FILE, JSON.stringify(locks, null, 2));
      }
    } catch { /* ignore lock file errors */ }
  }

  // Remove evicted sessions from presence list
  const filtered = users.filter(
    (u) => u.sessionId === sessionId || u.name.trim().toLowerCase() !== trimmedName,
  );

  const idx = filtered.findIndex((u) => u.sessionId === sessionId);
  const entry: PresenceUser = { name: name.trim(), sessionId, lastSeen: Date.now(), language, section };
  if (idx >= 0) filtered[idx] = entry;
  else filtered.push(entry);
  write(active(filtered));
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
