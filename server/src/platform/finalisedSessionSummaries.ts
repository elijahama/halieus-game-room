import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

// Statistics need result metadata, never replay payloads or whole board logs.
// Keep at most one parsed archive in flight per directory and cache only these
// small summaries. File metadata is rechecked on every read, including replacement
// and deletion; concurrent callers share the same refresh.
type Entry = { signature: string; record: any };
type DirectoryResult = { records: any[]; errors: Error[] };
const indexes = new Map<string, Map<string, Entry>>();
const pending = new Map<string, Promise<DirectoryResult>>();

function fields(source: any, names: readonly string[]): any {
  const result: any = {};
  if (!source || typeof source !== "object") return result;
  for (const name of names) if (Object.hasOwn(source, name)) result[name] = source[name];
  return result;
}
function playerSummary(player: any): any {
  const result = fields(player, ["id", "name", "isAi", "isBankrupt", "result", "chips", "seriesWins", "score"]);
  if (player?.progressionIdentity) result.progressionIdentity = fields(player.progressionIdentity, ["accountId", "beta", "activePlayMs"]);
  if (player?.progressionFeats) result.progressionFeats = fields(player.progressionFeats, ["straightFlush", "royalFlush"]);
  if (Array.isArray(player?.pieces)) result.pieces = player.pieces.map((piece: any) => fields(piece, ["steps"]));
  if (Array.isArray(player?.attempts)) result.attempts = Array(Math.min(6, player.attempts.length)).fill(null);
  return result;
}
function stateSummary(state: any): any {
  const result = fields(state, [
    "startedAt", "gameStartedAt", "started", "winnerPlayerId", "ranked", "matchMode", "blitz",
    "wordGameMode", "wordPuzzleKey", "wordDailyAccountId", "wordDailyClaimed",
    "solvedPlayerIds", "bestOf", "variant", "startingChips", "smallBlind", "bigBlind", "phase",
  ]);
  if (Array.isArray(state?.players)) result.players = state.players.map(playerSummary);
  if (state?.outcome) result.outcome = fields(state.outcome, ["winnerPlayerId", "countsAsCompletedPlay"]);
  if (state?.hand) result.hand = fields(state.hand, ["phase"]);
  if (state?.room) result.room = fields(state.room, ["started", "betaTournamentTest"]);
  if (Array.isArray(state?.rankedResults)) {
    result.rankedResults = state.rankedResults.map((row: any) => fields(row, ["playerId", "ratingBefore"]));
  }
  if (state?.playerStats && typeof state.playerStats === "object") {
    result.playerStats = Object.fromEntries(Object.entries(state.playerStats).map(([id, raw]) => {
      const stats: any = raw;
      const summary = fields(stats, ["kassManeuvers", "completedTrades", "initiatedThreeWayDeals", "finishPosition", "peakProperties", "rentPaid"]);
      // The comeback award only needs evidence of one qualifying historical point.
      const comeback = Array.isArray(stats?.history) && stats.history.find((point: any) =>
        Number.isFinite(point?.cash) && point.cash >= 0 && point.cash <= 150 &&
        Number.isFinite(point?.turnNumber) && point.turnNumber > 0);
      summary.history = comeback ? [fields(comeback, ["cash", "turnNumber"])] : [];
      return [id, summary];
    }));
  }
  if (state?.gameState) result.gameState = stateSummary(state.gameState);
  return result;
}
export function finalisedSessionSummary(record: any): any {
  return {
    ...fields(record, ["sessionId", "game", "roomCode", "status", "createdAt", "updatedAt", "finalisedAt"]),
    summary: fields(record?.summary, ["winner", "matchMode"]),
    state: stateSummary(record?.state),
  };
}
async function readSummary(path: string): Promise<any> {
  return finalisedSessionSummary(JSON.parse(await readFile(path, "utf8")));
}
async function refreshDirectory(root: string): Promise<DirectoryResult> {
  let files: string[];
  try { files = (await readdir(root)).filter(name => name.endsWith(".json")).sort(); }
  catch (error: any) {
    if (error.code !== "ENOENT") throw error;
    indexes.delete(root);
    return { records: [], errors: [] };
  }
  const previous = indexes.get(root) ?? new Map<string, Entry>();
  const next = new Map<string, Entry>();
  const errors: Error[] = [];
  for (const name of files) {
    const path = resolve(root, name);
    try {
      const info = await stat(path);
      const signature = [info.ino, info.size, info.mtimeMs, info.ctimeMs].join(":");
      const prior = previous.get(name);
      next.set(name, prior?.signature === signature ? prior : { signature, record: await readSummary(path) });
    } catch (error) {
      // Do not cache a broken file as a valid empty result. Strict progression
      // callers fall back to their last verified snapshot; history keeps its
      // established best-effort behavior and the next refresh retries the file.
      errors.push(error instanceof Error ? error : new Error("Unreadable session archive"));
    }
  }
  indexes.delete(root);
  indexes.set(root, next);
  while (indexes.size > 8) indexes.delete(indexes.keys().next().value!);
  return { records: [...next.values()].map(entry => entry.record), errors };
}
function readDirectory(root: string): Promise<DirectoryResult> {
  const existing = pending.get(root);
  if (existing) return existing;
  const work = refreshDirectory(root);
  pending.set(root, work);
  const cleanup = () => { if (pending.get(root) === work) pending.delete(root); };
  void work.then(cleanup, cleanup);
  return work;
}
export async function readFinalisedSessionSummaries(
  roots: readonly string[], options: { strict?: boolean } = {},
): Promise<any[]> {
  const records: any[] = [];
  for (const root of new Set(roots.map(path => resolve(path)))) {
    let result: DirectoryResult;
    try { result = await readDirectory(root); }
    catch (error) { if (options.strict) throw error; else continue; }
    if (options.strict && result.errors.length) throw result.errors[0];
    records.push(...result.records);
  }
  // Return an independent list: chronological sorts must not mutate another reader.
  return records;
}
