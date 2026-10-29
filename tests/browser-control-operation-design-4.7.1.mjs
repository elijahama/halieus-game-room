import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const pub = resolve(root, "client/public");
const original = await readFile(resolve(pub, "control/index.html"), "utf8");
const html = original.replace(/<script\b[^>]*src=[^>]*><\/script>/gi, "");
const css = await readFile(resolve(pub, "control/control.css"), "utf8");
const core = await readFile(resolve(pub, "control/control-core.css"), "utf8");
const siteFonts = await readFile(resolve(root, "client/src/styles/hgr-4.5.5c-type-hierarchy.css"), "utf8");
assert.match(siteFonts, /--hgr-interface-font: "Varela Round"/);
assert.match(siteFonts, /--hgr-font-heading: "Unbounded Variable"/);
assert.match(siteFonts, /--hgr-font-medium: "Righteous"/);
assert.match(siteFonts, /--hgr-font-caption: "Alata"/);
assert.match(html, /id="pcWindowActionsHeading"/);
assert.match(html, /id="softwareUpdateHeading"/);
assert.match(html, /id="publicAccessCard"/);
assert.match(html, /id="controlUpdateAlerts"/);
assert.match(html, /control\/control\.css\?v=4\.7\.1-operations-typography/);
assert.match(html, /control\/control\.js\?v=4\.7\.1-operations-typography/);
assert.match(css, /font-family: var\(--hgr-interface-font\)/);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;
  if (p === "/control/" || p === "/control/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html);
    return;
  }
  const safe = /^\/control\/(?:control(?:-core)?\.css|fonts\/[a-z0-9-]+\.woff2)$/.test(p)
    || p === "/control-navigation.css";
  if (!safe) { res.writeHead(404); res.end(); return; }
  try {
    const data = await readFile(resolve(pub, p.slice(1)));
    res.writeHead(200, { "content-type": extname(p) === ".css" ? "text/css" : "font/woff2" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.HGR_BROWSER_EXECUTABLE || undefined });
try {
  for (const [name, width, height, columns] of [
    ["phone-small", 320, 750, 1],
    ["phone", 390, 844, 1],
    ["tablet", 820, 1180, 2],
    ["desktop", 1440, 900, 3],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(origin + "/control/", { waitUntil: "load" });
    await page.evaluate(() => {
      document.querySelector('[data-panel="overview"]')?.classList.remove("is-active");
      document.querySelector('[data-panel="operations"]')?.classList.add("is-active");
      document.querySelector("#publicAccessCard").hidden = false;
      document.querySelector("#accessState").hidden = true;
    });
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('650 20px "Unbounded Variable"'),
        document.fonts.load('400 20px "Righteous"'),
        document.fonts.load('400 14px "Varela Round"'),
        document.fonts.load('400 11px "Alata"'),
      ]);
      await document.fonts.ready;
    });
    const actual = await page.evaluate(() => {
      const family = (selector) => getComputedStyle(document.querySelector(selector)).fontFamily;
      const buttons = [...document.querySelectorAll('[data-panel="operations"] .operation-grid button[data-operation]')];
      const laptop = [...document.querySelectorAll('.operation-grid--laptop button')];
      const update = [...document.querySelectorAll('.operation-grid--software button')];
      const buttonBoxes = buttons.map((button) => {
        const { x, y, width, height } = button.getBoundingClientRect();
        return { x, y, width, height };
      });
      return {
        fonts: {
          heading: family("#sectionTitle"),
          subheading: family("#pcWindowActionsHeading"),
          button: family('.operation-grid--laptop button[data-operation="start"]'),
          caption: family(".operation-effect"),
          navigation: family(".control-mobile-nav b"),
          maintenance: family("#publicAccessCard h2"),
        },
        actions: buttons.map((button) => button.dataset.operation),
        immutableEffects: buttons.map((button) => button.querySelector(".operation-effect")?.textContent.trim() || ""),
        smallStatusAvailable: buttons.every((button) => button.querySelector("small")),
        laptopColumns: getComputedStyle(document.querySelector(".operation-grid--laptop")).gridTemplateColumns.split(" ").length,
        updateCount: update.length, laptopCount: laptop.length,
        pageOverflows: document.documentElement.scrollWidth > innerWidth + 1,
        boxes: buttonBoxes,
      };
    });
    assert.deepEqual(actual.actions.sort(), ["close", "restart", "start", "update"], `${name}: exactly four original command IDs preserved`);
    assert.equal(actual.laptopCount, 3);
    assert.equal(actual.updateCount, 1);
    assert.equal(actual.laptopColumns, columns, `${name}: incorrect action grouping`);
    assert.equal(actual.pageOverflows, false, `${name}: horizontal overflow`);
    assert.equal(actual.smallStatusAvailable, true);
    assert(actual.immutableEffects.every(Boolean), `${name}: each action needs a persistent effect explanation`);
    for (const [role, family] of Object.entries({
      heading: "Unbounded Variable", subheading: "Righteous",
      button: "Varela Round", caption: "Alata",
      navigation: "Alata", maintenance: "Unbounded Variable",
    })) {
      assert.match(actual.fonts[role], new RegExp(family), `${name}: wrong ${role} font`);
    }
    for (const box of actual.boxes) {
      assert(box.width > 0 && box.height >= 44, `${name}: action is too small`);
      assert(box.x >= -1 && box.x + box.width <= width + 1, `${name}: action exceeds viewport`);
    }
    assert.deepEqual(pageErrors, []);
    await page.close();
    console.log(`PASS ${name}: HGR approved fonts, scoped four operations, ${columns}-column laptop actions, no overflow`);
  }
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
