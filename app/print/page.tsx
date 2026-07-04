import { readFileSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";
import BulletinPreview from "@/app/components/BulletinPreview";
import BulletinFitController from "@/app/components/BulletinFitController";
import type { BulletinData } from "@/lib/bulletin-types";
import type { BulletinLanguage } from "@/lib/bulletin-languages";

export const metadata = { title: "Bulletin Print" };

const VALID_LANGS = new Set<BulletinLanguage>(["en", "es", "ko", "zh", "ru"]);

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language: BulletinLanguage = VALID_LANGS.has(lang as BulletinLanguage)
    ? (lang as BulletinLanguage)
    : "en";
  let data: BulletinData;
  try {
    data = JSON.parse(
      readFileSync(join(process.cwd(), "data", `bulletin.${language}.json`), "utf-8")
    ) as BulletinData;
  } catch {
    // Missing or malformed bulletin file — show a 404 rather than an unhandled 500.
    notFound();
  }

  return (
    <>
      <style>{`
        @page { size: 14in 8.5in; margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .bulletin-page { page-break-after: always; break-after: page; }
        .bulletin-page:last-child { page-break-after: avoid; break-after: avoid; }
        nextjs-portal { display: none !important; }
      `}</style>
      <BulletinPreview data={data} />
      <BulletinFitController fitKey={JSON.stringify(data)} />
    </>
  );
}
