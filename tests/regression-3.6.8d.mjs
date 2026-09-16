import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

const displayVersion = read('VERSION').trim();
assert.match(displayVersion, /^(?:3\.6\.8[a-z]?|3\.7\.0[a-z]?|4\.0\.0)$/, '3.6.8d regression must stay on the 3.6.8 line');
const npmVersion = displayVersion === '4.0.0' ? '4.0.0' : displayVersion.startsWith('3.7.0') ? (displayVersion === '3.7.0' ? '3.7.0' : `3.7.0-${displayVersion.slice(-1)}`) : displayVersion === '3.6.8' ? '3.6.8' : `3.6.8-${displayVersion.slice(-1)}`;
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version, npmVersion, `${file} version mismatch`);
}

const css = read('client/src/index.css');
const sectionMatch = css.match(/\/\* Uniform single-outline game-brand icon construction — 3\.6\.8d \*\/[\s\S]*$/);
assert.ok(sectionMatch, 'single-outline icon construction marker missing');
const section = sectionMatch[0];
assert.match(section, /\.halieus-game-brand-icon[\s\S]*border:2px solid/, 'shared icon border missing');
assert.match(section, /\.halieus-game-brand-icon[\s\S]*outline:none/, 'shared icon outline reset missing');
assert.doesNotMatch(section, /outline-offset:2px/, 'legacy double-outline offset should not remain in shared icon framing');

for (const file of [
  'client/public/game-icons/blackjack.svg',
  'client/public/game-icons/hidden-dictator.svg',
  'client/public/game-icons/ludo.svg',
  'client/public/game-icons/mega-board.svg',
  'client/public/game-icons/poker.svg',
  'client/public/game-icons/whot.svg',
]) {
  const svg = read(file);
  const firstRect = (svg.match(/<rect[^>]*>/) || [''])[0];
  assert.ok(firstRect, `${file} must start with a framed background rect`);
  assert.doesNotMatch(firstRect, /stroke=/, `${file} should not keep an extra outer frame stroke`);
}

console.log('Halieus Game Room 3.6.8d single-outline game icon regression: PASS');
