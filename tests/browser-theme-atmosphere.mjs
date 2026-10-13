import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const data = await mkdtemp(resolve(tmpdir(), "hgr-browser-atmosphere-"));
const port = process.env.HGR_THEME_TEST_PORT || "39467";
const base = "http://127.0.0.1:" + port;
const server = spawn(process.execPath, [resolve(root, "server/dist/server/src/index.js")], {
  cwd: resolve(root, "server"),
  env: { ...process.env, PORT: port, SERVE_CLIENT: "true", CLIENT_ORIGINS: base,
    HALIEUS_DATA_DIR: data, HALIEUS_OWNER_BOOTSTRAP_FILE: resolve(data, "bootstrap.txt") },
  stdio: "pipe",
});
let serverOutput = "";
server.stdout.on("data", (chunk) => serverOutput += chunk);
server.stderr.on("data", (chunk) => serverOutput += chunk);
let browser;

const auth = { ok: true, setupRequired: false, authenticated: true,
  registration: "invite-only", accessRequestsEnabled: true,
  account: { id: "theme-atmosphere-test", username: "tester", displayName: "Theme Test",
    role: "player", status: "active", avatar: "H", playerColor: "#8b5cf6",
    createdAt: 0, lastLoginAt: null } };

async function inspect(page) {
  return page.locator(".halieus-theme-atmosphere").evaluate((node) => {
    const el = node.querySelector("span");
    if (!el) throw new Error("No atmosphere glyphs rendered");
    const style = getComputedStyle(el);
    const canvas = getComputedStyle(node);
    return {
      engine: node.getAttribute("data-atmosphere-engine"),
      source: node.getAttribute("data-atmosphere-source"),
      symbols: [...node.querySelectorAll("span")].map((symbol) => symbol.textContent),
      opacity: Number(style.opacity),
      animation: style.animationName,
      playState: style.animationPlayState,
      duration: style.animationDuration,
      transform: style.transform,
      color: style.color,
      backdropVisibility: canvas.visibility,
      backdropOpacity: Number(canvas.opacity),
    };
  });
}
async function select(page, mode, profile) {
  await page.evaluate(({ mode, profile }) => {
    window.dispatchEvent(new CustomEvent("halieus-theme-profile", { detail: profile }));
    window.dispatchEvent(new CustomEvent("halieus-theme-mode", { detail: mode }));
  }, { mode, profile });
  await page.waitForFunction(({ mode, profile }) =>
    document.documentElement.dataset.themeMode === mode &&
    document.documentElement.dataset.themeProfile === profile,
    { mode, profile });
  return inspect(page);
}
async function checkMotion(page, label) {
  const before = await inspect(page);
  assert.ok(before.symbols.length >= 9, label + ": missing glyphs");
  assert.ok(before.opacity >= .14, label + ": symbols too faint (" + before.opacity + ")");
  assert.notEqual(before.animation, "none", label + ": no animation");
  assert.equal(before.playState, "running", label + ": animation paused");
  assert.equal(before.backdropVisibility, "visible", label + ": backdrop hidden");
  assert.ok(before.backdropOpacity >= .95, label + ": backdrop transparent");
  await page.waitForTimeout(850);
  const after = await inspect(page);
  assert.notEqual(after.transform, before.transform, label + ": motion not perceptible in computed transform");
  return before;
}
try {
  let health;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { health = await (await fetch(base + "/health")).json(); break; } catch {}
    await new Promise((done) => setTimeout(done, 100));
  }
  assert.ok(health, serverOutput || "Server health timed out");
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined,
  });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 820 },
      isMobile: mobile, hasTouch: mobile, reducedMotion: "no-preference",
    });
    await context.addInitScript(() => {
      sessionStorage.setItem("halieus-intro-seen-v4", "1");
      localStorage.setItem("halieus-game-room-theme", "custom");
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/auth/status", (route) => route.fulfill({ json: auth }));
    await page.goto(base);
    await page.locator(".halieus-theme-atmosphere > span").first().waitFor();
    const label = mobile ? "mobile" : "desktop";
    const custom = await select(page, "custom", "studio-graphite");
    await checkMotion(page, label + " Custom");

    for (const profile of ["studio-graphite", "cyan", "soft-light"]) {
      const core = await select(page, "profile", profile);
      assert.equal(core.engine, "custom", profile + ": Core engine differs");
      assert.equal(core.source, "custom", profile + ": Core source differs");
      assert.deepEqual(core.symbols, custom.symbols, profile + ": Core glyphs differ");
      assert.equal(core.animation, custom.animation, profile + ": Core keyframes differ");
      assert.equal(core.duration, custom.duration, profile + ": Core speed differs");
      await checkMotion(page, label + " Core " + profile);
    }

    const standard = await select(page, "dark", "studio-graphite");
    assert.equal(standard.source, "game", "Standard theme must use game symbols");
    assert.notDeepEqual(standard.symbols, custom.symbols, "Game mode reused Custom glyphs");

    await select(page, "profile", "cyan");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => {
      const el = document.querySelector(".halieus-theme-atmosphere > span");
      return el && getComputedStyle(el).animationName === "none";
    });
    assert.equal((await inspect(page)).animation, "none", "Reduced-motion ignored");
    assert.deepEqual(errors, [], errors.join("; "));
    await context.close();
  }
  console.log("PASS actual browser Core+Custom symbols: same visible moving glyphs on desktop/touch; System/Dark game motifs; reduced motion");
} finally {
  await browser?.close();
  server.kill();
  if (server.exitCode === null) await new Promise((done) => server.once("exit", done));
  await rm(data, { recursive: true, force: true });
}
