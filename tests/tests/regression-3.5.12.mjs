import fs from 'node:fs';

const app = fs.readFileSync(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../client/src/index.css', import.meta.url), 'utf8');
const version = fs.readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(version.split('.').slice(0,2).join('.') === '3.5' && Number(version.split('.')[2]) >= 12, '3.5.12 viewport guarantees must remain in later 3.5.x builds');
assert(app.includes('className="game-page mega-live-page"'), 'active Mega Board page needs explicit mega-live-page class');
assert(css.includes('.game-page.mega-live-page'), 'Mega live page containment rule missing');
assert(css.includes('grid-template-rows:auto minmax(0,1fr) !important'), 'Mega page must use header + one constrained play row');
assert(css.includes('.mega-live-page > .game-layout.mega-live-layout-v3'), 'Mega layout must be pinned to constrained second row');
assert(css.includes('grid-row:2 !important'), 'Mega layout row assignment missing');
assert(css.includes('height:min(100%, 100cqh) !important'), 'board must cap against real container height');
console.log('3.5.12 Mega Board viewport regression checks passed.');
