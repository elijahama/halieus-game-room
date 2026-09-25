import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

/*
 * HGR 4.1.1 polish contract.
 *
 * This patch turns the 4.1 social foundation into the approved player-facing
 * experience: discoverable Home shelves, direct guild invitations, canonical
 * avatars, richer ranked presentation, scroll-safe setup/menu surfaces and an
 * explicit System/Dark/Light/Blue/Custom theme system. WHOT gameplay is deliberately
 * outside this patch.
 */

const currentVersion = read('VERSION').trim();
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,currentVersion,`${file} version mismatch`);
}

const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-4\.1\.0\.mjs.*regression-4\.1\.1\.mjs/s,'4.1.1 must extend the 4.1.0 regression chain');

const home=read('client/src/platform/components/HomeScreen.tsx');
const guildPanel=read('client/src/platform/components/GuildsPanel.tsx');
const guildServer=read('server/src/platform/guilds.ts');
const accounts=read('server/src/platform/accounts.ts');
const contracts=read('shared/platform/guilds.ts');
const theme=read('client/src/platform/theme.ts');
const themeButton=read('client/src/platform/components/ThemeButton.tsx');
const displaySettings=read('client/src/platform/components/DisplaySettingsPanel.tsx');
const app=read('client/src/App.tsx');
const css=read('client/src/styles/hgr-design-v1.css');
const leaderboard=read('client/src/games/mega-board/components/LeaderboardModal.tsx');
const debt=read('client/src/games/mega-board/components/DebtPanel.tsx');
const html=read('client/index.html');
const sw=read('client/public/sw.js');
const intro=read('client/src/platform/components/HalieusIntro.tsx');

assert.doesNotMatch(home,/<ProjectTimeline\b/,'Project History must stay off the player Home page');
for(const label of ['Featured','Most Played','Recommended','Recently Played','Friends Are Playing']) {
  assert.ok(home.includes(label),`Home discovery shelf missing: ${label}`);
}
assert.match(home,/halieus-home-player-strip/,'Home must use the compact social player strips');
assert.match(home,/recentPlayers/,'Home must expose a recent-player shelf');

assert.match(contracts,/interface HalieusGuildInvitation/,'Guild invitation contract missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/invitations"/,'Direct guild invitation route missing');
assert.match(guildServer,/app\.post\("\/guilds\/invitations\/:invitationId\/respond"/,'Guild invitation response route missing');
assert.match(accounts,/export function getAccountSummaryById\(/,'Guilds must resolve invite targets from canonical accounts');
assert.match(guildPanel,/INVITE PLAYERS/,'Guild Members must expose player search/invite');
assert.match(guildPanel,/pendingInvitations/,'Guild Members must expose pending invitations');
assert.match(guildPanel,/profilePicture \? <img/,'Guild member avatars must prefer the canonical profile picture');

assert.match(theme,/HalieusThemeMode = "system" \\| "dark" \\| "light" \\| "blue" \\| "red" \\| "green" \\| (?:"profile" \\| )?"custom"/,'Expanded theme contract missing');
assert.match(theme,/CUSTOM_THEME_KEY/,'Custom theme persistence missing');
assert.match(themeButton,/type="color"/,'Custom palette colour picker missing');
assert.match(themeButton,/halieus-rgb-fields/,'Custom palette RGB channel controls missing');
assert.match(themeButton,/mode: "system"[\s\S]*mode: "light"[\s\S]*mode: "dark"/,'Game menu quick theme choices must keep System, Light and Dark');
assert.match(themeButton,/Theme Library/,'Game menu must expose the 4.5 Theme Library for expressive profiles');
assert.match(themeButton,/THEME_PROFILES\.length/,'Game menu Theme Library must be driven by the shared profile catalog');
assert.doesNotMatch(app,/classList\.add\("theme-transitioning"\)/,'Theme switching must not add transition choreography');
assert.match(css,/html\[data-theme="dark"\][\s\S]*?--hgr-page:\s*#0f1012/s,'Dark mode must remain neutral');
assert.match(css,/html\[data-theme="blue"\]/,'Blue theme must remain explicit');
assert.match(css,/html\[data-theme="red"\]/,'Red theme must remain explicit');
assert.match(css,/html\[data-theme="green"\]/,'Green theme must remain explicit');
assert.match(css,/transition-property:\s*none !important/,'Theme transition animation must stay disabled');
assert.match(html,/halieus-game-room-custom-theme/,'First paint must understand persisted custom palettes');

assert.match(leaderboard,/leaderboard-podium/,'Ranked leaderboard top-three presentation missing');
assert.match(css,/\.leaderboard-podium/,'Ranked podium styling missing');
assert.match(css,/\.halieus-create-panel\.halieus-create-modal[\s\S]*?overflow:\s*visible !important/s,'Room creation modal must not trap an internal scrollbar');
assert.match(css,/\.game-menu-modal[\s\S]*?overflow:\s*visible !important/s,'Game menu must not trap an internal scrollbar');
assert.match(debt,/debt-property-option-list/,'Mega Board debt flow must expose property liquidation choices');
assert.match(css,/\.debt-property-option-list[\s\S]*?grid-template-columns:\s*repeat\(2/s,'Debt property choices must use a compact multi-column layout on desktop');
assert.match(css,/--ambient-accent:\s*var\(--game-card-accent\)/,'Game-card ambient colour must derive from game identity');

assert.ok(sw.includes(`halieus-shell-v${currentVersion.replaceAll('.', '-')}`), 'PWA cache must follow VERSION');
assert.match(intro,/HalieusBrandMark/,'Intro must use the shared current Halieus identity component');

console.log('Halieus Game Room 4.1.1 social + theme polish regression: PASS');
