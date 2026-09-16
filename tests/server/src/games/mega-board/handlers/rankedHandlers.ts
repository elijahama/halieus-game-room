import type { Server, Socket } from "socket.io";
import { getRankedLeaderboard, getRecentRankedMatches } from "../utils/rankings.js";

export function registerRankedHandlers(_io: Server, socket: Socket): void {
  socket.on("ranked:get", (_payload: unknown, acknowledge: (response: unknown) => void) => {
    acknowledge({
      ok: true,
      leaderboard: getRankedLeaderboard(),
      recentMatches: getRecentRankedMatches(20),
    });
  });
}
