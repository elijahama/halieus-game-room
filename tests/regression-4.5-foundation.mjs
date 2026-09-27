import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const readBytes=(path)=>readFileSync(new URL(`../${path}`,import.meta.url));
const gitBlobSha=(path)=>{
  const bytes=readBytes(path);
  // Git stores text assets canonically, while Windows may check text files out
  // with CRLF without considering the working tree dirty. Normalise launcher
  // SVG line endings before hashing so this regression protects artwork/content
  // rather than failing on a platform-specific checkout representation.
  const canonicalBytes = path.toLowerCase().endsWith(".svg")
    ? Buffer.from(bytes.toString("utf8").replace(/\r\n/g,"\n"), "utf8")
    : bytes;
  return createHash("sha1").update(`blob ${canonicalBytes.length}\0`).update(canonicalBytes).digest("hex");
};

const playerCard=read("client/src/platform/components/PlayerIdentityCard.tsx");
const pokerScreen=read("client/src/games/poker/PokerScreen.tsx");
const megaLobby=read("client/src/games/mega-board/components/LobbyScreen.tsx");
const ludoScreen=read("client/src/games/ludo/LudoScreen.tsx");
const ayoScreen=read("client/src/games/ayo/AyoScreen.tsx");
const connectFourScreen=read("client/src/games/connect-four/ConnectFourScreen.tsx");
const hiddenDictatorScreen=read("client/src/games/hidden-dictator/HiddenDictatorScreen.tsx");
const wordBoardScreen=read("client/src/games/word-board/WordBoardScreen.tsx");
const blackjackRebuild=read("client/src/games/blackjack/BlackjackRebuildScreen.tsx");
const whotRebuild=read("client/src/games/whot/WhotRebuildScreen.tsx");
const classicTableScreen=read("client/src/games/classic-table/ClassicTableScreen.tsx");
const wordArenaScreen=read("client/src/games/word-arena/WordArenaScreen.tsx");
const home=read("client/src/platform/components/HomeScreen.tsx");
const brand=read("client/src/platform/components/HalieusBrandMark.tsx");
const theme=read("client/src/platform/theme.ts");
const themeButton=read("client/src/platform/components/ThemeButton.tsx");
const display=read("client/src/platform/components/DisplaySettingsPanel.tsx");
const skins=read("client/src/platform/skins.ts") + read("shared/platform/skins.ts");
const skinButton=read("client/src/platform/components/SkinLibraryButton.tsx");
const app=read("client/src/App.tsx");
const css=read("client/src/styles/hgr-design-v1.css");
const indexCss=read("client/src/index.css");
const surfaceCss=read("client/src/styles/hgr-game-surfaces-v45.css");
const release451Css=read("client/src/styles/hgr-4.5.1.css");
const clientEntry=read("client/src/main.tsx");
const gameChrome=read("client/src/platform/components/GameChrome.tsx");
const roomChat=read("client/src/platform/components/RoomChatPanel.tsx");
const hgrIcons=read("client/src/platform/components/HgrIcon.tsx");
const accountPortal=read("client/src/platform/accounts/AccountPortal.tsx");
const megaGameMenu=read("client/src/games/mega-board/components/GameMenu.tsx");
const megaDice=read("client/src/games/mega-board/components/DiceRollOverlay.tsx");
const megaBoard=read("client/src/games/mega-board/components/GameBoard.tsx");
const megaLeaderboard=read("client/src/games/mega-board/components/LeaderboardModal.tsx");
const accountPanel=read("client/src/platform/accounts/AccountPanel.tsx");
const megaGameRules=read("shared/games/mega-board/game-rules.ts");
const megaLobbyHandlers=read("server/src/games/mega-board/handlers/lobbyHandlers.ts");
const megaTurnHandlers=read("server/src/games/mega-board/handlers/turnHandlers.ts");
const connectFourHandlers=read("server/src/games/connect-four/handlers.ts");
const ludoHandlers=read("server/src/games/ludo/handlers.ts");
const ayoHandlers=read("server/src/games/ayo/handlers.ts");
const rankedFormats=read("shared/platform/rankedFormats.ts");
const rankedBoardContracts=read("shared/platform/rankedLeaderboard.ts");
const rankedServer=read("server/src/platform/ranked.ts");
const guildContracts=read("shared/platform/guilds.ts");
const guildServer=read("server/src/platform/guilds.ts");
const guildPanel=read("client/src/platform/components/GuildsPanel.tsx");
const accountContracts=read("shared/platform/accounts.ts");
const accountServer=read("server/src/platform/accounts.ts");
const html=read("client/index.html");
const modelSheet=read("docs/HGR_MODEL_SHEET_V1.md");
const halieusMark=read("client/public/halieus-mark.svg");
const halieusAppIcon=read("client/public/halieus-app-icon.svg");
const manifest=read("client/public/site.webmanifest");
const launcherShortcuts=read("scripts/windows/launcher-shortcuts.ps1");
const previewGenerator=read("scripts/windows/generate-launcher-icons.ps1");
const launcherReferenceDoc=read("assets/branding/references/README.md");

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

assert.match(brand,/halieus-brand-mark-h-shape/,"4.5 H must use the approved website block silhouette");
assert.doesNotMatch(brand,/halieus-brand-mark-h-pillar|halieus-brand-mark-h-bridge/,"Retired faceted H geometry must not return");
assert.match(modelSheet,/Platform first; games inherit/,"Model sheet must formalise platform-first inheritance");
assert.match(modelSheet,/separate website and launcher identities/,"Model sheet must document the approved H construction");
assert.match(modelSheet,/yellow\/gold as the default Halieus brand colour/,"Model sheet must preserve yellow/gold as the standard Halieus identity");
assert.match(halieusMark,/M12 15H27L24 19V28H40V19L37 15H52L49 19V46L52 50H37L31 54Q23 59 23 50H12L15 46V19ZM27 35Q25 34 25 37V50Q25 53 28 51L38 44Q41 42 38 40Z/,"Canonical public Halieus mark must use the approved H geometry");
assert.match(
  html,
  /id="halieus-dynamic-favicon"[^>]+href="\/halieus-mark\.svg(?:\?[^"]+)?"/,
  "Initial browser identity must use the canonical Halieus mark",
);
assert.match(html,/halieus-boot-mark[\s\S]*?M12 15H27L24 19V28H40V19L37 15H52L49 19V46L52 50H37L31 54Q23 59 23 50H12L15 46V19ZM27 35Q25 34 25 37V50Q25 53 28 51L38 44Q41 42 38 40Z/,"First-paint mark must reuse the approved H geometry");
assert.match(app,/favicon\.href = "\/halieus-mark\.svg\?v=4\.5\.2-icon-set"/,"Platform tab identity must use the canonical icon-set web mark");
assert.doesNotMatch(app,/makeHalieusTabGlyph/,"Platform tab identity must not redraw the canonical H at runtime");
assert.doesNotMatch(app,/favicon[\s\S]*?getPropertyValue\("--hgr-logo-bg"\)/,"Platform favicon must not be recoloured from theme CSS at runtime");
assert.match(halieusAppIcon,/#daa017/i,"Installable app icon must preserve the approved default yellow brand");
assert.match(manifest,/halieus-app-icon\.svg/,"PWA manifest must expose the canonical Halieus app icon");
assert.match(launcherReferenceDoc,/Reference artwork beats generated interpretation/,"Launcher reference README must make approved artwork authoritative");
assert.match(launcherReferenceDoc,/Every approved PNG stored directly in:/,"Launcher reference README must treat the current reference directory as authoritative rather than hard-coding an old reference count");

const approvedReferenceBlobs = {
  "assets/branding/references/ChatGPT Image Sep 22, 2026, 08_26_31 AM.png": "5f1a96cd93fd0d111ec1d22db3bed5aefe8d9283",
  "assets/branding/references/ChatGPT Image Sep 22, 2026, 08_26_37 AM.png": "bc60ec3b771b37afe29ac14287862fc43852092a",
  "assets/branding/references/ChatGPT Image 24 Sept 2026, 21_54_08.png": "4420d3bb3b20810d1cc70087c02c6bef7503fcf8",
};
for (const [asset, expected] of Object.entries(approvedReferenceBlobs)) {
  assert.equal(gitBlobSha(asset), expected, `Approved launcher reference changed unexpectedly: ${asset}`);
}

const approvedLauncherBlobs = {
  "assets/branding/Halieus Game Room.ico": "931715f70ef873c9becbc8809b4c06a1d72d3607",
  "assets/branding/launchers/Start Halieus Game Room.ico": "baccee77f8607afa1f09deab7b620c34741b79a6",
  "assets/branding/launchers/Restart Halieus Game Room.ico": "f38f0b7e715c39bea7efb2e5f6e0934ac38a4a61",
  "assets/branding/launchers/Close Halieus Game Room.ico": "de74effa6decc942c41b2db3bef9b2e0dc8c732d",
  "assets/branding/launchers/HGR PowerShell.ico": "01e56e9ab2d5d4d39b30ff7c0aa69e08468b3dcb",
  "assets/branding/launchers/Update Halieus Website.ico": "a1d356a5eab7a9331e09e54620c11b6b83a415b8",
  "assets/branding/launchers/Start Halieus Game Room.svg": "d7b6183d9ba2f1f3daf1d1123084df3621856dda",
  "assets/branding/launchers/Restart Halieus Game Room.svg": "2c992549bea3db500afd7c35daadf48ae1fe79d2",
  "assets/branding/launchers/Close Halieus Game Room.svg": "4f9b877a596d1dd3b3aceb061afc54b1f9d60411",
  "assets/branding/launchers/HGR PowerShell.svg": "cc04e7d7eaed192085b6e5e184391ff91c44053d",
  "assets/branding/launchers/HGR OpenShard TUI.svg": "2a27eeb76f3d99271ab8593ec1b61fcb7aa866c3",
  "assets/branding/launchers/Update Halieus Website.svg": "30f3f2db624ab448e3fd015783e5b402d86a785d",
};
for (const [asset, expected] of Object.entries(approvedLauncherBlobs)) {
  assert.equal(gitBlobSha(asset), expected, `Approved reference-based launcher icon changed unexpectedly: ${asset}`);
}

assert.match(previewGenerator,/generated-preview/,"Generated launcher experiments must stay quarantined from approved assets");
assert.doesNotMatch(previewGenerator,/Remove-Item[\s\S]*?assets\\branding\\launchers(?!\\generated-preview)/s,"Preview generation must never delete approved launcher icons");
assert.doesNotMatch(launcherShortcuts,/generate-launcher-icons\.ps1/,"Shortcut refresh must never invoke artwork generation");
assert.doesNotMatch(launcherShortcuts,/launchers\\\\matte/,"Retired nested launcher folder must not return");
for (const launcherName of ["start.ico","restart.ico","close.ico","update.ico","powershell.ico","openshard.ico"]) {
  assert.ok(launcherShortcuts.includes(launcherName), "Shortcut generator must consume approved reference-based icon " + launcherName);
}
assert.match(modelSheet,/Shared website surface grammar/,"Model sheet must define the reusable website shell before game-level exceptions");
assert.match(css,/HGR 4\.5 shared website surface grammar/,"4.5 must implement a shared website surface layer");
assert.match(css,/\.halieus-game-category \.halieus-library-art :is\(img,svg\)/,"Games-page normalisation must preserve existing artwork and only control its safe area");
assert.match(css,/\.halieus-game-category \.halieus-library-status/,"Games-page status chips must use the shared shell grammar");
assert.match(css,/\.halieus-guilds-heading[\s\S]*?color:\s*var\(--hgr-brand\)/s,"Guilds heading must inherit the shared platform hierarchy");
assert.match(css,/\.halieus-guild-list,[\s\S]*?\.halieus-guild-detail[\s\S]*?background:\s*var\(--hgr-surface\) !important/s,"Guild workspace cards must inherit shared HGR surfaces");
assert.match(css,/\.account-panel \{[\s\S]*?background:\s*var\(--hgr-surface\) !important/s,"Account modal must inherit the shared HGR surface");
assert.match(css,/\.account-content-heading[\s\S]*?border-bottom:\s*1px solid var\(--hgr-border\)/s,"Account subsections must use the shared heading separator");
assert.match(css,/\.account-panel input,[\s\S]*?background:\s*var\(--hgr-surface-raised\) !important/s,"Account controls must inherit shared theme surfaces");
assert.match(gameChrome,/HgrIcon name="menu"/,"Persistent game chrome must use the shared HGR menu glyph instead of a text hamburger");
assert.match(css,/HGR 4\.5 shared in-game chrome/,"4.5 must define one shared lobby\/game-menu chrome layer");
assert.match(css,/\.game-menu-modal \.menu-action[\s\S]*?background:\s*var\(--hgr-surface-soft\) !important/s,"Game menu actions must use the shared inset-card surface");
assert.match(css,/\.lobby-overview-tile,[\s\S]*?\.players-panel-v2,[\s\S]*?\.lobby-side-card[\s\S]*?background:\s*var\(--hgr-surface-soft\) !important/s,"Lobby overview, roster and control cards must share one HGR surface grammar");
assert.match(css,/\.poker-header,[\s\S]*?\.rebuild-game-header,[\s\S]*?\.card-game-header-polished,[\s\S]*?\.word-arena-header,[\s\S]*?\.classic-table-header/s,"All active game families must share the 4.5 identity-strip header contract");
assert.match(css,/\.poker-room-meta,[\s\S]*?\.rebuild-game-meta,[\s\S]*?\.card-game-meta,[\s\S]*?\.word-arena-meta,[\s\S]*?\.classic-meta/s,"All active game families must share one room\/mode\/status chip grammar");
assert.match(css,/HGR 4\.5 shared results \/ end-screen shell/,"4.5 must define one shared results surface layer");
assert.match(css,/\.winner-modal,[\s\S]*?\.halieus-results-card[\s\S]*?background:\s*var\(--hgr-surface\) !important/s,"Mega Board and shared non-Mega result cards must consume the same HGR surface");
assert.match(css,/\.results-tabs,[\s\S]*?\.halieus-results-tabs[\s\S]*?background:\s*var\(--hgr-surface-soft\)/s,"Result tabs must inherit the shared platform tab grammar");
assert.match(css,/HGR 4\.5 shared room creation \/ invite surfaces/,"4.5 must define a shared create\/join\/invite layer");
assert.match(css,/\.halieus-create-panel\.halieus-create-modal,[\s\S]*?\.halieus-join-modal,[\s\S]*?\.invite-lobby-panel-redesigned,[\s\S]*?\.invite-join-card[\s\S]*?background:\s*var\(--hgr-surface-raised\) !important/s,"Create, Join and Invite surfaces must share the same elevated HGR surface");
assert.match(css,/\.halieus-join-games > button[\s\S]*?background:\s*var\(--hgr-surface-soft\) !important/s,"Join game choices must preserve existing artwork inside the shared tile grammar");
assert.match(home,/halieus-join-modal-v452/,"4.5.2 Join Game hub must use the compact rebuilt room-entry surface");
assert.match(home,/Recover an existing seat/,"Recovery must be clearly separated from normal room joining");
assert.match(home,/This reclaims your previous player seat\. It is not needed for a normal room join\./,"Recovery UI must explain when the key is actually required");
assert.match(home,/disabled=\{disabled \|\| !activeRecovery\.trim\(\) \|\| !roomCode\.trim\(\)\}/,"Recovery action must require both a room code and key");
assert.match(release451Css,/\.halieus-join-modal-v452[\s\S]*?width:\s*min\(760px/s,"4.5.2 Join hub must use the compact responsive layout");
assert.match(release451Css,/\.halieus-recovery-panel[\s\S]*?var\(--hgr-surface-soft\)/s,"Recovery must be a contained secondary panel rather than a loose input row");

assert.match(hgrIcons,/\| "chat"/,"Shared HGR icon set must include a room-chat glyph");
assert.match(roomChat,/HgrIcon name="chat"/,"Room activity trigger must use the shared HGR chat glyph");
assert.match(css,/HGR 4\.5 shared communication \/ confirmation surfaces/,"4.5 must define one shared communication-surface layer");
assert.match(css,/\.room-chat-panel[\s\S]*?background:\s*var\(--hgr-surface-raised\) !important/s,"Room chat must inherit the elevated HGR surface");
assert.match(css,/\.halieus-confirm-dialog[\s\S]*?background:\s*var\(--hgr-surface-raised\) !important/s,"Confirmation dialogs must inherit the shared HGR modal surface");
assert.match(css,/\.status-toast,[\s\S]*?\.hgr-toast,[\s\S]*?\.global-game-notice[\s\S]*?background:/s,"Toasts and global notices must share one notification frame");
assert.match(accountPortal,/HalieusBrandMark className="account342-brand-mark"/,"Account entry must use the canonical shared Halieus mark instead of a stale raster");
assert.match(accountPortal,/HgrIcon name=\{isFullscreen \? "minimize" : "fullscreen"\}/,"Account entry fullscreen control must use the shared HGR icon set");
assert.match(css,/HGR 4\.5 shared account-entry \/ ranked surfaces/,"4.5 must define one account-entry and leaderboard layer");
assert.match(css,/\.account342-card[\s\S]*?background:\s*var\(--hgr-surface-raised\) !important/s,"Account entry card must inherit the shared elevated HGR surface");
assert.match(css,/\.leaderboard-modal[\s\S]*?background:\s*var\(--hgr-surface-raised\) !important/s,"All ranked leaderboards must inherit the shared HGR modal surface");

assert.match(accountContracts,/HalieusGamerScoreLeaderboardEntry/,"Gamer Score leaderboard must have a shared typed contract");
assert.match(accountServer,/async function gamerScoreLeaderboard\(viewer: StoredAccount\)/,"Gamer Score ordering must be server-authoritative");
assert.match(accountServer,/account\.visibility !== "hidden" \|\| account\.id === viewer\.id/,"Gamer Score must inherit player-directory visibility rules");
assert.match(accountServer,/\/accounts\/gamer-score\/leaderboard/,"Accounts API must expose Gamer Score independently from game Elo");
assert.match(home,/Gamer Score leaderboard/,"Rankings must show account progression alongside per-game ladders");assert.match(home,/Per-game Elo ladders/,"Rankings must visually separate competitive Elo from Gamer Score progression");
assert.match(rankedFormats,/"connect-four"[\s\S]*?series-elo/,"Connect Four must declare a series-native Ranked model");
assert.match(rankedFormats,/ludo:[\s\S]*?placement-rating/,"Ludo must declare multiplayer placement ranking");
assert.match(rankedFormats,/ayo:[\s\S]*?score-rating/,"Ayo must declare a direct duel ranking model");
assert.match(home,/Ranked series/,"Connect Four Ranked UI must communicate that the competitive unit is a series");
assert.match(home,/connectFourBestOf === 1\) onConnectFourBestOfChange\(3\)/,"Selecting Ranked Connect Four must promote best-of-1 to a real series");
assert.match(home,/disabled=\{connectFourMatchMode === "ranked" && value === 1\}/,"Best-of-1 must be unavailable while Connect Four Ranked is active");
assert.match(home,/Ranked placement/,"Ludo Ranked UI must communicate placement scoring");
assert.match(home,/Ranked duel/,"Ayo must expose a Ranked duel mode");
assert.match(connectFourHandlers,/Ranked Connect Four is human vs human/,"Connect Four server must reject Ranked AI seats");
assert.match(connectFourHandlers,/Ranked Connect Four requires a best-of-3 or best-of-5 series/,"Connect Four server must reject a single-board Ranked result");
assert.match(ludoHandlers,/Ranked Ludo is human-only/,"Ludo server must reject Ranked AI seats");
assert.match(ayoHandlers,/Ranked Ayo is human vs human/,"Ayo server must reject Ranked AI seats");
assert.match(release451Css,/\.halieus-ranked-format-card/,"Ranked format explanation must have an HGR 4.5.2 presentation layer");
assert.match(rankedBoardContracts,/HalieusRankedLeaderboardSnapshot/,"Game-native Ranked standings must have a shared typed snapshot");
assert.match(rankedServer,/getSessionDataDirectory\(\)[\s\S]*?finalized/,"Ranked standings must rebuild from finalized archive truth");
assert.match(rankedServer,/state\.matchMode !== "ranked"/,"Only actual Ranked matches may enter the generic standings");
assert.match(rankedServer,/progressionIdentity\?\.beta/,"Beta play must never enter Ranked standings");
assert.match(rankedServer,/function processConnectFour/,"Connect Four standings must use a dedicated series result processor");
assert.match(rankedServer,/function processLudo/,"Ludo standings must use a dedicated multiplayer placement processor");
assert.match(rankedServer,/function processAyo/,"Ayo standings must use a dedicated duel processor");
assert.match(accountServer,/\/accounts\/ranked\/:game\/leaderboard/,"Accounts API must expose verified game-native Ranked standings");
assert.match(accountServer,/visibleIds\.has\(entry\.accountId\)/,"Ranked standings must respect player visibility");
assert.match(home,/genericRankedSnapshot\.entries\.map/,"Rankings UI must render real verified standings when available");
assert.match(release451Css,/\.halieus-generic-ranked-list/,"Verified Ranked standings must use the 4.5.2 compact list layout");


assert.match(home,/\/accounts\/gamer-score\/leaderboard/,"Rankings UI must load the authoritative Gamer Score board");
assert.match(home,/style=\{\{ background: entry\.playerColor \}\}/,"Player colour may remain on the Gamer Score avatar as identity");
assert.match(release451Css,/\.halieus-gamer-score-list > button[\s\S]*?var\(--hgr-border\)/,"Gamer Score row chrome must inherit the active HGR theme");
assert.doesNotMatch(release451Css,/halieus-gamer-score[^{}]*\{[^}]*var\(--profile-accent\)/,"Gamer Score chrome must not inherit profile colour");

assert.match(theme,/\| "profile" \| "custom"/,"Theme contract must include a scalable profile-library mode");
assert.match(theme,/THEME_PROFILES/,"Theme model must expose a named profile library");
assert.ok((theme.match(/mood: "/g) ?? []).length >= 16,"Theme library must include the coordinated core and retro profile sets");
assert.match(theme,/ivory-8bit[\s\S]*lavender-16bit[\s\S]*black-drive[\s\S]*grey-disc/s,"Theme library must include the four retro console-inspired HGR profiles");
assert.match(html,/ivory-8bit[\s\S]*lavender-16bit[\s\S]*black-drive[\s\S]*grey-disc/s,"First paint must recognise the four retro HGR profiles");
assert.match(themeButton,/Theme Library/,"Primary theme menu must group expressive profiles into a library");
assert.match(themeButton,/QUICK_OPTIONS/,"Primary theme menu must retain a compact quick-choice layer");
assert.match(themeButton,/halieus-theme-custom-launch/,"Custom RGB\/HEX access must remain immediate");
assert.match(display,/Readability/,"Game display settings must expose readability controls");
assert.match(display,/Interface density/,"Game display settings must expose density controls");
assert.match(app,/dataset\.textScale/,"Text size must apply from the shared app root");
assert.match(app,/dataset\.density/,"Density must apply from the shared app root");
assert.match(app,/const activeTabGameId: GameId \| null/,"App must resolve one active game identity for browser-tab presentation");
assert.match(app,/document\.title = `\$\{game\.name\} · Halieus Game Room`/,"Active game must identify itself in the browser title");
assert.match(app,/favicon\.href = game\.icon/,"Active game tab icon must reuse the current approved catalogue SVG");
assert.match(app,/document\.title = "Halieus Game Room"/,"Leaving a game must restore the platform browser title");
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
assert.match(app,/dataset\.skinPokerTable/,"Poker table skins must apply independently from card backs");
assert.match(skinButton,/ratings/,"Contextual cosmetic pickers must still accept authoritative rating context when mounted inside a game");
assert.doesNotMatch(home.slice(home.indexOf('<aside className={`halieus-sidebar'), home.indexOf('</aside>')),/<SkinLibraryButton/,"Home sidebar must not expose the cross-game cosmetic library; cosmetics are contextual");
assert.match(read("server/src/platform/accounts.ts"),/getRankedLeaderboard\(\)/,"Cosmetic rating gates must use authoritative server ratings");
assert.match(skins,/kind: "rating"/,"Cosmetic model must support real rating-gated unlocks");
assert.match(skins,/rating: 1200/,"At least one Mega Board cosmetic must demonstrate a real rating gate");
assert.match(skins,/"poker-table"/,"Poker table aesthetics must have their own cosmetic slot");
assert.match(skins,/unlockContextIsKnown/,"Unknown asynchronous unlock data must not incorrectly unequip a saved cosmetic");
assert.match(skinButton,/Account role does not bypass player progression/,"Normal admin play must not bypass cosmetic unlocks");
assert.match(skinButton,/games without a live rating model use play\/win unlocks/,"Cosmetic UI must not pretend a game has Elo before its rating model is live");assert.match(skins,/previewPalette\?: readonly \[string, string, string, string\]/,"Cosmetic catalog must support palette thumbnails");assert.match(skins,/id: "classic-board"[\s\S]*?previewPalette/,"Mega Board styles must carry palette identity");assert.match(skinButton,/halieus-skin-palette/,"Board cosmetic picker must render palette thumbnails when provided");assert.match(app,/const previousStyle = lobby\.boardStyle \?\? "classic-board"/,"Board style changes must preserve rollback state");assert.match(app,/setLobby\(current => current \? \{ \.\.\.current, boardStyle: style \}/,"Board style selection must update optimistically before the server reply");assert.match(app,/boardStyle: previousStyle/,"Rejected board style changes must roll back cleanly");assert.match(release451Css,/HGR 4\.5\.2 atmosphere and board palettes/);assert.match(release451Css,/\.halieus-shell > \.halieus-game-atmosphere \{[\s\S]*?z-index: 0 !important/,"Ambient motifs must sit above the themed shell canvas");assert.match(release451Css,/html\[data-theme-mode="profile"\] \.halieus-game-atmosphere[\s\S]*?visibility: visible/,"Profile themes must keep game atmosphere visible");assert.match(release451Css,/html\[data-theme-mode="custom"\] \.halieus-game-atmosphere[\s\S]*?opacity: 1/,"Custom themes must keep game atmosphere visible");assert.match(release451Css,/html\[data-theme-mode="profile"\] \.halieus-game-atmosphere span[\s\S]*?color: var\(--hgr-brand\)/,"Profile-theme emblems must inherit the active palette");assert.match(release451Css,/span:nth-child\(3n\+2\)[\s\S]*?color: var\(--hgr-info\)/,"Theme atmospheres must alternate the secondary palette colour");assert.doesNotMatch(release451Css,/html\[data-theme-mode="(?:system|light|dark)"\] \.halieus-game-atmosphere span[\s\S]*?color:/,"System, Light and Dark must preserve the normal game-accent emblem treatment");
assert.match(css,/data-skin-cards="midnight-deck"[\s\S]*?\.poker-card-back/s,"Card skins must visibly affect Poker");
assert.match(css,/data-skin-cards="midnight-deck"[\s\S]*?\.rebuild-card\.is-back/s,"Card skins must visibly affect Blackjack");
assert.match(css,/data-skin-mega-board="night-board"[\s\S]*?\.board-grid/s,"Mega Board skins must visibly affect the board field");
assert.match(css,/data-skin-mega-board="muted-tournament-board"[\s\S]*?\.board-space/s,"Muted Tournament must restyle Mega Board materials without changing geometry");
assert.match(css,/data-skin-mega-board="ivory-8bit-board"[\s\S]*?data-skin-mega-board="grey-disc-board"/s,"Mega Board must expose the full retro surface family");
assert.match(css,/data-skin-poker-table="muted-poker-room"[\s\S]*?\.poker-table/s,"Poker must expose an independent muted table treatment");
assert.match(css,/data-skin-poker-table="ivory-8bit-table"[\s\S]*?data-skin-poker-table="grey-disc-table"/s,"Poker must expose the full retro table family");

assert.match(pokerScreen,/type PokerSideTab = "actions" \| "players" \| "chat"/,"Poker control rail must use tabbed Actions/Players/Chat workspaces");
assert.match(pokerScreen,/className="poker-autopilot-compact"/,"Poker Autopilot must be a compact optional control rather than a permanent large panel");
assert.match(pokerScreen,/className="poker-autopilot-popover"/,"Poker Autopilot detail must open in a compact popover");
assert.match(indexCss,/\.poker-game-shell \{[\s\S]*?height: calc\(100dvh - 118px\)/s,"Desktop Poker must fit its game shell to the viewport");
assert.match(indexCss,/\.poker-side-tab-panel[\s\S]*?overflow: hidden/s,"Poker outer side panel must not become one giant scrolling rail");
assert.match(indexCss,/\.poker-actions-workspace,[\s\S]*?overflow-y: auto/s,"Only the selected Poker tab workspace may scroll when vertical space is constrained");
assert.match(indexCss,/@media \(max-width: 1000px\)[\s\S]*?\.poker-game-shell \{[\s\S]*?min-width: 0 !important/s,"Poker mobile layout must explicitly cancel the old 980px minimum width");
assert.match(indexCss,/\.poker-actions-workspace,[\s\S]*?touch-action: pan-y/s,"Poker selected tab must support touch scrolling without a mouse wheel");

assert.match(guildServer,/membershipSnapshotFor\(membership\.guild\)/,"Guild rooms must freeze membership at room creation so later membership changes cannot rewrite history");
assert.match(guildServer,/allHumanParticipantsWereGuildMembers/,"Guild result ingestion must distinguish full-guild parties from mixed parties");
assert.match(guildServer,/globalA\.rating !== globalB\.rating[\s\S]*?globalB\.rating - globalA\.rating/s,"Guild standings must be informed by the real global rating when available");
assert.match(guildPanel,/Global rank comes from HGR's live Mega Board Ranked table/,"Guild leaderboard UI must explain its global source of truth");
assert.match(guildPanel,/Guild result · counts internally/,"Guild room history must mark fully eligible internal results");
assert.match(guildPanel,/Mixed party · global only/,"Guild room history must mark mixed-party results as global-only");
assert.match(pokerScreen,/type PokerSideTab = "actions" \| "players" \| "chat"/,"Poker must expose Actions/Players/Chat as one side-tab workspace");
assert.match(pokerScreen,/className="poker-autopilot-compact"/,"Poker Autopilot must be compact instead of consuming a permanent sidebar card");
assert.match(pokerScreen,/className="poker-autopilot-popover"/,"Poker Autopilot options must open on demand");
assert.match(pokerScreen,/sideTab === "chat"[\s\S]*?poker-room-panel-slot is-tabbed/s,"Poker room activity must live inside the Chat tab");
assert.match(pokerScreen,/sideTab === "players"[\s\S]*?poker-side-players/s,"Poker player roster must live inside the Players tab");
assert.match(pokerScreen,/if \(state\.isSpectator && sideTab === "actions"\) setSideTab\("players"\)/,"Spectators must never be stranded on a disabled Actions tab");
assert.match(indexCss,/HGR 4\.5 Poker tabbed control rail/,"Poker tabbed rail must have one authoritative 4.5 layout layer");
assert.match(indexCss,/\.poker-side-tab-panel \{[\s\S]*?overflow:\s*hidden/s,"Poker sidebar shell must stay contained while selected workspace owns scrolling");
assert.match(indexCss,/\.poker-actions-workspace,[\s\S]*?overflow-y:\s*auto/s,"Poker selected workspace must provide internal scrolling when viewport height is constrained");
assert.match(indexCss,/@media \(min-width: 1001px\)[\s\S]*?height:\s*calc\(100dvh - 118px\)/s,"Desktop Poker table and side rail must fit the viewport rather than requiring page-wheel access");
assert.match(megaGameMenu,/Locked for this match/,"Live Mega timer must be read-only");
assert.match(app,/socket\.emit\("game:start",[\s\S]*?setGameState\(response\.state\)[\s\S]*?setGameStarted\(true\)/,"Mega Board host must enter play from the authoritative start acknowledgement");
assert.match(megaLobbyHandlers,/Cosmetics must never block gameplay/,"Mega Board room creation must fall back safely when cosmetic state cannot be read");
assert.match(megaLobbyHandlers,/socket\.join\(code\);[\s\S]*?const publicRoom = toPublicGameRoom\(room\)/,"Mega Board start must self-heal host Socket.IO room membership before broadcasts");
assert.match(read("client/src/games/mega-board/components/LobbyScreen.tsx"),/TURN_TIMER_PRESET_SECONDS.map/,"Pregame timer uses approved presets");
assert.match(megaTurnHandlers,/room.hostId !== socket.id/,"Only host may configure pregame timer");
assert.match(megaTurnHandlers,/room.started \|\| room.gameState/,"Server locks settings after start");
assert.doesNotMatch(megaTurnHandlers,/turnRollDeadline = Date.now/,"Timer edits cannot restart an active deadline");
assert.match(guildContracts,/HalieusGuildMembershipSnapshotEntry/,"Guild rooms must support a frozen membership snapshot for historical classification");
assert.match(guildContracts,/allHumanParticipantsWereGuildMembers/,"Guild room history must record whether the complete human party belonged to the guild");
assert.match(guildContracts,/globalRanks: HalieusGuildGlobalRank\[\]/,"Guild leaderboard entries must carry real global ranking context separately from internal results");
assert.match(guildServer,/getRankedLeaderboard\(\)/,"Guild standings must consume the real Mega Board global leaderboard");
assert.match(guildServer,/normaliseRankedPlayerKey/,"Guild/global ranking matching must use the same canonical Mega Board ranked identity");
assert.match(guildServer,/membershipSnapshot: membershipSnapshotFor\(membership\.guild\)/,"Guild membership context must be frozen before a guild room result can be classified");
assert.match(guildServer,/allHumanParticipantsWereGuildMembers = participants\.length > 0[\s\S]*?matchedParticipantIds\.length === participants\.length/s,"Mixed-party rooms must not count as all-guild internal matches");
assert.match(guildServer,/if \(!allGuild\) return false/,"Guild-only statistics must exclude mixed-party matches");
assert.match(guildServer,/globalB\.rating - globalA\.rating/,"Real global rating must inform guild standings when available");
assert.match(guildPanel,/Global rank comes from HGR's live Mega Board Ranked table/,"Guild UI must explain the current global ranking source");
assert.match(guildPanel,/Guild W\/L/,"Guild UI must keep internal win-loss record separate from global rating");
assert.match(guildPanel,/No separate guild Elo is created/,"Guild UI must not imply a second independent Elo system");


// 4.5 board/table refinement must remain a paint-only layer over the approved
// Mega Board geometry and Poker tab/scroll structure.
assert.match(clientEntry,/hgr-design-v1\.css";\s*import "\.\/styles\/hgr-game-surfaces-v45\.css"/,"Game-surface refinement must load after the shared HGR design system");
assert.match(clientEntry,/hgr-part17\.css";\s*import "\.\/styles\/hgr-4\.5\.1\.css"/,"4.5.1 release overrides must load after legacy Part 17 cascade layers");
for (const skinId of [
  "classic-board",
  "muted-tournament-board",
  "night-board",
  "transit-board",
  "tycoon-board",
  "ivory-8bit-board",
  "lavender-16bit-board",
  "black-drive-board",
  "grey-disc-board",
]) {
  assert.ok(surfaceCss.includes(`data-skin-mega-board="${skinId}"`), `Mega Board surface refinement must cover ${skinId}`);
}
for (const skinId of [
  "classic-felt",
  "muted-poker-room",
  "ivory-8bit-table",
  "lavender-16bit-table",
  "black-drive-table",
  "grey-disc-table",
]) {
  assert.ok(surfaceCss.includes(`data-skin-poker-table="${skinId}"`), `Poker table surface refinement must cover ${skinId}`);
}
assert.match(surfaceCss,/\.mega-live-page \.board-frame[\s\S]*?--mega-frame-material/s,"Mega Board frame must consume the 4.5 material system");
assert.match(surfaceCss,/\.mega-live-page \.board-centre-authentic[\s\S]*?--mega-centre-material/s,"Mega Board centre must consume the 4.5 material system");
assert.match(surfaceCss,/\.poker-page \.poker-table-wrap[\s\S]*?--poker-room-material/s,"Poker room rail must consume the 4.5 table material system");
assert.match(surfaceCss,/\.poker-page \.poker-seat\.is-turn[\s\S]*?--poker-accent/s,"Poker active seat must inherit the selected table cosmetic");
assert.doesNotMatch(surfaceCss,/data-theme=/,"Game-surface cosmetics must stay independent from platform theme selection");
assert.doesNotMatch(surfaceCss,/\.(?:poker-game-shell|poker-side-tab-panel|poker-actions-workspace|mega-live-layout-v3|game-layout|player-rail)\b/,"Surface refinement must not take ownership of approved layout or Poker scroll containers");
assert.doesNotMatch(
  surfaceCss,
  /(?:^|[;{]\s*)(?:display|position|width|min-width|max-width|height|min-height|max-height|grid-template(?:-columns|-rows)?|grid-row|grid-column|padding|margin|overflow(?:-x|-y)?|top|right|bottom|left|z-index|touch-action)\s*:/m,
  "4.5 surface refinement must remain paint-only and must not alter geometry or scroll ownership",
);

assert.match(surfaceCss,/HGR 4\.5 tactile object refinement/,"4.5 must include the tactile object refinement layer");
assert.match(surfaceCss,/\.mega-live-page \.property-colour-strip[\s\S]*?filter:\s*saturate\(1\.05\)/s,"Mega Board property groups must gain material depth without recolouring their gameplay identity");
assert.match(surfaceCss,/\.mega-live-page \.development-piece\.is-hotel,[\s\S]*?--mega-accent/s,"Mega Board developed properties must retain readable depth across board skins");
assert.match(surfaceCss,/\.poker-page \.poker-card-face[\s\S]*?linear-gradient/s,"Poker card faces must remain neutral and legible against all table skins");
assert.match(surfaceCss,/\.poker-page \.poker-card-back[\s\S]*?--poker-accent/s,"Poker card backs must gain separation without replacing the independent card-back cosmetic");
assert.match(surfaceCss,/\.poker-page \.poker-table-wrap[\s\S]*?--hgr-brand/s,"Poker neutral room chrome must inherit the active HGR theme profile");
assert.match(surfaceCss,/\.mega-live-page \.board-frame[\s\S]*?--hgr-brand/s,"Mega Board neutral frame chrome must inherit the active HGR theme profile");

// 4.5.1 Mega Board polish and platform profile/rankings continuation.
assert.match(home,/type HomeView = "home" \| "games" \| "players" \| "rankings" \| "guilds"/,"Global Rankings must be a first-class platform destination");
assert.match(home,/HgrIcon name="leaderboard"/,"Rankings navigation must use the shared HGR icon family");
assert.match(theme,/xbox-core[\s\S]*?ps2-midnight[\s\S]*?snes-colour[\s\S]*?neo-arcade/s,"Retro profile expansion must include console, SNES colour and arcade-inspired palettes");
assert.match(html,/xbox-core[\s\S]*?snes-colour[\s\S]*?neo-arcade/s,"Expanded retro profiles must be recognised on first paint");
assert.match(theme,/surfaceDark[\s\S]*?"--hgr-text": text/s,"Custom theme foregrounds must derive from surface luminance");
assert.match(themeButton,/halieus-theme-profile-motif/,"Theme Library must expose subtle hardware colour motifs without relying on controller symbols");
assert.match(megaLobby,/Board appearance[\s\S]*?SkinLibraryButton[\s\S]*?slots=\{\["mega-board"\]\}/s,"Mega Board lobby must own contextual board cosmetics");
assert.match(home,/BOARD APPEARANCE[\s\S]*?SkinLibraryButton[\s\S]*?slots=\{\["mega-board"\]\}/s,"Mega Board create-room flow must expose board appearance before play");
assert.match(megaDice,/doublesStage[\s\S]*?Third double · Jail/s,"Mega Board dice overlay must communicate escalating doubles risk");
assert.match(megaBoard,/expiringBusTicketsRemaining[\s\S]*?Bus Ticket deck/s,"Bus Ticket deck must expose remaining expiry-ticket inventory without revealing order");
assert.match(megaLeaderboard,/\[entries\[1\], entries\[0\], entries\[2\]\]/,"Mega Board leaderboard must render a true 2nd/1st/3rd podium order");
assert.match(megaLeaderboard,/leaderboard-podium-avatar[\s\S]*?entry.profilePicture[\s\S]*?entry.avatar/s,"Ranked podium must use player profile pictures with identity fallback");

/* Poker-standard lobby grammar: one hierarchy across all 14 active games. */
assert.match(surfaceCss,/data-theme-mode="blue"[\s\S]*?data-theme-mode="profile"[\s\S]*?data-theme-mode="custom"[\s\S]*?\.mega-live-page \.board-grid/s,"Board skins must tint with explicit HGR themes");
assert.doesNotMatch(surfaceCss,/data-theme-mode="system"[\s\S]*?\.mega-live-page \.board-grid/s,"System theme must preserve authored board palettes");
assert.match(css,/Explicit themes tint board-style preview palettes[\s\S]*?--skin-source-colour[\s\S]*?var\(--hgr-brand\)/s,"Board-style preview palettes must follow the active explicit theme");
assert.match(skinButton,/--skin-source-colour/,"Skin previews must expose authored colours through theme-tintable CSS variables");
assert.match(css,/HGR Part 20 — Poker-standard pre-game lobby grammar/,"Shared Poker-standard lobby CSS contract missing");
assert.match(css,/\.card-game-lobby,[\s\S]*?\.rebuild-lobby-layout,[\s\S]*?\.classic-lobby-layout,[\s\S]*?\.word-arena-lobby,[\s\S]*?\.hgr-standard-lobby-grid/,"All shared lobby families must use the Poker-standard two-column geometry");
assert.match(css,/grid-template-columns:\s*minmax\(360px,\s*\.9fr\)\s*minmax\(420px,\s*1\.1fr\)/,"Shared lobby geometry must preserve Poker's setup-left / roster-right balance");
assert.match(megaLobby,/hgr-standard-lobby-grid mega-standard-lobby-grid/,"Mega Board lobby must opt into the Poker-standard room grid");
assert.match(megaLobby,/hgr-standard-lobby-card mega-standard-lobby-card[\s\S]*?lobby-ai-quick-controls[\s\S]*?hgr-standard-lobby-roster/s,"Mega Board must keep setup/AI controls on the left and the seat roster on the right");
for (const [name, source, selector] of [
  ["Poker", pokerScreen, "poker-lobby-shell"],
  ["Ludo", ludoScreen, "card-game-lobby"],
  ["Ayo", ayoScreen, "card-game-lobby"],
  ["Connect Four", connectFourScreen, "card-game-lobby"],
  ["Hidden Dictator", hiddenDictatorScreen, "card-game-lobby"],
  ["Word Board", wordBoardScreen, "card-game-lobby"],
  ["Blackjack", blackjackRebuild, "rebuild-lobby-layout"],
  ["WHOT", whotRebuild, "rebuild-lobby-layout"],
  ["Cheat / Dominoes", classicTableScreen, "classic-lobby-layout"],
  ["Word Game / Password / Anagrams Race", wordArenaScreen, "word-arena-lobby"],
]) assert.ok(source.includes(selector), `${name} must remain on the shared Poker-standard lobby family`);
assert.match(accountPanel,/Gamer Score[\s\S]*?Achievements[\s\S]*?Verified games/s,"Player profile headline must be accomplishment-first rather than win-rate-first");
assert.match(release451Css,/HGR 4\.5\.1/,"Mega Board 4.5.1 final cascade contract must remain explicit");
assert.match(release451Css,/is-doubles-stage-1[\s\S]*?is-doubles-stage-2[\s\S]*?is-doubles-stage-3/s,"Doubles escalation must retain three visible warning stages");
assert.match(release451Css,/board-deck-chance[\s\S]*?board-deck-community[\s\S]*?board-deck-bus/s,"Chance, Community and Bus Ticket must keep distinct board identity");
assert.match(release451Css,/body:has\(\.room-chat-shell\.is-floating\)/,"Floating Room activity must reserve shared layout clearance instead of colliding with game content");

console.log("HGR 4.5 platform identity/theme/skins foundation regression: PASS");
