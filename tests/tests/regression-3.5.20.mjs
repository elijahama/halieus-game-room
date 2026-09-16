import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const version = read('VERSION').trim();

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 20, '3.5.20 guarantees must remain in later 3.5.x builds');

const handlers = read('server/src/games/mega-board/handlers/tradeHandlers.ts');
assert.match(handlers, /if \(transfers\.length === 0\) return null;/, 'recipient selection alone must not create a live deal preview');
assert.match(handlers, /io\.to\(code\)\.emit\("game:trade-live", preview\)/, 'server must broadcast null as well as material previews so stale banners clear');

const app = read('client/src/App.tsx');
assert.match(app, /socket\.emit\("game:trade-live-close", \{ code: lobby\.code \}\);[\s\S]{0,180}setLiveTradePreview\(null\)/, 'removing all trade recipients must explicitly clear the live preview');
assert.match(app, /activePlayer\?\.id !== currentPreview\.proposerId/, 'turn changes must discard stale live trade previews');
assert.match(app, /payload\.state\.pendingTrade/, 'formal proposals must replace ephemeral live previews');

const overlay = read('client/src/games/mega-board/components/LiveTradeOverlay.tsx');
assert.match(overlay, /livePreview\.proposerId !== activePlayerId/, 'overlay must refuse previews from a previous turn');
assert.match(overlay, /if \(transfers\.length === 0\) return null;/, 'overlay must never show an empty negotiation');

console.log('Halieus Game Room 3.5.20 live-deal false-positive regression PASS');
