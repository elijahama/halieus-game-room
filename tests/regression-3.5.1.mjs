import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const currentVersion=read('VERSION').trim();
assert.match(currentVersion,/^3\.5\.\d+$/);
assert.ok(Number(currentVersion.split('.')[2]) >= 1,'3.5.1 features must remain in later 3.5.x builds');
for (const p of ['package.json','client/package.json','server/package.json','shared/package.json']) assert.equal(json(p).version,currentVersion,`${p} version`);
assert.match(read('shared/version.ts'),new RegExp(`APP_VERSION = \"${currentVersion.replaceAll('.', '\\.')}\"`));
assert.match(read('server/src/platform/dataPaths.ts'),/HALIEUS_DATA_DIR/);
assert.match(read('server/src/index.ts'),/hasAdminSession\(request\)/);

const desktop=json('desktop/package.json');
assert.equal(desktop.version,currentVersion);
assert.equal(desktop.build.productName,'Halieus Game Room');
assert.equal(desktop.build.win.executableName,'Halieus Game Room');
assert.equal(desktop.build.nsis.artifactName,'Halieus Game Room Setup.exe');
assert.equal(desktop.build.portable.artifactName,'Halieus Game Room.exe');
const main=read('desktop/main.mjs');
assert.match(main,/PRODUCTION_URL = "https:\/\/halieus\.remotewire\.net"/);
assert.match(main,/nodeIntegration: false/);
assert.match(main,/contextIsolation: true/);
assert.match(main,/sandbox: true/);

const liveLauncher=read('Start Halieus Game Room.cmd');
assert.match(liveLauncher,/https:\/\/halieus\.remotewire\.net/);
assert.doesNotMatch(liveLauncher,/start-background\.ps1/);
assert.doesNotMatch(liveLauncher,/localhost:3000/);
assert.ok(existsSync(resolve(root,'Close Halieus Game Room.cmd')));
assert.equal(existsSync(resolve(root,'dev-tools/Local Development')),false);
assert.ok(existsSync(resolve(root,'Restart Halieus Game Room.cmd')));
const liveRestart=read('Restart Halieus Game Room.cmd');
assert.match(liveRestart,/halieus\.remotewire\.net/);
assert.doesNotMatch(liveRestart,/localhost:3000/);
assert.doesNotMatch(liveRestart,/start-background\.ps1/);

const html=read('client/index.html');
assert.match(html,/og:url" content="https:\/\/halieus\.remotewire\.net\//);
assert.match(html,/og:image" content="https:\/\/halieus\.remotewire\.net\/app-icon-512\.png/);
assert.match(html,/twitter:image/);
assert.match(html,/rel="canonical" href="https:\/\/halieus\.remotewire\.net\//);
const icon=read('client/public/app-icon.svg');
assert.doesNotMatch(icon,/M205 229h102v11H205/,'Halieus H seam bars must be removed');

assert.match(read('deploy/oracle/halieus.env.example'),/PUBLIC_APP_URL=https:\/\/halieus\.remotewire\.net/);
const updater=read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');
assert.doesNotMatch(updater,/LegacyDataPath/,'routine updater must not offer laptop data migration');
assert.match(read('dev-tools/Oracle Quick Deploy/quick-install.sh'),/npm prune --omit=dev/);
assert.equal(existsSync(resolve(root,'server/client')),false,'stale nested client copy must not ship');
assert.equal(existsSync(resolve(root,'server/server')),false,'stale nested server copy must not ship');

console.log('Halieus Game Room 3.5.1 production-host + polish compatibility regression passed.');
