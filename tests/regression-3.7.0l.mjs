import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

const displayVersion=read('VERSION').trim();
assert.match(displayVersion,/^(?:3\.7\.0l|4\.\d+\.\d+)$/);
const npmVersion=displayVersion.replace(/^(\d+\.\d+\.\d+)([a-z])$/,'$1-$2');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,npmVersion,`${file} version mismatch`);
}
const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0k\.mjs.*regression-3\.7\.0l\.mjs/s,'Regression chain must preserve 3.7.0k before 3.7.0l');

const catalog=read('client/src/platform/games/catalog.ts');
const brand=read('client/src/platform/components/GameBrandIcon.tsx');
const home=read('client/src/platform/components/HomeScreen.tsx');
const css=read('client/src/index.css');

const games=['mega-board','ludo','connect-four','ayo','word-board','poker','whot','blackjack','hidden-dictator','word-game','password','anagrams-race','cheat','dominoes'];
for(const game of games){
  const asset=`client/src/assets/game-icons/${game}.svg`;
  assert.ok(existsSync(new URL(`../${asset}`,import.meta.url)),`${asset} missing`);
  assert.match(catalog,new RegExp(`assets/game-icons/${game.replace(/-/g,'\\-')}\\.svg`),`${game} must be bundled from source assets`);
}
assert.match(brand,/publicFallback = `\/game-icons\/\$\{game\}\.svg`/,'GameBrandIcon must fall back to the public copy of the same artwork');
assert.match(brand,/onError=/,'GameBrandIcon must recover from an icon asset load failure');
assert.match(home,/halieus-create-brand"><GameBrandIcon game=\{selectedGame\}/,'Create-game setup must use the shared game icon component');
assert.match(home,/halieus-library-art"><GameBrandIcon game=\{game\.id\}/,'Homepage library and create-game setup must use the same icon component');
assert.match(css,/3\.7\.0l — game icon continuity/,'Icon continuity CSS marker missing');
assert.match(css,/\.halieus-create-brand>img[\s\S]*?border:0 !important/,'Room-start icon must not have an extra square frame');

const screenChecks=[
  ['client/src/games/mega-board/components/LobbyScreen.tsx',/GameBrandIcon game="mega-board"/],
  ['client/src/games/poker/PokerScreen.tsx',/GameBrandIcon game="poker"/],
  ['client/src/games/blackjack/BlackjackRebuildScreen.tsx',/GameBrandIcon game="blackjack"/],
  ['client/src/games/whot/WhotRebuildScreen.tsx',/GameBrandIcon game="whot"/],
  ['client/src/games/ludo/LudoScreen.tsx',/GameBrandIcon game="ludo"/],
  ['client/src/games/connect-four/ConnectFourScreen.tsx',/GameBrandIcon game="connect-four"/],
  ['client/src/games/hidden-dictator/HiddenDictatorScreen.tsx',/GameBrandIcon game="hidden-dictator"/],
  ['client/src/games/ayo/AyoScreen.tsx',/GameBrandIcon game="ayo"/],
  ['client/src/games/word-board/WordBoardScreen.tsx',/GameBrandIcon game="word-board"/],
  ['client/src/games/word-arena/WordArenaScreen.tsx',/GameBrandIcon game=\{state\.game\}/],
  ['client/src/games/classic-table/ClassicTableScreen.tsx',/GameBrandIcon game=\{state\.game\}/],
];
for(const [file,pattern] of screenChecks) assert.match(read(file),pattern,`${file} must render the catalog game icon in its room/start header`);

console.log('Halieus Game Room 3.7.0l consistent game icons regression: PASS');
