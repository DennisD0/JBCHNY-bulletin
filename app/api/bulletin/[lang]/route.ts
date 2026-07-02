import { NextResponse } from "next/server";
import type { BulletinData } from "@/lib/bulletin-types";
import { isBulletinLanguage } from "@/lib/bulletin-languages";
import { notifySoftSyncLanguages, readBulletin, writeBulletin } from "@/lib/bulletin-store";

type Context = { params: Promise<{ lang: string }> };

function languageError() {
  return NextResponse.json({ error: "Unsupported bulletin language" }, { status: 404 });
}

export async function GET(_request: Request, { params }: Context) {
  const { lang } = await params;
  if (!isBulletinLanguage(lang)) return languageError();
  return NextResponse.json(readBulletin(lang));
}

export async function POST(request: Request, { params }: Context) {
  const { lang } = await params;
  if (!isBulletinLanguage(lang)) return languageError();

  const body = await request.json() as { data?: BulletinData; sectionKey?: string };
  if (!body.data) {
    return NextResponse.json({ error: "Bulletin data is required" }, { status: 400 });
  }

  const current = readBulletin(lang);
  if (lang === "en") {
    writeBulletin(lang, body.data);
    const changedSections = notifySoftSyncLanguages(current.data, body.data, body.sectionKey);
    return NextResponse.json({ ok: true, changedSections });
  }

  writeBulletin(lang, body.data, current.meta);
  return NextResponse.json({ ok: true });
}

