import { NextResponse } from "next/server";
import { isBulletinLanguage } from "@/lib/bulletin-languages";
import { readBulletin, writeBulletin } from "@/lib/bulletin-store";
import { SECTION_FIELD_MAP } from "@/lib/section-field-map";

type Context = { params: Promise<{ lang: string }> };

export async function POST(request: Request, { params }: Context) {
  const { lang } = await params;
  if (!isBulletinLanguage(lang) || lang === "en" || lang === "ko") {
    return NextResponse.json({ error: "Sync dismiss is not available for this language" }, { status: 400 });
  }

  let body: { sectionKey?: string };
  try {
    body = await request.json() as { sectionKey?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { sectionKey } = body;
  if (!sectionKey || !SECTION_FIELD_MAP[sectionKey]) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const bulletin = readBulletin(lang);
  const sync = bulletin.meta.sections[sectionKey];
  if (!sync) {
    return NextResponse.json({ error: "No sync notification for this section" }, { status: 404 });
  }

  bulletin.meta.sections[sectionKey] = { ...sync, status: "dismissed" };
  writeBulletin(lang, bulletin.data, bulletin.meta);
  return NextResponse.json({ ok: true, meta: bulletin.meta });
}

