import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = resolve(import.meta.dirname, ".."), temp = mkdtempSync(join(tmpdir(), "hgr-active-notice-"));
let browser;
try {
  const bundle = join(temp, "notice.js");
  await build({ entryPoints: [join(root, "tests/fixtures/active-match-notice.tsx")], bundle: true, platform: "browser", format: "iife", outfile: bundle, jsx: "automatic", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"', "import.meta.env.VITE_SERVER_URL": '""' } });
  browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
  for (const width of [390, 820]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.clock.install();
    let requests = 0;
    let matches = [{ gameId: "mega-board", code: "ROOM", matchId: "mega-ROOM-123", paused: false, yourTurn: false, notice: { id: "n1", title: "Purchase complete", message: "Public purchase." } }];
    await page.route("http://notice.test/**", route => {
      if (new URL(route.request().url()).pathname === "/accounts/active-matches") { requests++; return route.fulfill({ json: { matches } }); }
      return route.fulfill({ contentType: "text/html", body: '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main id="root"></main></body></html>' });
    });
    await page.goto("http://notice.test/");
    await page.addStyleTag({ path: bundle.replace(/\.js$/, ".css") });
    await page.addScriptTag({ path: bundle });
    const notice = page.getByLabel("Active Mega Board game");
    await notice.waitFor();
    await page.getByLabel("Focus target").focus();
    await Promise.all([page.waitForResponse("**/accounts/active-matches"), page.evaluate(() => window.dispatchEvent(new Event("focus")))]);
    assert.equal(await page.getByText(/Latest public decision/).count(), 1);
    assert.equal(await page.getByText(/Your turn — Continue game/).count(), 0);
    matches = [{ ...matches[0], yourTurn: true }];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText("Your turn — Continue game to make your move.").waitFor();
    assert(await page.getByLabel("Focus target").evaluate(el => el === document.activeElement));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.getByRole("button", { name: "Return to game" }).click();
    await page.getByText(/Choose Take Over Session/).waitFor();
    assert.equal(await page.locator("output").innerText(), "mega-ROOM-123");
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    const before = requests;
    await page.clock.runFor(30_000);
    assert.equal(requests, before, "No hidden polling");
    matches = [{ ...matches[0], paused: true }];
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.getByText(/Moves and timers are frozen/).waitFor();
    assert.equal(await page.getByText(/Your turn — Continue game/).count(), 0, "Paused match suppresses turn call-to-action");
    matches = [{ ...matches[0], notice: { id: "n2", title: "Rent paid", message: "New public decision." } }];
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.getByText(/New public decision/).waitFor();
    assert.equal(await page.getByText(/Latest public decision/).count(), 1);
    matches = [];
    await page.getByRole("button", { name: "Return to game" }).click();
    await notice.waitFor({ state: "detached" });
    assert.equal(await page.locator("output").innerText(), "mega-ROOM-123", "Stale match cannot initiate another return");
    matches = [{ gameId: "mega-board", code: "ROOM", matchId: "mega-ROOM-456", paused: false, yourTurn: false, notice: null }];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await notice.waitFor();
    matches = [];
    await page.getByRole("button", { name: "Switch account" }).click();
    await notice.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Logout" }).click();
    const loggedOut = requests;
    await page.clock.runFor(30_000);
    assert.equal(requests, loggedOut);
    // Real shared dialog + production takeover hook, with a recovery callback spy.
    // Account/target changes below model external updates while confirmation is open.
    const takeoverResults = page.getByTestId("takeover-results");
    const dialog = page.getByRole("dialog", { name: "Take over Mega Board session?" });
    await page.getByRole("button", { name: "Manual takeover" }).click();
    await dialog.waitFor();
    assert.equal(await takeoverResults.innerText(), "[]", "Opening must not recover");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await dialog.waitFor({ state: "detached" });
    assert.equal(await takeoverResults.innerText(), "[]", "Cancel must not recover");
    await page.getByRole("button", { name: "Manual takeover" }).click();
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.equal(await takeoverResults.innerText(), "[]", "Escape must not recover");
    await page.getByRole("button", { name: "Manual takeover" }).click();
    await page.getByRole("button", { name: "Change target" }).evaluate(button => button.click());
    assert.match(await dialog.innerText(), /ORIGINAL/);
    await dialog.getByRole("button", { name: "Take Over Session", exact: true }).evaluate(button => { button.click(); button.click(); });
    await dialog.waitFor({ state: "detached" });
    const originalRecovery = [JSON.stringify({ code: "ORIGINAL", playerName: "Original player", reconnectToken: "original-key" })];
    assert.deepEqual(JSON.parse(await takeoverResults.innerText()), originalRecovery, "Guest confirmation consumes original snapshot exactly once");
    await page.getByRole("button", { name: "Manual takeover" }).click();
    await page.getByRole("button", { name: "Switch account" }).evaluate(button => button.click());
    await dialog.waitFor({ state: "detached" });
    assert.deepEqual(JSON.parse(await takeoverResults.innerText()), originalRecovery, "Account switch cancels pending guest takeover");
    await page.getByRole("button", { name: "Manual takeover" }).click();
    await dialog.getByRole("button", { name: "Take Over Session", exact: true }).click();
    await dialog.waitFor({ state: "detached" });
    const bothRecoveries = [...originalRecovery, JSON.stringify({ code: "CHANGED", playerName: "Changed player", reconnectToken: "changed-key" })];
    assert.deepEqual(JSON.parse(await takeoverResults.innerText()), bothRecoveries, "Current account can explicitly confirm a fresh target");
    await page.getByRole("button", { name: "Manual takeover" }).click();
    await page.getByRole("button", { name: "Logout" }).evaluate(button => button.click());
    await dialog.waitFor({ state: "detached" });
    assert.deepEqual(JSON.parse(await takeoverResults.innerText()), bothRecoveries, "Logout cancels pending account takeover");
    // A lock-screen push opens a match-scoped authenticated return route,
    // not an automatic session takeover or a guessed room join.
    matches = [{ gameId: "mega-board", code: "ROOM", matchId: "mega-ROOM-123", paused: false, yourTurn: true, notice: null }];
    await page.goto("http://notice.test/?resumeMatch=mega-ROOM-123");
    await page.addStyleTag({ path: bundle.replace(/\.js$/, ".css") });
    await page.addScriptTag({ path: bundle });
    await page.getByRole("button", { name: "Continue game" }).waitFor();
    matches = [];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText("Live match unavailable").waitFor();
    assert.equal(await page.getByRole("button", { name: "Continue game" }).count(), 0,
      "Stale deep-link cannot recover an expired or inaccessible match");
    console.log(`PASS takeover dialog ${width}: Cancel/Escape, snapshot, explicit one-use guest confirm, account switch/logout cancellation (component coverage)`);
    console.log(`PASS active notice ${width}: your-turn status, paused suppression, correct return, no forced takeover UI, dedup, focus, hidden/resume, account switch/logout`);
    await page.close();
  }
} finally { if (browser) await browser.close(); rmSync(temp, { recursive: true, force: true }); }
