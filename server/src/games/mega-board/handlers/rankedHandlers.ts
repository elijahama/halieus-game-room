import type { Server, Socket } from "socket.io";
import { getRankedLeaderboard, getRecentRankedMatches } from "../utils/rankings.js";
import { getAccountSummaryByDisplayName } from "../../../platform/accounts.js";

export function registerRankedHandlers(_io: Server, socket: Socket): void {
  socket.on("ranked:get", (_payload: unknown, acknowledge: (response: unknown) => void) => {
    acknowledge({
      ok: true,
      leaderboard: getRankedLeaderboard().map((entry) => {
        const account = getAccountSummaryByDisplayName(entry.playerName);
        return {
          ...entry,
          profilePicture: account?.profilePicture ?? null,
          avatar: account?.avatar ?? entry.playerName.slice(0, 2).toUpperCase(),
          playerColor: account?.playerColor ?? "#64748b",
        };
      }),
      recentMatches: getRecentRankedMatches(20),
    });
  });
}
