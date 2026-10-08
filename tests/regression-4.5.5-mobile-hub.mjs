import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [main, css, home, player, themeButton, themeCore, designCss, accountPanel, guilds, megaLeaderboard] = await Promise.all([
  read("client/src/main.tsx"),
  read("client/src/styles/hgr-4.5.5-mobile-hub.css"),
  read("client/src/platform/components/HomeScreen.tsx"),
  read("client/src/platform/components/PlayerIdentityCard.tsx"),
  read("client/src/platform/components/ThemeButton.tsx"),
  read("client/src/platform/theme.ts"),
  read("client/src/styles/hgr-design-v1.css"),
  read("client/src/platform/accounts/AccountPanel.tsx"),
  read("client/src/platform/components/GuildsPanel.tsx"),
  read("client/src/games/mega-board/components/LeaderboardModal.tsx"),
]);

assert.match(main, /hgr-4\.5\.5-mobile-hub\.css/);
assert.match(css, /HGR 4\.5\.5 Batch 2/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /\.halieus-feature-carousel \.halieus-showcase-feature[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
assert.match(css, /\.halieus-feature-card-stage[\s\S]*grid-column: 1 \/ -1 !important/);
assert.match(css, /\.halieus-feature-rail[\s\S]*grid-column: 1 \/ -1 !important[\s\S]*position: relative !important/);
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
assert.match(themeCore, /export function themeProfileVariables\(profile: HalieusThemeProfile\)[\s\S]*return customThemeVariables\(profile\.theme\)/);
assert.match(themeButton, /THEME_LIBRARY_GROUPS/);
assert.match(themeButton, /label: "Core"/);
assert.match(themeButton, /CORE_LIBRARY_THEME_IDS/);
assert.match(themeButton, /Original Custom preset logic · always available/);
assert.match(themeCore, /id: "studio-graphite"[\s\S]*id: "high-contrast"/);
assert.match(themeButton, /label: "Unlockables"/);
assert.doesNotMatch(themeButton, /<strong>Starting palettes<\/strong>|<strong>Workspace palette<\/strong>/);
assert.doesNotMatch(themeButton, /function selectCustomPalette\(/);
assert.match(themeButton, /type="range" min=\{0\} max=\{255\}/);
assert.match(themeButton, /halieus-custom-preview-legend/);
assert.match(themeButton, /halieus-hsl-fields/);
assert.match(themeButton, /Hue · saturation · lightness/);
assert.match(themeButton, /halieus-custom-contrast-guide/);
assert.match(designCss, /\.halieus-custom-contrast-guide/);
assert.match(designCss, /:is\(html\[data-theme="custom"\], html\[data-theme="profile"\]\) \.halieus-home-discovery/);
assert.match(designCss, /:is\(html\[data-theme="custom"\], html\[data-theme="profile"\]\) \.account-admin-content-card/);
assert.match(home, /style=\{account\.profilePicture \? undefined : \{ background: account\.playerColor \}\}/);
assert.match(player, /style=\{player\.profilePicture \? undefined : \{ background: player\.playerColor \}\}/);
assert.match(accountPanel, /style=\{profilePicture \? undefined : \{ background: playerColor \}\}/);
assert.doesNotMatch(guilds, /style=\{\{ background: entry\.playerColor \}\}/);
assert.match(megaLeaderboard, /style=\{entry\.profilePicture \? undefined : \{ background: entry\.playerColor \?\? "#64748b" \}\}/);


console.log("PASS 4.5.5 Batch 2/3 + Part 28: restored Custom-preset Core atmosphere, Unlockables, RGB/HSL editor, contrast guide and avatar-only player colour ownership are locked");
