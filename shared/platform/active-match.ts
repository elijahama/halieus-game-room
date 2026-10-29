/** Authenticated active Mega Board metadata only; never a recovery credential. */
export interface ActiveMatch {
  gameId: "mega-board";
  code: string;
  matchId: string;
  paused: boolean;
  /** True only when this account's eligible live seat can take an ordinary turn action. */
  yourTurn: boolean;
  notice: { id: string; title: string; message: string } | null;
}
