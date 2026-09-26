import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { getSessionDataDirectory } from "./dataPaths.js";
import { rankedFormatFor } from "../../../shared/platform/rankedFormats.js";
import type {
  HalieusRankedLeaderboardEntry,
  HalieusRankedLeaderboardSnapshot,
} from "../../../shared/platform/rankedLeaderboard.js";

type RankedGame = "connect-four" | "ludo" | "ayo";

interface WorkingEntry {
  accountId: string;
  displayName: string;
  rating: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  firstPlaces: number;
  placementTotal: number;
  placementCount: number;
  roundDifferential: number;
  scoreDifferential: number;
}

const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { at: number; value: HalieusRankedLeaderboardSnapshot }>();

function expected(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

function ensure(map: Map<string, WorkingEntry>, player: any): WorkingEntry | null {
  const accountId = player?.progressionIdentity?.accountId;
  if (!accountId || player?.isAi) return null;
  const existing = map.get(accountId);
  if (existing) {
    if (typeof player.name === "string" && player.name.trim()) existing.displayName = player.name.trim();
    return existing;
  }
  const entry: WorkingEntry = {
    accountId,
    displayName: typeof player.name === "string" && player.name.trim() ? player.name.trim() : "Player",
    rating: 1000,
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    firstPlaces: 0,
    placementTotal: 0,
    placementCount: 0,
    roundDifferential: 0,
    scoreDifferential: 0,
  };
  map.set(accountId, entry);
  return entry;
}

function updateDuel(first: WorkingEntry, second: WorkingEntry, firstScore: number, k = 32): void {
  const firstExpected = expected(first.rating, second.rating);
  const secondExpected = 1 - firstExpected;
  const secondScore = 1 - firstScore;
  const firstNext = first.rating + k * (firstScore - firstExpected);
  const secondNext = second.rating + k * (secondScore - secondExpected);
  first.rating = firstNext;
  second.rating = secondNext;
}

function ludoProgress(player: any): number {
  const pieces = Array.isArray(player?.pieces) ? player.pieces : [];
  const finished = Number.isFinite(player?.finishedCount)
    ? Number(player.finishedCount)
    : pieces.filter((piece: any) => Number(piece?.steps) === 57).length;
  const travel = pieces.reduce((sum: number, piece: any) => sum + Math.max(0, Number(piece?.steps) || 0), 0);
  return finished * 10_000 + travel;
}

function rankedPlayers(state: any): any[] {
  const players = Array.isArray(state?.players) ? state.players : [];
  if (players.some((player: any) => player?.progressionIdentity?.beta || /^\[BETA\]/i.test(String(player?.name ?? "")))) return [];
  return players.filter((player: any) => !player?.isAi && player?.progressionIdentity?.accountId);
}

function processConnectFour(map: Map<string, WorkingEntry>, state: any): void {
  const players = rankedPlayers(state);
  if (players.length !== 2) return;
  const first = ensure(map, players[0]);
  const second = ensure(map, players[1]);
  if (!first || !second) return;

  const winnerId = state?.winnerPlayerId ?? null;
  const firstScore = winnerId == null ? 0.5 : winnerId === players[0].id ? 1 : 0;
  updateDuel(first, second, firstScore, 32);

  first.matches += 1;
  second.matches += 1;
  if (firstScore === 1) { first.wins += 1; second.losses += 1; }
  else if (firstScore === 0) { second.wins += 1; first.losses += 1; }
  else { first.draws += 1; second.draws += 1; }

  const firstRounds = Number(players[0]?.seriesWins) || 0;
  const secondRounds = Number(players[1]?.seriesWins) || 0;
  first.roundDifferential += firstRounds - secondRounds;
  second.roundDifferential += secondRounds - firstRounds;
}

function processAyo(map: Map<string, WorkingEntry>, state: any): void {
  const players = rankedPlayers(state);
  if (players.length !== 2) return;
  const first = ensure(map, players[0]);
  const second = ensure(map, players[1]);
  if (!first || !second) return;

  const winnerId = state?.winnerPlayerId ?? null;
  const firstScore = winnerId == null ? 0.5 : winnerId === players[0].id ? 1 : 0;
  updateDuel(first, second, firstScore, 32);

  first.matches += 1;
  second.matches += 1;
  if (firstScore === 1) { first.wins += 1; second.losses += 1; }
  else if (firstScore === 0) { second.wins += 1; first.losses += 1; }
  else { first.draws += 1; second.draws += 1; }

  const firstCaptured = Number(players[0]?.captured) || 0;
  const secondCaptured = Number(players[1]?.captured) || 0;
  first.scoreDifferential += firstCaptured - secondCaptured;
  second.scoreDifferential += secondCaptured - firstCaptured;
}

function processLudo(map: Map<string, WorkingEntry>, state: any): void {
  const players = rankedPlayers(state);
  if (players.length < 2) return;

  const winnerId = state?.winnerPlayerId ?? null;
  const ordered = [...players].sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    return ludoProgress(b) - ludoProgress(a) || Number(a?.seat ?? 0) - Number(b?.seat ?? 0);
  });

  const positionById = new Map<string, number>();
  ordered.forEach((player, index) => positionById.set(player.id, index + 1));

  const entries = players
    .map((player) => ({ player, entry: ensure(map, player) }))
    .filter((row): row is { player: any; entry: WorkingEntry } => Boolean(row.entry));
  if (entries.length < 2) return;

  const deltas = new Map<string, number>();
  const pairK = 24 / Math.max(1, entries.length - 1);
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i]!;
      const b = entries[j]!;
      const aPos = positionById.get(a.player.id) ?? entries.length;
      const bPos = positionById.get(b.player.id) ?? entries.length;
      const score = aPos === bPos ? 0.5 : aPos < bPos ? 1 : 0;
      const expA = expected(a.entry.rating, b.entry.rating);
      const deltaA = pairK * (score - expA);
      deltas.set(a.entry.accountId, (deltas.get(a.entry.accountId) ?? 0) + deltaA);
      deltas.set(b.entry.accountId, (deltas.get(b.entry.accountId) ?? 0) - deltaA);
    }
  }

  for (const { player, entry } of entries) {
    entry.rating += deltas.get(entry.accountId) ?? 0;
    entry.matches += 1;
    const position = positionById.get(player.id) ?? entries.length;
    entry.placementTotal += position;
    entry.placementCount += 1;
    if (position === 1) {
      entry.wins += 1;
      entry.firstPlaces += 1;
    } else {
      entry.losses += 1;
    }
  }
}

function compareEntries(game: RankedGame, a: WorkingEntry, b: WorkingEntry): number {
  const rating = b.rating - a.rating;
  if (Math.abs(rating) >= 0.5) return rating;
  if (game === "connect-four") return b.wins - a.wins || b.roundDifferential - a.roundDifferential || b.matches - a.matches;
  if (game === "ayo") return b.wins - a.wins || b.scoreDifferential - a.scoreDifferential || b.matches - a.matches;
  const aAverage = a.placementCount ? a.placementTotal / a.placementCount : Number.POSITIVE_INFINITY;
  const bAverage = b.placementCount ? b.placementTotal / b.placementCount : Number.POSITIVE_INFINITY;
  return b.firstPlaces - a.firstPlaces || aAverage - bAverage || b.matches - a.matches;
}

export async function buildRankedLeaderboard(game: RankedGame): Promise<HalieusRankedLeaderboardSnapshot> {
  const cached = cache.get(game);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const format = rankedFormatFor(game);
  if (!format) throw new Error(`No Ranked format is configured for ${game}.`);

  const directory = resolve(getSessionDataDirectory(), "finalized");
  let files: string[] = [];
  try { files = await readdir(directory); }
  catch (error: any) { if (error?.code !== "ENOENT") throw error; }

  const records: any[] = [];
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    try {
      const record = JSON.parse(await readFile(resolve(directory, file), "utf8"));
      if (record?.game === game && ["completed", "forfeit-completed"].includes(record?.status)) records.push(record);
    } catch {
      // A damaged/incomplete archive is never ranking evidence.
    }
  }
  records.sort((a, b) => Number(a?.finalisedAt ?? 0) - Number(b?.finalisedAt ?? 0) || String(a?.sessionId ?? "").localeCompare(String(b?.sessionId ?? "")));

  const map = new Map<string, WorkingEntry>();
  for (const record of records) {
    const state = record?.state?.gameState ?? record?.state;
    if (!state || state.matchMode !== "ranked") continue;
    if (game === "connect-four") processConnectFour(map, state);
    else if (game === "ludo") processLudo(map, state);
    else processAyo(map, state);
  }

  const sorted = [...map.values()].sort((a, b) => compareEntries(game, a, b));
  const entries: HalieusRankedLeaderboardEntry[] = sorted.map((entry, index) => ({
    rank: index + 1,
    accountId: entry.accountId,
    displayName: entry.displayName,
    rating: Math.round(entry.rating),
    provisional: entry.matches < format.provisionalMatches,
    matches: entry.matches,
    wins: entry.wins,
    losses: entry.losses,
    draws: entry.draws,
    ...(game === "ludo" ? {
      firstPlaces: entry.firstPlaces,
      averagePlacement: entry.placementCount ? Number((entry.placementTotal / entry.placementCount).toFixed(2)) : undefined,
    } : {}),
    ...(game === "connect-four" ? { roundDifferential: entry.roundDifferential } : {}),
    ...(game === "ayo" ? { scoreDifferential: entry.scoreDifferential } : {}),
  }));

  const value: HalieusRankedLeaderboardSnapshot = {
    game,
    model: format.model,
    generatedAt: Date.now(),
    entries,
  };
  cache.set(game, { at: Date.now(), value });
  return value;
}
