import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const readBytes=(path)=>readFileSync(new URL(`../${path}`,import.meta.url));
const gitBlobSha=(path)=>{
  const bytes=readBytes(path);
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
};

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
const indexCss=read("client/src/index.css");
const surfaceCss=read("client/src/styles/hgr-game-surfaces-v45.css");
const clientEntry=read("client/src/main.tsx");
const gameChrome=read("client/src/platform/components/GameChrome.tsx");
const roomChat=read("client/src/platform/components/RoomChatPanel.tsx");
const hgrIcons=read("client/src/platform/components/HgrIcon.tsx");
const accountPortal=read("client/src/platform/accounts/AccountPortal.tsx");
const pokerScreen=read("client/src/games/poker/PokerScreen.tsx");
const megaGameMenu=read("client/src/games/mega-board/components/GameMenu.tsx");
const megaGameRules=read("shared/games/mega-board/game-rules.ts");
const megaTurnHandlers=read("server/src/games/mega-board/handlers/turnHandlers.ts");
const guildContracts=read("shared/platform/guilds.ts");
const guildServer=read("server/src/platform/guilds.ts");
const guildPanel=read("client/src/platform/components/GuildsPanel.tsx");
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

assert.match(brand,/halieus-brand-mark-h-shape/,"4.5 H must use the approved shared slab silhouette");
assert.doesNotMatch(brand,/halieus-brand-mark-h-pillar|halieus-brand-mark-h-bridge/,"Retired faceted H geometry must not return");
assert.match(modelSheet,/Platform first; games inherit/,"Model sheet must formalise platform-first inheritance");
assert.match(modelSheet,/approved H utility family/,"Model sheet must document the approved H construction");
assert.match(modelSheet,/yellow\/gold as the default Halieus brand colour/,"Model sheet must preserve yellow/gold as the standard Halieus identity");
assert.match(halieusMark,/M12 12h17v5h-4v12h14V17h-4v-5h17v5h-5v30h5v5H35v-5h4V35H25v12h4v5H12v-5h5V17h-5z/,"Canonical public Halieus mark must use the approved H geometry");
assert.match(html,/id="halieus-dynamic-favicon"[^>]+href="\/halieus-mark\.svg"/,"Initial browser identity must use the canonical Halieus mark");
assert.match(html,/halieus-boot-mark[\s\S]*?M12 12h17v5h-4v12h14V17h-4v-5h17v5h-5v30h5v5H35v-5h4V35H25v12h4v5H12v-5h5V17h-5z/,"First-paint mark must reuse the approved H geometry");
assert.match(app,/function makeHalieusTabGlyph/,"Platform tab identity must use the compact Halieus H glyph");
assert.match(app,/getPropertyValue\("--hgr-brand"\)/,"Platform tab H must derive its colour from the saved theme");
assert.match(app,/getPropertyValue\("--hgr-brand-ink"\)/,"Platform tab H must derive its outline contrast from the saved theme");
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
  "assets/branding/launchers/Start Halieus Game Room.svg": "a9c64ad6b389cfdde7812f6d92d844897790e714",
  "assets/branding/launchers/Restart Halieus Game Room.svg": "10ffaae53a8aae13c0c6da14610f9b692964a1a1",
  "assets/branding/launchers/Close Halieus Game Room.svg": "e3fdd2bc4b388273cf2d03e6111a99fed48b0144",
  "assets/branding/launchers/HGR PowerShell.svg": "d1765b8ceaf8893cfbed5d29f51b814348f7ab33",
  "assets/branding/launchers/HGR OpenShard TUI.svg": "d8e600e2004bff0450a495a3c6abc971d9b3c398",
  "assets/branding/launchers/Update Halieus Website.svg": "99e82375a762dbdf3981a1ca05593c7df6821197",
};
for (const [asset, expected] of Object.entries(approvedLauncherBlobs)) {
  assert.equal(gitBlobSha(asset), expected, `Approved reference-based launcher icon changed unexpectedly: ${asset}`);
}

assert.match(previewGenerator,/generated-preview/,"Generated launcher experiments must stay quarantined from approved assets");
assert.doesNotMatch(previewGenerator,/Remove-Item[\s\S]*?assets\\branding\\launchers(?!\\generated-preview)/s,"Preview generation must never delete approved launcher icons");
assert.doesNotMatch(launcherShortcuts,/generate-launcher-icons\.ps1/,"Shortcut refresh must never invoke artwork generation");
assert.doesNotMatch(launcherShortcuts,/launchers\\\\matte/,"Retired nested launcher folder must not return");
for (const launcherName of ["Start Halieus Game Room.ico","Restart Halieus Game Room.ico","Close Halieus Game Room.ico","HGR PowerShell.ico"]) {
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

assert.match(theme,/\| "profile" \| "custom"/,"Theme contract must include a scalable profile-library mode");
assert.match(theme,/THEME_PROFILES/,"Theme model must expose a named profile library");
assert.ok((theme.match(/mood: "/g) ?? []).length >= 16,"Theme library must include the coordinated core and retro profile sets");
assert.match(theme,/ivory-8bit[\s\S]*lavender-16bit[\s\S]*black-drive[\s\S]*grey-disc/s,"Theme library must include the four retro console-inspired HGR profiles");
assert.match(html,/ivory-8bit[\s\S]*lavender-16bit[\s\S]*black-drive[\s\S]*grey-disc/s,"First paint must recognise the four retro HGR profiles");
assert.match(themeButton,/Theme Library/,"Primary theme menu must group expressive profiles into a library");
assert.match(themeButton,/QUICK_OPTIONS/,"Primary theme menu must retain a compact quick-choice layer");
assert.match(themeButton,/halieus-theme-custom-launch/,"Custom RGB\/HEX access must remain immediate");
assert.match(display,/Text & density/,"Game display settings must expose readability controls");
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
assert.match(app,/normaliseRankedPlayerKey/,"Cosmetic rating unlocks must resolve against the existing Mega Board ranked identity");
assert.match(home,/ratings=\{skinRatings\}/,"Skin Library must receive real game rating context from the app");
assert.match(skins,/kind: "rating"/,"Cosmetic model must support real rating-gated unlocks");
assert.match(skins,/rating: 1200/,"At least one Mega Board cosmetic must demonstrate a real rating gate");
assert.match(skins,/"poker-table"/,"Poker table aesthetics must have their own cosmetic slot");
assert.match(skins,/unlockContextIsKnown/,"Unknown asynchronous unlock data must not incorrectly unequip a saved cosmetic");
assert.match(skinButton,/Account role does not bypass player progression/,"Normal admin play must not bypass cosmetic unlocks");
assert.match(skinButton,/games without a live rating model use play\/win unlocks/,"Cosmetic UI must not pretend a game has Elo before its rating model is live");
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
assert.match(megaGameMenu,/turn-timer-settings-panel/,"Mega Board game menu must expose the live host turn timer selector");
assert.match(megaGameMenu,/TURN_TIMER_PRESET_SECONDS\.map/,"Mega Board timer UI must use the shared approved preset list");
assert.match(megaGameMenu,/isHost && onTurnTimerChange/,"Only the Mega Board room host may edit the live turn timer");
assert.match(megaGameRules,/TURN_TIMER_PRESET_SECONDS = \[30, 45, 60, 90, 120, 150, 180, 300\]/,"Mega Board turn timer presets must remain explicit and predictable");
assert.match(megaTurnHandlers,/socket\.on\(\s*"game:set-turn-timer"/s,"Mega Board server must own turn-timer changes");
assert.match(megaTurnHandlers,/room\.hostId !== socket\.id/,"Mega Board server must reject non-host timer changes");
assert.match(megaTurnHandlers,/gameState\.turnTimerSeconds = seconds/,"Mega Board timer changes must update authoritative match state");
assert.match(megaTurnHandlers,/turnRollDeadline = Date\.now\(\) \+ seconds \* 1000/,"Changing the timer must restart the current eligible human roll window at the new duration");
assert.match(megaTurnHandlers,/Turn Timer Updated/,"Mega Board timer changes must be announced to the room");
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

console.log("HGR 4.5 platform identity/theme/skins foundation regression: PASS");
