import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read=(p)=>readFile(new URL("../"+p,import.meta.url),"utf8");
const [font,selector,app,account,css,manifest]=await Promise.all([
  read("client/src/platform/fontBeta.ts"),
  read("client/src/platform/accounts/BetaFontSelector.tsx"),
  read("client/src/App.tsx"),
  read("client/src/platform/accounts/AccountPanel.tsx"),
  read("client/src/styles/hgr-4.5.5-unbounded.css"),
  read("client/package.json").then(JSON.parse),
]);
for(const family of ["unbounded","righteous","alata","fredoka","varela-round"]){
  assert.ok(font.includes('id: "'+family+'"'),"Missing approved font "+family);
  assert.ok(css.includes('data-beta-font="'+family+'"'),"Missing real CSS family "+family);
  assert.ok(selector.includes('BETA_FONT_OPTIONS'),"Missing font previews");
}
assert.match(font,/sessionStorage\.setItem\(BETA_FONT_KEY/);
assert.match(font,/sessionStorage\.getItem\("halieus-beta-test-mode"\)/);
assert.match(font,/document\.documentElement\.dataset\.betaFont = font/);
assert.match(app,/syncBetaFont\(Boolean\(eligible\)\)/);
assert.match(app,/clearBetaFontPreview\(\)/);
assert.match(account,/\{betaMode && <BetaFontSelector\s*\/>\}/);
for(const p of ["@fontsource/righteous","@fontsource/alata","@fontsource-variable/fredoka","@fontsource/varela-round"]){
 assert.ok(manifest.dependencies[p],"Missing bundled Google Fonts package "+p);
}
assert.ok(css.includes("html:not([data-beta-font])"));
assert.ok(css.includes("font-size: 15px"));
assert.ok(css.includes("font-size: 14px"));
assert.ok(css.includes(".board-space-name"));
console.log("PASS fonts approved shortlist, beta-only session storage, 320px compact rules and game-board text");
