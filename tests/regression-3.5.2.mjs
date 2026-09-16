import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');

// 3.5.2 established the shared-theme timing and a pre-React theme bootstrap.
// Later releases may refine the loading bridge, but must preserve those guarantees.
const html=read('client/index.html');
assert.match(html,/halieus-game-room-theme/,'saved theme must be applied before app paint');
assert.match(html,/document\.documentElement\.dataset\.theme = theme/);
assert.match(html,/document\.documentElement\.style\.backgroundColor/);

const app=read('client/src/App.tsx');
assert.match(app,/THEME_TRANSITION_MS = 820/);
assert.match(app,/style\.backgroundColor = darkMode \? "#101317" : "#f4efe5"/);

const css=read('client/src/index.css');
assert.match(css,/reload\/theme continuity/);
assert.match(css,/html\.theme-transitioning,\s*html\.theme-transitioning body/,'document canvas must join theme transition');
assert.match(css,/transition-duration:820ms !important/);
assert.match(css,/@keyframes halieus-page-in \{ from \{ transform:translateY\(4px\); \} to \{ transform:none; \} \}/,'page entry must not fade the full screen transparent');

const deploy=read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(deploy,/\[string\]\$SourceZip = ""/,'source zip should be optional');
assert.match(deploy,/Packing the current Halieus workspace for Oracle/);
assert.match(deploy,/server\/data/,'routine deploy packaging excludes laptop runtime data');
assert.doesNotMatch(deploy,/LegacyDataPath/);
const installer=read('dev-tools/Oracle Quick Deploy/quick-install.sh');
assert.match(installer,/Preserve the live Certbot-managed HTTPS server block/);
assert.match(installer,/systemctl reload nginx/);

console.log('Halieus Game Room 3.5.2 theme/deployment guarantees preserved.');
