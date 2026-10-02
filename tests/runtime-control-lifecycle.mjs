import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';

const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const credential = randomBytes(32).toString('hex');
const child = spawn(process.execPath, ['--import', 'tsx', 'server/src/control-agent.ts'], {
  env: { ...process.env, HGR_CONTROL_HOST: '127.0.0.1', HGR_CONTROL_PORT: String(port), HGR_CONTROL_TOKEN: credential },
  stdio: 'ignore',
});
const exited = once(child, 'exit');
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    try { ready = (await fetch(`${base}/api/ping`)).ok; } catch { await delay(100); }
  }
  assert.ok(ready, 'Control agent must start');
  assert.equal((await fetch(`${base}/api/lifecycle/stop`, { method: 'POST' })).status, 403);
  assert.equal((await fetch(`${base}/api/lifecycle/stop`, { method: 'POST', headers: { Authorization: 'Bearer wrong' } })).status, 403);
  assert.equal((await fetch(`${base}/api/lifecycle/stop`, { method: 'POST', headers: { Authorization: `Bearer ${credential}` } })).status, 200);
  assert.equal((await Promise.race([exited, delay(5000).then(() => { throw Error('Graceful stop timed out'); })]))[0], 0);
} finally { if (child.exitCode === null) child.kill(); }
const shell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const result = spawnSync(shell, ['-NoProfile', '-File', 'tests/runtime-control-update.ps1'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stdout + result.stderr);
console.log(result.stdout.trim());
console.log('PASS Control local authenticated graceful stop; anonymous/wrong-token rejected');
