import React from "react";
import type { ConnectFourDisc } from "../../../../shared/games/connect-four/types";

interface Props {
  board: ConnectFourDisc[];
  winningCells?: number[];
  lastDropIndex: number | null;
  canAct?: boolean;
  onDrop?: (column: number) => void;
  review?: boolean;
}

/** One board surface for live games, round-end and final result review. */
export function ConnectFourBoard({
  board, winningCells = [], lastDropIndex, canAct = false, onDrop, review = false,
}: Props) {
  const winning = new Set(winningCells);
  const hasLine = winning.size === 4;
  return <div className={review ? "connect-four-board-review" : undefined}>
    {review && <p className="connect-four-winning-caption" role="status">
      {hasLine ? "Winning four — outlined in white" : "Final round board — no four-in-a-row recorded"}
    </p>}
    <div className={`connect-four-board${review ? " is-review" : ""}`}
      role="grid" aria-label={hasLine ? "Connect Four board with the four winning discs highlighted" : "Connect Four board"}>
      {board.map((disc, cellIndex) => {
        const row = Math.floor(cellIndex / 7);
        const column = cellIndex % 7;
        const isWinning = winning.has(cellIndex);
        const isLastDrop = !review && cellIndex === lastDropIndex;
        const discLabel = disc === 1 ? "red disc" : disc === 2 ? "yellow disc" : "empty";
        return <button key={cellIndex} type="button"
          className={`connect-four-cell${isWinning ? " is-winning-cell" : ""}`}
          disabled={review || !canAct || board[column] !== 0}
          onClick={() => onDrop?.(column)}
          aria-label={`Row ${row + 1}, column ${column + 1}, ${discLabel}${isWinning ? ", part of the winning four" : ""}`}>
          <span key={`${cellIndex}-${disc}`}
            style={isLastDrop ? { ["--connect-drop-origin" as string]: `calc(-${row + 1}00% - ${(row + 1) * 7}px)` } : undefined}
            className={`${disc === 1 ? "is-red" : disc === 2 ? "is-yellow" : ""}${isLastDrop ? " is-last-drop" : ""}${isWinning ? " is-winning-disc" : ""}`}/>
        </button>;
      })}
    </div>
  </div>;
}
