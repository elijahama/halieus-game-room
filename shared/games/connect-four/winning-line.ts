import type { ConnectFourDisc } from "./types.js";

/**
 * Return one authoritative four-disc winning line, as row-major indexes
 * (0–41), or null. Deterministic for a board that contains multiple lines.
 * This is shared by the server and client; it does not change game rules.
 */
export function findConnectFourWinningCells(
  board: readonly ConnectFourDisc[],
  disc: ConnectFourDisc,
): number[] | null {
  if (board.length !== 42 || disc === 0) return null;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      if (board[row * 7 + col] !== disc) continue;
      for (const [rowStep, colStep] of directions) {
        const cells: number[] = [];
        for (let step = 0; step < 4; step++) {
          const r = row + step * rowStep;
          const c = col + step * colStep;
          if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r * 7 + c] !== disc) break;
          cells.push(r * 7 + c);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return null;
}
