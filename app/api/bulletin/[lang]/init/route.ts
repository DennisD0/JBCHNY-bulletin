import { NextResponse } from "next/server";
import { readBulletin, writeBulletin } from "@/lib/bulletin-store";

type Context = { params: Promise<{ lang: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { lang } = await params;
  if (lang !== "ko") {
    return NextResponse.json({ error: "Only Korean supports one-time initialization" }, { status: 400 });
  }

  const english = readBulletin("en");
  const korean = readBulletin("ko");
  if (korean.meta.initializedFromEn) {
    return NextResponse.json({ error: "Korean has already been initialized" }, { status: 409 });
  }

  const meta = {
    ...korean.meta,
    language: "ko" as const,
    isolated: true,
    initializedFromEn: true,
    sections: {},
  };
  writeBulletin("ko", english.data, meta);
  return NextResponse.json({ data: english.data, meta });
}

