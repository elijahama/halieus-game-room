import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
assert.match(version, /^4\.5\.\d+[a-z]?$/, `Approved HGR 4.5.x release intent (got ${version})`);
const label = version.replace(/\.0$/, '');
const release = JSON.parse(await readFile(resolve(root, 'RELEASE.json'), 'utf8'));
const data = await mkdtemp(resolve(tmpdir(), 'hgr-built-identity-'));
const port = process.env.HGR_IDENTITY_TEST_PORT || '39461';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [resolve(root, 'server/dist/server/src/index.js')], {
  cwd: resolve(root, 'server'),
  env: { ...process.env, PORT: port, SERVE_CLIENT: 'true', CLIENT_ORIGINS: base, HALIEUS_DATA_DIR: data, HALIEUS_OWNER_BOOTSTRAP_FILE: resolve(data, 'bootstrap.txt') },
  stdio: 'pipe',
});
let output = '';
server.stdout.on('data', (s) => output += s);
server.stderr.on('data', (s) => output += s);
let browser;
try {
  let health;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { health = await (await fetch(`${base}/health`)).json(); break; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(health?.version, version, output);
  assert.equal(health.releaseFingerprint, release.fingerprint, 'Built server fingerprint');
  browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
  const context = await browser.newContext();
  await context.addInitScript(() => sessionStorage.setItem('halieus-intro-seen-v4', '1'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/auth/status', (route) => route.fulfill({ json: {
    ok: true, setupRequired: false, authenticated: true, registration: 'invite-only', accessRequestsEnabled: true,
    account: { id: 'identity-test', username: 'tester', displayName: 'Release Test', role: 'player', status: 'active', avatar: 'H', playerColor: '#8b5cf6', createdAt: 0, lastLoginAt: null },
  } }));
  await page.goto(base);
  await page.locator('.halieus-side-account').click();
  const info = page.locator('.account-build-info-label');
  await info.waitFor();
  assert.equal((await info.textContent()).trim(), `Build ${label}`);
  assert.equal(await info.getAttribute('aria-label'), `Halieus Game Room build ${label}`);
  assert.equal(await page.getByRole('button', { name: 'Build Info', exact: true }).count(), 0);
  assert.equal(await page.locator('html').getAttribute('data-halieus-build'), version);
  assert.equal(await page.locator('html').getAttribute('data-halieus-release'), release.fingerprint);
  const expectedCache = `halieus-shell-v${version.replaceAll('.', '-')}-${release.fingerprint}`;
  await page.waitForFunction(async (expected) => (await caches.keys()).includes(expected), expectedCache);
  const activeWorker = await page.evaluate(async () => (await navigator.serviceWorker.ready).active.scriptURL);
  assert.equal(new URL(activeWorker).searchParams.get('release'), release.fingerprint);
  // Home browser identity uses the canonical HGR mark; both initial icon links
  // must carry the current VERSION cache-busting prefix.
  assert.equal(
    await page.locator('#halieus-dynamic-favicon').getAttribute('href'),
    `/halieus-mark.svg?v=${version}-icon-set`,
  );
  assert.equal(
    await page.locator('link[rel="shortcut icon"]').getAttribute('href'),
    `/halieus-mark.svg?v=${version}-icon-set`,
  );
  assert.deepEqual(errors, []);
  console.log(`PASS: rendered Build ${label}; browser/server ${version}; ${release.fingerprint}; cache ${expectedCache}; favicon identity; no page errors`);
} finally {
  await browser?.close();
  server.kill();
  if (server.exitCode === null) await new Promise((r) => server.once('exit', r));
  await rm(data, { recursive: true, force: true });
}
