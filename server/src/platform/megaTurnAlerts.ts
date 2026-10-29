import type { GameRoom } from "../games/mega-board/types/game.js";
import type { HgrPushMessage } from "./pushNotifications.js";
import { sendHgrPush } from "./pushNotifications.js";
import { activeMegaMatch } from "./active-match.js";

/**
 * Server-confirmed, account-bound Mega Board turn alert. The pushed URL is
 * a return *request*, never a recovery credential or automatic seat takeover.
 * Call after an authoritative game-state mutation, before saving the room.
 */
export function notifyNewMegaTurn(
  room: GameRoom,
  deliver: (accountIds: readonly string[], notice: HgrPushMessage) => Promise<void> = sendHgrPush,
): boolean {
  const state = room.gameState;
  if (!state || room.betaTournamentTest) return false;
  const player = state.players[state.currentPlayerIndex];
  if (!player || player.isAi || player.isBankrupt || player.autopilotEnabled ||
      state.pendingTrade || state.pendingAuction || state.pendingDebt ||
      state.pendingPurchase || state.pendingCard || state.pendingMegaAction ||
      state.pendingJailMove || state.pendingSpeedDieAction) return false;

  // The authenticated account assignment was captured by the game server,
  // not by a user-controlled display name, room code or reconnect payload.
  const seat = room.players.find(item => item.id === player.id && !item.isAi &&
    !item.hasLeft && typeof item.replayAccountId === "string" && item.replayAccountId.length > 0);
  if (!seat?.replayAccountId) return false;
  const match = activeMegaMatch(room, seat, seat.replayAccountId);
  if (!match?.yourTurn) return false;

  // One notification per actual seat turn, including across repeated state
  // broadcasts and process restarts (marker persists in private room storage).
  const key = `${match.matchId}:${state.turnNumber}:${state.currentPlayerIndex}`;
  if (room.lastTurnPushKey === key) return false;
  room.lastTurnPushKey = key;

  void deliver([seat.replayAccountId], {
    topic: "turns",
    title: "Your turn — Mega Board",
    body: "Your game is ready for your move. Tap to continue.",
    url: "/?resumeMatch=" + encodeURIComponent(match.matchId),
    tag: "hgr-mega-turn-" + key,
  }).catch(() => undefined); // Never make delivery failure reject or undo gameplay.
  return true;
}
