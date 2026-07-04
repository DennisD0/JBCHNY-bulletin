import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BulletinData } from "@/lib/bulletin-types";
import {
  BULLETIN_LANGUAGES,
  defaultBulletinMeta,
  type BulletinLanguage,
  type BulletinMeta,
} from "@/lib/bulletin-languages";
import { SECTION_FIELD_MAP, snapshotSection } from "@/lib/section-field-map";

type StoredBulletin = BulletinData & { _meta?: BulletinMeta };

export function bulletinPath(language: BulletinLanguage) {
  return join(process.cwd(), "data", `bulletin.${language}.json`);
}

export function readBulletin(language: BulletinLanguage): { data: BulletinData; meta: BulletinMeta } {
  let stored: StoredBulletin;
  try {
    stored = JSON.parse(readFileSync(bulletinPath(language), "utf-8")) as StoredBulletin;
  } catch {
    // Missing or malformed file — return a safe default so callers (e.g.
    // notifySoftSyncLanguages) don't crash for a language that isn't populated yet.
    return { data: {} as BulletinData, meta: defaultBulletinMeta(language) };
  }
  const { _meta, ...data } = stored;
  const base = defaultBulletinMeta(language);
  // Deep-merge so a legacy/partial _meta always has a defined `sections` map
  // before the section-update logic writes into meta.sections[sectionKey].
  const meta: BulletinMeta = _meta
    ? { ...base, ..._meta, sections: { ...base.sections, ...(_meta.sections ?? {}) } }
    : base;
  return { data: data as BulletinData, meta };
}

export function writeBulletin(language: BulletinLanguage, data: BulletinData, meta?: BulletinMeta) {
  const stored = language === "en" ? data : { _meta: meta ?? defaultBulletinMeta(language), ...data };
  writeFileSync(bulletinPath(language), `${JSON.stringify(stored, null, 2)}\n`, "utf-8");
}

export function hashSection(data: BulletinData, sectionKey: string) {
  return createHash("sha256")
    .update(JSON.stringify(snapshotSection(data, sectionKey)))
    .digest("hex");
}

export function notifySoftSyncLanguages(previous: BulletinData, next: BulletinData, requestedSection?: string) {
  const sectionKeys = requestedSection && SECTION_FIELD_MAP[requestedSection]
    ? [requestedSection]
    : Object.keys(SECTION_FIELD_MAP);

  const changedKeys = sectionKeys.filter(
    (sectionKey) => hashSection(previous, sectionKey) !== hashSection(next, sectionKey),
  );

  for (const sectionKey of changedKeys) {
    const enContentHash = hashSection(next, sectionKey);
    const pendingEnContent = snapshotSection(next, sectionKey);
    for (const language of BULLETIN_LANGUAGES) {
      if (language === "en" || language === "ko") continue;
      const target = readBulletin(language);
      if (target.meta.sections[sectionKey]?.enContentHash === enContentHash) continue;
      target.meta.sections[sectionKey] = {
        status: "pending",
        enContentHash,
        pendingEnContent,
      };
      writeBulletin(language, target.data, target.meta);
    }
  }

  return changedKeys;
}

