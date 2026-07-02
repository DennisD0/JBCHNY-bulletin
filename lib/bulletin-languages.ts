import type { BulletinData } from "@/lib/bulletin-types";

export const BULLETIN_LANGUAGES = ["en", "es", "ko", "zh", "ru"] as const;

export type BulletinLanguage = (typeof BULLETIN_LANGUAGES)[number];

export type SectionSyncStatus = "pending" | "synced" | "dismissed";

export interface SectionSyncMeta {
  status: SectionSyncStatus;
  enContentHash: string;
  pendingEnContent?: Partial<BulletinData>;
}

export interface BulletinMeta {
  language: BulletinLanguage;
  isolated: boolean;
  initializedFromEn: boolean;
  sections: Record<string, SectionSyncMeta>;
}

export interface BulletinApiResponse {
  data: BulletinData;
  meta: BulletinMeta;
}

export interface LanguageLock {
  sessionId: string;
  userName: string;
  acquiredAt: number;
  collaborators?: string[]; // sessionIds of accepted collaborators
}

export type LanguageLocks = Record<BulletinLanguage, LanguageLock | null>;

export function isBulletinLanguage(value: string): value is BulletinLanguage {
  return BULLETIN_LANGUAGES.includes(value as BulletinLanguage);
}

export function defaultBulletinMeta(language: BulletinLanguage): BulletinMeta {
  return {
    language,
    isolated: language === "ko",
    initializedFromEn: language === "en",
    sections: {},
  };
}

