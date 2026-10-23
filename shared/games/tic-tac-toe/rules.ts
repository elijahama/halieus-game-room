/** HGR Noughts and Crosses / Tic-Tac-Toe pure rules.
 * Server authentication, room concurrency and Ranked awards are NOT handled here.
 */
export type BoardSize = 3 | 4 | 5;
export type MatchMode = "casual" | "ranked";
export type Mark = "X" | "O";
export type Cell = Mark | null;
export type Outcome = "playing" | "won" | "draw";
export interface GameState {
  size: BoardSize;
  mode: MatchMode;
  board: readonly Cell[];
  starting: Mark;
  next: Mark;
  outcome: Outcome;
  winner: Mark | null;
  winningLine: readonly number[];
  moves: number;
  revision: number;
  lastMove: number | null;
}
export interface FinalResultCandidate {
  format: "3x3" | "4x4" | "5x5";
  mode: MatchMode;
  winner: Mark | null;
  draw: boolean;
  moves: number;
  revision: number;
}
const validSizes = [3, 4, 5] as const;
const other = (mark: Mark): Mark => mark === "X" ? "O" : "X";
export function newGame(size: BoardSize, mode: MatchMode = "casual", starting: Mark = "X"): GameState {
  if (!validSizes.includes(size)) throw new Error("Board size must be 3, 4 or 5.");
  if (mode !== "casual" && mode !== "ranked") throw new Error("Invalid match mode.");
  if (starting !== "X" && starting !== "O") throw new Error("Invalid starting player.");
  return {
    size, mode, starting, board: Array<Cell>(size * size).fill(null),
    next: starting, outcome: "playing", winner: null,
    winningLine: [], moves: 0, revision: 0, lastMove: null,
  };
}
export function findWinningLine(board: readonly Cell[], size: BoardSize): number[] {
  if (!validSizes.includes(size) || board.length !== size * size) throw new Error("Invalid board.");
  const lines: number[][] = [];
  for (let row=0; row<size; row++) lines.push(Array.from({length:size},(_,col)=>row*size+col));
  for (let col=0; col<size; col++) lines.push(Array.from({length:size},(_,row)=>row*size+col));
  lines.push(Array.from({length:size},(_,i)=>i*size+i));
  lines.push(Array.from({length:size},(_,i)=>i*size+size-1-i));
  return lines.find(line => {
    const first = board[line[0]];
    return (first === "X" || first === "O") && line.every(i=>board[i]===first);
  }) ?? [];
}
/** Immutable move. Rejects duplicate turns, out-of-range and finished games. */
export function play(state: GameState, mark: Mark, index: number): GameState {
  if (!validSizes.includes(state.size) || state.board.length !== state.size * state.size
    || !Number.isInteger(state.moves) || state.moves < 0
    || state.board.filter(cell=>cell!==null).length !== state.moves
    || state.revision !== state.moves || !Number.isInteger(state.revision)
    || state.board.some(cell => cell!==null && cell!=="X" && cell!=="O")) {
    throw new Error("Invalid game state.");
  }
  if (state.outcome !== "playing") throw new Error("Game already finished.");
  if (mark !== state.next) throw new Error("Not this player's turn.");
  if (!Number.isInteger(index) || index < 0 || index >= state.board.length) {
    throw new Error("Move outside the board.");
  }
  if (state.board[index] !== null) throw new Error("Square already occupied.");
  const board: Cell[] = [...state.board];
  board[index] = mark;
  const line = findWinningLine(board, state.size);
  const moves = state.moves + 1;
  const outcome: Outcome = line.length ? "won" : moves === board.length ? "draw" : "playing";
  return {
    ...state, board, next: outcome === "playing" ? other(mark) : mark,
    outcome, winner: outcome === "won" ? mark : null, winningLine: line,
    moves, revision: moves, lastMove: index,
  };
}
/** Not a Ranked award or verified server result; this is only a result candidate. */
export function finalResultCandidate(state: GameState): FinalResultCandidate {
  if (state.outcome === "playing") throw new Error("Live games cannot finalize.");
  if (state.outcome === "won" && (!state.winner || state.winningLine.length !== state.size))
    throw new Error("Unverified winner.");
  if (state.outcome === "draw" && (state.winner || state.moves !== state.size * state.size))
    throw new Error("Unverified draw.");
  return {
    format: `${state.size}x${state.size}` as FinalResultCandidate["format"],
    mode: state.mode, winner: state.winner, draw: state.outcome === "draw",
    moves: state.moves, revision: state.revision,
  };
}
