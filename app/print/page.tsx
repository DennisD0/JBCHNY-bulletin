import { readFileSync } from "fs";
import { join } from "path";
import BulletinPreview from "@/app/components/BulletinPreview";
import BulletinFitController from "@/app/components/BulletinFitController";
import type { BulletinData } from "@/lib/bulletin-types";

export const metadata = { title: "Bulletin Print" };

export default function PrintPage() {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), "data", "bulletin.en.json"), "utf-8")
  ) as BulletinData;

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
