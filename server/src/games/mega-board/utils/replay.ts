import type { GameState } from "../../../../../shared/games/mega-board/game-state.js";
import type { MegaReplayFrame } from "../../../../../shared/games/mega-board/replay.js";

// Short, bounded in-room replay journal. This is intentionally *not* a save file.
// No unrevealed deck, recovery credential, private chat or session data is copied.
const MAX_FRAMES = 240;

export function captureMegaReplayFrame(state: GameState, at = Date.now()): void {
  if (state.phase !== "playing" && state.phase !== "finished") return;
  const frame: MegaReplayFrame = {
    sequence: (state.replayFrames?.at(-1)?.sequence ?? 0) + 1,
    at,
    turn: state.turnNumber,
    phase: state.turnPhase,
    activePlayerId: state.players[state.currentPlayerIndex]?.id ?? null,
    label: state.activityLog.at(-1)?.message ?? "Match in progress",
    lastActivityId: state.activityLog.at(-1)?.id ?? null,
    players: state.players.map(player => ({
      id: player.id, name: player.name, tokenId: player.tokenId,
      colour: player.colour, position: player.position, cash: player.cash,
      bankrupt: player.isBankrupt, owned: [...player.properties],
    })),
    propertyOwners: { ...state.propertyOwners },
    developments: { ...state.propertyDevelopments },
    mortgages: { ...state.mortgagedProperties },
    pot: state.freeParkingPot,
    dice: state.lastDiceRoll ? { ...state.lastDiceRoll } : null,
    winnerId: state.winnerId,
  };
  const { sequence, at: _at, label: _label, lastActivityId: _id, ...rest } = frame;
  const previous = state.replayFrames?.at(-1);
  if (previous) {
    const { sequence: _previousSeq, at: _previousAt, label: _previousLabel, lastActivityId: _previousId, ...previousRest } = previous;
    if (JSON.stringify(rest) === JSON.stringify(previousRest)) return;
  }
  state.replayFrames ??= [];
  state.replayFrames.push(frame);
  if (state.replayFrames.length > MAX_FRAMES) state.replayFrames.splice(0, state.replayFrames.length - MAX_FRAMES);
}
