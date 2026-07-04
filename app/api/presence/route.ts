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

// Release any language locks held by the given session IDs.
function releaseLocksFor(sessionIds: string[]) {
  if (sessionIds.length === 0) return;
  try {
    const raw = existsSync(LOCKS_FILE) ? readFileSync(LOCKS_FILE, "utf-8") : null;
    if (!raw) return;
    const locks = JSON.parse(raw) as Record<string, { sessionId: string } | null>;
    let changed = false;
    for (const lang of Object.keys(locks)) {
      if (locks[lang] && sessionIds.includes(locks[lang]!.sessionId)) {
        locks[lang] = null;
        changed = true;
      }
    }
    if (changed) writeFileSync(LOCKS_FILE, JSON.stringify(locks, null, 2));
  } catch { /* ignore lock file errors */ }
}

// GET — return list of currently active users
export async function GET() {
  return NextResponse.json(active(read()));
}

// POST — register / heartbeat  { name, sessionId, language?, section? }
// Also handles tab-close "leave" beacons: sendBeacon can only POST, so a body
// with a sessionId but no name is treated as a leave (remove entry + release locks).
export async function POST(req: Request) {
  // sendBeacon can fire an empty body on tab close — parse defensively so it
  // doesn't throw "Unexpected end of JSON input" and 500.
  let body: { name?: string; sessionId?: string; language?: string; section?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { name, sessionId, language, section } = body;
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });

  // Leave signal (no name) — remove this session and release any locks it holds.
  if (!name?.trim()) {
    write(read().filter((u) => u.sessionId !== sessionId));
    releaseLocksFor([sessionId]);
    return NextResponse.json({ ok: true, left: true });
  }

  const trimmedName = name.trim().toLowerCase();
  const users = read();

  // Evict any previous sessions with the same name (e.g. old tab) and release their locks.
  // Guard u.name — a malformed persisted entry without a name must not crash the heartbeat.
  const evictedIds = users
    .filter((u) => u.name?.trim().toLowerCase() === trimmedName && u.sessionId !== sessionId)
    .map((u) => u.sessionId);

  releaseLocksFor(evictedIds);

  // Remove evicted sessions from presence list
  const filtered = users.filter(
    (u) => u.sessionId === sessionId || u.name?.trim().toLowerCase() !== trimmedName,
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
  let sessionId: string | undefined;
  try { ({ sessionId } = (await req.json()) as { sessionId: string }); } catch { /* empty/malformed body */ }
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 });
  const users = read().filter((u) => u.sessionId !== sessionId);
  write(users);
  // Mirror the POST leave-beacon path: releasing presence must also drop any locks held.
  releaseLocksFor([sessionId]);
  return NextResponse.json({ ok: true });
}
