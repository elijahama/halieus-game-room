import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

assert.equal(read('VERSION').trim(),'3.5.0');
for (const p of ['package.json','client/package.json','server/package.json','shared/package.json']) assert.equal(json(p).version,'3.5.0',`${p} version`);
assert.match(read('shared/version.ts'),/APP_VERSION = "3\.5\.0"/);
assert.match(read('server/src/index.ts'),/from "\.\.\/\.\.\/shared\/version\.js"/);
assert.match(read('server/src/platform/dataPaths.ts'),/HALIEUS_DATA_DIR/);
assert.match(read('server/src/platform/dataPaths.ts'),/"mega-board"/);
assert.match(read('server/src/index.ts'),/hasAdminSession\(request\)/);
assert.doesNotMatch(read('server/src/platform/sessionArchive.ts'),/rootFolderId: driveConfig\.rootFolderId,[\s\S]*indexSpreadsheetId:/);

const desktop=json('desktop/package.json');
assert.equal(desktop.version,'3.5.0');
assert.equal(desktop.build.productName,'Halieus Game Room');
assert.equal(desktop.build.win.executableName,'Halieus Game Room');
assert.equal(desktop.build.nsis.artifactName,'Halieus Game Room Setup.exe');
assert.equal(desktop.build.portable.artifactName,'Halieus Game Room.exe');
const main=read('desktop/main.mjs');
assert.match(main,/PRODUCTION_URL = "https:\/\/play\.halieus\.net"/);
assert.match(main,/if \(app\.isPackaged\) return PRODUCTION_URL/);
assert.match(main,/nodeIntegration: false/);
assert.match(main,/contextIsolation: true/);
assert.match(main,/sandbox: true/);
assert.match(main,/shell\.openExternal/);

const ludo=read('client/public/game-icons/ludo.svg');
assert.match(ludo,/cx="46" cy="18" r="7" fill="#eab308"/,'Ludo top-right should be yellow');
assert.match(ludo,/cx="46" cy="46" r="7" fill="#16a34a"/,'Ludo bottom-right should be green');
assert.doesNotMatch(read('client/public/game-icons/mega-board.svg'),/#f5c451/,'Mega Board old yellow detail should be removed');
assert.match(read('deploy/oracle/halieus.env.example'),/PUBLIC_APP_URL=https:\/\/play\.halieus\.net/);
assert.match(read('Start Halieus Game Room.cmd'),/LOCAL DEV/);
assert.doesNotMatch(read('Start Halieus Game Room.cmd'),/funnel --bg/i);
console.log('Halieus Game Room 3.5.0 Desktop + Oracle foundation regression passed.');
