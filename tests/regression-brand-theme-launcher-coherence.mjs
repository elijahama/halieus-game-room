import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const home=read("client/src/platform/components/HomeScreen.tsx");
const brand=read("client/src/platform/components/HalieusBrandMark.tsx");
const icons=read("client/src/platform/components/HgrIcon.tsx");
const theme=read("client/src/platform/theme.ts");
const css=read("client/src/styles/hgr-design-v1.css");
const shortcuts=read("scripts/windows/launcher-shortcuts.ps1");
const packagedShortcuts=read("server/launcher-shortcuts.ps1");
const guilds=read("client/src/platform/components/GuildsPanel.tsx");
const updater=read("Update HGR GitHub.cmd");
const brandContract=read("shared/platform/brand.ts");
const flatGenerator=read("scripts/generate-flat-brand.mjs");
const logoReference=read("assets/branding/references/HGR_LOGO_SYSTEM_REFERENCE.md");
const iconPalette=read("assets/branding/references/HGR_ICON_PALETTE.md");
const postUpdateClient=read("scripts/windows/post-update-client.ps1");
const mainIdentityGenerator=read("scripts/generate-platform-icons.mjs");

assert.match(home,/HalieusBrandMark/,"Home chrome must use the shared Halieus mark");
assert.match(home,/HgrIcon name="chevron-left"/,"Featured previous control must use the shared SVG chevron");
assert.match(home,/HgrIcon name="chevron-right"/,"Featured next control must use the shared SVG chevron");
assert.match(icons,/case "chevron-left"/,"Shared icon set must include a left chevron");
assert.match(icons,/case "chevron-right"/,"Shared icon set must include a right chevron");
assert.match(brand,/halieus-brand-mark-tile/,"Shared Halieus mark must expose a themeable tile");
assert.match(brand,/halieus-brand-mark-h/,"Shared Halieus mark must expose a themeable H");
assert.match(brandContract,/M13 16H28L25 20V30H39V20L36 16H51L48 20V44L51 48H36L39 44V35H25V44L28 48H13L16 44V20Z/,"Canonical H must use the approved launcher-family flared geometry");
assert.match(iconPalette,/HGR Control[\s\S]*?#4F7BFE/,"Reference palette must reserve royal blue for HGR Control");
assert.match(iconPalette,/Update[\s\S]*?#38BDF8/,"Reference palette must keep Update light blue");
assert.match(iconPalette,/OpenShard[\s\S]*?#A855F7/,"Reference palette must keep OpenShard purple");
assert.doesNotMatch(flatGenerator,/root, 'launcher'/,"Website flat-brand generator must not manufacture launcher artwork");
assert.match(logoReference,/HGR ICON - CONTROL UPDATE/i,"Brand reference must preserve the saved CONTROL UPDATE H");

assert.match(theme,/"--hgr-action-bg": action/,"Custom themes must derive a solid action colour");
assert.match(theme,/"red" \\| "green" \\| (?:"profile" \\| )?"custom"/,"Theme contract must include dedicated Red/Green compatibility and the profile library");
assert.match(theme,/"--hgr-action-ink": brandInk/,"Custom action contrast must be derived from the selected action colour");
assert.match(css,/\.button-primary,[\s\S]*?\.halieus-global-join[\s\S]*?background:\s*var\(--hgr-action-bg\) !important/s,"Primary actions must use one solid theme action colour");
const primaryActionSection = css.match(/\/\* Primary actions are flat theme actions\.[\s\S]*?\*\/([\s\S]*?)\/\* Carousel controls:/)?.[1] ?? "";
assert.ok(primaryActionSection,"Primary action coherence section must remain present");
assert.doesNotMatch(primaryActionSection,/linear-gradient/,"Current primary action override must not reintroduce gradient banding");
assert.match(css,/\.halieus-feature-arrow[\s\S]*?place-items:\s*center !important/s,"Featured arrows must use layout centring");
assert.match(css,/\.halieus-feature-card-stage > img,[\s\S]*?box-shadow:\s*none !important/s,"Featured artwork must not use a square glow");
assert.match(css,/html\[data-theme="dark"\][\s\S]*?--hgr-page:\s*#101114[\s\S]*?--mm-page:\s*var\(--hgr-page\)/s,"Dark mode must bridge HGR and legacy surfaces to the same graphite canvas");
assert.match(css,/html\[data-theme="light"\][\s\S]*?--hgr-action-bg:\s*var\(--hgr-gold\)/s,"Light mode must preserve the canonical saturated HGR gold action colour");
assert.match(css,/html\[data-theme="red"\][\s\S]*?--hgr-page:\s*#170d10/s,"Red profile must recolour the complete workspace");
assert.match(css,/html\[data-theme="green"\][\s\S]*?--hgr-page:\s*#0d1712/s,"Green profile must recolour the complete workspace");
assert.match(css,/\.halieus-avatar-media,[\s\S]*?overflow:\s*hidden !important[\s\S]*?aspect-ratio:\s*1 \/ 1/s,"Player pictures must use one clipped square frame");
assert.match(css,/\.halieus-avatar-media > img,[\s\S]*?object-fit:\s*cover !important[\s\S]*?object-position:\s*center !important/s,"Uploaded player pictures must use the same centred cover crop everywhere");
assert.match(css,/\.halieus-side-account > \.halieus-avatar-media[\s\S]*?width:\s*40px !important[\s\S]*?border-radius:\s*12px !important/s,"Sidebar profile picture must stay compact and aligned with the platform identity system");

for (const name of ["HGR - Start.lnk","HGR - Restart.lnk","HGR - Close.lnk","HGR - Update Site.lnk","HGR - PowerShell.lnk","HGR - OpenShard TUI.lnk","HGR - Control.lnk","HGR - Stop Control.lnk"]) {
  assert.ok(shortcuts.includes(name),`Launcher shortcut family must include ${name}`);
}
assert.match(shortcuts,/Close the local Halieus Game Room desktop app window only/,"Close shortcut must state that it only closes the local app window");
assert.match(shortcuts,/OpenShard-HGR\.cmd/,"OpenShard shortcut must route through the HGR helper rather than calling a global tool blindly");
assert.match(shortcuts,/openshard\.ico/,"OpenShard must have its own dedicated launcher-art path");
assert.match(shortcuts,/RuntimeLauncherIconRoot/,"Shortcut refresh must use runtime ICO exports from approved reference PNGs");
assert.match(shortcuts,/ControlIconPath/,"HGR Control must have its own icon path");
assert.match(shortcuts,/Start HGR Control\.cmd/,"HGR Control shortcut must route to the canonical background Control launcher");
assert.doesNotMatch(shortcuts,/ControlMobile = 'HGR - Control Mobile\.lnk'/,"Launcher set must not duplicate HGR Control as Control Mobile");
assert.match(shortcuts,/\$openShard\.IconLocation = "\$OpenShardIconPath,0"/,"OpenShard shortcut must use its dedicated resolved icon variable");
assert.match(shortcuts,/HGR - Control\.lnk/,"Launcher family must expose one HGR Control launcher");
assert.match(shortcuts,/HGR - Stop Control\.lnk/,"Launcher family must expose one Stop Control launcher");
assert.match(shortcuts,/ProjectLauncherDirectory = Join-Path \$ProjectRoot 'HGR Launchers'/,"Developer shortcuts must share one HGR Launchers folder");
assert.match(shortcuts,/StartMenuLauncherDirectory = Join-Path \$ProgramsRoot 'Halieus Game Room'/,"Start Menu shortcuts must share one Halieus Game Room folder");
assert.match(shortcuts,/ tui`""/,"OpenShard shortcut must open the receipt dashboard/TUI");
assert.match(packagedShortcuts,/Close HGR App\.lnk/,"Packaged launcher must use the same Close HGR App wording");
assert.match(packagedShortcuts,/desktop app window only/,"Packaged Close shortcut must not imply cloud shutdown");
assert.match(postUpdateClient,/function Test-HgrVisibleAppWindow/,"Post-update handoff must distinguish a visible HGR app window from background Edge processes");
assert.match(postUpdateClient,/MainWindowHandle -ne 0/,"Only a visible dedicated Edge app window may suppress post-update launch");
assert.match(postUpdateClient,/No visible dedicated HGR app window was found\. Opening HGR/,"A successful update must explicitly open HGR when no visible app window exists");
assert.match(postUpdateClient,/Wait-HgrVisibleAppWindow/,"Post-update Start/Restart must verify that a visible HGR window actually appeared");
assert.match(postUpdateClient,/Get-Command cmd\.exe -ErrorAction Stop/,"Post-update handoff must invoke batch launchers through cmd.exe");
assert.match(mainIdentityGenerator,/assets\/branding\/references\/HGR Main\.png/,"Main HGR reference export must be regenerated from the canonical H");
assert.doesNotMatch(mainIdentityGenerator,/HGR Start\.png|HGR Restart\.png|HGR Close\.png|HGR Update\.png|HGR PowerShell\.png|HGR OpenShard\.png|HGR Control Launcher\.png/,"Main identity regeneration must never rewrite role-specific utility art");

const recoveryStart=updater.indexOf('for /f "delims=" %%F in (\'git ls-tree -r --name-only HEAD -- "assets/branding/references"\') do (');
assert.ok(recoveryStart >= 0,"Updater must repair missing protected launcher/reference assets after autostash");
assert.ok(recoveryStart < updater.indexOf("STEP 2 - Preparing release identity"),"Protected-brand recovery must run before release preparation");
assert.match(updater,/for %%F in \("assets\/branding\/Halieus Game Room\.ico" "assets\/branding\/Halieus Game Room\.png"\) do \(/,"Updater must protect the canonical base brand assets");
assert.match(updater,/git ls-tree -r --name-only HEAD -- "assets\/branding\/references"/,"Updater must protect the approved reference PNG inventory from the current tracked HEAD");
assert.doesNotMatch(updater,/assets\/branding\/launchers/,"Updater must not resurrect the removed duplicate launcher-art folder");
assert.match(updater,/if not exist "%%F"[\s\S]*?git restore --source=HEAD --staged --worktree -- "%%F"/,"Updater must restore only missing tracked protected assets");
assert.match(updater,/:PAUSE_EXIT[\s\S]*?git restore --staged --worktree -- RELEASE\.json shared\/release\.ts/s,"Failed update runs must clean generated release identity before exiting");

assert.match(guilds,/id: "members", label: "Members", icon: "players"/,"Guild Members tab must use the shared HGR players SVG icon");
assert.match(guilds,/<HgrIcon name=\{tab\.icon\} size=\{16\} \/>/,"Guild tabs must render through the shared HGR icon system");
assert.doesNotMatch(guilds,/👥 Members|💬 Chat|🏆 Leaderboard|🎲 Rooms/,"Guild tabs must not depend on platform-specific emoji glyphs");
assert.match(guilds,/className="halieus-guild-member-row"[\s\S]*?player=\{\{[\s\S]*?profilePicture: member\.profilePicture[\s\S]*?playerColor: member\.playerColor/,"Guild member rows must use the shared player identity component and real HGR profile artwork");
assert.match(guilds,/halieus-guild-heading-actions/,"Guild Join/Create actions must live in the page heading");
assert.doesNotMatch(guilds,/<div className="halieus-guild-actions">/,"Guild landing must not render a second full-width setup bar");
assert.match(guilds,/setGuildAction\("join"\)/,"Guild heading must open the Join modal");
assert.match(guilds,/setGuildAction\("create"\)/,"Guild heading must open the Create modal");

console.log("HGR brand, theme and launcher coherence regression: PASS");
