import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { filterGameLibrary } from "../client/src/platform/games/libraryDiscovery.ts";

const games = [
  { id: "mega-board", name: "Mega Board", subtitle: "Build · Trade · Dominate", category: "board" },
  { id: "word-board", name: "Word Board", subtitle: "Build words", category: "board" },
  { id: "poker", name: "Poker", subtitle: "Texas Hold’em", category: "cards" },
  { id: "whot", name: "WHOT", subtitle: "Classic shedding", category: "cards" },
  { id: "hidden-dictator", name: "Hidden Dictator", subtitle: "Hide your role", category: "social" },
];
const ids = (query, category = "all") => filterGameLibrary(games, query, category).map(game => game.id);
assert.deepEqual(ids(""), games.map(game => game.id), "Empty search preserves library order");
assert.deepEqual(ids("   "), games.map(game => game.id), "Whitespace-only search shows all games");
assert.deepEqual(ids("board"), ["mega-board", "word-board"], "Search matches game names, not unrelated entries");
assert.deepEqual(ids("HoLd’Em"), ["poker"], "Search is case-insensitive and searches subtitles");
assert.deepEqual(ids("   mega   trade  "), ["mega-board"], "Multiple words must all match");
assert.deepEqual(ids("", "cards"), ["poker", "whot"], "Category filters are independent of search");
assert.deepEqual(ids("hold", "board"), [], "Category and query must both match");
assert.deepEqual(ids("something imaginary"), [], "Unmatched game has a real zero-results state");
assert.deepEqual(ids("ＢＯＡＲＤ"), ["mega-board", "word-board"], "Unicode compatibility search normalization");
assert.equal(games.length, 5, "Filtering must never modify source catalogue");

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const home = read("client/src/platform/components/HomeScreen.tsx");
const panel = read("client/src/platform/components/GameLibrarySearchPanel.tsx");
const css = read("client/src/styles/hgr-library-discovery.css");
const main = read("client/src/main.tsx");
assert.match(home, /<GameLibrarySearchPanel/, "HomeScreen must render actual shared filter component");
assert.match(panel, /aria-label="Find a game"/, "Search affordance has an accessible label");
assert.match(panel, /type="search"/, "Native search field with keyboard support");
assert.match(panel, /aria-pressed=\{category === id\}/, "Filter chips announce active state");
assert.match(home, /matchingLibraryGames.length === 0/, "Empty results feedback is explicit");
assert.match(home, /id="hgr-filtered-game-library"/, "Filtered content remains one library");
assert.match(home, /onClick=\{\(\) => openCreate\(game.id\)\}/, "Existing room creation untouched");
assert.match(home, /FUTURE_GAME_QUEUE.map/, "Coming Soon stays a separate roadmap and cannot become playable via search");
assert.match(home, /data-game-layout=\{gameLibraryView\}/, "Tiles and List preference remains available");
assert.match(css, /\.view-games \.hgr-library-search-panel/, "New CSS scoped to the Games view");
assert.match(css, /min-height:\s*44px/, "Accessible touch size in search and reset");
assert.match(css, /:focus-visible/, "Visible keyboard focus");
assert.equal((main.match(/import "\.\/styles\/hgr-library-discovery\.css";/g) || []).length, 1, "Exactly one scoped CSS import");
console.log("PASS original library-discovery filter: search, categories, no results, Unicode, accessibility and no game/roadmap regressions");
