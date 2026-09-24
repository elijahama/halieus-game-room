import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const playerCard=read("client/src/platform/components/PlayerIdentityCard.tsx");
const home=read("client/src/platform/components/HomeScreen.tsx");
const brand=read("client/src/platform/components/HalieusBrandMark.tsx");
const theme=read("client/src/platform/theme.ts");
const themeButton=read("client/src/platform/components/ThemeButton.tsx");
const display=read("client/src/platform/components/DisplaySettingsPanel.tsx");
const skins=read("client/src/platform/skins.ts");
const skinButton=read("client/src/platform/components/SkinLibraryButton.tsx");
const app=read("client/src/App.tsx");
const css=read("client/src/styles/hgr-design-v1.css");
const html=read("client/index.html");
const modelSheet=read("docs/HGR_MODEL_SHEET_V1.md");

assert.match(playerCard,/actions\?: PlayerIdentityAction\[\]/,"Player cards must expose real contextual actions");
assert.match(playerCard,/aria-haspopup="menu"/,"Player overflow trigger must be an accessible menu control");
assert.match(playerCard,/role="menuitem"/,"Player overflow options must expose menu-item semantics");
assert.match(playerCard,/event\.target !== event\.currentTarget/,"Player menu keyboard events must not bubble into the whole player card");
assert.doesNotMatch(home,/status="•••"/,"Player ellipses must not remain decorative status text");
assert.match(home,/actions=\{playerCardActions\(person\)\}/,"Home/player directory cards must use the shared action menu");
assert.match(home,/Join their game/,"Player menu must expose real live-room join where available");
assert.match(home,/Spectate/,"Player menu must expose real spectate where available");
assert.match(home,/Invite to my room/,"Player menu must expose active-room invitation where available");
assert.match(home,/Copy username/,"Player menu must expose a useful identity action");

assert.match(brand,/halieus-brand-mark-h-pillar/,"4.5 H must use the faceted pillar geometry");
assert.match(brand,/halieus-brand-mark-h-bridge/,"4.5 H must use a distinct central bridge");
assert.match(modelSheet,/Platform first; games inherit/,"Model sheet must formalise platform-first inheritance");
assert.match(modelSheet,/three pieces/,"Model sheet must document the new H construction");

assert.match(theme,/\| "profile" \| "custom"/,"Theme contract must include a scalable profile-library mode");
assert.match(theme,/THEME_PROFILES/,"Theme model must expose a named profile library");
assert.ok((theme.match(/mood: "/g) ?? []).length >= 12,"Theme library must include at least twelve coordinated profiles");
assert.match(themeButton,/Theme Library/,"Primary theme menu must group expressive profiles into a library");
assert.match(themeButton,/QUICK_OPTIONS/,"Primary theme menu must retain a compact quick-choice layer");
assert.match(themeButton,/halieus-theme-custom-launch/,"Custom RGB\/HEX access must remain immediate");
assert.match(display,/Text & density/,"Game display settings must expose readability controls");
assert.match(display,/Interface density/,"Game display settings must expose density controls");
assert.match(app,/dataset\.textScale/,"Text size must apply from the shared app root");
assert.match(app,/dataset\.density/,"Density must apply from the shared app root");
assert.match(html,/halieus-game-room-theme-profile/,"First paint must preserve the selected theme profile");

assert.match(skins,/SKIN_CATALOG/,"Cosmetic skins need one shared catalog");
assert.match(skins,/isSkinUnlocked/,"Cosmetic access must be evaluated from progression");
assert.match(skins,/BETA_SKIN_PREVIEW_KEY/,"Beta cosmetic previews must have separate session state");
assert.match(skins,/sessionStorage\.setItem\(BETA_SKIN_PREVIEW_KEY/,"Beta cosmetic selection must remain session-only");
assert.match(skinButton,/Account role does not bypass player progression/,"Normal admin play must not bypass cosmetic unlocks");
assert.match(skinButton,/Test Lab preview/,"Beta/Test Lab must explain full preview access");
assert.match(app,/clearBetaSkinPreview\(\)/,"Leaving Beta must restore the normal cosmetic loadout");
assert.match(app,/dataset\.skinCards/,"Card skins must apply from the app root");
assert.match(app,/dataset\.skinMegaBoard/,"Mega Board skins must apply from the app root");
assert.match(css,/data-skin-cards="midnight-deck"[\s\S]*?\.poker-card-back/s,"Card skins must visibly affect Poker");
assert.match(css,/data-skin-cards="midnight-deck"[\s\S]*?\.rebuild-card\.is-back/s,"Card skins must visibly affect Blackjack");
assert.match(css,/data-skin-mega-board="night-board"[\s\S]*?\.board-grid/s,"Mega Board skins must visibly affect the board field");

console.log("HGR 4.5 platform identity/theme/skins foundation regression: PASS");
