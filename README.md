# Choire Reader Player

Upload a photo or PDF of choral sheet music and hear it played back — voice by
voice. Built for choir rehearsal: solo your part, mute the others, slow the
tempo, and follow along as a cursor tracks the music.

## How it works

```
Upload image/PDF  →  Audiveris (OMR)  →  MusicXML  →  OSMD (render)  →  Tone.js (playback)
```

1. The image/PDF is uploaded to `/api/omr/process`, which runs **Audiveris**
   (Optical Music Recognition) as a background job.
2. The client polls `/api/omr/status/[jobId]` until the job is `done`, then
   fetches the recognized score from `/api/omr/result/[jobId]` (a `.mxl`).
3. **OpenSheetMusicDisplay (OSMD)** renders the score to SVG.
4. The score is parsed into voice parts (`lib/musicxml-parts.ts`), and
   **Tone.js** (`lib/audio-engine.ts`) builds one piano sampler + channel per
   voice for synchronized playback.

## Features

- Per-voice **mute / solo / volume** mixer (auto-detected S / A / T / B roles,
  overridable)
- **Tempo** control (40–200 BPM) that re-paces playback without re-scheduling
- Transport: **play / pause / stop**, **seek bar**, elapsed / total time
- **Spacebar** toggles play/pause
- Score **cursor that follows playback** (scrollable score view)
- **Download** the recognized MusicXML

## Prerequisites

- **Node.js** (project built with Next.js 16 / React 19)
- **Audiveris** OMR engine placed at:
  `tools/audiveris/Audiveris/Audiveris.exe`
  (The `tools/` folder is git-ignored because of its size — install Audiveris
  there locally. See `lib/audiveris.ts` for the exact path the server invokes.)

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, upload sheet music, and press Play.

> Note: Audiveris OMR can take a minute or two per page, and recognition
> quality depends on the clarity of the input scan.

## Project layout

| Path | Purpose |
|------|---------|
| `app/page.tsx` | The reader UI (upload, score, transport, voice mixer) |
| `app/api/omr/*` | Upload → process → status → result endpoints |
| `lib/audiveris.ts` | Spawns the Audiveris CLI, returns the `.mxl` path |
| `lib/jobs.ts` | In-memory OMR job store |
| `lib/musicxml-parts.ts` | Parses MusicXML into voice parts (ticks) |
| `lib/audio-engine.ts` | Tone.js playback graph (sampler/channel/part per voice) |
