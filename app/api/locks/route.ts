import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  BULLETIN_LANGUAGES,
  isBulletinLanguage,
  type LanguageLock,
  type LanguageLocks,
} from "@/lib/bulletin-languages";

const LOCKS_PATH = join(process.cwd(), "data", "locks.json");
const LOCK_TIMEOUT_MS = 3 * 60 * 1000; // 3 min; heartbeat fires every 45s so 2 missed = lock reclaimed

function readLocks(): LanguageLocks {
  return JSON.parse(readFileSync(LOCKS_PATH, "utf-8")) as LanguageLocks;
}

function writeLocks(locks: LanguageLocks) {
  writeFileSync(LOCKS_PATH, `${JSON.stringify(locks, null, 2)}\n`, "utf-8");
}

function removeExpiredLocks(locks: LanguageLocks) {
  const now = Date.now();
  let changed = false;
  for (const language of BULLETIN_LANGUAGES) {
    if (locks[language] && now - locks[language].acquiredAt > LOCK_TIMEOUT_MS) {
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
    action?: "acquire" | "release" | "heartbeat" | "takeover";
    lang?: string;
    sessionId?: string;
    userName?: string;
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
    if (current && current.sessionId !== body.sessionId) {
      return NextResponse.json({ ok: false, lock: current });
    }
    locks[body.lang] = current ? { ...current, acquiredAt: Date.now() } : nextLock;
    writeLocks(locks);
    return NextResponse.json({ ok: true, lock: locks[body.lang] });
  }

  if (body.action === "release") {
    if (current?.sessionId === body.sessionId) {
      locks[body.lang] = null;
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

  locks[body.lang] = nextLock;
  writeLocks(locks);
  return NextResponse.json({ ok: true, lock: nextLock });
}

