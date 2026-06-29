import { NextRequest, NextResponse } from "next/server";
import { checkIpRate, clientIp } from "@/lib/rate-limit";

const SITE = "https://bibletoppt.com";
const REFERER = `${SITE}/hymn/sheet-music/`;
// Impersonate a real browser — the site 403s plain bots.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;
  const n = parseInt(number, 10);
  if (!Number.isFinite(n) || n < 1 || n > 645) {
    return NextResponse.json({ error: "Hymn number must be 1–645" }, { status: 400 });
  }

  // Reuse the same per-IP rate limiter as the OMR route so one user can't
  // hammer the upstream site (or our queue) by spamming hymn fetches.
  const ipRate = checkIpRate(clientIp(req.headers), Date.now());
  if (!ipRate.ok) {
    return NextResponse.json(
      { error: ipRate.reason },
      { status: 429, headers: { "Retry-After": String(ipRate.retryAfter ?? 60) } }
    );
  }

  const padded = String(n).padStart(3, "0");

  // We fetch the JPG render rather than the PDF. The PDF is a high-resolution
  // scan (~30 MP) that exceeds Audiveris's image-size limit and would be
  // rejected. The JPG is pre-rendered at ~1327×2560 (3.4 MP) — comfortably
  // within Audiveris's limit and passes through our CLAHE/sharpen preprocessing
  // pipeline as a normal image file.

  // Step 1: get a short-lived JWT from the site's token endpoint.
  let token: string;
  try {
    const tokenRes = await fetch(
      `${SITE}/api/download/sheet-music?action=token&number=${padded}&format=jpg`,
      { headers: { "User-Agent": UA, Referer: REFERER + padded } }
    );
    if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
    const body = await tokenRes.json();
    if (typeof body?.token !== "string") throw new Error("no token in response");
    token = body.token;
  } catch (err) {
    return NextResponse.json(
      { error: `Could not fetch hymn sheet: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  // Step 2: exchange the token for the actual image.
  let imgRes: Response;
  try {
    imgRes = await fetch(
      `${SITE}/api/download/sheet-music?token=${token}&format=jpg`,
      { headers: { "User-Agent": UA, Referer: REFERER + padded } }
    );
    if (!imgRes.ok) throw new Error(`image ${imgRes.status}`);
    const ct = imgRes.headers.get("content-type") ?? "";
    if (!ct.includes("image") && !ct.includes("jpeg") && !ct.includes("jpg")) {
      throw new Error(`unexpected content-type: ${ct}`);
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Could not download sheet image: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  // Return as JPEG so the client names it .jpg and our isImageFile() check
  // routes it through the preprocessing pipeline instead of raw-to-Audiveris.
  const filename = `${padded}.jpg`;
  return new NextResponse(imgRes.body, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
