import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(process.cwd(), "data", "bulletin.en.json");

export async function GET() {
  try {
    const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to read bulletin.en.json", error);
    return NextResponse.json({ error: "Failed to load bulletin data" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  // Reject payloads that aren't a plain object — never overwrite the dataset with
  // an array, primitive, or null. (No auth gate by design: trusted-users tool.)
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "Invalid bulletin payload" }, { status: 400 });
  }
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
