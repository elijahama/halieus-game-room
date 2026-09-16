import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../client/src/index.css', import.meta.url), 'utf8');
const marker = 'RC 3.3.48a — Mega Board property-label font-weight hotfix';
const markerIndex = css.lastIndexOf(marker);
assert.ok(markerIndex >= 0, '3.3.48a board-font hotfix marker is missing');
const tail = css.slice(markerIndex);
assert.match(tail, /\.board-space:not\(\.is-corner\) \.board-space-name\s*\{[\s\S]*?font-weight:\s*640\s*!important\s*;/, 'regular Mega Board property labels must finish at weight 640');
assert.ok(!/\.board-space[^{}]*\.board-space-name\s*\{[^}]*font-weight:\s*(?:7\d\d|8\d\d|9\d\d)\s*!important/.test(tail), 'hotfix tail must not re-heavy the regular property labels');
console.log('RC 3.3.48a board font hotfix regression passed.');
