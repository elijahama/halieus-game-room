import type { GameRoom } from "../types/game.js";
import { gameHistory } from "../../../platform/game-history.js";
import { createMegaBoardGameReplayArchive } from "./mega-game-replay.js";

// Freeze a finish once per live state, including its timestamp. Failures remain
// retryable; durable identity in Game History prevents duplicates after restart.
const pending = new WeakMap<object, Promise<string>>();
export function archiveCompletedMegaGame(room: GameRoom, history = gameHistory): Promise<string> {
  const state = room.gameState;
  if (!state || state.phase !== "finished" || !state.winnerId) {
    return Promise.reject(new Error("Only a server-confirmed finished match can be archived"));
  }
  const prior = pending.get(state);
  if (prior) return prior;
  const archive = createMegaBoardGameReplayArchive(state);
  const accountIds = room.players.filter(player => !player.isAi &&
    state.players.some(seat => seat.id === player.id))
    .flatMap(player => player.replayAccountId ? [player.replayAccountId] : []);
  const operation = history.record(archive, accountIds);
  pending.set(state, operation);
  void operation.catch(() => pending.delete(state));
  return operation;
}
