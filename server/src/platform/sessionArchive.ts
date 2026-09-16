import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { APP_VERSION } from "../../../shared/version.js";
import { getSessionDataDirectory } from "./dataPaths.js";

export type ArchiveGame = "mega-board" | "poker" | "blackjack" | "whot" | "ludo" | "hidden-dictator" | "connect-four" | "word-game" | "password" | "anagrams-race" | "cheat" | "dominoes" | "ayo" | "word-board";
export type ArchiveStatus = "completed" | "forfeit-completed" | "host-ended" | "incomplete";

const dataRoot = getSessionDataDirectory();
const workingDir = resolve(dataRoot, "working");
const finalDir = resolve(dataRoot, "finalized");
const queueDir = resolve(dataRoot, "upload-queue");
const indexPath = resolve(dataRoot, "sessions-index.ndjson");
const driveConfigPath = resolve(dataRoot, "drive-archive-config.json");

const driveConfig = {
  schemaVersion: 1,
  syncMode: "google-oauth-required",
  rootFolderId: "1eDMQAe3pWWhVt4En-YaxmoLp61pV6Kzm",
  indexSpreadsheetId: "1K0r04km_qSMpu0vaV1sAkmBz2kKU6iav_ZdFSKh99uQ",
  folders: {
    "mega-board": "1i2AVGxK0k8LpZ_hq_Qs-dE8EAeRgd-yX",
    poker: "1p-2JxhcviTKCtODJNZ7nZdTBxjPto3jT",
    blackjack: "1xrOJ7h6Mz6FIoPCKIUJlos2aklj0Sjob",
    whot: "1FghodUBTsqnf_lfKxHQPor96Ek5rau6V",
    ludo: "17z-I-yAGVgw0SZPETis4eE3mSdfD_Rts",
    incomplete: "1XubUvcQaCp0qzcf0b4ssxsKPbPS9Cc2a",
  },
};

const pendingWrites = new Map<string, NodeJS.Timeout>();
const latestPayloads = new Map<string, unknown>();
const finalizedKeys = new Set<string>();

function safePart(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
}

function archiveKey(game: ArchiveGame, code: string, createdAt: number): string {
  return `${game}-${safePart(code)}-${Math.max(0, Math.floor(createdAt))}`;
}

function sanitise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitise);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (/reconnecttoken|recoverykey|access_token|refresh_token|authorization/i.test(key)) continue;
      output[key] = sanitise(child);
    }
    return output;
  }
  return value;
}

async function ensureArchiveDirs(): Promise<void> {
  await Promise.all([
    mkdir(workingDir, { recursive: true }),
    mkdir(finalDir, { recursive: true }),
    mkdir(queueDir, { recursive: true }),
  ]);
  if (!existsSync(driveConfigPath)) {
    await writeFile(driveConfigPath, JSON.stringify(driveConfig, null, 2), "utf8");
  }
}

function baseRecord(game: ArchiveGame, code: string, createdAt: number, payload: unknown) {
  return {
    schemaVersion: 1,
    sessionId: archiveKey(game, code, createdAt),
    game,
    roomCode: code,
    appVersion: APP_VERSION,
    createdAt,
    updatedAt: Date.now(),
    state: sanitise(payload),
  };
}

async function writeWorking(game: ArchiveGame, code: string, createdAt: number, payload: unknown): Promise<void> {
  await ensureArchiveDirs();
  const record = baseRecord(game, code, createdAt, payload);
  await writeFile(resolve(workingDir, `${record.sessionId}.json`), JSON.stringify(record, null, 2), "utf8");
}

export function recordWorkingSession(game: ArchiveGame, code: string, createdAt: number, payload: unknown): void {
  const key = archiveKey(game, code, createdAt);
  if (finalizedKeys.has(key)) return;
  latestPayloads.set(key, payload);
  if (pendingWrites.has(key)) return;
  pendingWrites.set(key, setTimeout(() => {
    pendingWrites.delete(key);
    const latest = latestPayloads.get(key);
    latestPayloads.delete(key);
    if (latest !== undefined) {
      void writeWorking(game, code, createdAt, latest).catch((error) => {
        console.error("Session archive working write failed:", error);
      });
    }
  }, 250));
}

export async function finalizeSession(
  game: ArchiveGame,
  code: string,
  createdAt: number,
  status: ArchiveStatus,
  payload: unknown,
  summary: Record<string, unknown> = {},
): Promise<void> {
  const key = archiveKey(game, code, createdAt);
  await ensureArchiveDirs();
  const finalPath = resolve(finalDir, `${key}.json`);
  if (finalizedKeys.has(key) || existsSync(finalPath)) {
    finalizedKeys.add(key);
    return;
  }
  finalizedKeys.add(key);
  const timer = pendingWrites.get(key);
  if (timer) clearTimeout(timer);
  pendingWrites.delete(key);
  latestPayloads.delete(key);

  const record = {
    ...baseRecord(game, code, createdAt, payload),
    status,
    finalisedAt: Date.now(),
    summary: sanitise(summary),
  };
  await writeFile(finalPath, JSON.stringify(record, null, 2), "utf8");

  const workingPath = resolve(workingDir, `${key}.json`);
  if (existsSync(workingPath)) {
    try {
      await rename(workingPath, resolve(workingDir, `${key}.archived.json`));
    } catch {
      // Non-fatal: final file is canonical once written.
    }
  }

  const gameFolderId = (driveConfig.folders as Record<string, string>)[game];
  const folderId = status === "incomplete" ? driveConfig.folders.incomplete : (gameFolderId ?? driveConfig.rootFolderId);
  const queueTask = {
    queueVersion: 1,
    sessionId: key,
    queuedAt: Date.now(),
    status: "pending-oauth",
    sourcePath: finalPath,
    driveFolderId: folderId,
    driveIndexSpreadsheetId: driveConfig.indexSpreadsheetId,
    fileName: `${key}.json`,
  };
  await writeFile(resolve(queueDir, `${key}.json`), JSON.stringify(queueTask, null, 2), "utf8");
  await appendFile(indexPath, JSON.stringify({
    sessionId: key,
    game,
    roomCode: code,
    version: APP_VERSION,
    createdAt,
    finalisedAt: record.finalisedAt,
    status,
    ...sanitise(summary) as Record<string, unknown>,
    localFile: finalPath,
    syncState: "queued",
  }) + "\n", "utf8");
}

export async function getSessionArchiveStatus(): Promise<{ configured: boolean; pendingUploads: number }> {
  await ensureArchiveDirs();
  const queueListing = await import("node:fs/promises").then(({ readdir }) => readdir(queueDir));
  return {
    configured: true,
    pendingUploads: queueListing.filter((name) => name.endsWith(".json")).length,
  };
}
