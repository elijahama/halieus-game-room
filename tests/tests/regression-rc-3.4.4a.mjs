import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const rootPkg = JSON.parse(read('package.json'));
const home = read('client/src/platform/components/HomeScreen.tsx');
const css = read('client/src/index.css');

assert.match(rootPkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// Games must be catalogue-first. The old permanent catalogue/form split caused
// the library to collapse into unreadable strips on normal desktop widths.
assert.match(home, /halieus-games-layout is-library-only/);
assert.match(home, /const \[createOpen, setCreateOpen\] = useState\(false\)/);
assert.match(home, /function openCreate\(game: GameSelection\)/);
assert.match(home, /createOpen && <div className="halieus-create-backdrop"/);
assert.match(home, /halieus-create-panel halieus-create-modal/);
assert.match(home, /onClick=\{\(\) => openCreate\(game\.id\)\}/);

// The setup form cannot live permanently beside the catalogue anymore.
const gamesStart = home.indexOf('{view === "games"');
const playersStart = home.indexOf('{view === "players"', gamesStart);
const gamesBlock = home.slice(gamesStart, playersStart);
assert.doesNotMatch(gamesBlock, /halieus-create-panel/);
assert.doesNotMatch(gamesBlock, /halieus-create-form/);

// Desktop catalogue gets real card widths; modal setup is bounded and scrollable.
assert.match(css, /\.halieus-game-category>div\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
assert.match(css, /\.halieus-create-backdrop\{position:fixed;inset:0/);
assert.match(css, /\.halieus-create-panel\.halieus-create-modal\{[^}]*width:min\(760px,100%\)!important;[^}]*max-height:min\(88vh,900px\);[^}]*overflow:auto/s);
assert.match(css, /@media\(max-width:1180px\)\{\.halieus-game-category>div\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important\}\}/);
assert.match(css, /@media\(max-width:720px\).*grid-template-columns:1fr!important/s);

console.log('RC 3.4.4a Games library recovery regression passed.');
