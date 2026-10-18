import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [rail, sidebar, board, skin, css, entry] = await Promise.all([
  read("client/src/games/mega-board/components/PlayerRail.tsx"),
  read("client/src/games/mega-board/components/GameSidebar.tsx"),
  read("client/src/games/mega-board/components/GameBoard.tsx"),
  read("client/src/styles/hgr-game-surfaces-v45.css"),
  read("client/src/styles/hgr-4.5.5-mega-board-portfolio.css"),
  read("client/src/main.tsx"),
]);
assert.match(board, /data-mortgaged=\{gameState\.mortgagedProperties\[space\.id\]/, "Board mortgage paint must derive from authoritative game state");
assert.match(skin, /\.board-space\.is-mortgaged-space/, "Legacy skin rule must exist to prove the late override covers the regression");
assert.match(css, /board-space\.is-mortgaged-space[\s\S]*?linear-gradient\(155deg, #b91c1c/, "Mortgaged tiles must use explicit dark red paint");
assert.match(css, /board-space\.is-mortgaged-space[\s\S]*?filter: none !important/, "Mortgages may not be desaturated by board skins");
assert.match(css, /board-space\.is-mortgaged-space[\s\S]*?\.board-space-name[\s\S]*?color: #fff !important/, "Red mortgages need readable high-contrast names");
assert.match(rail, /orderedOwnedSpaces\.map\(\(space\)/, "Rail must render all owned assets");
assert.doesNotMatch(rail, /orderedOwnedSpaces\.slice\(0,\s*6\)|compactOwnedSpaces|hiddenOwnedSpaceCount/, "Never hide all properties behind the six-chip cutoff");
assert.match(rail, /player-property-count/, "Show an actual total when holdings exceed the visible area");
assert.match(css, /player-property-strip[\s\S]*?overflow-y: auto !important/, "Property list must scroll inside its player card");
assert.match(css, /player-property-strip[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/, "Asset chips need readable columns");
assert.equal((sidebar.match(/<DebtPanel/g) ?? []).length, 1, "Keep one debt panel");
const scrollStart = sidebar.indexOf('className={`turn-actions-popup-scroll');
assert.ok(scrollStart > 0 && sidebar.indexOf("<DebtPanel", scrollStart) > scrollStart, "Debt panel must be within the scrollable dialog body");
assert.match(sidebar, /hasLiveDebt && !activePanel/, "Don't leave a second debt card on top of full manager");
assert.match(sidebar, /turn-actions-debt-back[\s\S]*?setActivePanel\(null\)/, "Full manager must allow return to debt resolution");
assert.match(css, /\.turn-actions-popup-layer\.has-live-debt \.turn-actions-popup[\s\S]*?max-height: min\(78dvh, calc\(100dvh - 104px\)\)/, "Debt dialog must fit desktop viewports");
assert.match(css, /\.turn-actions-popup-layer\.has-live-debt \.turn-actions-popup-scroll[\s\S]*?overflow-y: auto !important/, "Debt body must scroll rather than clipping payment actions");
assert.match(entry, /hgr-4\.5\.5-part28-authority\.css";\s*import "\.\/styles\/hgr-4\.5\.5-mega-board-portfolio\.css"/, "New Mega Board override must load last, after theme and skin CSS");
console.log("PASS Mega Board red mortgaged tiles, entire property roster and scrollable compact liquidation dialog");

const allSeatSummary = /activePlayers\.filter\(\(player\) => player\.isConnected\)\.length\} online/;
assert.match(rail, allSeatSummary, "Side rails must show connected match-player counts");
assert.match(css, /player-rail-side \.player-rail-list[\s\S]*?overflow-y: auto !important/, "No active player seat may be clipped by the fixed grid");
assert.match(css, /player-rail-side \.player-rail-card[\s\S]*?height: auto !important/, "Seats must scroll as content-sized cards");
assert.match(board, /latestDiceActivity\?\.playerId === activeGamePlayer\?\.id/, "Do not mislabel an earlier player's dice as the current roll");
assert.match(board, /latestDiceActivity\.turnNumber === gameState\.turnNumber/, "An old round must not leave a stale Last roll label");
assert.match(board, /This turn's roll/, "Completed dice should be labelled for the current player and turn");
assert.doesNotMatch(board, /aria-label="Last dice roll"/, "Global stale roll must not pretend to be the current player's result");
console.log("PASS full online-match roster and per-turn dice presentation semantics");

assert.match(css,/tablet-players-drawer \.player-property-strip[\s\S]*?overflow-y: auto !important/,"Tablet/phone Players drawer must scroll all properties");
assert.match(css,/tablet-players-drawer \.player-property-strip[\s\S]*?max-height: min\(30dvh, 220px\)/,"Player drawer property chips must not consume the entire screen");
