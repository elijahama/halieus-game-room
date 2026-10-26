/** Foreground Mega Board metadata only; never a recovery credential. */
export interface ActiveMatch {
  gameId: "mega-board";
  code: string;
  matchId: string;
  paused: boolean;
  notice: { id: string; title: string; message: string } | null;
}
