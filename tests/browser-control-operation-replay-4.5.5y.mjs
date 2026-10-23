import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
let activeAccountId = 'owner-a';
const now = () => new Date().toISOString();
const account = () => ({
  id: activeAccountId, username: activeAccountId, displayName: 'Control Owner',
  role: 'owner', avatar: 'CO', playerColor: '#3475c5', profilePicture: null,
});
const history = [{ id: 'audited-past-operation', at: now(), action: 'update',
  summary: 'Previous update recorded in audit', reason: 'Completed' }];
const server = createServer(async (req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  const replies = {
    '/auth/status': { authenticated: true, account: account() },
    '/admin/snapshot': { accounts: [account()], onlineAccountIds: [], audit: history },
    '/accounts/live-games': { rooms: [] },
    '/accounts/me/stats': { stats: { played: 0, wins: 0, recent: [] } },
    '/health': { status: 'online', version: 'fixture', uptimeSeconds: 30 },
    '/control/cloud/status': { devices: [], activeOperation: null },
    '/control/operation-status': { operation: null },
    '/control/operation-history': { operations: history },
  };
  if (route in replies) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(replies[route]));
    return;
  }
  // Allow the test to emit Socket.IO events without making an external relay.
  if (route === '/socket.io/socket.io.js') {
    res.setHeader('Content-Type', 'application/javascript');
    res.end('window.io = () => ({on: (name, fn) => { (window.__socketEvents ||= {})[name] = fn; }});');
    return;
  }
  const file = route === '/control/' ? '/control/index.html' : route;
  const allowedControl = file.startsWith('/control/') && file.slice(9).length > 0 && !file.slice(9).includes('/');
  const allowedNav = file === '/control-navigation.js' || file === '/control-navigation.css';
  if ((!allowedControl && !allowedNav) || file.includes('..')) {
    res.writeHead(404); res.end(); return;
  }
  try {
    const bytes = await readFile(resolve(root, 'client/public' + file));
    res.setHeader('Content-Type',
      file.endsWith('.js') ? 'application/javascript' :
      file.endsWith('.css') ? 'text/css' :
      file.endsWith('.png') ? 'image/png' :
      file.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
const emit = (page, value, route = 'socket') => page.evaluate(({ value, route }) => {
  if (route === 'socket') window.__socketEvents['control:operation'](value);
  else if (route === 'page') window.dispatchEvent(new CustomEvent('hgr-control-operation', { detail: value }));
  else new BroadcastChannel('hgr-control-operations').postMessage(value);
}, { value, route });
const ready = async (page) => {
  await page.waitForFunction(() =>
    document.getElementById('accessState').hidden &&
    !!window.__socketEvents?.['control:operation']);
};
const isVisible = (page) => page.locator('#operationToast').isVisible();
try {
  for (const width of [390, 820]) {
    activeAccountId = 'owner-a';
    const context = await browser.newContext({
      viewport: { width, height: 850 }, serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await page.goto(base + '/control/');
    await ready(page);

    // A recent completed update (3 s before this page opened) is still OLD.
    const old = {
      id: 'old-' + width, action: 'update', state: 'succeeded',
      startedAt: new Date(Date.now() - 4000).toISOString(),
      updatedAt: new Date(Date.now() - 2500).toISOString(),
      progress: 100, phase: 'Complete',
    };
    await emit(page, old);
    assert.equal(await isVisible(page), false, 'recent historical terminal replay is suppressed');

    // Actual in-session running -> completed event must not be lost.
    const live = {
      id: 'live-' + width, action: 'update', state: 'running',
      startedAt: now(), updatedAt: now(), progress: 23, phase: 'Updating',
    };
    await emit(page, live, 'page');
    assert.equal(await isVisible(page), true, 'live running operation appears');
    assert.equal(await page.locator('#operationDismiss').isVisible(), false, 'cannot dismiss running operation');
    const complete = { ...live, state: 'succeeded', updatedAt: now(), progress: 100, phase: 'Complete' };
    await emit(page, complete);
    assert.equal(await isVisible(page), true, 'in-session completion appears');
    await page.locator('#operationToastToggle').click();
    assert.equal(await page.locator('#operationDismiss').isVisible(), true, 'terminal operation is dismissible');
    await page.locator('#operationDismiss').click();
    assert.equal(await isVisible(page), false, 'toast is dismissed');

    // Suppress socket, page, cross-tab, and reload replays after acknowledgement.
    await emit(page, complete);
    await emit(page, complete, 'page');
    await emit(page, complete, 'broadcast');
    await page.waitForTimeout(100);
    assert.equal(await isVisible(page), false, 'dismissed terminal cannot replay across channels');
    const stored = await page.evaluate(() => localStorage.getItem('hgr-control-operation-dismissals-v1:owner-a'));
    assert.ok(stored?.includes(complete.id + ':succeeded'), 'dismissal is account-scoped and persisted');
    await page.reload();
    await ready(page);
    await emit(page, complete);
    assert.equal(await isVisible(page), false, 'dismissal survives refresh');

    // Scope acknowledgement to owner-a; owner-b does not inherit it.
    activeAccountId = 'owner-b';
    await page.reload();
    await ready(page);
    const newForOther = { ...complete, startedAt: now(), updatedAt: now() };
    await emit(page, newForOther);
    assert.equal(await isVisible(page), true, 'a different account can see its own new terminal');
    assert.ok(await page.locator('#auditList .audit-entry').count() > 0, 'existing audit history is preserved');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false, 'Control layout has no horizontal overflow');
    await context.close();
    console.log('PASS Control replay/dismissal/account isolation at ' + width + 'px');
  }
} finally {
  await browser.close();
  await new Promise((ok) => server.close(ok));
}
