import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 3180;
const temp = await mkdtemp(join(tmpdir(), 'halieus-accounts-'));
const accountDir = join(temp, 'accounts');
const bootstrapFile = join(temp, 'OWNER SETUP CODE.txt');
const server = spawn(process.execPath, ['dist/server/src/index.js'], {
  cwd: new URL('../server/', import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    SERVE_CLIENT: 'false',
    HALIEUS_ACCOUNT_DATA_DIR: accountDir,
    HALIEUS_OWNER_BOOTSTRAP_FILE: bootstrapFile,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stdout.on('data', (chunk) => { output += chunk.toString(); });
server.stderr.on('data', (chunk) => { output += chunk.toString(); });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitForServer() {
  for (let index = 0; index < 100; index += 1) {
    if (output.includes(`Listening on port ${port}`)) return;
    if (server.exitCode !== null) throw new Error(output);
    await wait(100);
  }
  throw new Error(output);
}
const base = `http://127.0.0.1:${port}`;
async function request(path, { cookie = '', method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  const setCookie = response.headers.get('set-cookie')?.split(';')[0] ?? '';
  return { response, json, cookie: setCookie || cookie };
}

try {
  await waitForServer();
  let result = await request('/auth/status');
  assert.equal(result.response.status, 200);
  assert.equal(result.json.setupRequired, true);
  assert.equal(result.json.authenticated, false);
  assert.equal(result.json.registration, 'invite-only');

  const bootstrapText = await readFile(bootstrapFile, 'utf8');
  const bootstrapCode = bootstrapText.match(/OWNER-[A-Z0-9-]+/)?.[0];
  assert.ok(bootstrapCode);

  result = await request('/auth/setup-owner', { method: 'POST', body: { bootstrapCode, username: 'owner', displayName: 'Halieus Owner', password: 'OwnerPassword123!' } });
  assert.equal(result.response.status, 201);
  assert.equal(result.json.account.role, 'owner');
  const ownerCookie = result.cookie;
  assert.match(ownerCookie, /^halieus_session=/);

  result = await request('/admin/invites', { cookie: ownerCookie, method: 'POST', body: { label: 'Jordan', expiryDays: 7 } });
  assert.equal(result.response.status, 201);
  assert.match(result.json.code, /^HGR-/);
  const inviteCode = result.json.code;

  let player = await request('/auth/redeem-invite', { method: 'POST', body: { inviteCode, username: 'jordan', displayName: 'Jordan', password: 'JordanPassword123!' } });
  assert.equal(player.response.status, 201);
  assert.equal(player.json.account.role, 'player');
  const playerCookie = player.cookie;

  result = await request('/auth/profile', { cookie: playerCookie, method: 'POST', body: { username: 'jordan.new', displayName: 'Jordan', avatar: 'JO', playerColor: '#16a34a' } });
  assert.equal(result.response.status, 200);
  assert.equal(result.json.account.username, 'jordan.new');
  const oldLogin = await request('/auth/login', { method: 'POST', body: { username: 'jordan', password: 'JordanPassword123!' } });
  assert.equal(oldLogin.response.status, 401, 'old username must stop authenticating after rename');
  const newLogin = await request('/auth/login', { method: 'POST', body: { username: 'jordan.new', password: 'JordanPassword123!' } });
  assert.equal(newLogin.response.status, 200, 'new username must authenticate after rename');

  const directory = await request('/accounts/directory', { cookie: newLogin.cookie });
  assert.equal(directory.response.status, 200);
  const directoryJordan = directory.json.players.find((entry) => entry.username === 'jordan.new');
  assert.ok(directoryJordan, 'renamed player should appear in the signed-in player directory');
  const publicStats = await request(`/accounts/players/${directoryJordan.id}/stats`, { cookie: newLogin.cookie });
  assert.equal(publicStats.response.status, 200);
  assert.equal(typeof publicStats.json.stats.played, 'number');
  assert.ok(Array.isArray(publicStats.json.stats.byGame));

  const reuse = await request('/auth/redeem-invite', { method: 'POST', body: { inviteCode, username: 'second', displayName: 'Second', password: 'SecondPassword123!' } });
  assert.equal(reuse.response.status, 403, 'account invite must be single-use');

  result = await request('/admin/snapshot', { cookie: ownerCookie });
  assert.equal(result.response.status, 200);
  assert.ok(result.json.accounts.some((account) => account.username === 'jordan.new' && account.createdViaInviteLabel === 'Jordan'));
  assert.ok(result.json.audit.some((entry) => entry.action === 'account.created.invite'));

  result = await request('/auth/request-access', { method: 'POST', body: { displayName: 'Enock', preferredUsername: 'enock', note: 'Friend of the owner' } });
  assert.equal(result.response.status, 201);
  let snapshot = await request('/admin/snapshot', { cookie: ownerCookie });
  const pending = snapshot.json.accessRequests.find((entry) => entry.displayName === 'Enock');
  assert.equal(pending.status, 'pending');
  const approval = await request(`/admin/access-requests/${pending.id}/approve`, { cookie: ownerCookie, method: 'POST' });
  assert.match(approval.json.code, /^HGR-/);

  const jordan = snapshot.json.accounts.find((account) => account.username === 'jordan.new');
  result = await request(`/admin/accounts/${jordan.id}/status`, { cookie: ownerCookie, method: 'POST', body: { status: 'suspended' } });
  assert.equal(result.response.status, 200);
  player = await request('/auth/status', { cookie: playerCookie });
  assert.equal(player.json.authenticated, false, 'suspension must invalidate account access');

  result = await request(`/admin/accounts/${jordan.id}/password-reset`, { cookie: ownerCookie, method: 'POST' });
  assert.match(result.json.code, /^RESET-/);

  console.log('RC 3.4.0 controlled-account integration passed.');
} finally {
  server.kill('SIGTERM');
  await wait(150);
  await rm(temp, { recursive: true, force: true });
}
