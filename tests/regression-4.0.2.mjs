import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

/*
 * HGR 4.0.2 regression contract.
 *
 * 4.0.2 removes the old phone-as-desktop viewport emulation. Mobile layout is
 * now CSS-owned at device width, so a future refactor must not silently restore
 * width=980 or depend on a 680px minimum Mega Board to make the phone UI work.
 */

// Historical 4.0.2 contract: later HGR 4.x releases must retain the true
// device-width mobile rules without pinning the current version to 4.0.2.
assert.match(read('VERSION').trim(),/^4\.\d+\.\d+$/,'4.x product version expected');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.match(json(file).version,/^4\.\d+\.\d+$/,`${file} must remain on the HGR 4.x line`);
}

const rootPackage=json('package.json');
assert.match(
  rootPackage.scripts['test:regression'],
  /regression-4\.0\.1\.mjs.*regression-4\.0\.2\.mjs/s,
  'Regression chain must preserve 4.0.1 before 4.0.2',
);

const app=read('client/src/App.tsx');
const html=read('client/index.html');
const css=read('client/src/index.css');
const ordering=read('client/src/games/mega-board/components/TurnOrderScreen.tsx');
const serviceWorker=read('client/public/sw.js');
const intro=read('client/src/platform/components/HalieusIntro.tsx');
const readme=read('README.md');

assert.doesNotMatch(app,/width=98[012]/,'Runtime code must never force a desktop-width mobile viewport');
assert.doesNotMatch(app,/enforceDesktopMobileViewport|desktopMobileContent/,'Legacy Mega Board viewport emulation must stay removed');
assert.match(app,/4\.0\.2 mobile viewport contract/,'App must explain the device-width mobile viewport contract');

assert.match(
  html,
  /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/,
  'Static viewport must remain device-width and safe-area aware',
);
assert.doesNotMatch(html,/width=980/,'HTML viewport must never request the old desktop mobile width');
// 4.0.2 only requires a cache-busted browser identity. Later 4.x releases
// may replace the original favicon.ico artwork, so this historical regression
// follows the current canonical Halieus mark without resurrecting retired assets.
assert.match(
  html,
  /id="halieus-dynamic-favicon"[^>]+href="\/app-icon-reference\.png\?v=4\.\d+\.\d+(?:-[^"]+)?"/,
  '4.0.2 browser asset cache identity missing',
);

assert.match(ordering,/className="mega-ordering-page"/,'Mega ordering screen needs its mobile layout hook');

assert.match(css,/HGR 4\.0\.2 — true device-width gameplay recovery/,'4.0.2 mobile CSS marker missing');
assert.match(
  css,
  /\.mega-live-page \.board-grid\s*\{[\s\S]*?width:\s*100%\s*!important;[\s\S]*?min-width:\s*0\s*!important/s,
  'Mega Board must fit the physical phone width',
);
assert.match(
  css,
  /\.mega-live-page \.board-decision-layer\s*\{[\s\S]*?position:\s*fixed\s*!important;[\s\S]*?align-items:\s*flex-end\s*!important/s,
  'Mega mandatory decisions must use a bounded phone sheet',
);
assert.match(
  css,
  /\.mega-ordering-page \.ordering-top-actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/s,
  'Mega ordering navigation must remain a two-action phone rail',
);
assert.match(
  css,
  /HGR 4\.0\.2 — shared phone game-menu sheet completion/,
  'Shared phone game-menu sheet marker missing',
);
assert.match(
  css,
  /\.game-menu-top-layer > \.game-menu-modal\s*\{[\s\S]*?max-height:\s*calc\(100dvh/s,
  'Mega/shared game menu must stay bounded to the physical phone viewport',
);
assert.match(
  css,
  /\.hidden-dictator-live\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)\s*!important/s,
  'Hidden Dictator must collapse to one phone column',
);
assert.match(
  css,
  /@media \(max-height: 560px\) and \(pointer: coarse\) and \(orientation: landscape\)/,
  'Short landscape phones need explicit density safeguards',
);

assert.match(serviceWorker,/halieus-shell-v4-\d+-\d+/,'PWA cache must remain versioned on the HGR 4.x line');
assert.match(intro,/HalieusBrandMark/,'Intro identity must remain wired through the shared Halieus mark');
assert.match(readme,/Current milestone:\*\* 4\.\d+\.\d+/,'README must advertise the current HGR 4.x milestone');

console.log('Halieus Game Room 4.0.2 device-width mobile regression: PASS');
