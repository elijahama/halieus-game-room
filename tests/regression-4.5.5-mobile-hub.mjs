import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [main, css, home, player] = await Promise.all([
  read("client/src/main.tsx"),
  read("client/src/styles/hgr-4.5.5-mobile-hub.css"),
  read("client/src/platform/components/HomeScreen.tsx"),
  read("client/src/platform/components/PlayerIdentityCard.tsx"),
]);

assert.match(main, /hgr-4\.5\.5-mobile-hub\.css/);
assert.match(css, /HGR 4\.5\.5 Batch 2/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /\.halieus-feature-rail[\s\S]*position: relative !important/);
assert.match(css, /\.halieus-feature-rail button[\s\S]*flex: 0 0 48px !important/);
assert.match(css, /\.halieus-feature-card-stage[\s\S]*grid-template-columns: 112px minmax\(0, 1fr\) !important/);
assert.match(css, /\.halieus-feature-card-stage > img[\s\S]*filter: none !important/);
assert.match(css, /\.halieus-mobile-nav button\.is-active[\s\S]*box-shadow: inset 0 -2px 0 var\(--hgr-brand\) !important/);
assert.match(css, /\.halieus-player-directory \.halieus-player-action-trigger[\s\S]*place-items: center !important/);
assert.match(css, /\.halieus-join-modal > header > button[\s\S]*place-items: center !important/);
assert.match(css, /\.halieus-mobile-nav[\s\S]*repeat\(5, minmax\(0, 1fr\)\) !important/);
assert.match(home, /className="halieus-feature-rail"/);
assert.match(home, /className="halieus-mobile-nav"/);
assert.match(player, /className="halieus-player-action-trigger"/);

console.log("PASS 4.5.5 Batch 2: mobile hub uses full-width carousel geometry, flat controls and centred actions");
