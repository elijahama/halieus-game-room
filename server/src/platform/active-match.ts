import type { Express, Request } from "express";
import type { ActiveMatch } from "../../../shared/platform/active-match.js";
import type { GameRoom, RoomPlayer } from "../games/mega-board/types/game.js";
import { rooms } from "../games/mega-board/state/rooms.js";

export function activeMegaMatch(room: GameRoom, player: RoomPlayer, accountId: string, now = Date.now()): ActiveMatch | null {
  const state = room.gameState;
  if (!accountId || player.replayAccountId !== accountId || player.isAi || player.hasLeft ||
      !room.started || !state || state.phase === "finished" || state.winnerId ||
      state.roomCode !== room.code || !Number.isFinite(state.gameStartedAt) || state.gameStartedAt <= 0 ||
      (room.hostDisconnectDeadline !== null && room.hostDisconnectDeadline <= now) ||
      !state.players.some(seat => seat.id === player.id && !seat.isBankrupt)) return null;
  // Only explicitly public, completed decisions. Never serialize a pending trade/card or player record.
  const notice = [...(state.globalNotices ?? []), ...(state.lastGlobalNotice ? [state.lastGlobalNotice] : [])]
    .filter(item => ["purchase-complete", "trade-complete", "bankruptcy", "rent-payment"].includes(item.kind))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return { gameId: "mega-board", code: room.code, matchId: `mega-${room.code}-${state.gameStartedAt}`,
    paused: Boolean(state.pauseState), notice: notice ? { id: notice.id, title: notice.title, message: notice.message } : null };
}

export function registerActiveMatchRoutes(app: Express, authenticate: (request: Request) => { id: string } | null) {
  app.get("/accounts/active-matches", (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const account = authenticate(request);
    if (!account) { response.status(401).json({ reason: "Sign in to view active games." }); return; }
    const matches: ActiveMatch[] = [];
    for (const room of rooms.values()) {
      const match = room.players.map(player => activeMegaMatch(room, player, account.id)).find(Boolean);
      if (match) matches.push(match);
    }
    response.json({ matches });
  });
}
