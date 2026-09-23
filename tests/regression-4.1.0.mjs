import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

/*
 * HGR 4.1.0 regression contract.
 *
 * Guilds are a persistent platform/social layer. They may reserve and organise
 * normal HGR rooms, but they must not become a second game-state authority.
 * Authentication, role permissions and persistence therefore stay server-side,
 * while game creation hands back to the existing HGR room setup flow.
 */

const currentVersion=read('VERSION').trim();
assert.match(currentVersion,/^4\.1\./,'4.1.0 regression should run against the current 4.1.x release');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,currentVersion,`${file} version mismatch`);
}

const rootPackage=json('package.json');
assert.match(
  rootPackage.scripts['test:regression'],
  /regression-4\.0\.2\.mjs.*regression-4\.1\.0\.mjs/s,
  'Regression chain must preserve 4.0.2 before 4.1.0',
);

const contracts=read('shared/platform/guilds.ts');
const accounts=read('server/src/platform/accounts.ts');
const guildServer=read('server/src/platform/guilds.ts');
const server=read('server/src/index.ts');
const archive=read('server/src/platform/sessionArchive.ts');
const home=read('client/src/platform/components/HomeScreen.tsx');
const main=read('client/src/main.tsx');
const guildPanel=read('client/src/platform/components/GuildsPanel.tsx');
const css=read('client/src/index.css');
const sw=read('client/public/sw.js');
const intro=read('client/src/platform/components/HalieusIntro.tsx');
const html=read('client/index.html');
const readme=read('README.md');
const gitignore=read('.gitignore');
const releaseIntegrity=read('scripts/release-integrity.mjs');
const hgrTheme=read('client/src/styles/hgr-theme.css');
const hgrDesignV1=read('client/src/styles/hgr-design-v1.css');
const themeButton=read('client/src/platform/components/ThemeButton.tsx');
const displaySettings=read('client/src/platform/components/DisplaySettingsPanel.tsx');
const themeModel=read('client/src/platform/theme.ts');
const hgrDesignV1Doc=read('docs/HGR_DESIGN_SYSTEM_V1.md');
const projectTimeline=read('client/src/platform/projectTimeline.ts');
const projectTimelineComponent=read('client/src/platform/components/ProjectTimeline.tsx');
const launcherGenerator=read('scripts/windows/generate-launcher-icons.ps1');
const launcherShortcuts=read('scripts/windows/launcher-shortcuts.ps1');
const designSystemDoc=read('docs/HGR_DESIGN_SYSTEM.md');
const hgrIcon=read('client/src/platform/components/HgrIcon.tsx');
const updateCmd=read('Update HGR GitHub.cmd');
const releaseWorkflow=read('.github/workflows/release-identity.yml');
const startCmd=read('Start Halieus Game Room.cmd');
const restartCmd=read('Restart Halieus Game Room.cmd');
const closeCmd=read('Close Halieus Game Room.cmd');

assert.match(contracts,/HalieusGuildRole = "owner" \| "admin" \| "moderator" \| "member"/,'Guild role contract missing');
assert.match(contracts,/HalieusGuildRoomPolicy = "members" \| "moderators" \| "admins"/,'Guild room permission contract missing');
assert.match(contracts,/interface HalieusGuildDetail/,'Guild detail contract missing');
assert.match(contracts,/participantAccountIds: string\[\]/,'Guild history must retain stable participant account ids');

assert.match(accounts,/export function getAuthenticatedAccount\(/,'Guilds must authenticate through the canonical account store');
assert.match(accounts,/export function getAccountSummaryById\(/,'Guild direct invites must resolve canonical account identity server-side');

assert.match(guildServer,/export function registerGuildRoutes\(/,'Guild REST routes missing');
assert.match(guildServer,/app\.post\("\/guilds\/join"/,'Private guild invite-code join route missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/messages"/,'Persistent guild chat route missing');
assert.match(guildServer,/app\.delete\("\/guilds\/:guildId\/messages\/:messageId"/,'Guild chat moderation route missing');
assert.match(guildServer,/function canModerate\(/,'Guild moderator permission boundary missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/rooms"/,'Guild room reservation route missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/members\/:accountId\/role"/,'Guild role-management route missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/invitations"/,'Guild direct-player invitation route missing');
assert.match(guildServer,/app\.post\("\/guilds\/invitations\/:invitationId\/respond"/,'Guild invitation response route missing');
assert.match(guildServer,/function canCreateRoom\(/,'Server-side guild room permissions missing');
assert.match(guildServer,/export async function recordGuildSessionResult\(/,'Guild result projection missing');
assert.doesNotMatch(guildServer,/app\.get\("\/guilds\/search"/,'4.1.0 guilds must remain private/invite-led');

assert.match(server,/registerGuildRoutes\(app, getAuthenticatedAccount, getAccountSummaryById\)/,'Server must register Guild routes with canonical account lookup');
assert.match(server,/await loadGuildStore\(\)/,'Server must load persistent guild data at startup');
assert.match(server,/\["\/auth", "\/accounts", "\/admin", "\/guilds"\]/,'Guild responses must use no-store cache policy');

assert.match(
  archive,
  /await recordGuildSessionResult\(game, code, status, payload, summary\)/,
  'Canonical session completion must project into matching guild history',
);
assert.match(
  archive,
  /await writeFile\(finalPath,[\s\S]*?await recordGuildSessionResult/s,
  'Guild result projection must happen only after the canonical final archive write',
);

assert.match(home,/type HomeView = "home" \| "games" \| "players" \| "guilds"/,'Guilds must live in the Game Room social navigation');
assert.match(home,/import \{ GuildsPanel \} from "\.\/GuildsPanel"/,'Game Room must import the Guilds surface');
assert.match(home,/function openGuildCreate\(game: GameId, roomCode: string\)/,'Guild rooms must hand off to the existing game create flow');
assert.match(home,/view === "players" \|\| view === "guilds"/,'Players navigation must remain active while browsing Guilds');
assert.doesNotMatch(home,/import \{ ProjectTimeline \} from "\.\/ProjectTimeline"/,'Project history should no longer occupy the player Home screen');
assert.match(home,/import \{ HgrIcon \} from "\.\/HgrIcon"/,'Home navigation must import the shared SVG icon system');
assert.match(home,/HgrIcon name="home"/,'Home navigation SVG icon missing');
assert.match(home,/HgrIcon name="games"/,'Games navigation SVG icon missing');
assert.match(home,/HgrIcon name="players"/,'Players navigation SVG icon missing');
assert.match(home,/HgrIcon name="plus"/,'Join Game SVG icon missing');
assert.match(home,/HgrIcon name="info"/,'Build Info SVG icon missing');
assert.doesNotMatch(home,/<span>⌂<\/span>|<span>▦<\/span>|<span>◉<\/span>|<span>＋<\/span>|<span>ⓘ<\/span>/,'Legacy text navigation glyphs must not return');
assert.match(hgrIcon,/export function HgrIcon/,'Shared HGR SVG icon component missing');

assert.doesNotMatch(home,/<ProjectTimeline\b/,'Project history belongs in project/about documentation rather than Home');

assert.match(guildPanel,/type GuildView = "rooms" \| "chat" \| "leaderboard" \| "members"/,'Guild UI must expose Rooms, Chat, Leaderboard and Members');
assert.match(guildPanel,/Guilds is deliberately REST-backed rather than tied to a game socket/,'Guild architecture comment missing');
assert.match(guildPanel,/setInterval\(\(\) => void loadDetail\(selectedGuildId, true\), 5000\)/,'Guild chat/detail persistence polling missing');
assert.match(guildPanel,/Create guild room/,'Guild room creation action missing');
assert.match(guildPanel,/PRIVATE INVITE CODE/,'Private guild invite UI missing');
assert.match(guildPanel,/INVITE PLAYERS/,'Guild member surface must expose direct player invitations');
assert.match(guildPanel,/pendingInvitations/,'Guild UI must surface pending invitations');

assert.match(css,/HGR 4\.1\.0 — Guilds & persistent groups/,'4.1.0 Guild CSS marker missing');
assert.match(css,/@media \(max-width: 680px\)[\s\S]*?\.halieus-guilds-panel/s,'Guilds need an explicit phone layout');

assert.match(hgrTheme,/--hgr-brand:/,'Shared HGR brand token missing');
assert.match(hgrTheme,/--hgr-start:/,'Shared HGR semantic Start token missing');
assert.match(hgrTheme,/--hgr-restart:/,'Shared HGR semantic Restart token missing');
assert.match(hgrTheme,/--hgr-close:/,'Shared HGR semantic Close token missing');
assert.match(hgrTheme,/--hgr-update:/,'Shared HGR semantic Update token missing');
assert.match(hgrTheme,/\.hgr-project-history/,'Project timeline design-system styling missing');
assert.match(hgrDesignV1,/--hgr-yellow:\s*#ffc200/i,'HGR Design System v1 primary yellow token missing');
assert.match(hgrDesignV1,/--hgr-navy:\s*#081b2b/i,'HGR Design System v1 navy token missing');
assert.match(hgrDesignV1,/html\[data-theme="dark"\][\s\S]*?--hgr-page:\s*#0f1012/s,'Dark mode must remain chromatic-neutral rather than blue');
assert.match(hgrDesignV1,/html\[data-theme="blue"\]/,'Blue must be an explicit optional theme');
assert.match(hgrDesignV1,/\.button-primary,[\s\S]*?var\(--hgr-yellow\)/s,'Shared primary actions must use HGR yellow');
assert.match(hgrDesignV1,/\.hgr-tabs/,'Reusable HGR tabs primitive missing');
assert.match(hgrDesignV1,/\.hgr-status--online/,'Reusable HGR status primitive missing');
assert.match(hgrDesignV1,/\.halieus-nav-icon/,'Shared navigation SVG icon styling missing');
assert.match(hgrDesignV1,/\.halieus-mobile-menu-button::before[\s\S]*?content:\s*none !important/s,'Legacy mobile hamburger pseudo-glyph must be disabled');
assert.match(themeButton,/mode: "custom"/,'Theme selector must expose Custom');
assert.match(themeButton,/type="color"/,'Custom theme must expose RGB colour controls');
assert.match(themeModel,/CUSTOM_THEME_KEY/,'Custom theme palette must persist separately');
assert.match(displaySettings,/\["system", "dark", "light", "blue", "custom"\]/,'Game menus must expose System, Dark, Light, Blue and Custom');
assert.doesNotMatch(read('client/src/App.tsx'),/classList\.add\("theme-transitioning"\)/,'Theme changes must apply immediately without transition choreography');
assert.match(hgrDesignV1,/@media \(max-width: 1024px\)/,'Design System v1 tablet contract missing');
assert.match(hgrDesignV1,/@media \(max-width: 720px\)/,'Design System v1 phone contract missing');
assert.match(main,/import "\.\/styles\/hgr-design-v1\.css";/,'HGR Design System v1 must load after the legacy theme layer');
assert.match(hgrDesignV1Doc,/Phase 2 — Signed-out landing/,'Design System v1 must document the next implementation phase');

assert.match(hgrTheme,/Shared game-shell polish — 4\.1\.x/,'Shared game-shell polish marker missing');
assert.match(hgrTheme,/\.card-game-header,[\s\S]*?\.rebuild-game-header,[\s\S]*?\.word-arena-header/s,'Shared game header family must remain unified');
assert.match(hgrTheme,/@media \(max-width: 980px\)[\s\S]*?\.rebuild-live-layout[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important/s,'Shared game layouts must collapse before tablet widths overflow');
assert.match(hgrTheme,/@media \(max-width: 680px\)[\s\S]*?\.card-game-host-actions,[\s\S]*?\.rebuild-host-controls[\s\S]*?grid-template-columns: minmax\(0, 1fr\) !important/s,'Shared game setup controls must collapse to one phone column');
assert.match(hgrTheme,/\.game-menu-modal,[\s\S]*?\.card-game-invite-modal[\s\S]*?var\(--hgr-surface-raised\)/s,'Shared game menus must use HGR surfaces');


assert.match(projectTimeline,/version: "0\.22\.x"/,'Timeline must include the foundation era');
assert.match(projectTimeline,/version: "3\.5\.0"/,'Timeline must include the Desktop + Oracle foundation');
assert.match(projectTimeline,/version: "4\.0\.2"/,'Timeline must include device-width mobile recovery');
assert.match(projectTimeline,/version: "4\.1\.0"/,'Timeline must include the current Guilds milestone');
assert.match(projectTimelineComponent,/GitHub source history begins with the 4\.0\.0 repository import/,'Timeline must disclose the historical-source boundary');

assert.match(launcherGenerator,/generated-preview/,'Optional generated launcher previews must be quarantined from approved icons');
assert.doesNotMatch(launcherGenerator,/Remove-Item[\s\S]*?\$LauncherRoot/s,'Launcher generator must never wipe the approved launcher root');
assert.match(launcherShortcuts,/assets\\branding\\launchers\\matte/,'Shortcut refresh must consume approved launcher assets');
assert.doesNotMatch(launcherShortcuts,/generate-launcher-icons\.ps1/,'Shortcut refresh must never invoke icon generation');
assert.doesNotMatch(launcherShortcuts,/Remove-Item[\s\S]*?\.ico|Remove-Item[\s\S]*?\.png/s,'Shortcut refresh must never delete icon artwork');
assert.match(launcherShortcuts,/without modifying any files/,'Missing launcher icons must fall back without regenerating artwork');
assert.doesNotMatch(startCmd,/launcher-shortcuts\.ps1/,'Start must never refresh or regenerate launcher assets');
assert.doesNotMatch(restartCmd,/launcher-shortcuts\.ps1/,'Restart must never refresh or regenerate launcher assets');
assert.doesNotMatch(closeCmd,/launcher-shortcuts\.ps1/,'Close must never refresh or regenerate launcher assets');
assert.doesNotMatch(gitignore,/^assets\/branding\/launchers\/$/m,'Approved launcher assets must be trackable in Git');
assert.match(gitignore,/assets\/branding\/launchers\/generated-preview\//,'Only generated launcher previews should be ignored');

assert.match(gitignore,/server\/data\/guilds\//,'Local guild runtime data must never be committed');
assert.match(releaseIntegrity,/server\/data\/guilds/,'Guild runtime data must be excluded from release fingerprint inputs');
assert.match(releaseIntegrity,/persistent-guilds-4\.1\.0/,'4.1.0 Guilds must be part of the signed release contract');
assert.match(releaseIntegrity,/hgr-shared-design-tokens-4\.1\.0/,'Shared HGR design tokens must be part of the signed release contract');
assert.match(releaseIntegrity,/hgr-design-system-v1-4\.1\.0/,'HGR Design System v1 must be part of the signed release contract');
assert.ok(
  updateCmd.indexOf('STEP 2 - Preparing release identity BEFORE the browser build') < updateCmd.indexOf('call npm run build'),
  'Updater must generate the 4.1 release identity before compiling the browser bundle',
);
assert.match(updateCmd,/STEP 3B - Validating the real Oracle deployment package locally/,'Updater must package-test the real Oracle release before commit/push/deploy');
assert.match(updateCmd,/tests\\package-oracle-4\.0\.0\.ps1/,'Updater must run the tracked Oracle package preflight automatically');
assert.match(releaseWorkflow,/npm run prepare:release/,'Release identity workflow must regenerate the manifest');
assert.match(releaseWorkflow,/git add RELEASE\.json shared\/release\.ts/,'Release identity workflow must commit both generated release files');
assert.match(releaseIntegrity,/hgr-project-history-4\.1\.0/,'Project history must be part of the signed release contract');
assert.match(releaseIntegrity,/matte-launcher-family-4\.1\.0/,'Matte launcher family must be part of the signed release contract');

assert.match(sw,new RegExp(`halieus-shell-v${currentVersion.replaceAll('.','-')}`),'PWA shell cache must match the current 4.1.x release');
assert.match(intro,new RegExp(`app-icon-192\\.png\\?v=${currentVersion.replaceAll('.','\\.')}`),'Intro asset cache-buster must match the current release');
assert.doesNotMatch(html,/\?v=4\.0\.2/,'Static browser assets must not retain the 4.0.2 cache identity');
assert.ok(readme.includes(`**Current milestone:** ${currentVersion}`),'README must advertise the current 4.1.x milestone');

assert.match(launcherShortcuts,/Microsoft\\Windows\\Start Menu\\Programs/,'HGR shortcuts must be created in the user Start Menu Programs root');

console.log('Halieus Game Room 4.1.0 Guilds regression: PASS');
