import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// tesseract.js downloads language data from a CDN on every cold worker unless told
// where to find it. On the small VM that download alone can blow past the reverse
// proxy's 60s timeout (nginx then returns an HTML 504 page, which the client fails
// to parse as JSON). The repo already ships the traineddata files for Audiveris,
// so point tesseract.js at them.
export function localTessdataDir(langs: string[] = ["kor", "eng"]): string | undefined {
  const candidates = [
    process.env.AUDIVERIS_TESSDATA_DIR,
    path.join(process.cwd(), "tools", "audiveris", "tessdata"),
  ];
  for (const dir of candidates) {
    if (dir && langs.every((l) => fs.existsSync(path.join(dir, `${l}.traineddata`)))) return dir;
  }
  return undefined;
}

export async function createOcrWorker(langs: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createWorker } = require("tesseract.js") as typeof import("tesseract.js");
  const langPath = localTessdataDir(langs.split("+"));
  return createWorker(langs, 1, langPath ? { langPath, gzip: false, cachePath: os.tmpdir() } : {});
}
