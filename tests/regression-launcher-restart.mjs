import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (name) => readFileSync(resolve(root, name), 'utf8');

for (const file of [
  'Start Halieus Game Room.cmd',
  'Restart Halieus Game Room.cmd',
  'Close Halieus Game Room.cmd',
  'Start Halieus Game Room.lnk',
  'Restart Halieus Game Room.lnk',
  'launcher-shortcuts.ps1',
]) assert.ok(existsSync(resolve(root, file)), `${file} must exist`);

assert.equal(existsSync(resolve(root, 'dev-tools/Local Development')), false, 'user workspace must not ship localhost launch controls');

const productionStart = read('Start Halieus Game Room.cmd');
const productionRestart = read('Restart Halieus Game Room.cmd');
const productionClose = read('Close Halieus Game Room.cmd');
const updater = read('Update HGR GitHub.cmd');
const shortcuts = read('launcher-shortcuts.ps1');

for (const launcher of [productionStart, productionRestart]) {
  assert.match(launcher, /https:\/\/halieus\.remotewire\.net/);
  assert.doesNotMatch(launcher, /http:\/\/halieus\.remotewire\.net/);
  assert.doesNotMatch(launcher, /localhost/i);
  assert.match(launcher, /Halieus Game Room\\Website/,'site launchers use persistent dedicated website profile');
}
assert.match(productionRestart, /refresh=/);
assert.match(productionRestart, /Get-CimInstance Win32_Process/,'restart closes the dedicated site window before reopening');
assert.doesNotMatch(productionRestart, /git\s+(fetch|pull|push|rebase|commit)/i,'standalone restart must never perform Git update work');
assert.doesNotMatch(productionRestart, /npm\s+run/i,'standalone restart must never run build or release tasks');
assert.doesNotMatch(productionRestart, /deploy-from-windows|update-website\.ps1/i,'standalone restart must never deploy production');
assert.match(updater, /:RESTART_AFTER_UPDATE/,'updater must own a final restart stage');
assert.match(updater, /call "%~dp0Restart Halieus Game Room\.cmd"/,'successful updater must reuse the dedicated restart launcher');
assert.match(updater, /FINAL STEP - Restarting Halieus Game Room/,'updater must make automatic restart visible in its success flow');
assert.match(productionClose, /Get-CimInstance Win32_Process/);
assert.match(productionClose, /Halieus Game Room\\Website/);
assert.doesNotMatch(productionClose, /localhost/i);
assert.doesNotMatch(productionClose, /halieus-game-room/i,'Close must not stop the Oracle/server service');
assert.match(shortcuts, /\$CloseShortcut/);
assert.match(shortcuts, /Start HGR App\.lnk/);
assert.match(shortcuts, /Restart HGR App\.lnk/);
assert.match(shortcuts, /Close HGR App\.lnk/);
assert.match(shortcuts, /Update HGR Site\.lnk/);
assert.match(shortcuts, /HGR - OpenShard\.lnk/);
assert.match(shortcuts, /OpenShard-HGR\.cmd/);
assert.match(shortcuts, /Open the Halieus Game Room OpenShard receipt dashboard/);
assert.match(shortcuts, /Close the local Halieus Game Room desktop app window only/);
assert.doesNotMatch(shortcuts, /Description 'Close Halieus Game Room'/);

console.log('launcher website-only Start/Restart/Close regression PASS');
