# Pre-Deploy Security & Bug Checklist

Deferred from code review of `c8e6a5a`. Fix these before deploying to production.

## 🔴 Critical (fix before any real users)

- [ ] **Race condition in lock acquire** (`app/api/locks/route.ts`)
  Add a module-level mutex (e.g. a `Map<lang, Promise>`) to serialize concurrent lock writes.
  Two simultaneous `acquire` requests can both pass the "is it locked?" check before either writes.

- [ ] **`takeover` has no session validation** (`app/api/locks/route.ts:83`)
  Anyone can call `POST /api/locks { action:"takeover", lang:"ko" }` and evict the pastor.
  At minimum: log who was displaced. Optionally require caller to have had a recent heartbeat.

## 🟡 Warning (bugs)

- [ ] **Old route bypasses sync** (`app/api/bulletin/route.ts`)
  Delete this file — it still writes `bulletin.en.json` without running `notifySoftSyncLanguages`.
  All saves must go through `/api/bulletin/en`.

- [ ] **N×3 non-batched file I/O in sync loop** (`lib/bulletin-store.ts:43`)
  `notifySoftSyncLanguages` reads + writes each language file per changed section.
  Fix: read all language files once, mutate meta in memory, write each once at the end.

- [ ] **`postLockAction` missing `useCallback`** (`app/page.tsx`)
  The heartbeat `useEffect` lists it as a dep; without `useCallback` the interval
  is cleared and reset on every render.

- [ ] **`data/locks.json` must be gitignored**
  Add `data/locks.json` to `.gitignore`. Generate it at startup if missing.
  Every deploy resets lock state and silently drops active sessions.

- [ ] **Read-only mode is visual-only** (`app/page.tsx`)
  Wrap with `pointerEvents:none` doesn't set `disabled` on inputs — keyboard users
  can still edit, and screen readers won't announce the form as read-only.
  Pass `readOnly` into each editor panel and apply `disabled` to each `<input>`/`<textarea>`.

## 🔵 Info (polish)

- [ ] `userName` is hardcoded to `"Editor"` — add a simple localStorage name prompt on first visit
- [ ] `lib/bulletin-translation.ts` and `app/api/bulletin/[lang]/translate/` are untracked — commit or gitignore
- [ ] Silent `.catch(() => undefined)` on save/lock failures — add a toast/error notification
- [ ] `data/bulletin.*.json` contain real personal data committed to git — gitignore and load from private store in prod
- [ ] `seminarInfo` is in `SECTION_FIELD_MAP` but missing from `TAB_SECTION_KEY` — add it or it won't show sync banners
