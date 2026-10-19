import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAccountDataDirectory } from "./dataPaths.js";

/**
 * Server-only one-attempt ledger. A daily attempt is reserved on the first
 * submitted guess, not on opening the lobby. The account/day key is derived
 * from an authenticated socket session, never from user-entered player names.
 *
 * wx is an atomic create-if-absent operation. It survives game-room deletion,
 * process restarts, concurrent sockets and different browser devices.
 */
interface DailyAttemptClaim {
  schema: 1;
  puzzleKey: string;
  accountHash: string;
  roomAttemptId: string;
  claimedAt: number;
}

function claimPath(accountId: string, puzzleKey: string): string {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(puzzleKey)
    || new Date(puzzleKey + "T00:00:00.000Z").toISOString().slice(0, 10) !== puzzleKey) {
    throw new Error("Invalid daily puzzle date.");
  }
  const accountHash = createHash("sha256").update(accountId).digest("hex");
  return resolve(getAccountDataDirectory(), "word-game-daily-attempts", puzzleKey, accountHash + ".json");
}

/** Check the durable ledger without mutating it; caller must still reserve on submit. */
export function existingDailyWordAttempt(accountId: string, puzzleKey: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(claimPath(accountId, puzzleKey), "utf8")) as DailyAttemptClaim;
    if (parsed.schema !== 1 || parsed.puzzleKey !== puzzleKey
      || parsed.accountHash !== createHash("sha256").update(accountId).digest("hex")
      || typeof parsed.roomAttemptId !== "string" || !parsed.roomAttemptId) {
      throw new Error("Daily attempt ledger is malformed.");
    }
    return parsed.roomAttemptId;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error; // fail closed if storage is corrupted or unreadable
  }
}

export function reserveDailyWordAttempt(accountId: string, puzzleKey: string, roomAttemptId: string): boolean {
  if (!accountId || !roomAttemptId) throw new Error("A daily attempt requires authenticated account and room identity.");
  const path = claimPath(accountId, puzzleKey);
  const accountHash = createHash("sha256").update(accountId).digest("hex");
  const record: DailyAttemptClaim = {
    schema: 1, puzzleKey, accountHash, roomAttemptId, claimedAt: Date.now(),
  };
  mkdirSync(resolve(path, ".."), { recursive: true });
  try {
    writeFileSync(path, JSON.stringify(record) + "\n", { flag: "wx", mode: 0o600, encoding: "utf8" });
    return true;
  } catch (error: any) {
    if (error?.code !== "EEXIST") throw error;
    // Same match reconnect/resume: still the originally reserved attempt.
    // Any new room or replay gets no further ranked attempt.
    return existingDailyWordAttempt(accountId, puzzleKey) === roomAttemptId;
  }
}
