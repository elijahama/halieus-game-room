export type HalieusLiveGameId = "mega-board" | "poker" | "blackjack" | "whot" | "ludo" | "hidden-dictator" | "connect-four" | "word-game" | "password" | "anagrams-race" | "cheat" | "dominoes" | "ayo" | "word-board";

/**
 * Privacy-safe room summary used by the signed-in Game Room. It intentionally
 * contains only public table facts: room code, visible player names/counts and
 * whether the room can accept a seat or spectator. Hidden cards/roles/state are
 * never part of this contract.
 */
export interface HalieusLiveRoomSummary {
  game: HalieusLiveGameId;
  gameTitle: string;
  code: string;
  phase: string;
  matchMode: "casual" | "ranked" | "blitz";
  started: boolean;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  playerCount: number;
  maximumPlayers: number;
  humanPlayers: string[];
  aiCount: number;
  spectatorCount: number;
  joinable: boolean;
  spectatable: boolean;
}
