import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');

assert.equal(read('VERSION').trim(), '3.5.26');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, '3.5.26', `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.5\.26"/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, '3.5.26');
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, '3.5.26', `package-lock ${workspace || 'root'} version mismatch`);

const main = read('client/src/main.tsx');
assert.match(main, /RELEASE_FINGERPRINT/);
assert.match(main, /halieusRelease/);
assert.match(main, /Build \$\{APP_VERSION\} · \$\{releaseShort\}/);

const app = read('client/src/App.tsx');
assert.doesNotMatch(app, /<HalieusIntro/);
assert.doesNotMatch(app, /showIntro/);
assert.match(app, /type HalieusThemeMode = "system" \| "light" \| "dark"/);
assert.match(app, /prefers-color-scheme: dark/);

const theme = read('client/src/platform/components/ThemeButton.tsx');
assert.match(theme, /halieus-theme-segments/);
for (const mode of ['system','light','dark']) assert.match(theme, new RegExp(`selectMode\\("${mode}"\\)`));

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /halieus-side-display-controls/);
assert.match(home, /Friends are at the table/);
assert.match(home, /selectedPlayerRoom\.joinable/);
assert.match(home, /selectedPlayerRoom\.spectatable/);
assert.match(home, /halieus-player-tools/);

const css = read('client/src/index.css');
assert.match(css, /3\.5\.26 — release-integrity UI stabilization/);
assert.match(css, /\.halieus-sidebar[\s\S]*?height:100dvh !important/);
assert.match(css, /\.connect-four-match-score \.connect-four-player-disc/);
assert.match(css, /\.blackjack-page \.blackjack-live-shell\.blackjack355-live/);
const latest = css.slice(css.lastIndexOf('3.5.26 — release-integrity UI stabilization'));
assert.doesNotMatch(latest, /\bzoom\s*:/, '3.5.26 must not use CSS zoom');
assert.doesNotMatch(latest, /transform\s*:\s*scale\(/, '3.5.26 must not use global scale hacks');

for (const file of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd']) {
  const source = read(file);
  assert.doesNotMatch(source, /update-website\.ps1/i, `${file} must not deploy`);
  assert.doesNotMatch(source, /deploy-from-windows\.ps1/i, `${file} must not deploy`);
  assert.doesNotMatch(source, /\bssh\b/i, `${file} must not use SSH`);
}

const quickInstall = read('dev-tools/Oracle Quick Deploy/quick-install.sh');
assert.doesNotMatch(quickInstall, /apt-get\s+(?:update|install)/, 'routine Update must not provision apt packages');
assert.doesNotMatch(quickInstall, /certbot/, 'routine Update must not run Certbot');
assert.match(quickInstall, /EXPECTED_FINGERPRINT/);
assert.match(quickInstall, /release-integrity\.mjs --verify/);

const deploy = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(deploy, /Verifying exact release on Oracle/);
assert.match(deploy, /Public check is diagnostic only/);
assert.match(deploy, /releaseFingerprint/);
assert.match(deploy, /Private SSH key-like file/);
assert.match(deploy, /"desktop"/);
assert.match(deploy, /dev-tools\\Oracle Quick Deploy/);
assert.match(deploy, /"Start Halieus Game Room\.cmd"/);
assert.match(deploy, /"launcher-shortcuts\.ps1"/);

const server = read('server/src/index.ts');
assert.match(server, /RELEASE_FINGERPRINT/);
assert.match(server, /releaseFingerprint: RELEASE_FINGERPRINT/);

assert.ok(existsSync(resolve(root, 'scripts/release-integrity.mjs')));
assert.ok(existsSync(resolve(root, 'dev-tools/Oracle Quick Deploy/provision-oracle.sh')));

// Poker and Ludo were approved and are protected from platform-layout changes.
const protectedHashes = {
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else assert.ok(!/\.(key|pem|ppk)$/i.test(name), `private-key-like file packaged: ${full}`);
  }
}
walk(root);

console.log('3.5.26 release-integrity regression: PASS');
