import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

assert.equal(read('VERSION').trim(),'4.1.1','Video-reference polish remains inside the 4.1.1 milestone');

const home=read('client/src/platform/components/HomeScreen.tsx');
const guilds=read('client/src/platform/components/GuildsPanel.tsx');
const guildContracts=read('shared/platform/guilds.ts');
const guildServer=read('server/src/platform/guilds.ts');
const account=read('client/src/platform/accounts/AccountPanel.tsx');
const theme=read('client/src/platform/theme.ts');
const themeButton=read('client/src/platform/components/ThemeButton.tsx');
const displaySettings=read('client/src/platform/components/DisplaySettingsPanel.tsx');
const app=read('client/src/App.tsx');
const html=read('client/index.html');
const css=read('client/src/styles/hgr-design-v1.css');

assert.match(theme,/HalieusThemeMode = "system" \| "dark" \| "light" \| "blue" \| "red" \| "green" \| "custom"/,'System and chromatic profiles must be persisted theme modes');
assert.match(theme,/function resolveThemeMode/,'System theme needs a single canonical resolver');
assert.match(themeButton,/mode: "system"/,'Sidebar Theme menu must expose System');
assert.match(themeButton,/CUSTOM_PRESETS/,'Custom theme editor must expose useful starting palettes');
assert.match(themeButton,/Studio Graphite/,'Custom theme presets must use studio-style coordinated palettes');
assert.ok((themeButton.match(/id: \"[a-z0-9-]+\", label:/g) ?? []).length >= 12,'Custom theme editor must expose at least twelve coordinated presets');
assert.match(themeButton,/halieus-custom-preview-window/,'Custom theme editor must show a richer live palette preview');
assert.match(displaySettings,/\["system", "dark", "light", "blue", "red", "green", "custom"\]/,'In-game settings must expose standard and chromatic profiles');
assert.match(app,/prefers-color-scheme: dark/,'Runtime System theme must observe the device colour preference');
assert.match(app,/media\.addEventListener\("change", sync\)/,'System theme must react if the device theme changes while HGR is open');
assert.match(html,/mode === "system" \? systemTheme : mode/,'First paint must resolve System before React loads');

assert.match(home,/halieus-feature-copy-stage/,'Hero copy must transition inside a fixed stage');
assert.match(home,/halieus-feature-card-stage/,'Hero game art must transition inside a fixed stage');
assert.match(css,/\.halieus-feature-carousel[\s\S]*?min-height:\s*430px/s,'Desktop hero must keep a stable frame while games rotate');
assert.match(css,/\.halieus-shell[\s\S]*?--halieus-page:\s*var\(--hgr-page\)[\s\S]*?background:\s*var\(--hgr-page\) !important/s,'Every theme must recolour the Game Room canvas instead of leaving the legacy dark shell behind');
assert.match(css,/\.halieus-feature-copy-stage[\s\S]*?grid-template-rows:\s*20px auto auto auto auto !important/s,'Hero rows must size from their content instead of parent em units');
assert.match(css,/\.halieus-feature-copy-stage > h1[\s\S]*?height:\s*1\.92em !important/s,'Hero title must reserve its own fixed two-line area without overlapping room copy');
assert.match(css,/@keyframes hgr-feature-content-in/,'Hero rotation needs a smooth content transition');
assert.match(home,/return shelves\[discoveryShelf\]\.slice\(0, 4\)/,'Home discovery must be a four-game preview');
assert.match(home,/onlinePlayers\.slice\(0, 3\)/,'Online players Home preview must stay short');
assert.match(home,/recentPlayers\.slice\(0, 3\)/,'Recent players Home preview must stay short');
assert.match(home,/\n\s*friends,\n/,'Friends Are Playing must not fall back to generic recommendations');
assert.match(home,/No friend activity to show/,'Friends Are Playing must expose a truthful empty state');
assert.match(css,/\.halieus-home-player-strip > div[\s\S]*?overflow:\s*visible !important/s,'Home player previews must not have an internal scrollbar');
assert.match(css,/\.halieus-discovery-row[\s\S]*?overflow:\s*visible !important/s,'Home game preview must not have an internal scrollbar');

assert.match(guilds,/guildAction, setGuildAction/,'Guild join/create must be explicitly opened');
assert.match(guilds,/createPortal/,'Guild join/create and organisation settings must render above the workspace');
assert.match(guilds,/halieus-guild-action-modal/,'Guild join/create must use a contained action modal');
assert.match(guilds,/halieus-guild-settings-modal/,'Guild organisation settings must use a contained modal');
assert.match(guildContracts,/picture:\s*string \| null/,'Guild summaries must expose an optional guild picture');
assert.match(guildContracts,/guildPicture:\s*string \| null/,'Guild invitations must carry the guild picture');
assert.match(guildServer,/Guild picture must be a PNG, JPEG or WebP under 1 MB/,'Guild pictures must be validated server-side');
assert.match(guilds,/Upload picture/,'Guild settings must allow a guild picture upload');
assert.match(guilds,/Join guild/,'Guild page must expose a compact Join action');
assert.match(guilds,/Create guild/,'Guild page must expose a compact Create action');
assert.match(guilds,/Invite HGR players/,'Guild settings must surface native platform invitations next to invite-code tools');
assert.match(guilds,/setView\("members"\)/,'Native guild invitation shortcut must open Members');

assert.match(account,/useState<AdminTab>\("account"\)/,'Owner account should open on personal profile/security');
assert.match(account,/Owner tools →/,'Owner administration must remain explicitly reachable');
assert.match(account,/adminTab !== "account"/,'Administration must not permanently occupy the account profile');
assert.match(account,/← My profile/,'Owner tools must provide a clear route back to personal profile');
assert.match(css,/\.account-panel \.account-owner-nav[\s\S]*?grid-template-columns:\s*repeat\(6,minmax\(0,1fr\)\)/s,'Owner tools must use the compact HGR segmented navigation');
assert.match(css,/\.account-panel \.account-player-admin-row[\s\S]*?border-radius:\s*12px/s,'Player management rows must use the compact HGR identity-card presentation');
assert.match(css,/html\[data-theme="light"\][\s\S]*?--hgr-action-bg:\s*#d6a11f/s,'Light mode must retain the standard yellow HGR primary action');
assert.match(css,/html\[data-theme="red"\][\s\S]*?--hgr-action-bg:\s*#c9444d/s,'Red must be a first-class coordinated colour profile');
assert.match(css,/html\[data-theme="green"\][\s\S]*?--hgr-action-bg:\s*#428e59/s,'Green must be a first-class coordinated colour profile');
assert.match(css,/\.modern-player-list-v2[\s\S]*?max-height:\s*348px !important;[\s\S]*?overflow-y:\s*auto !important/s,'Mega Board lobby roster must scroll internally instead of growing past room controls');
assert.ok(account.indexOf('account-game-record') < account.indexOf('account-feedback-card'),'Personal game record must appear before feedback in the account hierarchy');
assert.match(css,/\.account-owner-nav[\s\S]*?background:\s*var\(--hgr-surface-soft\) !important/s,'Owner navigation must inherit the active HGR theme rather than a fixed blue admin palette');

console.log('Halieus Game Room 4.1.1 video-reference polish regression: PASS');
