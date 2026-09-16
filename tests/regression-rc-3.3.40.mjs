import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('client/src/App.tsx');
const home = read('client/src/platform/components/HomeScreen.tsx');
const catalog = read('client/src/platform/games/catalog.ts');
const ludo = read('client/src/games/ludo/LudoScreen.tsx');
const ludoReport = read('client/src/games/ludo/utils/gameReport.ts');
const ludoTypes = read('shared/games/ludo/types.ts');
const ludoServer = read('server/src/games/ludo/handlers.ts');
const serverIndex = read('server/src/index.ts');
const archive = read('server/src/platform/sessionArchive.ts');
const css = read('client/src/index.css');

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);

// Ludo is a real Halieus module, not a Coming Soon placeholder.
assert.match(catalog, /id: "ludo", name: "Ludo"/);
assert.match(catalog, /icon: "\/game-icons\/ludo\.svg"/);
assert.match(catalog, /subtitle: "Race to home"/);
assert.match(app, /readLudoCodeFromPath/);
assert.match(app, /\/ludo\/\$\{response\.code\}/);
assert.match(app, /<LudoScreen/);
assert.match(app, /ludo:reconnect/);
assert.match(serverIndex, /registerLudoHandlers/);
assert.match(serverIndex, /activeLudoRooms/);

// First playable rules contract: 2–4 players, four pieces, yard/track/home/finish,
// six-to-enter, exact finish, safe starts/stars and explicit blockades setting.
assert.match(ludoTypes, /piecesPerPlayer: 4/);
assert.match(ludoTypes, /rollToEnter: 6/);
assert.match(ludoTypes, /blockadesEnabled: boolean/);
assert.match(ludoTypes, /-1 = yard, 0\.\.51 = main track, 52\.\.56 = home lane, 57 = finished/);
assert.match(ludoServer, /room\.players\.length >= 4/);
assert.match(ludoServer, /room\.players\.length < 2/);
assert.match(ludoServer, /if \(piece\.steps === -1\) return roll === room\.rules\.rollToEnter/);
assert.match(ludoServer, /target <= 57/);
assert.match(ludoServer, /opponentPiece\.steps = -1/);
assert.match(ludoServer, /finishedCount\(player\) === 4/);
assert.match(ludoServer, /SAFE_STARS/);

// Shared lifecycle and same-seat automation are present.
for (const event of ['ludo:create','ludo:join','ludo:reconnect','ludo:spectate','ludo:add-ai','ludo:start','ludo:roll','ludo:move','ludo:set-autopilot','ludo:end-game','ludo:forfeit','ludo:leave']) {
  assert.match(ludoServer, new RegExp(event.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(ludoServer, /player\.isAi \|\| player\.autopilotEnabled/);
assert.match(ludoServer, /Autopilot rolled for the delegated human seat/);
assert.match(ludoServer, /room\.currentTurnPlayerId === previousPlayerId/);
assert.match(ludoServer, /if \(room\.started\) room\.players\.forEach/);
assert.match(ludo, /AutopilotControl compact/);

// Board-first presentation and report evidence are explicit.
assert.equal((ludo.match(/\[\d+,\d+\]/g) ?? []).length >= 52, true);
assert.match(ludo, /className="ludo-board"/);
assert.match(ludo, /legalPieceIds\.includes/);
assert.match(ludo, /useLayoutEffect/);
assert.match(ludo, /node\.animate/);
assert.match(ludo, /Recent actions|roomActivity/); // RC 3.3.46 routes public recent actions into shared Game Log.
assert.match(ludoReport, /ACTION & AI EVIDENCE/);
assert.match(ludoReport, /Recovery keys, socket IDs, IP addresses and authentication data are intentionally excluded/);
assert.match(css, /3\.3\.40[^\n]*Ludo playable-beta/);
assert.match(css, /grid-template-columns:repeat\(15/);
assert.match(css, /\.ludo-piece\.is-legal/);
assert.match(css, /@keyframes ludo-die-pop/);

// Ludo reports archive to the dedicated evidence folder.
assert.match(archive, /"ludo"/);
assert.match(archive, /17z-I-yAGVgw0SZPETis4eE3mSdfD_Rts/);

// Existing catalogue direction remains intact: WHOT playable above paused Blackjack.
assert.ok(catalog.indexOf('id: "whot"') < catalog.indexOf('id: "blackjack"'));
assert.match(catalog, /icon: "\/game-icons\/blackjack\.svg"/);

console.log('RC 3.3.40 Ludo regression checks passed.');
