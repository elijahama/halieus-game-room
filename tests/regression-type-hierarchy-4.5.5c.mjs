import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [entry, beta, betaUi, fontCss, hierarchy, app, pkg, master] = await Promise.all([
  "client/src/main.tsx", "client/src/platform/fontBeta.ts",
  "client/src/platform/accounts/BetaFontSelector.tsx",
  "client/src/styles/hgr-4.5.5-unbounded.css",
  "client/src/styles/hgr-4.5.5c-type-hierarchy.css",
  "client/src/App.tsx", "client/package.json", "docs/HGR_MASTERBOOK.md",
].map(read));
const clientPkg = JSON.parse(pkg);
for (const family of [
  "@fontsource-variable/unbounded", "@fontsource/righteous",
  "@fontsource/alata", "@fontsource/varela-round",
]) assert.ok(clientPkg.dependencies[family], "Missing licensed bundled font "+family);
assert.ok(entry.indexOf('import "./styles/hgr-4.5.5c-type-hierarchy.css";') >
  entry.indexOf('import "./styles/hgr-4.5.5-unbounded.css";'), "Typography authority must load last");
assert.match(beta, /id: "balanced", label: "Balanced HGR"/);
assert.match(beta, /return isBetaFont\(saved\) \? saved : "balanced"/);
assert.match(beta, /sessionStorage\.getItem\("halieus-beta-test-mode"\)/);
assert.match(betaUi, /font\.id === "balanced"/);
assert.match(betaUi, /The owner-reviewed Balanced HGR mix/);
assert.match(app, /syncBetaFont\(Boolean\(eligible\)\)/);
assert.match(app, /clearBetaFontPreview\(\)/);
assert.match(hierarchy, /--hgr-interface-font: "Varela Round"/);
assert.match(hierarchy, /--hgr-font-heading: "Unbounded Variable"/);
assert.match(hierarchy, /--hgr-font-medium: "Righteous"/);
assert.match(hierarchy, /--hgr-font-caption: "Alata"/);
assert.match(hierarchy, /font-size: clamp\(21px, 6\.3vw, 30px\)/);
assert.match(hierarchy, /\.mega-live-page \.centre-roll-readout > span/);
assert.match(hierarchy, /\.board-space-name, \.board-centre-logo, \.property-deed-card/);
assert.ok(!/\.halieus-theme-atmosphere/.test(hierarchy), "Do not change atmosphere rendering");
assert.ok(!/\.hgr-brand-mark|\.halieus-brand-mark/.test(hierarchy), "Do not rework logo family");
assert.match(master, /4\.5\.5c[^\n]*role-based typography/);
assert.match(fontCss, /html\[data-beta-font="fredoka"\]/, "Keep rejected Fredoka for audit and opt-in comparison");
console.log("PASS 4.5.5c role-based font hierarchy, Beta isolation and preserved game identity");
