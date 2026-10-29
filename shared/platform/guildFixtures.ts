/** Server-authenticated Guild-v-Guild Mega Board fixture proposal.
 * No live rooms or tournament ratings are created by this record alone. */
export type HgrGuildFixtureStatus = "proposed" | "lineups-locked" | "cancelled";
export type HgrGuildBoardLineups = [string[], string[]];
export interface HgrGuildFixture {
  id: string;
  game: "mega-board";
  homeGuildId: string;
  awayGuildId: string;
  proposedByAccountId: string;
  homeLineups: HgrGuildBoardLineups;
  awayLineups: HgrGuildBoardLineups | null;
  status: HgrGuildFixtureStatus;
  createdAt: number;
  updatedAt: number;
  lockedAt: number | null;
  cancelledAt: number | null;
}
