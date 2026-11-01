# Session hand-off

Last updated 2026-11-01. Read this first when picking the project up again.

## What this is
Church bulletin editor (Next.js 16, React 19, TypeScript, Tailwind 4). Live at https://jbchbulletin.duckdns.org/.
Every push to `main` runs the "Deploy to VM" GitHub Action (`.github/workflows/deploy.yml` → `scripts/deploy.sh`) on a GCP e2-micro VM. A deploy that installs new packages can take ~15 minutes; a normal one takes ~4. Pushes that only touch `*.md` or `.github/workflows/**` do not deploy.
`AGENTS.md` warns that this Next.js has breaking changes: read `node_modules/next/dist/docs` before writing Next-specific code.

## Done in this stretch of work
- **Monthly Calendar auto-fill** from a one-month `.xlsx` (`lib/month-sheet.ts`, `lib/month-calendar-patch.ts`, `app/api/manage/month-calendar/route.ts`, `app/components/MonthCalendarModal.tsx`). Banners, weekly recurring events and day notes; reviewable and editable before applying; the saved bulletin calendar can be edited afterwards too.
- **Bible Seminar Info**: own sidebar section with Hide/Show; filled from any "Bible Seminar" banner (grand, small, mini…).
- **Reading plan editor** (`ReadingPlanEditor.tsx`): daily readings tab, and a "Memory verses & themes" tab (`VerseThemeEditor.tsx`) that edits each week's verse and its theme (Hope, Peace…). Backed by `GET /api/memory-verse?list=1` and `POST /api/memory-verse {action:"saveList"}`, stored in `data/memory_verse_list.json`.
- **Monthly Calendar progress bar** in the sidebar, advancing with the real date and time.
- **Export all languages** (`ExportAllModal.tsx`): one PDF per selected language, exported one at a time.
- **PDF fixes**: CJK fonts installed on the VM during deploy (Korean/Chinese no longer empty boxes); long calendar banner labels shrink to fit; a Retreat Info box with no title/date/location is left off the printed bulletin (it still shows in the editor).
- **Live data survives deploys**: `scripts/keep-data.sh` saves `data/*.json` before the git reset and restores it after (rolling backups in `~/bulletin-data-backups` on the VM). The 11/01/2026 editions made before this fix were lost.
- **Dependencies**: `next` 16.4.3, `sharp` 0.35, `@xmldom/xmldom` 0.9; removed unused `jspdf`, `html2canvas`, `jimp`. `npm audit --omit=dev` reports 0 vulnerabilities. `eslint-config-next` is pinned at 16.2.9 on purpose (newer versions add rules that report many more errors).
- **`app/page.tsx` split**: 6,222 → ~2,150 lines. It now holds only the `Home` component; everything else lives in `app/components/editor/` (`ui`, `BasicTabs`, `SidebarPanels`, `CalendarTabs`, `NewsPrayerTabs`, `SectionPanels`, `AutomationPanel`, `FloatingToolbar`, `constants`, `Sidebar`, `LanguageBar`, `AccessControl`, `Notifications`, `SectionEditorPanel`, `Comments`). No behaviour change. `BulletinPreview.tsx` (1,461 → 852 lines) keeps only the main preview component; its design tokens, table/heading primitives, calendar grid, editable-text and pending-diff helpers moved to `app/components/preview/` (`theme`, `primitives`, `CalGrid`, `Editable`, `PendingDiff`). It still re-exports `PAGE_W`/`PAGE_H`. All five exported PDFs were byte-for-byte the same size before and after the split.

## How it was verified
- `npx tsc --noEmit` clean; `npm test` 39/39; `npm run build` passes; `npm run lint` unchanged at 52 errors (all pre-existing).
- Live PDFs for en/es/ko/zh/ru exported one at a time and read: Korean, Chinese and Russian show real characters; layout matches the hand-made reference bulletins.
- Export the languages **sequentially**. Running 5 at once on the e2-micro makes Chrome fail with 500 errors.

## Spanish translation (found and fixed late)
- The Spanish bulletin body was English. The app's "translate from English" endpoint (`POST /api/bulletin/<lang>/translate`) uses `translate.googleapis.com`, which **the VM cannot reach** (requests hang → nginx 504). The code used to swallow those failures and save English as if translated; it now retries and returns an error naming the cause.
- Workaround used: run the app locally against a copy of the live English data (put the `.data` of `/api/bulletin/en` into `data/bulletin.en.json`, `next start`, POST `/translate` on localhost), then `POST /api/bulletin/es {data}` to the live site, and `git checkout data/` afterwards. Spanish now matches the live English edition (2026-30, 08/02/2026).
- Names in the Bible Seminar Service table (`cells`) are no longer machine-translated; long translated row labels (e.g. "PREPARACIÓN") shrink to fit.
- Spanish Bible Seminar Info date/speaker lines are still English text (`date` is deliberately untranslated).
- A real fix for the VM would be outbound access to Google Translate, or a different translation provider.

## Live checks done after the last deploy
Theme save (edited and restored via `saveList`), Bible Seminar Info hide/show (hidden PDF drops the section, shown PDF is byte-identical to before), calendar edit modal opens with the saved calendar, month .xlsx parse endpoint returns banners/events/seminars, and a manual redeploy left en/es/ko/zh/ru bulletins, the verse list and the reading plan byte-identical.

Also verified through the live UI: a calendar edit applied and saved to the live Spanish bulletin (then restored), and a memory-verse theme edited and saved from the editor's Memory verses & themes tab (then restored). The calendar fill was also run end to end on the live site (Spanish tab): a reduced copy of the .xlsx was dropped into the Fill dialog, applied, saved, and the live data showed October 2026 with banners, 17 event days and the seminar info; Spanish was then restored from a backup.

Final pass on the live site after the last deploy: all five PDFs re-read (en/es/ko/zh/ru), the "Export 5 PDFs" dialog downloaded all five, Bible Seminar Info Hide/Show worked through the editor buttons (PDF 1,685,196 bytes hidden vs 1,686,979 shown), and the calendar fill was applied with a copy of the Feb sheet carrying every non-empty cell and merge (4 banners incl. US Pastor Retreat 10/12–10/15, 19 event days, 3 weekly meetings, 2 seminars — identical to the full file's parse), saved, then Spanish restored from a backup.

The original full .xlsx (154,396 bytes) was also applied on the live site (served briefly from `public/`, since removed): same result as above, and the printed Spanish PDF showed October 2026 with all four banners and the September Bible Seminar info. Spanish was restored afterwards.

## Known open items
- **No login / write protection yet**: ~14 write endpoints are unauthenticated, and lock takeover is open (see `PRE_DEPLOY_CHECKLIST.md`). The owner will decide on login later; nothing was added.
- The zh and ru data files had Retreat Info switched on while en/ko/es had it off; the print view now hides it when empty, but the flag itself is unsynced.
- Lint: 52 pre-existing errors (react-hooks rules, `require()` imports, unescaped quotes); warnings are now 8 (were 17).
- Fixed late: PDF uploads (`/api/manage/upload`) failed with "Cannot read properties of undefined (reading 'openDocument')" because `require("mupdf")` can't load an ES module with top-level await (this was also the cause of the old `mupdf can't be external` build warning). It now uses `await import("mupdf")`; verified on the live site (a PDF now parses and the live schedule is unchanged).
- Local dev: Node is installed under `C:\Program Files\nodejs`; the PATH may need refreshing in new shells.
