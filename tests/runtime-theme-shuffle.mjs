import assert from "node:assert/strict";
import { CORE_THEME_IDS } from "../shared/platform/themeProgression.ts";
import { nextShuffledThemeId } from "../client/src/platform/themeShuffle.ts";
const visible=[{id:"deep-blue"},{id:"forest"},{id:"lavender-16bit"},{id:"black-drive"}];
const starter=["deep-blue","forest"];
assert.equal(nextShuffledThemeId(visible,starter,false,"deep-blue",0),"forest",
  "Shuffle avoids repeating the preview and cannot select locked themes");
assert.equal(nextShuffledThemeId(visible,starter,false,"forest",0),"deep-blue");
assert.equal(nextShuffledThemeId(visible,starter,false,null,0.99),"forest");
assert.equal(nextShuffledThemeId(visible,starter,false,"forest",999),"deep-blue");
assert.equal(nextShuffledThemeId(visible,starter,false,"forest",NaN),"deep-blue");
assert.equal(nextShuffledThemeId(visible,["deep-blue","forest","lavender-16bit"],false,"forest",0.99),
  "lavender-16bit","Newly earned themes can participate once verified");
assert.equal(nextShuffledThemeId(visible,CORE_THEME_IDS,false,"deep-blue",0),"forest");
assert.equal(nextShuffledThemeId(visible,starter,true,"deep-blue",0.99),"black-drive",
  "Beta preview can include locked themes but does not persist them");
assert.equal(nextShuffledThemeId([{id:"black-drive"}],starter,false,null,0),null,
  "No available theme means no selection, never a forged entitlement");
console.log("PASS Theme Shuffle: verified entitlement filter, avoid current, eligible earned themes and Beta-only previews.");
