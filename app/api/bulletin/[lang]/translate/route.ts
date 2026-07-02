import { NextResponse } from "next/server";
import { isBulletinLanguage } from "@/lib/bulletin-languages";
import { readBulletin, writeBulletin } from "@/lib/bulletin-store";
import { translateBulletinContent } from "@/lib/bulletin-translation";

type Context = { params: Promise<{ lang: string }> };

export async function POST(_request: Request, { params }: Context) {
  const { lang } = await params;
  if (!isBulletinLanguage(lang) || lang === "en") {
    return NextResponse.json({ error:"Translation is only available for non-English bulletins" }, { status:400 });
  }

  try {
    const english = readBulletin("en");
    const target = readBulletin(lang);
    const data = await translateBulletinContent(english.data, lang);
    const meta = {
      ...target.meta,
      isolated: lang === "ko",
      initializedFromEn: true,
      sections: {},
    };
    writeBulletin(lang, data, meta);
    return NextResponse.json({ data, meta });
  } catch (error) {
    return NextResponse.json(
      { error:error instanceof Error ? error.message : "Translation failed" },
      { status:502 },
    );
  }
}

