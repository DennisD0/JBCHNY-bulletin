import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Storage } from "@google-cloud/storage";

// Uploaded plans (reading plan, monthly schedule) are persisted in a Google
// Cloud Storage bucket so they survive restarts and redeploys. The repo copy in
// data/ is only the fallback used when nothing has been uploaded yet or when
// GCS_BUCKET is not configured (e.g. local development).

const PREFIX = "data/";

let storage: Storage | null = null;

function bucketName(): string | null {
  return process.env.GCS_BUCKET?.trim() || null;
}

function bucket(name: string) {
  storage ??= new Storage();
  return storage.bucket(name);
}

function localPath(name: string) {
  return join(process.cwd(), "data", name);
}

function readLocal<T>(name: string): T | null {
  const p = localPath(name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch (error) {
    console.error(`Failed to read/parse local ${name}`, error);
    return null;
  }
}

/** Read a JSON data file: the uploaded GCS copy if present, else the repo copy. */
export async function readDataJson<T>(name: string): Promise<T | null> {
  const bn = bucketName();
  if (bn) {
    try {
      const file = bucket(bn).file(PREFIX + name);
      const [exists] = await file.exists();
      if (exists) {
        const [buf] = await file.download();
        return JSON.parse(buf.toString("utf8")) as T;
      }
    } catch (error) {
      console.error(`GCS read failed for ${name}, using local copy`, error);
    }
  }
  return readLocal<T>(name);
}

/** Persist a JSON data file to GCS (when configured) and the local data dir. */
export async function writeDataJson(name: string, data: unknown): Promise<void> {
  const body = JSON.stringify(data, null, 2);
  const bn = bucketName();
  if (bn) {
    // Let a GCS failure propagate so the user sees "Save failed" instead of a
    // false success that would silently vanish on the next deploy.
    await bucket(bn).file(PREFIX + name).save(body, { contentType: "application/json" });
  }
  try {
    writeFileSync(localPath(name), body);
  } catch (error) {
    // The local copy is a cache; only fatal when GCS isn't doing the persisting.
    if (!bn) throw error;
    console.error(`Local write failed for ${name}`, error);
  }
}
