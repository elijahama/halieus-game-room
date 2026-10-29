/** Server-authenticated Guild-v-Guild Mega Board fixture proposal.
 * No live rooms or tournament ratings are created by this record alone. */
export type HgrGuildFixtureStatus = "proposed" | "lineups-locked" | "rooms-bound" | "completed" | "cancelled";
export type HgrGuildBoardLineups = [string[], string[]];
/** Each bound room is a real server-owned Mega Board lobby, not a simulated game. */
export interface HgrGuildFixtureBoardLink {
  roomCode: string;
  roomCreatedAt: number;
  boardMatchId: string;
  seatAccountIds: string[];
}
/** Immutable, verified winner/placements from an actual completed game. */
export interface HgrGuildFixtureBoardResult {
  boardMatchId: string;
  roomCode: string;
  roomCreatedAt: number;
  gameStartedAt: number;
  winnerAccountId: string;
  winnerGuildId: string;
  completedAt: number;
  placements: Array<{ accountId: string; guildId: string; finishPosition: number }>;
}
export interface HgrGuildFixture {
  id: string;
  game: "mega-board";
  homeGuildId: string;
  awayGuildId: string;
  proposedByAccountId: string;
  homeLineups: HgrGuildBoardLineups;
  awayLineups: HgrGuildBoardLineups | null;
  boards?: [HgrGuildFixtureBoardLink, HgrGuildFixtureBoardLink] | null;
  boardResults?: HgrGuildFixtureBoardResult[];
  /** Verified board wins only, not approved F1 standings or ratings. */
  homeBoardWins?: number;
  awayBoardWins?: number;
  status: HgrGuildFixtureStatus;
  createdAt: number;
  updatedAt: number;
  lockedAt: number | null;
  cancelledAt: number | null;
}
