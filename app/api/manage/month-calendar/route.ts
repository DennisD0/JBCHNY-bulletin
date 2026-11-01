import { NextRequest, NextResponse } from "next/server";
import { readMonthSheets } from "@/lib/month-sheet";

// Reads a one-month calendar spreadsheet and returns what it would put in the bulletin's
// calendar section. Nothing is saved here: the editor applies the result to the open
// bulletin, and the normal Save stores it.

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // a month sheet is well under 1 MB

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json({ error: "Upload an Excel (.xlsx) file. In Google Sheets: File → Download → Microsoft Excel." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "That file is too large for a month calendar." }, { status: 413 });
  }

  try {
    const sheets = await readMonthSheets(Buffer.from(await file.arrayBuffer()));
    if (sheets.length === 0) {
      return NextResponse.json({ error: "No month calendar found in this file. Each sheet needs the month title and the LORD'S DAY / MON … SAT header." }, { status: 422 });
    }
    return NextResponse.json({ sheets });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read this file." }, { status: 422 });
  }
}
