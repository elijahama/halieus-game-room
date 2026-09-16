import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const displayVersion = read('VERSION').trim();
assert.match(displayVersion, /^(?:3\.6\.8[a-z]?|3\.7\.0[a-z]?|4\.0\.0)$/, '3.6.8 regression must run only on the 3.6.8 line');
const npmVersion = displayVersion === '4.0.0' ? '4.0.0' : displayVersion.startsWith('3.7.0') ? (displayVersion === '3.7.0' ? '3.7.0' : `3.7.0-${displayVersion.slice(-1)}`) : displayVersion === '3.6.8' ? '3.6.8' : `3.6.8-${displayVersion.slice(-1)}`;
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json']) assert.equal(json(file).version, npmVersion, `${file} version mismatch`);

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /onGenerateRoomCode\(\);[\s\S]*setCreateOpen\(true\)/, 'Create Room must start with a fresh code');
assert.doesNotMatch(home, /label>AI players<select value=\{wordArenaAiCount\}/, 'Password/Anagrams Create Room must not expose AI count');
assert.match(home, /Human players only/, 'Human-only note missing');

const word = read('server/src/games/word-arena/handlers.ts');
assert.match(word, /const aiCount=0;/, 'Word Arena must refuse AI creation');
assert.match(word, /scheduleRoundAi\(_io:Server,_room:Room\)/, 'Word Arena AI scheduler must be disabled');

const classic = read('server/src/games/classic-table/handlers.ts');
assert.match(classic, /if \(room\.currentTurnPlayerId === previousId\) room\.currentTurnPlayerId = player\.id;/, 'Classic recovery must remap the active turn');
assert.match(classic, /reverse\(\)\.find\(\(\{ player \}\) => player\.isAi\)/, 'Classic lobby must free an AI seat for a joining human');

const whot = read('server/src/games/whot/rebuild.ts');
assert.match(whot, /if \(room\.currentTurnPlayerId === previousId\) room\.currentTurnPlayerId = player\.id;/, 'WHOT recovery must remap turn ownership');
const blackjack = read('server/src/games/blackjack/rebuild.ts');
assert.match(blackjack, /if \(room\.currentTurnPlayerId === previousId\) room\.currentTurnPlayerId = player\.id;/, 'Blackjack recovery must remap turn ownership');

const css = read('client/src/index.css');
assert.match(css, /3\.6\.8 — viewport fit/);
assert.match(css, /classic-table-page \{ height:100dvh/);
assert.match(css, /rebuild-game-page \{ height:100dvh/);
assert.match(css, /mega-game-chrome[\s\S]*min-height:38px/);
assert.match(css, /--classic-surface/);

const icon = read('client/public/game-icons/whot.svg');
assert.doesNotMatch(icon, />A<\/text>/, 'WHOT icon must not use a standard playing-card A index');
assert.match(icon, />7<\/text>/, 'WHOT rear card should use a WHOT-style numbered index');

console.log('Halieus Game Room 3.6.8 regression: PASS');
