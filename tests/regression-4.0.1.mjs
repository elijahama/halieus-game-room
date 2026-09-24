import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

/*
 * HGR 4.0.1 regression contract.
 *
 * This patch is deliberately presentation-focused: ranked calculations remain
 * server-authoritative while the client reorganises those recorded values into
 * clearer desktop and mobile result layouts.
 */

// Historical 4.0.1 contract: later 4.x releases must preserve these UI
// behaviours without forcing the current product version back to 4.0.1.
assert.match(read('VERSION').trim(),/^4\.\d+\.\d+$/,'4.x product version expected');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.match(json(file).version,/^4\.\d+\.\d+$/,`${file} must remain on the 4.x line`);
}

const rootPackage=json('package.json');
assert.match(
  rootPackage.scripts['test:regression'],
  /regression-4\.0\.0\.mjs.*regression-4\.0\.1\.mjs/s,
  'Regression chain must preserve 4.0.0 before 4.0.1',
);

const winner=read('client/src/games/mega-board/components/WinnerScreen.tsx');
const css=read('client/src/index.css');
const serviceWorker=read('client/public/sw.js');
const intro=read('client/src/platform/components/HalieusIntro.tsx');
const readme=read('README.md');

assert.match(winner,/function rankedPlaceMark\(position: number\)/,'Ranked place presentation helper missing');
assert.match(winner,/ranked-result-summary ranked-result-summary-v401/,'4.0.1 ranked result container missing');
assert.match(winner,/Rating movement/,'Ranked results need a clear rating movement heading');
assert.match(winner,/ranked-bonus-breakdown/,'Ranked rating breakdown cards missing');
assert.match(winner,/ranked-award-strip/,'Ranked award strip missing');
assert.match(winner,/data-label="Revenue"/,'Mobile final-result labels missing');
assert.match(winner,/data-label="Profit \/ loss"/,'Mobile profit/loss label missing');

assert.match(css,/HGR 4\.0\.1 — ranked results hierarchy \+ phone results layout/,'4.0.1 result CSS marker missing');
assert.match(css,/\.ranked-result-card\s*\{[\s\S]*?grid-template-columns:/s,'Ranked desktop cards must keep structured columns');
assert.match(css,/@media \(max-width: 760px\)[\s\S]*?\.ranked-result-card\s*\{[\s\S]*?grid-template-columns:\s*1fr/s,'Ranked cards must collapse cleanly on phones');
assert.match(css,/\.final-results-heading\.final-results-grid\s*\{[\s\S]*?display:\s*none\s*!important/s,'Desktop result heading must be removed from phone card layout');
assert.match(css,/\.final-player-row \.final-result-metric::before\s*\{[\s\S]*?content:\s*attr\(data-label\)/s,'Phone metrics must expose their labels');
assert.match(css,/HGR 4\.0\.1 — shared non-Mega phone results cards/,'Shared phone-results CSS marker missing');
assert.match(css,/\.final-player-row\.halieus-final-results-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s,'Shared game results must collapse to balanced phone cards');
assert.match(css,/\.results-tabs\s*\{\s*grid-template-columns:\s*repeat\(3,/s,'Results tabs must match the three actual tabs');

assert.match(serviceWorker,/halieus-shell-v4-\d+-\d+/,'PWA cache must remain versioned on the 4.0.x line');
assert.match(intro,/HalieusBrandMark/,'Intro identity must remain wired through the shared Halieus mark');
assert.match(readme,/Current milestone:\*\* 4\.\d+\.\d+/,'README must advertise the current 4.0.x milestone');

console.log('Halieus Game Room 4.0.1 mobile + ranked results regression: PASS');
