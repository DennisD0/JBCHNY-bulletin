import sharp from "sharp";
import { createOcrWorker } from "./ocr-worker";
import {
  CHURCHES, buildEastCoastEntries, matchPreacher, parseEventBand, quarterSundays,
  type BandEvent, type GridCell, type GridChurch,
} from "./schedule-grid-shared";

// Reads the printed quarterly sermon-plan table (churches × 13 Sundays) by finding
// its ruled lines, cutting it into cells and OCRing each cell on its own. Whole-page
// OCR turns this layout into noise; per-cell OCR snapped to a known preacher list is
// reliable. Cells are classified by shape first (arrow / merged retreat / empty) so
// OCR is only asked to read names.

const DARK = 110;        // grey level that counts as a ruled line
const INK = 170;         // grey level that counts as text
const EXPECTED_ROWS = CHURCHES.length;   // 21
const EXPECTED_VLINES = 3 + 13 + 1;      // region, no., church + 13 Sundays + right edge

export interface GridResult {
  coverageStart: string;
  coverageEnd: string;
  quarter: string;
  churches: GridChurch[];
  events: BandEvent[];
  corrected: number; // names snapped to the closest known preacher (probably right)
  unmatched: number; // names that matched nobody — need a human look
}

type Raw = { data: Buffer; W: number; H: number };

function groupLines(positions: number[]): number[] {
  const out: number[] = [];
  let start: number | null = null;
  let prev = 0;
  for (const p of positions) {
    if (start === null) { start = p; prev = p; }
    else if (p - prev <= 2) prev = p;
    else { out.push(Math.round((start + prev) / 2)); start = p; prev = p; }
  }
  if (start !== null) out.push(Math.round((start + prev) / 2));
  return out;
}

/** The longest run of evenly spaced horizontal lines = the table body rows. */
function bodyRows(lines: number[]): number[] {
  let best: number[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const run = [lines[i]];
    const gap = lines[i + 1] - lines[i];
    for (let j = i + 1; j < lines.length; j++) {
      const g = lines[j] - lines[j - 1];
      if (g < gap * 0.7 || g > gap * 1.4) break;
      run.push(lines[j]);
    }
    if (run.length > best.length) best = run;
  }
  return best;
}

async function loadRaw(buf: Buffer): Promise<Raw> {
  // Normalise phone-photo orientation and cap size; the table's ruled lines are all
  // we need so a mid-size greyscale image is plenty.
  const { data, info } = await sharp(buf).rotate().greyscale()
    .resize({ width: 2200, withoutEnlargement: true })
    .raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

function detectGrid(img: Raw): { rows: number[]; cols: number[]; before: number[] } | null {
  const { data, W, H } = img;
  const hPositions: number[] = [];
  for (let y = 0; y < H; y++) {
    let c = 0;
    for (let x = 0; x < W; x++) if (data[y * W + x] < DARK) c++;
    if (c > W * 0.6) hPositions.push(y);
  }
  const allLines = groupLines(hPositions);
  const rows = bodyRows(allLines);
  if (rows.length !== EXPECTED_ROWS + 1) return null;
  const before = allLines.filter((y) => y < rows[0]);

  const y0 = rows[0] + 2, y1 = rows[rows.length - 1] - 2;
  const vPositions: number[] = [];
  for (let x = 0; x < W; x++) {
    let c = 0;
    for (let y = y0; y < y1; y++) if (data[y * W + x] < DARK) c++;
    if (c > (y1 - y0) * 0.6) vPositions.push(x);
  }
  const cols = groupLines(vPositions);
  if (cols.length !== EXPECTED_VLINES) return null;
  return { rows, cols, before };
}

/** Fraction of a horizontal segment that is ruled line (checks ±1px for blur). */
function lineCoverage(img: Raw, y: number, x0: number, x1: number): number {
  const { data, W, H } = img;
  let dark = 0;
  for (let x = x0; x < x1; x++) {
    for (let dy = -1; dy <= 1; dy++) {
      const yy = Math.min(H - 1, Math.max(0, y + dy));
      if (data[yy * W + x] < DARK) { dark++; break; }
    }
  }
  return dark / Math.max(1, x1 - x0);
}

function inkBox(img: Raw, x0: number, y0: number, x1: number, y1: number) {
  const { data, W } = img;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[y * W + x] < INK) {
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return { count, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Quarter/year from the title line ("2026년 4/4분기"), else the current quarter. */
async function readQuarter(buf: Buffer, worker: Awaited<ReturnType<typeof createOcrWorker>>, fallbackYear: number) {
  try {
    const { width = 0, height = 0 } = await sharp(buf).rotate().metadata();
    const band = await sharp(buf).rotate()
      .extract({ left: 0, top: 0, width, height: Math.max(20, Math.round(height * 0.15)) })
      .greyscale().normalise().png().toBuffer();
    const { data } = await worker.recognize(band);
    const m = data.text.match(/(20\d\d)\s*년?\s*([1-4])\s*\/\s*4/);
    if (m) return { year: Number(m[1]), quarter: Number(m[2]) };
  } catch { /* fall through */ }
  const now = new Date();
  return { year: fallbackYear || now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

export async function readScheduleGrid(
  buf: Buffer,
  fallbackYear: number,
  roster?: Record<string, "p" | "e">,
  aliases?: Record<string, string>,
): Promise<GridResult | null> {
  const img = await loadRaw(buf);
  const grid = detectGrid(img);
  if (!grid) return null;
  const { rows, cols, before } = grid;
  const dateCols = cols.slice(3); // 14 boundaries → 13 Sunday columns

  const worker = await createOcrWorker("kor+eng");
  try {
    // The title is a normal block of text; read it before switching to cell mode.
    const { year, quarter } = await readQuarter(buf, worker, fallbackYear);
    const sundays = quarterSundays(year, quarter);

    const resized = await sharp(buf).rotate()
      .resize({ width: 2200, withoutEnlargement: true }).greyscale().png().toBuffer();

    // Event bands above the grid: per-church evangelistic meetings / mission-team visits,
    // and US-wide events (retreats). OCR one month-column at a time so lines stay separate.
    const events: BandEvent[] = [];
    if (before.length >= 2) {
      await worker.setParameters({ tessedit_pageseg_mode: "6" as never });
      const bands: Array<[number, number]> = [
        [before[before.length - 2], before[before.length - 1]], // per-church meetings
        [before[before.length - 1], rows[0]],                   // US-wide events
      ];
      // Column chunks = one per month, split where the Sunday dates change month.
      const edges = [0];
      for (let c = 1; c < 13; c++) if (sundays[c].slice(5, 7) !== sundays[c - 1].slice(5, 7)) edges.push(c);
      edges.push(13);
      for (const [by0, by1] of bands) {
        if (by1 - by0 < 20) continue;
        for (let e = 0; e < edges.length - 1; e++) {
          const bx0 = dateCols[edges[e]] + 2, bx1 = dateCols[edges[e + 1]] - 1;
          const band = await sharp(resized)
            .extract({ left: bx0, top: by0 + 2, width: bx1 - bx0, height: by1 - by0 - 3 })
            .resize({ width: (bx1 - bx0) * 4, kernel: "lanczos3" }).normalise()
            .extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#ffffff" })
            .png().toBuffer();
          const { data } = await worker.recognize(band);
          events.push(...parseEventBand(data.text, quarter, year));
        }
      }
    }

    // PSM 7 = treat each cell as a single line of text.
    await worker.setParameters({ tessedit_pageseg_mode: "7" as never });

    const churches: GridChurch[] = [];
    let corrected = 0, unmatched = 0;
    for (let r = 0; r < EXPECTED_ROWS; r++) {
      const cells: GridCell[] = [];
      let prevName = ""; let prevTitle: "p" | "e" = "p";
      for (let c = 0; c < 13; c++) {
        const date = sundays[c];
        const x0 = dateCols[c] + 3, x1 = dateCols[c + 1] - 2;
        const y0 = rows[r] + 3, y1 = rows[r + 1] - 2;
        const cellW = x1 - x0, cellH = y1 - y0;

        // Merged cell (the vertical 동계수련회 block): the ruled line above or below is missing.
        const openTop = r > 0 && lineCoverage(img, rows[r], x0, x1) < 0.5;
        const openBottom = r < EXPECTED_ROWS - 1 && lineCoverage(img, rows[r + 1], x0, x1) < 0.5;
        if (openTop || openBottom) { cells.push({ date, name: "", title: "p", status: "retreat" }); continue; }

        const box = inkBox(img, x0, y0, x1, y1);
        if (box.count < 6) { cells.push({ date, name: "", title: "p", status: "empty" }); continue; }
        // A "→" is a tiny flat mark (≈10×3px at print size); a name is ≥ ~10px tall and ~40px wide.
        if (box.h <= cellH * 0.4 && box.count < 60) {
          cells.push({ date, name: prevName, title: prevTitle, status: "same" });
          continue;
        }

        const crop = await sharp(resized)
          .extract({ left: x0, top: y0, width: cellW, height: cellH })
          .resize({ width: cellW * 5, kernel: "lanczos3" })
          .normalise().threshold(150)
          .extend({ top: 12, bottom: 12, left: 12, right: 12, background: "#ffffff" })
          .png().toBuffer();
        const { data } = await worker.recognize(crop);
        const raw = data.text.replace(/\s+/g, "").trim();

        if (raw.includes("동계")) { cells.push({ date, name: "", title: "p", status: "retreat", raw }); continue; }
        // "DVD" is printed in place of a preacher when the sermon is a video.
        if (/DVD/i.test(raw)) { cells.push({ date, name: "DVD", title: "p", status: "ok", raw }); continue; }
        const m = matchPreacher(raw, roster, aliases);
        if (m.status === "corrected") corrected++;
        if (m.status === "unknown") unmatched++;
        cells.push({ date, name: m.name, title: m.title, status: m.status, raw });
        prevName = m.name; prevTitle = m.title;
      }
      churches.push({ no: r + 1, ko: CHURCHES[r].ko, en: CHURCHES[r].en, region: CHURCHES[r].region, sundays: cells });
    }

    return {
      coverageStart: sundays[0],
      coverageEnd: sundays[sundays.length - 1],
      quarter: `Q${quarter} ${year}`,
      churches,
      events: [...new Map(events.map((e) => [e.id, e])).values()],
      corrected,
      unmatched,
    };
  } finally {
    await worker.terminate();
  }
}

export { buildEastCoastEntries };
