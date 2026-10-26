/** Generic completed-game read-only timeline adapter for the HGR replay platform.
 * Every gameplay handler must explicitly map server-confirmed PUBLIC action log
 * fields. Raw room/game state objects must never be passed to the archive.
 */
import {
  HGR_REPLAY_FORMAT, HGR_REPLAY_VERSION, REPLAY_GAME_IDS,
  type HgrGameReplayArchive, type HgrGameReplayEvent, type HgrReplayPlayer,
} from "../../../shared/platform/game-replay.js";
import type { HalieusGameId } from "../../../shared/platform/game-activity.js";

export interface FinishedTimelineInput {
  gameId: HalieusGameId;
  matchId: string;
  roomCode: string;
  startedAt: number;
  finishedAt: number;
  phase: "finished";
  players: HgrReplayPlayer[];
  actions: HgrGameReplayEvent[];
}

export function createFinishedTimelineReplay(input: FinishedTimelineInput): HgrGameReplayArchive {
  if (!(REPLAY_GAME_IDS as readonly string[]).includes(input.gameId)) throw new Error("Unknown HGR replay game");
  if (input.phase !== "finished") throw new Error("Only a finished match can be archived");
  for (const [name, value] of [
    ["matchId", input.matchId], ["roomCode", input.roomCode],
  ] as const) {
    if (typeof value !== "string" || !value.trim() || value.length > 200) throw new Error(`Invalid ${name}`);
  }
  if (!Number.isSafeInteger(input.startedAt) || !Number.isSafeInteger(input.finishedAt) ||
      input.finishedAt < input.startedAt) throw new Error("Invalid replay event date range");
  if (!Array.isArray(input.players) || input.players.length === 0 || !Array.isArray(input.actions)) {
    throw new Error("Invalid finished game replay participants or events");
  }
  const ids = new Map(input.players.map((p, i) => [p.id, `seat-${i + 1}`]));
  const players = input.players.map((p, i) => ({
    id: `seat-${i + 1}`, name: String(p.name), result: p.result === null ? null : String(p.result),
  }));
  const events = input.actions.map((e) => ({
    sequence: e.sequence, at: e.at, turn: e.turn,
    category: String(e.category), description: String(e.description),
    actorId: e.actorId ? ids.get(e.actorId) ?? null : null,
  }));
  if (events.some((e) => !Number.isSafeInteger(e.sequence) || !Number.isFinite(e.at) ||
      !e.category.trim() || !e.description.trim())) throw new Error("Invalid replay action");
  return {
    format: HGR_REPLAY_FORMAT, version: HGR_REPLAY_VERSION,
    gameId: input.gameId, matchId: input.matchId,
    roomCode: input.roomCode, startedAt: input.startedAt, finishedAt: input.finishedAt,
    players, events, track: { kind: "event-timeline", frames: [], truncated: false },
  };
}
