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
  const stored = JSON.parse(readFileSync(bulletinPath(language), "utf-8")) as StoredBulletin;
  const { _meta, ...data } = stored;
  return {
    data: data as BulletinData,
    meta: _meta ?? defaultBulletinMeta(language),
  };
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

