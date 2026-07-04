import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { NextRequest, NextResponse } from "next/server";
import { checkIpRate, clientIp } from "@/lib/rate-limit";
import { toPdfPage, HYMNAL_MAX, type HymnalEdition } from "@/lib/hymnal-map";

const HYMNAL_PDF =
  process.env.HYMNAL_PDF ?? path.join(process.cwd(), "hymnal", "hymnal.pdf");

// Renderer script runs outside Next.js's bundler so mupdf's WASM loads cleanly.
const RENDERER = path.join(process.cwd(), "lib", "render-hymn-page.mjs");

const COLLECTION_TO_EDITION: Record<string, HymnalEdition> = {
  chansonggah: "찬송가",
  gracesong: "은혜찬송",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; number: string }> }
) {
  const { collection, number } = await params;

  const edition = COLLECTION_TO_EDITION[collection];
  if (!edition) {
    return NextResponse.json({ error: "Unknown collection" }, { status: 400 });
  }

  const n = parseInt(number, 10);
  const max = HYMNAL_MAX[edition];
  if (!Number.isFinite(n) || n < 1 || n > max) {
    return NextResponse.json(
      { error: `Hymn number must be 1–${max} for ${edition}` },
      { status: 400 }
    );
  }

  const ipRate = checkIpRate(clientIp(req.headers), Date.now());
  if (!ipRate.ok) {
    return NextResponse.json(
      { error: ipRate.reason },
      { status: 429, headers: { "Retry-After": String(ipRate.retryAfter ?? 60) } }
    );
  }

  const pdfPage = toPdfPage(n, edition); // 1-based
  const pageIndex = pdfPage - 1; // 0-based for mupdf

  const outPath = path.join(
    os.tmpdir(),
    `hymn-${collection}-${n}-${Date.now()}.png`
  );

  try {
    await renderPage(HYMNAL_PDF, pageIndex, outPath);
    const pngBuffer = await fs.readFile(outPath);
    const padded = String(n).padStart(3, "0");
    return new NextResponse(new Blob([pngBuffer], { type: "image/png" }), {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${padded}.png"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to render hymn page: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 500 }
    );
  } finally {
    await fs.unlink(outPath).catch(() => {});
  }
}

function renderPage(
  pdfPath: string,
  pageIndex: number,
  outPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath, // same node binary that's running Next.js
      [RENDERER, pdfPath, String(pageIndex), outPath],
      { windowsHide: true }
    );
    let stderr = "";
    let settled = false;
    // Bound the renderer: a hung mupdf process would otherwise leave this Promise
    // pending forever and orphan the child.
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill("SIGKILL");
      reject(new Error("Renderer timed out"));
    }, 30_000);
    proc.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start renderer: ${err.message}`));
    });
    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Renderer exited ${code}: ${stderr.trim()}`));
    });
  });
}
