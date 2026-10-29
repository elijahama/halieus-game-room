/** Server-authenticated Guild-v-Guild Mega Board fixture proposal.
 * No live rooms or tournament ratings are created by this record alone. */
export type HgrGuildFixtureStatus = "proposed" | "lineups-locked" | "rooms-bound" | "cancelled";
export type HgrGuildBoardLineups = [string[], string[]];
/** Each bound room is a real server-owned Mega Board lobby, not a simulated game. */
export interface HgrGuildFixtureBoardLink {
  roomCode: string;
  roomCreatedAt: number;
  boardMatchId: string;
  seatAccountIds: string[];
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
  status: HgrGuildFixtureStatus;
  createdAt: number;
  updatedAt: number;
  lockedAt: number | null;
  cancelledAt: number | null;
}
