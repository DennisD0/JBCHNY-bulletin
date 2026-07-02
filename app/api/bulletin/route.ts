import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(process.cwd(), "data", "bulletin.en.json");

export async function GET() {
  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const data = await request.json();
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
