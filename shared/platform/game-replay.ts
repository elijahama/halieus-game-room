import type { HalieusGameId } from "./game-activity.js";
import type { MegaReplayFrame } from "../games/mega-board/replay.js";

/**
 * HGR-wide archive contract, independent of tournament mode or account ranking.
 * No game writes raw private state into the archive. Each game's server adapter
 * must explicitly whitelist finished-match activity and public-safe checkpoints.
 */
export const HGR_REPLAY_FORMAT = "hgr-game-replay" as const;
export const HGR_REPLAY_VERSION = 1 as const;

export const REPLAY_GAME_IDS = [
  "mega-board", "poker", "blackjack", "whot", "ludo",
  "hidden-dictator", "connect-four", "word-game", "password",
  "anagrams-race", "cheat", "dominoes", "ayo", "word-board",
] as const satisfies readonly HalieusGameId[];

export interface HgrGameReplayEvent {
  sequence: number;
  at: number;
  turn: number | null;
  category: string;
  description: string;
  actorId: string | null;
}

export interface HgrReplayPlayer {
  id: string;
  name: string;
  result: string | null;
}

/**
 * Full visual board checkpoints are currently supported for Mega Board only.
 * Other games may use an honest action-by-action timeline during their adapter
 * pilot, then receive their own whitelisted visual checkpoint variant.
 */
export type HgrReplayTrack =
  | { kind: "mega-board-checkpoints"; frames: MegaReplayFrame[]; truncated: boolean }
  | { kind: "event-timeline"; frames: []; truncated: boolean };

export interface HgrGameReplayArchive {
  format: typeof HGR_REPLAY_FORMAT;
  version: typeof HGR_REPLAY_VERSION;
  gameId: HalieusGameId;
  matchId: string;
  roomCode: string;
  startedAt: number;
  finishedAt: number;
  players: HgrReplayPlayer[];
  events: HgrGameReplayEvent[];
  track: HgrReplayTrack;
  /** Optional links. Tournaments do not get a separate replay archive format. */
  tournament?: { tournamentId: string; fixtureId: string; boardMatchId: string };
}

/** Downloadable JSON is a read-only game record, not an importable save state. */
export function serializeHgrReplay(archive: HgrGameReplayArchive): string {
  if (archive.format !== HGR_REPLAY_FORMAT || archive.version !== HGR_REPLAY_VERSION ||
      !(REPLAY_GAME_IDS as readonly string[]).includes(archive.gameId)) {
    throw new Error("Unsupported HGR game replay archive");
  }
  if (archive.track.kind !== "mega-board-checkpoints" && archive.track.kind !== "event-timeline") {
    throw new Error("Unknown HGR replay track");
  }
  // Defense in depth: remove stray adapter/private fields, even if accidentally
  // attached to a typed object at runtime. Never serialize a raw game room.
  const track: HgrReplayTrack = archive.track.kind === "mega-board-checkpoints"
    ? {
      kind: "mega-board-checkpoints", truncated: Boolean(archive.track.truncated),
      frames: archive.track.frames.map((f) => ({
        sequence: f.sequence, at: f.at, turn: f.turn, phase: f.phase,
        activePlayerId: f.activePlayerId, label: f.label, lastActivityId: f.lastActivityId,
        players: f.players.map((p) => ({
          id: p.id, name: p.name, tokenId: p.tokenId, colour: p.colour,
          position: p.position, cash: p.cash, bankrupt: p.bankrupt, owned: [...p.owned],
        })),
        propertyOwners: { ...f.propertyOwners },
        developments: { ...f.developments }, mortgages: { ...f.mortgages },
        pot: f.pot, dice: f.dice ? { ...f.dice } : null,
        winnerId: f.winnerId,
      })),
    }
    : { kind: "event-timeline", truncated: Boolean(archive.track.truncated), frames: [] };
  const safe: HgrGameReplayArchive = {
    format: HGR_REPLAY_FORMAT, version: HGR_REPLAY_VERSION,
    gameId: archive.gameId, matchId: archive.matchId, roomCode: archive.roomCode,
    startedAt: archive.startedAt, finishedAt: archive.finishedAt,
    players: archive.players.map((p) => ({
      id: p.id, name: p.name, result: p.result,
    })),
    events: archive.events.map((e) => ({
      sequence: e.sequence, at: e.at, turn: e.turn,
      category: e.category, description: e.description, actorId: e.actorId,
    })),
    track,
    ...(archive.tournament ? { tournament: {
      tournamentId: archive.tournament.tournamentId,
      fixtureId: archive.tournament.fixtureId,
      boardMatchId: archive.tournament.boardMatchId,
    } } : {}),
  };
  return JSON.stringify(safe, null, 2) + "\n";
}

/** Simple human-readable export for every game, including timeline-only tracks. */
export function replayAsPlainText(archive: HgrGameReplayArchive): string {
  if (archive.format !== HGR_REPLAY_FORMAT || archive.version !== HGR_REPLAY_VERSION ||
      !(REPLAY_GAME_IDS as readonly string[]).includes(archive.gameId)) {
    throw new Error("Unsupported HGR game replay archive");
  }
  const lines = [
    "HGR Game Replay", `Game: ${archive.gameId}`, `Match: ${archive.matchId}`,
    `Room: ${archive.roomCode}`, `Started: ${new Date(archive.startedAt).toISOString()}`,
    `Finished: ${new Date(archive.finishedAt).toISOString()}`,
    `Players: ${archive.players.map(p => p.name).join(", ")}`,
    `Replay: ${archive.track.kind}`,
  ];
  if (archive.tournament) lines.push(`Tournament: ${archive.tournament.tournamentId} / ${archive.tournament.fixtureId}`);
  lines.push("", "Game events:");
  for (const e of archive.events) {
    lines.push(`${String(e.sequence).padStart(4, "0")}. ${e.turn === null ? "" : `Turn ${e.turn}: `}${e.description}`);
  }
  return lines.join("\n") + "\n";
}
