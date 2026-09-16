import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

assert.equal(read('VERSION').trim(), '3.6.3b');
assert.equal(JSON.parse(read('package.json')).version, '3.6.3-b');
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.3b"/);

const css = read('client/src/index.css');
const patch = css.slice(css.lastIndexOf('3.6.3b — Owner tab-hub polish'));
assert.ok(patch.length > 0, '3.6.3b CSS patch marker missing');
assert.match(patch, /\.account-panel \.account-owner-nav \{[\s\S]*?gap: 0 !important;[\s\S]*?border-radius: 16px !important;/);
assert.match(patch, /grid-template-columns: 34px minmax\(0, 1fr\)/);
assert.match(patch, /button strong \{[\s\S]*?font-weight: 950 !important;/);
assert.match(patch, /button small \{[\s\S]*?font-weight: 760 !important;/);
assert.match(patch, /button::after \{[\s\S]*?width: 58% !important;[\s\S]*?height: 4px !important;/);
assert.match(patch, /button\.is-active::after \{[\s\S]*?scaleX\(1\)/);
assert.doesNotMatch(patch, /\.ludo[-\w\s>.:#\[]*\{/i, '3.6.3b must not target Ludo');
assert.doesNotMatch(patch, /\.poker[-\w\s>.:#\[]*\{/i, '3.6.3b must not target Poker');
assert.match(patch, /\.mega-game-chrome \{[\s\S]*?min-width: 236px !important;/);
assert.match(patch, /\.mega-game-chrome \.game-room-back-button,[\s\S]*?font-weight: 950 !important;/);
assert.doesNotMatch(patch, /\.mega-(live-page|board|board-shell|board-grid|player-rail|game-layout)/i, '3.6.3b must not alter Mega Board board/game geometry');
assert.doesNotMatch(patch, /\bzoom\s*:/, '3.6.3b must not use CSS zoom');
assert.doesNotMatch(patch, /transform\s*:\s*scale\(/, '3.6.3b must not use global scale hacks');


const deploy = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(deploy, /function Convert-HalieusVersionToNpm/);
assert.match(deploy, /expectedPackageVersion = Convert-HalieusVersionToNpm \$expectedVersion/);
assert.match(deploy, /\$packageVersion -ne \$expectedPackageVersion/);

const installer = read('dev-tools/Oracle Quick Deploy/quick-install.sh');
assert.match(installer, /expectedPackageVersion = match\[2\]/);
assert.match(installer, /actual !== expectedPackageVersion/);

const starter = read('start-background.ps1');
assert.match(starter, /expectedPackageVersion = Convert-HalieusVersionToNpm \$expectedVersion/);
assert.match(starter, /\$clientPackageVersion -ne \$expectedPackageVersion/);

const updater = read('update-website.ps1');
assert.match(updater, /function Compare-HalieusVersions/);
assert.match(updater, /Compare-HalieusVersions \$expectedVersion \$currentVersion/);
assert.doesNotMatch(updater, /\[version\]\$expectedVersion/);

console.log('Halieus Game Room 3.6.3b owner tab-hub regression: PASS');
