/**
 * Mega Board adapter for the HGR-wide game archive format.
 * Applies equally to a finished standard, ranked or tournament Mega Board game.
 * Does not expose raw GameState, private decks, sockets, credentials or chat.
 */
import type { GameActivityEntry, GameState } from "../../../../../shared/games/mega-board/game-state.js";
import type { MegaReplayFrame } from "../../../../../shared/games/mega-board/replay.js";
import { HGR_REPLAY_FORMAT, HGR_REPLAY_VERSION, type HgrGameReplayArchive, type HgrGameReplayEvent } from
  "../../../../../shared/platform/game-replay.js";
import type { TournamentBoardResult } from "./tournament-ratings.js";

export function createMegaBoardGameReplayArchive(state: GameState,
  tournamentBoard?: TournamentBoardResult): HgrGameReplayArchive {
  if (state.phase !== "finished" || !state.winnerId) {
    throw new Error("Mega Board replay is available after a verified match finish");
  }
  if (tournamentBoard && (state.roomCode !== tournamentBoard.roomCode ||
      state.gameStartedAt !== tournamentBoard.gameStartedAt ||
      tournamentBoard.players.length !== state.players.length ||
      !tournamentBoard.players.every((p) => state.players.some((gamePlayer) =>
        gamePlayer.id === p.playerId && gamePlayer.name === p.playerName)))) {
    throw new Error("Tournament replay requires its matching server-verified finished board");
  }
  // Live player IDs can be socket IDs. Export stable anonymous seats instead.
  const anonymousIds = new Map(state.players.map((p, i) => [p.id, `seat-${i + 1}`]));
  const activityIds = new Map(state.activityLog.map((e, i) => [e.id, `event-${i + 1}`]));
  const alias = (id: string | null | undefined) => id ? anonymousIds.get(id) ?? null : null;
  const events = state.activityLog.map((e: GameActivityEntry, i): HgrGameReplayEvent => ({
    sequence: i + 1, at: e.at, turn: e.turnNumber, category: e.kind,
    description: e.message, actorId: alias(e.playerId),
  }));
  // Explicitly copy all allowed presentation fields. Never spread a frame/state.
  const frames: MegaReplayFrame[] = (state.replayFrames ?? []).map((f) => ({
    sequence: f.sequence, at: f.at, turn: f.turn, phase: f.phase,
    activePlayerId: alias(f.activePlayerId), label: f.label,
    lastActivityId: f.lastActivityId ? activityIds.get(f.lastActivityId) ?? null : null,
    players: f.players.map((p) => ({
      id: anonymousIds.get(p.id) ?? "unassigned", name: p.name, tokenId: p.tokenId, colour: p.colour,
      position: p.position, cash: p.cash, bankrupt: p.bankrupt, owned: [...p.owned],
    })),
    propertyOwners: Object.fromEntries(Object.entries(f.propertyOwners).map(([space, id]) => [space, alias(id)])),
    developments: { ...f.developments }, mortgages: { ...f.mortgages },
    pot: f.pot, dice: f.dice ? { white1: f.dice.white1, white2: f.dice.white2, speed: f.dice.speed, movementTotal: f.dice.movementTotal, ...(f.dice.doublesStage !== undefined ? { doublesStage: f.dice.doublesStage } : {}) } : null, winnerId: alias(f.winnerId),
  }));
  return {
    format: HGR_REPLAY_FORMAT,
    version: HGR_REPLAY_VERSION,
    gameId: "mega-board",
    matchId: tournamentBoard?.boardMatchId ?? `mega-${state.roomCode}-${state.gameStartedAt}`,
    roomCode: state.roomCode,
    startedAt: state.gameStartedAt,
    finishedAt: tournamentBoard?.completedAt ?? state.replayFrames?.at(-1)?.at ?? Date.now(),
    players: state.players.map((p) => ({
      id: anonymousIds.get(p.id) ?? "unassigned", name: p.name,
      result: p.id === state.winnerId ? "winner" : p.isBankrupt ? "bankrupt" : "finished",
    })),
    events,
    track: frames.length
      ? { kind: "mega-board-checkpoints", frames, truncated: frames[0].sequence > 1 }
      : { kind: "event-timeline", frames: [], truncated: false },
    ...(tournamentBoard ? {
      tournament: { tournamentId: tournamentBoard.tournamentId,
        fixtureId: tournamentBoard.fixtureId, boardMatchId: tournamentBoard.boardMatchId },
    } : {}),
  };
}
