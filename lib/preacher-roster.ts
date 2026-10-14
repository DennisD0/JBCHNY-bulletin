import { readDataJson, writeDataJson } from "./cloud-data";
import { PREACHERS, learnFromGrid, type GridChurch, type LearnedRoster } from "./schedule-grid-shared";

const FILE = "preacher_roster.json";

async function loadLearned(): Promise<LearnedRoster> {
  const saved = await readDataJson<Partial<LearnedRoster>>(FILE).catch(() => null);
  return { names: saved?.names ?? {}, aliases: saved?.aliases ?? {} };
}

/** Built-in preachers plus anything people have added, and the learned OCR corrections. */
export async function loadRoster() {
  const learned = await loadLearned();
  return { roster: { ...PREACHERS, ...learned.names }, aliases: learned.aliases };
}

/** Remember corrections made in the review table so the same misread is fixed next time. */
export async function saveLearnedFromGrid(churches: GridChurch[]): Promise<void> {
  const prior = await loadLearned();
  const next = learnFromGrid(churches, prior);
  if (JSON.stringify(next) !== JSON.stringify(prior)) await writeDataJson(FILE, next);
}
