/** Isolated Mega Board Tournament ratings. No import or write to normal Ranked persistence. */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GameState } from "../../../../../shared/games/mega-board/game-state.js";
import {
  DEFAULT_RANKED_RATING, MINIMUM_RANKED_RATING, calculatePlacementDelta,
  getAwardBonusForPlayer, getPerformanceBonusForPlayer,
  type RankedMatchPlayerResult,
} from "../../../../../shared/games/mega-board/ranked.js";
import { getMegaBoardDataDirectory } from "../../../platform/dataPaths.js";

export interface TournamentSeat { playerId: string; accountId: string; guildId: string | null }
export interface TournamentBoardAssignment {
  tournamentId: string; fixtureId: string; boardMatchId: string;
  roomCode: string; gameStartedAt: number; seats: TournamentSeat[];
}
export interface TournamentPlayerResult extends RankedMatchPlayerResult {
  accountId: string; guildId: string | null;
}
export interface TournamentBoardResult {
  tournamentId: string; fixtureId: string; boardMatchId: string;
  roomCode: string; gameStartedAt: number; completedAt: number;
  players: TournamentPlayerResult[];
}
export interface TournamentRatingEntry {
  accountId: string; playerName: string; rating: number;
  gamesPlayed: number; wins: number; podiums: number;
  totalFinish: number; averageFinish: number; awardsWon: number;
  performancePoints: number; lastPlayedAt: number;
}
interface TournamentRatingDocument {
  version: 1; savedAt: number; leaderboard: TournamentRatingEntry[]; boards: TournamentBoardResult[];
}
export const TOURNAMENT_RATINGS_PATH = path.resolve(getMegaBoardDataDirectory(), "tournament-rankings.json");

function initialEntry(accountId: string, playerName: string): TournamentRatingEntry {
  return {
    accountId, playerName, rating: DEFAULT_RANKED_RATING,
    gamesPlayed: 0, wins: 0, podiums: 0, totalFinish: 0,
    averageFinish: 0, awardsWon: 0, performancePoints: 0, lastPlayedAt: 0,
  };
}
function requiredId(id: unknown, label: string): asserts id is string {
  if (typeof id !== "string" || !id.trim() || id.length > 200) throw new Error(`Missing or invalid ${label}`);
}
function validateBoard(state: GameState, assignment: TournamentBoardAssignment): void {
  requiredId(assignment.tournamentId, "tournamentId");
  requiredId(assignment.fixtureId, "fixtureId");
  requiredId(assignment.boardMatchId, "boardMatchId");
  requiredId(assignment.roomCode, "roomCode");
  if (state.phase !== "finished" || !state.winnerId) throw new Error("Tournament board is not finished");
  if (state.ranked || state.blitz) throw new Error("Regular Ranked and Blitz rooms cannot be tournament boards");
  if (state.roomCode !== assignment.roomCode || state.gameStartedAt !== assignment.gameStartedAt ||
      !Number.isSafeInteger(assignment.gameStartedAt) || assignment.gameStartedAt <= 0) {
    throw new Error("Tournament board identity does not match its trusted assignment");
  }
  if (!Array.isArray(assignment.seats) || assignment.seats.length !== state.players.length ||
      assignment.seats.length < 2) throw new Error("Tournament board roster does not match assignment");
  const playerIds = new Set<string>(); const accountIds = new Set<string>();
  for (const seat of assignment.seats) {
    requiredId(seat.playerId, "playerId"); requiredId(seat.accountId, "accountId");
    if (seat.guildId !== null) requiredId(seat.guildId, "guildId");
    if (playerIds.has(seat.playerId) || accountIds.has(seat.accountId)) throw new Error("Duplicate tournament seat identity");
    playerIds.add(seat.playerId); accountIds.add(seat.accountId);
  }
  if (!state.players.some((player) => player.id === state.winnerId) ||
      state.players.some((player) => player.isAi || !playerIds.has(player.id))) {
    throw new Error("Tournament assignment has an AI or unregistered player");
  }
}
function matchesAssignment(board: TournamentBoardResult, assignment: TournamentBoardAssignment): boolean {
  return board.tournamentId === assignment.tournamentId && board.fixtureId === assignment.fixtureId &&
    board.boardMatchId === assignment.boardMatchId && board.roomCode === assignment.roomCode &&
    board.gameStartedAt === assignment.gameStartedAt && board.players.length === assignment.seats.length &&
    board.players.every((result) => assignment.seats.some((seat) =>
      seat.playerId === result.playerId && seat.accountId === result.accountId && seat.guildId === result.guildId));
}
function computeResult(state: GameState, assignment: TournamentBoardAssignment,
  entries: Map<string, TournamentRatingEntry>) {
  const seatById = new Map(assignment.seats.map((seat) => [seat.playerId, seat]));
  const positionById = Object.fromEntries(state.players.map((player) => [
    player.id, player.id === state.winnerId ? 1 :
      state.playerStats[player.id]?.finishPosition ?? state.players.length,
  ]));
  const ratingById = Object.fromEntries(state.players.map((player) => [
    player.id, entries.get(seatById.get(player.id)!.accountId)?.rating ?? DEFAULT_RANKED_RATING,
  ]));
  const updates = new Map(entries);
  const completedAt = Date.now();
  const players = state.players.map((player): TournamentPlayerResult => {
    const seat = seatById.get(player.id)!;
    const previous = entries.get(seat.accountId) ?? initialEntry(seat.accountId, player.name);
    const placementDelta = calculatePlacementDelta(player.id, positionById, ratingById);
    const performanceBonus = getPerformanceBonusForPlayer(state, player.id);
    const awards = getAwardBonusForPlayer(state, player.id);
    const ratingAfter = Math.max(MINIMUM_RANKED_RATING, previous.rating + placementDelta + performanceBonus + awards.bonus);
    const finishPosition = positionById[player.id]!;
    const gamesPlayed = previous.gamesPlayed + 1;
    updates.set(seat.accountId, {
      ...previous, playerName: player.name, rating: ratingAfter, gamesPlayed,
      wins: previous.wins + Number(finishPosition === 1),
      podiums: previous.podiums + Number(finishPosition <= 3),
      totalFinish: previous.totalFinish + finishPosition,
      averageFinish: (previous.totalFinish + finishPosition) / gamesPlayed,
      awardsWon: previous.awardsWon + awards.awards.length,
      performancePoints: previous.performancePoints + performanceBonus + awards.bonus,
      lastPlayedAt: completedAt,
    });
    return {
      playerId: player.id, playerName: player.name, accountId: seat.accountId, guildId: seat.guildId,
      finishPosition, ratingBefore: previous.rating, placementDelta, performanceBonus,
      awardBonus: awards.bonus, ratingDelta: ratingAfter - previous.rating, ratingAfter,
      awards: awards.awards,
    };
  }).sort((a, b) => a.finishPosition - b.finishPosition || b.ratingDelta - a.ratingDelta);
  const board: TournamentBoardResult = {
    tournamentId: assignment.tournamentId, fixtureId: assignment.fixtureId,
    boardMatchId: assignment.boardMatchId, roomCode: assignment.roomCode,
    gameStartedAt: assignment.gameStartedAt, completedAt, players,
  };
  return { board, updates };
}

/** Single-writer tournament-only ledger. The coordinator must call load() first. */
export function createTournamentRatingLedger(filePath: string = TOURNAMENT_RATINGS_PATH) {
  if (path.basename(filePath).toLowerCase() === "rankings.json") {
    throw new Error("Tournament ratings must never use the regular Ranked file");
  }
  let entries = new Map<string, TournamentRatingEntry>();
  let boards = new Map<string, TournamentBoardResult>();
  let loaded = false;
  let operations: Promise<unknown> = Promise.resolve();

  async function load(): Promise<number> {
    if (loaded) return entries.size;
    let raw: string;
    try { raw = await readFile(filePath, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") { loaded = true; return 0; }
      throw error;
    }
    const doc: TournamentRatingDocument = JSON.parse(raw);
    if (!doc || doc.version !== 1 || !Array.isArray(doc.leaderboard) || !Array.isArray(doc.boards)) {
      throw new Error("Unsupported or corrupt tournament ratings data; refusing to overwrite it");
    }
    const nextEntries = new Map<string, TournamentRatingEntry>();
    const nextBoards = new Map<string, TournamentBoardResult>();
    for (const entry of doc.leaderboard) {
      requiredId(entry?.accountId, "stored accountId");
      if (!Number.isFinite(entry.rating) || !Number.isInteger(entry.gamesPlayed) || nextEntries.has(entry.accountId)) {
        throw new Error("Corrupt tournament leaderboard");
      }
      nextEntries.set(entry.accountId, entry);
    }
    for (const board of doc.boards) {
      requiredId(board?.boardMatchId, "stored boardMatchId");
      if (!Array.isArray(board.players) || nextBoards.has(board.boardMatchId)) {
        throw new Error("Corrupt or duplicate tournament board record");
      }
      nextBoards.set(board.boardMatchId, board);
    }
    entries = nextEntries; boards = nextBoards; loaded = true;
    return entries.size;
  }

  async function recordCompletedBoard(state: GameState, assignment: TournamentBoardAssignment): Promise<TournamentBoardResult> {
    const operation = operations.then(async () => {
      if (!loaded) throw new Error("Tournament rating ledger must be loaded first");
      validateBoard(state, assignment);
      const existing = boards.get(assignment.boardMatchId);
      if (existing) {
        if (!matchesAssignment(existing, assignment)) throw new Error("Tournament board ID already belongs to another fixture");
        return structuredClone(existing);
      }
      if ([...boards.values()].some((board) => board.roomCode === assignment.roomCode &&
        board.gameStartedAt === assignment.gameStartedAt)) {
        throw new Error("The same game has already been recorded under a different tournament board ID");
      }
      const { board, updates } = computeResult(state, assignment, entries);
      const nextBoards = new Map(boards);
      nextBoards.set(assignment.boardMatchId, board);
      const doc: TournamentRatingDocument = {
        version: 1, savedAt: Date.now(), leaderboard: [...updates.values()], boards: [...nextBoards.values()],
      };
      await mkdir(path.dirname(filePath), { recursive: true });
      const temporary = `${filePath}.tmp`;
      await writeFile(temporary, JSON.stringify(doc, null, 2), "utf8");
      await rename(temporary, filePath);
      entries = updates; boards = nextBoards;
      return structuredClone(board);
    });
    operations = operation.then(() => undefined, () => undefined);
    return operation;
  }

  function getLeaderboard(): TournamentRatingEntry[] {
    return [...entries.values()].map((entry) => structuredClone(entry)).sort((a, b) =>
      b.rating - a.rating || b.wins - a.wins || b.podiums - a.podiums ||
      a.averageFinish - b.averageFinish || a.accountId.localeCompare(b.accountId));
  }
  function getBoardResults(tournamentId: string, fixtureId?: string): TournamentBoardResult[] {
    return [...boards.values()].filter((board) => board.tournamentId === tournamentId &&
      (!fixtureId || board.fixtureId === fixtureId)).map((board) => structuredClone(board))
      .sort((a, b) => a.completedAt - b.completedAt);
  }
  return { load, recordCompletedBoard, getLeaderboard, getBoardResults };
}
