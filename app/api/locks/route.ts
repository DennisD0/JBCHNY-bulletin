import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextResponse } from "next/server";
import {
  BULLETIN_LANGUAGES,
  isBulletinLanguage,
  type LanguageLock,
  type LanguageLocks,
} from "@/lib/bulletin-languages";

const LOCKS_PATH = join(tmpdir(), "bulletin-locks.json");
const PRESENCE_PATH = join(tmpdir(), "bulletin-presence.json");
const LOCK_TIMEOUT_MS = 3 * 60 * 1000;
const PRESENCE_STALE_MS = 45_000; // must match presence/route.ts

const EMPTY_LOCKS: LanguageLocks = { en: null, ko: null, es: null, zh: null, ru: null };

function readLocks(): LanguageLocks {
  try {
    return JSON.parse(readFileSync(LOCKS_PATH, "utf-8")) as LanguageLocks;
  } catch {
    return { ...EMPTY_LOCKS };
  }
}

function writeLocks(locks: LanguageLocks) {
  writeFileSync(LOCKS_PATH, `${JSON.stringify(locks, null, 2)}\n`, "utf-8");
}

// Returns session IDs that are currently active in the presence file.
function activePresenceIds(): Set<string> {
  try {
    if (!existsSync(PRESENCE_PATH)) return new Set();
    const users = JSON.parse(readFileSync(PRESENCE_PATH, "utf-8")) as Array<{ sessionId: string; lastSeen: number }>;
    const cutoff = Date.now() - PRESENCE_STALE_MS;
    return new Set(users.filter((u) => u.lastSeen >= cutoff).map((u) => u.sessionId));
  } catch {
    return new Set();
  }
}

function removeExpiredLocks(locks: LanguageLocks) {
  const now = Date.now();
  const presentIds = activePresenceIds();
  let changed = false;
  for (const language of BULLETIN_LANGUAGES) {
    if (!locks[language]) continue;
    const timedOut = now - locks[language]!.acquiredAt > LOCK_TIMEOUT_MS;
    // If the holder is no longer in the active presence list, the tab is gone — release immediately.
    const holderGone = !presentIds.has(locks[language]!.sessionId);
    if (timedOut || holderGone) {
      locks[language] = null;
      changed = true;
    }
  }
  if (changed) writeLocks(locks);
  return locks;
}

export async function GET() {
  return NextResponse.json(removeExpiredLocks(readLocks()));
}

export async function POST(request: Request) {
  const body = await request.json() as {
    action?: "acquire" | "release" | "heartbeat" | "takeover" | "add-collaborator";
    lang?: string;
    sessionId?: string;
    userName?: string;
    targetSessionId?: string;
  };

  if (!body.action || !body.lang || !isBulletinLanguage(body.lang) || !body.sessionId) {
    return NextResponse.json({ error: "action, lang, and sessionId are required" }, { status: 400 });
  }

  const locks = removeExpiredLocks(readLocks());
  const current = locks[body.lang];
  const nextLock: LanguageLock = {
    sessionId: body.sessionId,
    userName: body.userName?.trim() || "Editor",
    acquiredAt: Date.now(),
  };

  if (body.action === "acquire") {
    if (current?.collaborators?.includes(body.sessionId)) {
      return NextResponse.json({ ok: true, lock: current, collaborator: true });
    }
    // Self-healing: if the current holder's tab is gone (not in active presence),
    // treat the lock as free and steal it rather than reporting a false conflict.
    const holderIsMe = !current || current.sessionId === body.sessionId;
    if (current && !holderIsMe && activePresenceIds().has(current.sessionId)) {
      return NextResponse.json({ ok: false, lock: current });
    }
    // Keep my own lock's collaborators; otherwise (free or stolen) start fresh.
    locks[body.lang] = holderIsMe && current ? { ...current, acquiredAt: Date.now() } : nextLock;
    writeLocks(locks);
    return NextResponse.json({ ok: true, lock: locks[body.lang] });
  }

  if (body.action === "release") {
    if (current?.sessionId === body.sessionId) {
      locks[body.lang] = null;
      writeLocks(locks);
    } else if (current?.collaborators?.includes(body.sessionId)) {
      locks[body.lang] = {
        ...current,
        collaborators: current.collaborators.filter((id) => id !== body.sessionId),
      };
      writeLocks(locks);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "heartbeat") {
    if (current?.sessionId !== body.sessionId) {
      return NextResponse.json({ ok: false, lock: current }, { status: 409 });
    }
    locks[body.lang] = { ...current, acquiredAt: Date.now() };
    writeLocks(locks);
    return NextResponse.json({ ok: true, lock: locks[body.lang] });
  }

  if (body.action === "add-collaborator") {
    if (!current) return NextResponse.json({ error: "No active lock" }, { status: 404 });
    const collabId = body.targetSessionId ?? body.sessionId;
    const existing = current.collaborators ?? [];
    if (!existing.includes(collabId!)) {
      locks[body.lang] = { ...current, collaborators: [...existing, collabId!] };
      writeLocks(locks);
    }
    return NextResponse.json({ ok: true, lock: locks[body.lang] });
  }

  locks[body.lang] = nextLock;
  writeLocks(locks);
  return NextResponse.json({ ok: true, lock: nextLock });
}
