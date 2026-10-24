import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const home = read("client/src/platform/components/HomeScreen.tsx");
const gallery = read("client/src/styles/hgr-4.6-gallery-experiment.css");
const entry = read("client/src/main.tsx");
const prior = read("client/src/styles/hgr-4.5.5l-library-view.css");

assert.match(home, /type GameLibraryLayout = "tiles" \| "list" \| "gallery"/, "Gallery is an additional view, not a replacement");
assert.match(home, /getItem\(GAME_LIBRARY_LAYOUT_KEY\) === "gallery"/, "Remember Gallery opt-in");
assert.match(home, /getItem\(GAME_LIBRARY_LAYOUT_KEY\) === "list"/, "Preserve saved List preference");
assert.match(home, /\? "list" : "tiles"/, "Keep Tiles default");
for (const layout of ["tiles", "list", "gallery"]) {
  assert.match(home, new RegExp('gameLibraryView === "' + layout + '"'), layout + " must be selectable");
  assert.match(home, new RegExp('changeGameLibraryView\\("' + layout + '"\\)'), layout + " must work");
}
assert.match(home, /data-game-layout=\{gameLibraryView\}/, "Data attribute reaches presentation layer");
assert.match(home, /onClick=\{\(\) => openCreate\(game\.id\)\}/, "All presentation modes share HGR game-room creation");
assert.match(home, /GAMES\.filter\(\(game\) => game\.category === group\.id\)/, "Keep original game categories");
assert.match(home, /FUTURE_GAME_QUEUE\.map/, "Unfinished games remain roadmap only");
assert.match(gallery, /data-game-layout="gallery"/, "Gallery CSS must be strictly opt-in");
assert.match(gallery, /repeat\(2, minmax\(0, 1fr\)\)/, "Phone Gallery must fit two original posters per row");
assert.match(gallery, /scroll-snap-type: none !important/, "Gallery uses a proper no-horizontal-scroll grid");
assert.match(gallery, /var\(--game-card-accent\)/, "Use HGR per-game accents");
assert.match(gallery, /var\(--hgr-surface/, "Use HGR theme surfaces rather than cloned third-party tokens");
assert.match(gallery, /prefers-reduced-motion: reduce/, "Accessible motion controls are required");
assert.doesNotMatch(gallery, /miruro[.-]|miruro\.com|url\(https?:/, "Do not copy Miruro imagery or CSS assets");
assert.match(prior, /data-game-layout="list"/, "Original List CSS stays intact");
assert.match(prior, /data-game-layout="tiles"/, "Original Tiles CSS stays intact");
assert.equal((entry.match(/import "\.\/styles\/hgr-4\.6-gallery-experiment\.css";/g) ?? []).length, 1,
  "Gallery CSS loads once, after the original theme and library CSS");
console.log("PASS HGR 4.6 gallery: original assets, optional persistent third layout, room actions, category integrity, theme tokens, no external Miruro code");
