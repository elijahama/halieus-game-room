import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { findConnectFourWinningCells } from "../shared/games/connect-four/winning-line.ts";
import { ConnectFourBoard } from "../client/src/games/connect-four/ConnectFourBoard.tsx";

const empty = () => Array(42).fill(0);
function boardWith(cells, disc = 1) {
  const board = empty();
  for (const cell of cells) board[cell] = disc;
  return board;
}
const cases = [
  ["horizontal", [35,36,37,38]],
  ["vertical", [14,21,28,35]],
  ["diagonal down-right", [7,15,23,31]],
  ["diagonal up-right", [17,23,29,35]],
];
for (const [label, cells] of cases) {
  const board = boardWith(cells);
  assert.deepEqual(findConnectFourWinningCells(board, 1), cells, label);
  assert.equal(findConnectFourWinningCells(board, 2), null, label + " opposite disc");
  assert.equal(findConnectFourWinningCells(board, 0), null, label + " blank disc");
  const html = renderToStaticMarkup(
    React.createElement(ConnectFourBoard, {
      board, winningCells: findConnectFourWinningCells(board, 1),
      lastDropIndex: cells.at(-1), review: true,
    }),
  );
  assert.equal((html.match(/is-winning-cell/g) ?? []).length, 4, label + " four highlighted cells");
  assert.equal((html.match(/part of the winning four/g) ?? []).length, 4);
  assert.match(html, /Winning four.*outlined in white/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 42, label + " read-only review");
  const live = renderToStaticMarkup(React.createElement(ConnectFourBoard, {
    board, winningCells: [], lastDropIndex: null, canAct: true, onDrop: () => {},
  }));
  assert(!live.includes("is-winning-cell"), label + " no highlight mid-game");
}
const three = boardWith([35,36,37]);
assert.equal(findConnectFourWinningCells(three, 1), null, "Three is not four");
assert.equal(findConnectFourWinningCells(empty(), 1), null, "Empty board never wins");
assert.equal(findConnectFourWinningCells(Array(41).fill(1), 1), null, "Invalid board size never wins");
const yellow = boardWith([35,36,37,38], 2);
assert.deepEqual(findConnectFourWinningCells(yellow, 2), [35,36,37,38]);
const noWinHtml = renderToStaticMarkup(React.createElement(ConnectFourBoard, {
  board: empty(), winningCells: [], lastDropIndex: null, review: true,
}));
assert(!noWinHtml.includes("is-winning-cell"), "Forfeit/draw board must not falsely highlight a win");
assert.match(noWinHtml, /no four-in-a-row recorded/);
console.log("PASS Connect Four 4.6.4: all win directions, wrong/empty/three, red/yellow, exactly four accessible highlights, read-only final board and no phantom winners");
