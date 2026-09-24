import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const home=read("client/src/platform/components/HomeScreen.tsx");
const brand=read("client/src/platform/components/HalieusBrandMark.tsx");
const icons=read("client/src/platform/components/HgrIcon.tsx");
const theme=read("client/src/platform/theme.ts");
const css=read("client/src/styles/hgr-design-v1.css");
const shortcuts=read("scripts/windows/launcher-shortcuts.ps1");
const packagedShortcuts=read("server/launcher-shortcuts.ps1");

assert.match(home,/HalieusBrandMark/,"Home chrome must use the shared Halieus mark");
assert.match(home,/HgrIcon name="chevron-left"/,"Featured previous control must use the shared SVG chevron");
assert.match(home,/HgrIcon name="chevron-right"/,"Featured next control must use the shared SVG chevron");
assert.match(icons,/case "chevron-left"/,"Shared icon set must include a left chevron");
assert.match(icons,/case "chevron-right"/,"Shared icon set must include a right chevron");
assert.match(brand,/halieus-brand-mark-tile/,"Shared Halieus mark must expose a themeable tile");
assert.match(brand,/halieus-brand-mark-h/,"Shared Halieus mark must expose a themeable H");

assert.match(theme,/"--hgr-action-bg": action/,"Custom themes must derive a solid action colour");
assert.match(theme,/"--hgr-action-ink": "#ffffff"/,"Custom action contrast must remain legible");
assert.match(css,/\.button-primary,[\s\S]*?\.halieus-global-join[\s\S]*?background:\s*var\(--hgr-action-bg\) !important/s,"Primary actions must use one solid theme action colour");
assert.doesNotMatch(css,/HGR interface coherence pass[\s\S]*?\.halieus-global-join[\s\S]*?linear-gradient/s,"Current primary action override must not reintroduce gradient banding");
assert.match(css,/\.halieus-feature-arrow[\s\S]*?place-items:\s*center !important/s,"Featured arrows must use layout centring");
assert.match(css,/\.halieus-feature-card-stage > img,[\s\S]*?box-shadow:\s*none !important/s,"Featured artwork must not use a square glow");
assert.match(css,/html\[data-theme="dark"\][\s\S]*?--hgr-page:\s*#101114[\s\S]*?--mm-page:\s*var\(--hgr-page\)/s,"Dark mode must bridge HGR and legacy surfaces to the same graphite canvas");

for (const name of ["Start HGR App.lnk","Restart HGR App.lnk","Close HGR App.lnk","Update HGR Site.lnk"]) {
  assert.ok(shortcuts.includes(name),`Launcher shortcut family must include ${name}`);
}
assert.match(shortcuts,/Close the local Halieus Game Room desktop app window only/,"Close shortcut must state that it only closes the local app window");
assert.match(packagedShortcuts,/Close HGR App\.lnk/,"Packaged launcher must use the same Close HGR App wording");
assert.match(packagedShortcuts,/desktop app window only/,"Packaged Close shortcut must not imply cloud shutdown");

console.log("HGR brand, theme and launcher coherence regression: PASS");
