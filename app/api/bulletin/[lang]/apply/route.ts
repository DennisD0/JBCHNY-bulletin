import { NextResponse } from "next/server";
import type { BulletinData } from "@/lib/bulletin-types";
import { isBulletinLanguage } from "@/lib/bulletin-languages";
import { readBulletin, writeBulletin } from "@/lib/bulletin-store";
import { SECTION_FIELD_MAP } from "@/lib/section-field-map";
import { translateBulletinContent } from "@/lib/bulletin-translation";

type Context = { params: Promise<{ lang: string }> };

export async function POST(request: Request, { params }: Context) {
  const { lang } = await params;
  if (!isBulletinLanguage(lang) || lang === "en" || lang === "ko") {
    return NextResponse.json({ error: "Sync apply is not available for this language" }, { status: 400 });
  }

  const { sectionKey } = await request.json() as { sectionKey?: string };
  if (!sectionKey || !SECTION_FIELD_MAP[sectionKey]) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const bulletin = readBulletin(lang);
  const sync = bulletin.meta.sections[sectionKey];
  if (!sync?.pendingEnContent) {
    return NextResponse.json({ error: "No pending English content" }, { status: 409 });
  }

  let sectionData: Partial<BulletinData>;
  try {
    sectionData = await translateBulletinContent(sync.pendingEnContent, lang);
  } catch (error) {
    return NextResponse.json(
      { error:error instanceof Error ? error.message : "Translation failed" },
      { status:502 },
    );
  }
  const data = { ...bulletin.data, ...sectionData } as BulletinData;
  bulletin.meta.sections[sectionKey] = { ...sync, status: "synced" };
  writeBulletin(lang, data, bulletin.meta);

  return NextResponse.json({ data, sectionData, meta: bulletin.meta });
}
