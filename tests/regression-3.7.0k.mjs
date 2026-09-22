import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

const displayVersion=read('VERSION').trim();
assert.match(displayVersion,/^(?:3\.7\.0[kl]|4\.\d+\.\d+)$/);
const npmVersion=displayVersion.replace(/^(\d+\.\d+\.\d+)([a-z])$/,'$1-$2');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,npmVersion,`${file} version mismatch`);
}
const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0j\.mjs.*regression-3\.7\.0k\.mjs/s,'Regression chain must preserve 3.7.0j before 3.7.0k');

const rules=read('shared/games/mega-board/game-rules.ts');
assert.match(rules,/TURN_TIMER_PRESET_SECONDS = \[30, 45, 60, 90, 120, 150, 180, 300\]/,'Live turn-timer presets must include 2:30 and practical shorter/longer choices');
assert.match(rules,/isValidTurnTimerSeconds/,'Server must validate turn timer choices against the shared presets');

const state=read('shared/games/mega-board/game-state.ts');
assert.match(state,/turnTimerSeconds: number/,'Authoritative game state must persist the host-controlled move timer');
assert.match(state,/options\.blitz \? BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS : TURN_ROLL_AUTOPILOT_DURATION_MS/,'New Blitz matches must still default to 2:30 while normal modes keep their prior default');

const serverState=read('server/src/games/mega-board/utils/game-state.ts');
assert.match(serverState,/gameState\.turnTimerSeconds \* 1000/,'New roll deadlines must use the persisted room timer');
assert.match(serverState,/OPTIONAL_ACTION_DURATION_MS = 150_000|OPTIONAL_ACTION_DURATION_MS/,'Optional-action timing must remain a separate existing rule');

const reconnect=read('server/src/games/mega-board/utils/reconnection.ts');
assert.match(reconnect,/gameState\.turnRollDeadlinePlayerId = replace\([\s\S]*?gameState\.turnRollDeadlinePlayerId/,'Refresh/reconnect must migrate the deadline owner to the new socket ID');
assert.doesNotMatch(reconnect,/turnRollDeadline\s*=\s*Date\.now/,'Reconnect must never create a fresh absolute deadline');

const handlers=read('server/src/games/mega-board/handlers/turnHandlers.ts');
assert.match(handlers,/"game:set-turn-timer"/,'Server must expose an in-match timer-setting event');
assert.match(handlers,/room\.hostId !== socket\.id/,'Only the host may change the timer');
assert.match(handlers,/isValidTurnTimerSeconds\(payload\.seconds\)/,'Server must reject unsupported timer values');
assert.match(handlers,/gameState\.turnTimerSeconds = seconds/,'Timer choice must be stored in authoritative game state');
assert.match(handlers,/gameState\.turnRollDeadline = Date\.now\(\) \+ seconds \* 1000/,'An explicit host change may restart the current roll window at the selected duration');

const persistence=read('server/src/games/mega-board/utils/persistence.ts');
assert.match(persistence,/turnTimerSeconds \?\?=/,'Older persisted matches must receive a timer default during migration');

const menu=read('client/src/games/mega-board/components/GameMenu.tsx');
assert.match(menu,/Turn timer/,'The live game menu must expose the turn timer control');
assert.match(menu,/TURN_TIMER_PRESET_SECONDS\.map/,'The menu must render the shared server-approved presets');
assert.match(menu,/isHost && onTurnTimerChange/,'Only the host gets the editable selector');

const app=read('client/src/App.tsx');
assert.match(app,/function handleTurnTimerChange\(seconds: number\)/,'Client must have a timer update handler');
assert.match(app,/"game:set-turn-timer"/,'Client must send timer changes to the authoritative server');
assert.match(app,/turnTimerSeconds=\{gameState\?\.turnTimerSeconds\}/,'Game menu must receive the authoritative current timer');

console.log('Halieus Game Room 3.7.0k persistent refresh-safe live turn-timer controls regression: PASS');
