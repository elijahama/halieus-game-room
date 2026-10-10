import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { io } from 'socket.io-client';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
const data = await mkdtemp(resolve(tmpdir(), 'hgr-website-brand-'));
const port = 39462, base = `http://127.0.0.1:${port}`;
const shape = 'M13 16H28L25 20V30H39V20L36 16H51L48 20V44L51 48H36L39 44V35H25V44L28 48H13L16 44V20Z';
const server = spawn(process.execPath, [resolve(root, 'server/dist/server/src/index.js')], { cwd: resolve(root, 'server'), env: { ...process.env, PORT: String(port), SERVE_CLIENT: 'true', CLIENT_ORIGINS: base, HALIEUS_DATA_DIR: data, HALIEUS_OWNER_BOOTSTRAP_FILE: resolve(data, 'bootstrap.txt') }, stdio: 'pipe' });
let output = '', browser;
const sockets = [];
let roomNumber = 0;
server.stdout.on('data', d => output += d); server.stderr.on('data', d => output += d);
try {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${base}/health`)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
  if (process.env.HGR_SCREENSHOTS) await mkdir(process.env.HGR_SCREENSHOTS, { recursive: true });
  for (const [device, width, height] of [['desktop', 1440, 900], ['short', 1280, 600], ['phone', 390, 844], ['tablet', 820, 1180]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(theme => { localStorage.setItem('halieus-game-room-theme', theme); sessionStorage.setItem('halieus-intro-seen-v4', '1'); }, theme);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let signedIn = false;
      await page.route('**/auth/status', route => route.fulfill({ json: { ok: true, setupRequired: false, authenticated: signedIn, registration: 'invite-only', accessRequestsEnabled: true, ...(signedIn ? { account: { id: 'brand-test', username: 'tester', displayName: 'Brand Test', role: 'player', status: 'active', avatar: 'H', playerColor: '#3475c5', createdAt: 0, lastLoginAt: null } } : {}) } }));
      await page.route('**/assets/*.js', async route => { await new Promise(r => setTimeout(r, 700)); await route.continue(); });
      await page.goto(base, { waitUntil: 'commit' });
      await page.locator('.halieus-boot-mark path').waitFor();
      assert.equal(await page.locator('.halieus-boot-mark path').getAttribute('d'), shape);
      assert.ok(['rgb(0, 0, 0)','rgb(255, 255, 255)'].includes(await page.locator('.halieus-boot-mark path').evaluate(e=>getComputedStyle(e).fill)));
      if (process.env.HGR_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.HGR_SCREENSHOTS, `${device}-${theme}-boot.png`) });
      await page.locator('.account342-card').waitFor();
      await page.locator('.account-portal .halieus-brand-mark:visible').first().waitFor();
      assert.equal(await page.locator('.account342-hero-mark path').getAttribute('d'), shape);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      if (process.env.HGR_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.HGR_SCREENSHOTS, `${device}-${theme}-auth.png`) });
      signedIn = true;
      await page.reload(); await page.locator('.halieus-shell').waitFor();
      for (const d of await page.locator('.halieus-brand-mark-h-shape').evaluateAll(paths => paths.map(p => p.getAttribute('d')))) assert.equal(d, shape);
      assert.equal(await page.locator('#halieus-dynamic-favicon').getAttribute('href'), `/halieus-mark.svg?v=${version}-brand-h9`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${device} home overflow`);
      if (process.env.HGR_SCREENSHOTS) await page.screenshot({ path: resolve(process.env.HGR_SCREENSHOTS, `${device}-${theme}-home.png`) });

      await page.locator('.halieus-side-account-top:visible, .halieus-mobile-account:visible').first().click();
      const appearance = page.locator('.account-appearance-card');
      await appearance.scrollIntoViewIfNeeded();
      assert.equal(await appearance.locator('.halieus-logo-preset-grid button').count(),10);
      const themeBox = await appearance.locator('.halieus-display-group-theme').boundingBox();
      assert.ok(themeBox.height < 190, `${device}: theme row must not stretch into a blank column (${themeBox.height})`);
      assert.equal(await appearance.evaluate(e=>e.scrollWidth<=e.clientWidth),true,`${device}: appearance overflow`);
      await appearance.getByRole('button',{name:'Blue tile Royal-blue launcher treatment'}).click();
      assert.equal(await appearance.getByRole('button',{name:'Blue tile Royal-blue launcher treatment'}).getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme,'Logo selection must not change the theme');
      if (process.env.HGR_SCREENSHOTS) await appearance.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`${device}-${theme}-appearance.png`)});
      if (process.env.HGR_SCREENSHOTS) { await appearance.locator('.halieus-display-group-theme').scrollIntoViewIfNeeded(); await page.screenshot({path:resolve(process.env.HGR_SCREENSHOTS,`${device}-${theme}-appearance-viewport.png`)}); }
      await page.getByRole('button',{name:'Close account panel'}).click();
      await page.locator('.halieus-brand-mark[data-logo-preset="blue"]:visible').first().waitFor();
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('halieus-logo-preset',{detail:'brand'})));

      const previousFavicon=await page.locator('#halieus-dynamic-favicon').getAttribute('href');
      for(const accent of ['#ffff00','#000033','#777777']) {
        await page.evaluate(accent=>{window.dispatchEvent(new CustomEvent('halieus-custom-theme',{detail:{page:'#ffffff',surface:'#888888',accent,secondary:'#123456'}}));window.dispatchEvent(new CustomEvent('halieus-theme-mode',{detail:'custom'}));},accent);
        await page.waitForFunction(()=>document.documentElement.dataset.theme==='custom');
        await page.waitForFunction(accent=>document.documentElement.style.getPropertyValue('--hgr-brand')===accent,accent);
        const actual=await page.locator('.halieus-brand-mark-h-shape').first().evaluate(e=>getComputedStyle(e).fill);
        assert.ok(['rgb(0, 0, 0)','rgb(255, 255, 255)'].includes(actual));
        const favicon=await page.locator('#halieus-dynamic-favicon').getAttribute('href');
        assert.equal(favicon,previousFavicon,'Canonical icon-set favicon must not be recoloured by theme changes');
      }
      await page.evaluate(theme=>window.dispatchEvent(new CustomEvent('halieus-theme-mode',{detail:theme})),theme);
      for (const [route, title, icon] of [['poker', 'Poker', 'poker.svg'], ['game', 'Mega Board', 'mega-board.svg']]) {
        // Context identity follows an actual room, not an unjoined invite form.
        const host = io(base, { transports: ['websocket'] });
        sockets.push(host);
        await new Promise((resolve, reject) => { host.once('connect', resolve); host.once('connect_error', reject); });
        const code = `BR${String(++roomNumber).padStart(4, '0')}`;
        const created = await new Promise((resolve, reject) => host.timeout(5000).emit(`${route}:create`, { code, playerName: 'Brand Test', startingChips: 5000, smallBlind: 25, bigBlind: 50, matchMode: 'casual', variant: 'texas-holdem' }, (err, result) => err ? reject(err) : resolve(result)));
        assert.equal(created.ok, true, created.reason);
        host.disconnect();
        await new Promise(r => setTimeout(r, 150));
        await page.evaluate(({ route, code, token }) => {
          localStorage.removeItem('halieus-poker-session-v1');
          localStorage.removeItem('mega-board-session-v1');
          localStorage.setItem(route === 'poker' ? 'halieus-poker-session-v1' : 'mega-board-session-v1', JSON.stringify({ code, reconnectToken: token, playerName: 'Brand Test' }));
        }, { route, code, token: created.reconnectToken });
        await page.goto(`${base}/${route}/${code}?guest=1`);
        await page.waitForFunction(title => document.title === `${title} · Halieus Game Room`, title, { timeout: 10000 }).catch(async error => { throw new Error(`${device} ${theme} ${title}: ${await page.title()}; ${(await page.locator('body').innerText()).slice(-1200)}; ${error.message}`); });
        const favicon = await page.locator('#halieus-dynamic-favicon').getAttribute('href');
        const artwork = await page.evaluate(async href => (await fetch(href)).text(), favicon);
        assert.ok(artwork.includes(`aria-label="${title}"`) || artwork.includes(`aria-label='${title}'`), `${icon}: contextual artwork`);
        assert.ok(artwork.includes(route === 'poker' ? '>P<' : '>M<'), `${icon}: contextual letter`);
        assert.ok(!artwork.includes(shape), 'Game favicon must not be the website H');
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${device} ${theme}: boot/auth/home H, theme, no overflow/errors, contextual M/P`);
      await context.close();
    }
  }
} finally {
  await browser?.close(); for (const socket of sockets) socket.disconnect(); server.kill();
  await new Promise(r => server.exitCode !== null ? r() : server.once('exit', r));
  await rm(data, { recursive: true, force: true });
}
