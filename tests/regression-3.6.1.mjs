import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const sha = (file) => createHash('sha256').update(readFileSync(resolve(root, file))).digest('hex');
const version = read('VERSION').trim();

assert.equal(version, '3.6.1');
for (const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(JSON.parse(read(file)).version, version, `${file} version mismatch`);
}
assert.match(read('shared/version.ts'), /APP_VERSION = "3\.6\.1"/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, version);
for (const workspace of ['', 'client', 'server', 'shared']) assert.equal(lock.packages?.[workspace]?.version, version, `package-lock ${workspace || 'root'} version mismatch`);

// Release commands stay separated: Start/Restart can never deploy or SSH.
for (const file of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd']) {
  const source = read(file);
  assert.doesNotMatch(source, /update-website\.ps1/i, `${file} must not deploy`);
  assert.doesNotMatch(source, /deploy-from-windows\.ps1/i, `${file} must not deploy`);
  assert.doesNotMatch(source, /\bssh\b/i, `${file} must not use SSH`);
}

// 3.5.27 is the frozen escape hatch in Oracle Quick Deploy.
const frozenBackup = 'dev-tools/Oracle Quick Deploy/Backups/Halieus Game Room 3.5.27 - FROZEN BACKUP.zip';
assert.ok(existsSync(resolve(root, frozenBackup)), '3.5.27 frozen rollback ZIP is missing');
assert.equal(sha(frozenBackup), 'a71d846fe68d237b3ba6a82ca30550d1038791efa439cc3bbf83a782f86fd237', '3.5.27 frozen rollback ZIP changed');

// Approved games are protected byte-for-byte.
const protectedHashes = {
  'client/src/games/ludo/LudoScreen.tsx': 'b977ca1628d37771c1f7d0dbc56b3de8f683d2a0bd182acd4e5bbbfb5d70e21f',
  'server/src/games/ludo/handlers.ts': 'af79aa3e431380fda0aa4a4adabb546fb71cc9e777c3f9dc1205bc6ab6513786',
  'client/src/games/poker/PokerScreen.tsx': 'ba5eabb7c528e4a79f41292755ddf9428584a6a9358d2cbee630a7292cdc5d18',
  'server/src/games/poker/handlers.ts': 'be84ed92e852370451450a7533e79e3e66be77077c2d93a01f86e33c4634a1be',
  'update-website.ps1': '3672e902e3af5604d0c1caa82c8bcb00198b45a70df0ef71b56f707761242c8e',
  'dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1': 'dc35a9deb14deff078cab72096735940c2a2977a3f40185b0515e5b124a74606',
  'dev-tools/Oracle Quick Deploy/quick-install.sh': '5930a5a432783a07c141efec075492a638f62d75c6eca096a0926b9e9b1e9805',
};
for (const [file, expected] of Object.entries(protectedHashes)) assert.equal(sha(file), expected, `${file} changed unexpectedly`);

// The Windows deployment packer must include every release-integrity input.
// 3.6.1 originally omitted tests/docs/root docs from the Oracle source ZIP,
// which caused Oracle to reject an otherwise valid release before build.
const deployPacker = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.match(deployPacker, /"tests"/);
assert.match(deployPacker, /"docs"/);
assert.match(deployPacker, /"README\.md"/);
assert.match(deployPacker, /"ARCHITECTURE\.md"/);
assert.match(deployPacker, /Deployment package completeness verified/);
assert.match(deployPacker, /releaseManifest\.integrityFiles/);
assert.ok(deployPacker.includes('\"tests\"'), 'deployment packer must include tests');

const home = read('client/src/platform/components/HomeScreen.tsx');
assert.match(home, /createPortal/);
assert.match(home, /halieus-viewport-overlay/);
assert.ok(home.indexOf('halieus-side-account halieus-side-account-top') < home.indexOf('<nav className="halieus-side-nav"'), 'profile must appear before Home navigation');
assert.match(home, /Friends are at the table/);
assert.match(home, /halieus-player-tools/);
assert.match(home, /halieus-game-inbox/);
assert.match(home, /Invite to game/);
assert.match(home, /\/accounts\/game-invites/);

const sharedAccounts = read('shared/platform/accounts.ts');
const serverAccounts = read('server/src/platform/accounts.ts');
assert.match(sharedAccounts, /HalieusGameInviteSummary/);
assert.match(serverAccounts, /app\.get\("\/accounts\/game-invites"/);
assert.match(serverAccounts, /app\.post\("\/accounts\/game-invites"/);
assert.match(serverAccounts, /You can only invite friends to a room you are currently playing in/);

const app = read('client/src/App.tsx');
assert.match(app, /type HalieusThemeMode = "system" \| "light" \| "dark"/);
assert.match(app, /prefers-color-scheme: dark/);
assert.doesNotMatch(app, /<HalieusIntro/);
const theme = read('client/src/platform/components/ThemeButton.tsx');
for (const mode of ['system','light','dark']) assert.match(theme, new RegExp(`selectMode\\("${mode}"\\)`));
const display = read('client/src/platform/components/DisplaySettingsPanel.tsx');
assert.match(display, /Follow device/);
assert.match(display, /Full screen/);

// Mega Board sizing has one measured square and Autopilot is outside its flow.
const board = read('client/src/games/mega-board/components/GameBoard.tsx');
assert.match(board, /ResizeObserver/);
assert.match(board, /Math\.min\(rect\.width, rect\.height\)/);
assert.match(board, /--mega-board-size/);
const css = read('client/src/index.css');
const finalCss = css.slice(css.lastIndexOf('3.6.1 — stabilization contract'));
assert.match(finalCss, /\.game-page\.mega-live-page/);
assert.match(finalCss, /grid-template-rows:\s*max-content minmax\(0, 1fr\)/);
assert.match(finalCss, /\.mega-live-layout-v3 > \.board-frame/);
assert.match(finalCss, /width:var\(--mega-board-size/);
assert.match(finalCss, /\.mega-game-meta \.halieus-autopilot-control/);
assert.doesNotMatch(finalCss, /\bzoom\s*:/, '3.6.1 must not use CSS zoom');
assert.doesNotMatch(finalCss, /transform\s*:\s*scale\(/, '3.6.1 must not use global scale hacks');

// Page-specific UI fixes.
assert.match(css, /\.view-games \.halieus-game-category > div/);
assert.match(css, /\.view-players \.halieus-players-layout/);
assert.match(css, /\.blackjack-room-panel-slot/);
assert.match(css, /\.poker-room-panel-slot/);
assert.match(css, /\.connect-four-room-stack/);
assert.match(css, /\.whot357-room-dock/);
assert.match(css, /\.account-owner-nav/);
assert.match(css, /\.halieus-sidebar[\s\S]*?height:\s*100dvh/);
assert.doesNotMatch(finalCss, /\.ludo[-\w\s>.:#\[]*\{/i, '3.6 final CSS contract must not target Ludo');

const connect = read('client/src/games/connect-four/ConnectFourScreen.tsx');
assert.match(connect, /data-initial/);
assert.match(connect, /connect-four-room-stack/);
const blackjack = read('client/src/games/blackjack/BlackjackScreen.tsx');
assert.match(blackjack, /blackjack-room-panel-slot/);
const account = read('client/src/platform/accounts/AccountPanel.tsx');
for (const tab of ['Overview','Players','Invites','Rooms','Audit','Test Lab','Account']) assert.match(account, new RegExp(`>${tab}<`));

// No private SSH credential files in the distributable source tree (the frozen
// backup is a ZIP and is intentionally allowed).
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (['node_modules','.release-backups','dist','.runtime','logs'].includes(name)) continue;
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else assert.ok(!/\.(key|pem|ppk|pub)$/i.test(name), `SSH credential-like file packaged: ${full}`);
  }
}
walk(root);


// Final report acceptance checks.
assert.match(css, /3\.6\.1 — final report lock/);
const finalReportCss = css.slice(css.lastIndexOf('3.6.1 — final report lock'));
assert.match(finalReportCss, /\.mega-game-meta \.halieus-autopilot-control[\s\S]*?position:static/);
assert.match(finalReportCss, /\.halieus-sidebar[\s\S]*?height:100dvh/);
assert.match(finalReportCss, /\.connect-four-room-stack \.room-chat-panel/);
assert.match(finalReportCss, /\.blackjack-room-panel-slot/);
assert.match(finalReportCss, /\.poker-room-panel-slot/);
assert.match(finalReportCss, /\.whot357-opponents/);
assert.doesNotMatch(finalReportCss, /\bzoom\s*:/);
assert.doesNotMatch(finalReportCss, /transform\s*:\s*scale\(/, 'final report must not introduce global scale hacks');
assert.doesNotMatch(finalReportCss, /\.ludo[-\w\s>.:#\[]*\{/i, 'final report CSS must not target Ludo');
assert.match(read('client/src/platform/components/ThemeButton.tsx'), />System<\/b>/);
assert.match(read('client/src/games/blackjack/BlackjackScreen.tsx'), /top: 39 \+ Math\.sin\(angle\) \* 28/);
assert.ok(existsSync(resolve(root, 'docs/project/HGR_3.6.1_FIX_LOG.md')), 'consolidated fix log missing');

console.log('Halieus Game Room 3.6.1 stabilization regression: PASS');
