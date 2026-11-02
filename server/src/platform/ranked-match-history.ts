import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Express, Request } from "express";
import { getAuthenticatedAccount } from "./accounts.js";
import { getSessionDataDirectory } from "./dataPaths.js";
import { getAllRankedMatches } from "../games/mega-board/utils/rankings.js";
import type { RankedMatchSummary } from "../../../shared/games/mega-board/ranked.js";
import type { HgrRankedMatchHistoryEntry, HgrRankedMatchHistoryPage } from "../../../shared/platform/rankedMatchHistory.js";

const PAGE_SIZE = 25;
const CACHE_TTL_MS = 15_000;
const ALLOWED_GAMES = new Set([
  "mega-board", "poker", "blackjack", "whot", "ludo", "connect-four",
  "ayo", "hidden-dictator", "cheat", "dominoes", "word-game",
  "password", "anagrams-race", "word-board",
]);
function limitedName(name: unknown): string {
  return typeof name === "string" ? name.trim().slice(0, 80) : "";
}
function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function rankedArchive(record: any): HgrRankedMatchHistoryEntry | null {
  if (!record || !ALLOWED_GAMES.has(record.game)
    || !["completed", "forfeit-completed"].includes(record.status)) return null;
  const state = record.state?.gameState ?? record.state;
  if (!state || typeof state !== "object") return null;
  const isMega = record.game === "mega-board";
  if (isMega ? state.ranked !== true : state.matchMode !== "ranked") return null;
  if (record.state?.room?.betaTournamentTest || state.betaTournamentTest) return null;
  if (!Array.isArray(state.players) || !validTime(record.finalisedAt)) return null;
  // Published Rated history must not expose practice/Beta records or games with
  // AI seats as competitive matches. Historic ambiguous archives are omitted.
  if (state.players.some((player: any) => player?.isAi === true
    || player?.progressionIdentity?.beta === true
    || /^\[BETA\]/i.test(String(player?.name ?? "")))) return null;
  const realPlayers = state.players.filter((player: any) => !player?.isAi && limitedName(player?.name));
  if (realPlayers.length < 2) return null;
  const winnerId = state.winnerPlayerId ?? state.winnerId ?? null;
  const rankedResults: any[] = isMega && Array.isArray(state.rankedResults) ? state.rankedResults : [];
  const positions = new Map<string, { placement: number | null; ratingDelta: number | null }>();
  for (const result of rankedResults) {
    if (!result || typeof result.playerId !== "string") continue;
    positions.set(result.playerId, {
      placement: Number.isSafeInteger(result.finishPosition) && result.finishPosition > 0 ? result.finishPosition : null,
      ratingDelta: Number.isSafeInteger(result.ratingDelta) ? result.ratingDelta : null,
    });
  }
  const players = realPlayers.map((player: any) => {
    const ranked = positions.get(player.id);
    return {
      name: limitedName(player.name),
      placement: ranked?.placement ?? (winnerId === player.id ? 1 : null),
      winner: winnerId != null && winnerId === player.id,
      ratingDelta: ranked?.ratingDelta ?? null,
    };
  });
  const id = isMega
    ? String(state.rankedMatchId || `ranked-${state.roomCode || record.roomCode}-${state.gameStartedAt}`)
    : String(record.sessionId ?? "");
  const roomCode = String(record.roomCode ?? state.roomCode ?? "").slice(0, 20);
  if (!id || !roomCode) return null;
  return { id, game: record.game, roomCode, completedAt: record.finalisedAt, players };
}
function storedMega(match: RankedMatchSummary): HgrRankedMatchHistoryEntry | null {
  if (!match?.matchId || !validTime(match.completedAt) || !Array.isArray(match.players)) return null;
  const players = match.players
    .filter(row => limitedName(row?.playerName))
    .map(row => ({
      name: limitedName(row.playerName),
      placement: Number.isSafeInteger(row.finishPosition) && row.finishPosition > 0 ? row.finishPosition : null,
      winner: row.finishPosition === 1,
      ratingDelta: Number.isSafeInteger(row.ratingDelta) ? row.ratingDelta : null,
    }));
  if (players.length < 2) return null;
  return { id: match.matchId, game: "mega-board",
    roomCode: String(match.roomCode ?? "").slice(0, 20),
    completedAt: match.completedAt, players };
}
function sortMatches(a: HgrRankedMatchHistoryEntry, b: HgrRankedMatchHistoryEntry): number {
  return b.completedAt - a.completedAt || a.game.localeCompare(b.game) || a.id.localeCompare(b.id);
}
/** Reuse the retained, authoritative sessions; never manufacture old results. */
export function createRankedMatchHistory(
  directory = resolve(getSessionDataDirectory(), "finalized"),
  megaMatches: () => RankedMatchSummary[] = getAllRankedMatches,
) {
  let cache: { at: number; entries: HgrRankedMatchHistoryEntry[] } | null = null;
  let inFlight: Promise<HgrRankedMatchHistoryEntry[]> | null = null;
  async function snapshot() {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.entries;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const matches = new Map<string, HgrRankedMatchHistoryEntry>();
      let files: string[] = [];
      try { files = await readdir(directory); }
      catch (error: any) { if (error?.code !== "ENOENT") throw error; }
      for (const filename of files.filter(name => name.endsWith(".json"))) {
        try {
          const record = JSON.parse(await readFile(resolve(directory, filename), "utf8"));
          const entry = rankedArchive(record);
          if (entry) matches.set(entry.game + ":" + entry.id, entry);
        } catch {
          // A damaged record is not Ranked history evidence.
        }
      }
      // The canonical Mega Board ranked ledger includes genuine older results
      // even if a session archive was not produced. It also has exact rating
      // deltas, so prefer it when both records describe the same match.
      for (const match of megaMatches()) {
        const entry = storedMega(match);
        if (entry) matches.set(entry.game + ":" + entry.id, entry);
      }
      const entries = [...matches.values()].sort(sortMatches);
      cache = { at: Date.now(), entries };
      return entries;
    })().finally(() => { inFlight = null; });
    return inFlight;
  }
  async function list(offset = 0, game = "all"): Promise<HgrRankedMatchHistoryPage> {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000
      || (game !== "all" && !ALLOWED_GAMES.has(game))) throw new Error("Invalid Ranked history page or game.");
    const all = await snapshot();
    const filtered = game === "all" ? all : all.filter(row => row.game === game);
    return { matches: filtered.slice(offset, offset + PAGE_SIZE), total: filtered.length,
      nextOffset: offset + PAGE_SIZE < filtered.length ? offset + PAGE_SIZE : null };
  }
  return { list };
}

export const rankedMatchHistory = createRankedMatchHistory();
export function registerRankedMatchHistoryRoutes(app: Express,
  authenticate: (request: Request) => { id: string } | null = getAuthenticatedAccount,
  history = rankedMatchHistory,
): void {
  app.get("/ranked/matches", async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (!authenticate(request)) {
      response.status(401).json({ reason: "Sign in to view Ranked match history." });
      return;
    }
    const rawOffset = String(request.query.offset ?? "0");
    const game = String(request.query.game ?? "all");
    if (!/^(0|[1-9]\d{0,6})$/.test(rawOffset) ||
      (game !== "all" && !ALLOWED_GAMES.has(game))) {
      response.status(400).json({ reason: "Invalid Ranked history page or game." });
      return;
    }
    try { response.json(await history.list(Number(rawOffset), game)); }
    catch {
      response.status(503).json({ reason: "Ranked match history is temporarily unavailable." });
    }
  });
}
