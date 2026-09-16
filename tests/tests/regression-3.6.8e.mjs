import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

assert.match(read('VERSION').trim(), /^3\.(?:6\.8e|7\.0[a-z]?)$/, '3.6.8e invariant should survive later 3.x releases');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.match(json(file).version, /^3\.(?:6\.8-e|7\.0(?:-[a-z])?)$/, `${file} version mismatch`);
}

const board = read('client/src/games/mega-board/components/GameBoard.tsx');
assert.match(board, /board-bank-live-stock/, 'Bank live stock counter missing from Mega Board');
for (const field of ['houses','hotels','skyscrapers','depots']) {
  assert.match(board, new RegExp(`bankInventory\\.${field}`), `Bank counter missing ${field}`);
}
assert.match(board, /onClick=\{onOpenBank\}/, 'Bank must remain clickable');
assert.match(board, /authoritative GameState broadcast/, 'Bank counter should document server-authoritative source');

const modal = read('client/src/games/mega-board/components/AvailablePropertiesModal.tsx');
assert.match(modal, /Out of stock/, 'Bank inventory modal must expose out-of-stock state');
assert.match(modal, /Available/, 'Bank inventory modal must expose available state');

const state = read('shared/games/mega-board/game-state.ts');
assert.match(state, /bankInventory:\s*\{[\s\S]*houses:\s*32,[\s\S]*hotels:\s*12,[\s\S]*skyscrapers:\s*8,[\s\S]*depots:\s*4/, 'authoritative bank inventory defaults changed unexpectedly');

const css = read('client/src/index.css');
assert.match(css, /3\.6\.8e — Mega Board Bank live building inventory hotfix/, 'Bank hotfix CSS marker missing');
assert.match(css, /\.board-bank-live-stock\s*\{/, 'Bank live stock layout missing');

console.log('Halieus Game Room 3.6.8e Mega Board Bank inventory regression: PASS');
