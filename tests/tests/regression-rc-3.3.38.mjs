import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const home = read('client/src/platform/components/HomeScreen.tsx');
const whot = read('client/src/games/whot/WhotScreen.tsx');
const whotReport = read('client/src/games/whot/utils/gameReport.ts');
const whotTypes = read('shared/games/whot/types.ts');
const whotServer = read('server/src/games/whot/handlers.ts');
const css = read('client/src/index.css');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);
assert.match(whotTypes, /WhotMatchMode = "casual" \| "ranked"/);
assert.match(whotTypes, /WhotActionLogEntry/);
assert.match(whotServer, /matchMode: matchMode\(payload\?\.matchMode\)/);
assert.match(whotServer, /matchMode: room\.matchMode/);
assert.match(whotServer, /actionLog: room\.actionLog\.slice\(-240\)/);
assert.match(whotServer, /recordAction\(latest/);
assert.match(app, /matchMode: whotMatchMode/);
assert.match(app, /setWhotMatchMode\(nextState\.matchMode\)/);
assert.match(home, /aria-label="WHOT match type"/);
assert.match(home, />Casual</);
assert.doesNotMatch(home, />[★♠] Casual</);
assert.match(home, />🏆 Ranked</);
assert.doesNotMatch(home, /WHOT[^\n]{0,80}Blitz/);
assert.match(whot, /whot344-table/);
assert.match(whot, /whot344-centre/);
assert.match(whot, /whot344-local/);
assert.match(whot, /whot344-opponents/);
assert.match(whot, /whot-evidence-feed|roomActivity/); // RC 3.3.46 moves the visible evidence surface into shared Game Log.
assert.match(whot, /Draw card/);
assert.match(whot, /whot344-market/);
assert.match(whotReport, /ACTION & AI EVIDENCE/);
assert.match(whotReport, /Market draws record count and hand-count movement, but not hidden card identities/);
assert.match(whotReport, /Match: \$\{state\.matchMode === "ranked" \? "Ranked" : "Casual"\}/);
assert.match(css, /v0\.22\.9-rc\.3\.3\.38/);
assert.match(css, /\.poker-lobby-actions-v2 \{[\s\S]*max-width: 100%;[\s\S]*min-width: 0;/);
assert.match(css, /\.whot344-opponents[\s\S]{0,220}grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css, /\.whot-status-panel \{[\s\S]*height:auto !important/);
assert.match(css, /\.whot-hand \.whot-card \{[\s\S]*width:clamp\(74px,4\.6vw,88px\)/);

console.log('RC 3.3.38 regression checks passed.');
