import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

assert.equal(read('VERSION').trim(),'4.1.1','Video-reference polish remains inside the 4.1.1 milestone');

const home=read('client/src/platform/components/HomeScreen.tsx');
const guilds=read('client/src/platform/components/GuildsPanel.tsx');
const account=read('client/src/platform/accounts/AccountPanel.tsx');
const theme=read('client/src/platform/theme.ts');
const themeButton=read('client/src/platform/components/ThemeButton.tsx');
const displaySettings=read('client/src/platform/components/DisplaySettingsPanel.tsx');
const app=read('client/src/App.tsx');
const html=read('client/index.html');
const css=read('client/src/styles/hgr-design-v1.css');

assert.match(theme,/HalieusThemeMode = "system" \| "dark" \| "light" \| "blue" \| "custom"/,'System must be a persisted theme mode');
assert.match(theme,/function resolveThemeMode/,'System theme needs a single canonical resolver');
assert.match(themeButton,/mode: "system"/,'Sidebar Theme menu must expose System');
assert.match(displaySettings,/\["system", "dark", "light", "blue", "custom"\]/,'In-game settings must expose System');
assert.match(app,/prefers-color-scheme: dark/,'Runtime System theme must observe the device colour preference');
assert.match(app,/media\.addEventListener\("change", sync\)/,'System theme must react if the device theme changes while HGR is open');
assert.match(html,/mode === "system" \? systemTheme : mode/,'First paint must resolve System before React loads');

assert.match(home,/halieus-feature-copy-stage/,'Hero copy must transition inside a fixed stage');
assert.match(home,/halieus-feature-card-stage/,'Hero game art must transition inside a fixed stage');
assert.match(css,/\.halieus-feature-carousel[\s\S]*?min-height:\s*430px/s,'Desktop hero must keep a stable frame while games rotate');
assert.match(css,/@keyframes hgr-feature-content-in/,'Hero rotation needs a smooth content transition');
assert.match(home,/return shelves\[discoveryShelf\]\.slice\(0, 4\)/,'Home discovery must be a four-game preview');
assert.match(home,/onlinePlayers\.slice\(0, 3\)/,'Online players Home preview must stay short');
assert.match(home,/recentPlayers\.slice\(0, 3\)/,'Recent players Home preview must stay short');
assert.match(css,/\.halieus-home-player-strip > div[\s\S]*?overflow:\s*visible !important/s,'Home player previews must not have an internal scrollbar');
assert.match(css,/\.halieus-discovery-row[\s\S]*?overflow:\s*visible !important/s,'Home game preview must not have an internal scrollbar');

assert.match(guilds,/guildAction, setGuildAction/,'Guild join/create must be explicitly opened');
assert.match(guilds,/Join guild/,'Guild page must expose a compact Join action');
assert.match(guilds,/Create guild/,'Guild page must expose a compact Create action');
assert.match(guilds,/Invite HGR players/,'Guild settings must surface native platform invitations next to invite-code tools');
assert.match(guilds,/setView\("members"\)/,'Native guild invitation shortcut must open Members');

assert.match(account,/useState<AdminTab>\("account"\)/,'Owner account should open on personal profile/security');
assert.match(account,/Owner tools →/,'Owner administration must remain explicitly reachable');
assert.match(account,/adminTab !== "account"/,'Administration must not permanently occupy the account profile');
assert.match(account,/← My profile/,'Owner tools must provide a clear route back to personal profile');

console.log('Halieus Game Room 4.1.1 video-reference polish regression: PASS');
