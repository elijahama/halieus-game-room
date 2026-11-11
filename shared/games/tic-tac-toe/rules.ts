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
function winningLines(board: readonly Cell[], size: BoardSize): number[][] {
  const lines: number[][] = [];
  for (let row = 0; row < size; row++) lines.push(Array.from({ length: size }, (_, col) => row * size + col));
  for (let col = 0; col < size; col++) lines.push(Array.from({ length: size }, (_, row) => row * size + col));
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + size - 1 - i));
  return lines.filter(line => {
    const first = board[line[0]];
    return (first === "X" || first === "O") && line.every(i => board[i] === first);
  });
}
export function findWinningLine(board: readonly Cell[], size: BoardSize): number[] {
  if (!validSizes.includes(size) || board.length !== size * size) throw new Error("Invalid board.");
  return winningLines(board, size)[0] ?? [];
}
/** Validate saved/reconnected state before accepting moves or preparing a result.
 * This is integrity checking, not player authentication or proof of a server action log.
 */
export function assertValidGameState(state: GameState): void {
  const invalid = (): never => { throw new Error("Invalid game state."); };
  if (!state || !validSizes.includes(state.size) || !Array.isArray(state.board)
    || state.board.length !== state.size * state.size || !Array.isArray(state.winningLine)
    || (state.mode !== "casual" && state.mode !== "ranked")
    || (state.starting !== "X" && state.starting !== "O")
    || (state.next !== "X" && state.next !== "O")
    || (state.winner !== null && state.winner !== "X" && state.winner !== "O")
    || !["playing", "won", "draw"].includes(state.outcome)
    || !Number.isInteger(state.moves) || state.moves < 0 || state.moves > state.board.length
    || !Number.isInteger(state.revision) || state.revision !== state.moves
    || state.board.some(cell => cell !== null && cell !== "X" && cell !== "O")) invalid();

  const xs = state.board.filter(cell => cell === "X").length;
  const os = state.board.filter(cell => cell === "O").length;
  if (xs + os !== state.moves) invalid();
  const firstCount = state.starting === "X" ? xs : os;
  const secondCount = state.starting === "X" ? os : xs;
  if (firstCount !== Math.ceil(state.moves / 2) || secondCount !== Math.floor(state.moves / 2)) invalid();

  const last = state.moves === 0 ? null : state.moves % 2 ? state.starting : other(state.starting);
  if (last === null) {
    if (state.lastMove !== null || state.next !== state.starting) invalid();
  } else if (!Number.isInteger(state.lastMove) || state.lastMove === null
    || state.lastMove < 0 || state.lastMove >= state.board.length
    || state.board[state.lastMove] !== last) invalid();

  const lines = winningLines(state.board, state.size);
  if (lines.length) {
    // A legal terminal move may complete multiple lines, but every newly completed
    // line must belong to that player and include the final square.
    if (state.outcome !== "won" || state.winner !== last
      || lines.some(line => state.board[line[0]] !== last || !line.includes(state.lastMove!))) invalid();
    const primary = lines[0];
    if (state.winningLine.length !== primary.length
      || primary.some((cell, i) => state.winningLine[i] !== cell)
      || state.next !== last) invalid();
  } else {
    if (state.winner !== null || state.winningLine.length !== 0) invalid();
    const expectedOutcome = state.moves === state.board.length ? "draw" : "playing";
    if (state.outcome !== expectedOutcome || state.next !== (last === null ? state.starting :
      expectedOutcome === "playing" ? other(last) : last)) invalid();
  }
}
/** Immutable move. Rejects duplicate turns, out-of-range and finished games. */
export function play(state: GameState, mark: Mark, index: number): GameState {
  assertValidGameState(state);
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
  assertValidGameState(state);
  if (state.outcome === "playing") throw new Error("Live games cannot finalize.");
  return {
    format: `${state.size}x${state.size}` as FinalResultCandidate["format"],
    mode: state.mode, winner: state.winner, draw: state.outcome === "draw",
    moves: state.moves, revision: state.revision,
  };
}
