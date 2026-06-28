// In-process abuse protection for the OMR upload endpoint.
//
// The app deploys to Cloud Run with --max-instances 1, so a single Node process
// handles every request. That makes an in-memory limiter reliable (no shared
// store needed) — all counters live in the one process that serves traffic.
//
// Two layers:
//   1. Per-IP fixed-window limit  — stops one visitor from flooding uploads.
//   2. Global in-flight cap        — stops the serial OMR queue from being
//      stuffed with more work than it can ever clear (each job takes minutes).

interface Window {
  count: number;
  resetAt: number;
}

const ipWindows = new Map<string, Window>();

// Legitimate use: the UI lets a user queue up to 5 hymns at once, plus a few
// retries. 15 uploads/minute/IP is comfortably above that and well below a flood.
const PER_IP_LIMIT = 15;
const PER_IP_WINDOW_MS = 60_000;

// Each recognition takes 1–3 minutes and runs one at a time. Beyond ~10 queued
// the backlog is longer than anyone will wait, so reject rather than pile on.
const MAX_IN_FLIGHT = 10;

let inFlight = 0;

/** Best-effort client IP behind Cloud Run's proxy (X-Forwarded-For: client, …). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export interface RateDecision {
  ok: boolean;
  /** Seconds the client should wait before retrying (for Retry-After). */
  retryAfter?: number;
  reason?: string;
}

/** Per-IP fixed-window check. Call once per upload request. */
export function checkIpRate(ip: string, now: number): RateDecision {
  const existing = ipWindows.get(ip);
  if (!existing || now >= existing.resetAt) {
    ipWindows.set(ip, { count: 1, resetAt: now + PER_IP_WINDOW_MS });
    return { ok: true };
  }
  if (existing.count >= PER_IP_LIMIT) {
    return {
      ok: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
      reason:
        "You're uploading too quickly. Please wait a moment and try again.",
    };
  }
  existing.count++;
  return { ok: true };
}

/** Whether the serial OMR queue has room for another job right now. */
export function tryReserveSlot(): RateDecision {
  if (inFlight >= MAX_IN_FLIGHT) {
    return {
      ok: false,
      retryAfter: 30,
      reason:
        "The recognition queue is full right now. Please wait for the current " +
        "hymns to finish, then try again.",
    };
  }
  inFlight++;
  return { ok: true };
}

/** Release a slot reserved with tryReserveSlot(), once the job settles. */
export function releaseSlot(): void {
  if (inFlight > 0) inFlight--;
}

// Periodically drop expired IP windows so the Map can't grow unbounded under a
// distributed flood. unref() so this timer never holds the process open.
const CLEANUP_MS = 5 * 60_000;
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, window] of ipWindows) {
    if (now >= window.resetAt) ipWindows.delete(ip);
  }
}, CLEANUP_MS);
cleanup.unref?.();
