import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [css, main, sharedCss] = await Promise.all([
  readFile(resolve(root, "client/src/styles/hgr-4.5.4.6-feature-rail.css"), "utf8"),
  readFile(resolve(root, "client/src/main.tsx"), "utf8"),
  readFile(resolve(root, "client/src/index.css"), "utf8"),
]);

assert.match(sharedCss, /inset 3px 0 0 var\(--hgr-brand\)/, "Shared destination styling must still explain the original curved brand edge");
assert.match(css, /\.halieus-feature-rail button\.is-active\s*\{/, "4.5.4.6 must target only the active featured-game rail tile");
assert.match(css, /0 7px 16px rgba\(0,0,0,\.16\) !important/, "Selected tile must retain its existing raised depth");
assert.doesNotMatch(css, /var\(--hgr-brand|#[Ee]7[Aa]900|#[Ff][Ff][CcCc]0000/, "Feature-rail selection override must not paint a yellow/gold brand edge");
assert.doesNotMatch(css, /inset\s+[1-9]\d*px\s+0\s+0/, "Feature-rail selection must not recreate an asymmetric left inset strip");
assert.doesNotMatch(css, /inset\s+0\s+-[2-9]\d*px/, "Feature-rail selection must not recreate a thick curved bottom strip");

const identityImport = main.indexOf('import "./styles/hgr-4.5.4-identity.css";');
const railImport = main.indexOf('import "./styles/hgr-4.5.4.6-feature-rail.css";');
assert.ok(identityImport >= 0 && railImport > identityImport, "Feature-rail cleanup must load after existing identity/theme cascade");

console.log("PASS 4.5.4.6: selected featured-game rail tile keeps neutral depth without the curved gold banner");
