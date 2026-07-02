# New York Church Bulletin Editor

A browser-based editor for creating New York Church's weekly multilingual
bulletins. The application keeps a print-accurate legal-landscape preview on a
pan-and-zoom canvas while allowing bulletin content to be edited directly or
through section panels.

## Features

- Two-page bulletin preview with crisp pan, zoom, and fit-to-screen controls
- English, Spanish, Korean, Chinese, and Russian bulletin workspaces
- Section-level translation status, preview, apply, and dismiss workflows
- Bulletin-date and week selection for generating future issues
- Auto-filled Bible readings, schedules, calendar events, and memory verses
- Inline editing for bulletin text, tables, calendar events, and banner labels
- PDF export for printing and distribution
- Shared editing locks, takeover and collaboration requests, notifications,
  and canvas comments
- Desktop and mobile layouts with section-focused editing

## Getting started

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Useful commands:

```bash
npm test       # Run the Node test suite
npm run lint   # Run ESLint
npm run build  # Create a production build
npm start      # Serve the production build
```

## Data and workflow

- `data/bulletin.en.json` is the primary English bulletin.
- `data/bulletin.es.json`, `data/bulletin.ko.json`,
  `data/bulletin.zh.json`, and `data/bulletin.ru.json` store translated
  bulletins and section-sync metadata.
- `data/year_reading_plan.json` and schedule data power future-week auto-fill.
- `data/comments.json`, `data/locks.json`, and `data/notifications.json` hold
  local collaboration state for the development deployment.
- The editor APIs live under `app/api`, including bulletin, translation,
  comments, locks, notifications, management, and PDF export routes.

For a production multi-user deployment, the JSON-backed collaboration state
should be moved to persistent shared storage rather than relying on the local
filesystem.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Main bulletin editor, canvas, sidebar, comments, and collaboration UI |
| `app/components/BulletinPreview.tsx` | Print-accurate two-page bulletin layout and inline editing |
| `app/manage/page.tsx` | Reading-plan and schedule management tools |
| `app/print/page.tsx` | Print and PDF rendering surface |
| `app/api/*` | Bulletin data, translation, collaboration, management, and export APIs |
| `lib/bulletin-types.ts` | Shared bulletin data types |
| `lib/bulletin-languages.ts` | Supported language configuration |
| `data/*` | Bulletin content and auto-fill source data |

The repository also contains hymn/OCR utilities used by the management tools,
but the primary application is the church bulletin editor described above.
