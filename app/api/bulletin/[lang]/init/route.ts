import { NextResponse } from "next/server";
import { readBulletin, writeBulletin } from "@/lib/bulletin-store";
import { translateBulletinContent } from "@/lib/bulletin-translation";

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
  try {
    const data = await translateBulletinContent(english.data, "ko");
    writeBulletin("ko", data, meta);
    return NextResponse.json({ data, meta });
  } catch (error) {
    return NextResponse.json(
      { error:error instanceof Error ? error.message : "Translation failed" },
      { status:502 },
    );
  }
}
