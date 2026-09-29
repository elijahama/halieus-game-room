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

assert.match(home,/HalieusBrandMark/,"Home chrome must use the shared Halieus mark");
assert.match(home,/HgrIcon name="chevron-left"/,"Featured previous control must use the shared SVG chevron");
assert.match(home,/HgrIcon name="chevron-right"/,"Featured next control must use the shared SVG chevron");
assert.match(icons,/case "chevron-left"/,"Shared icon set must include a left chevron");
assert.match(icons,/case "chevron-right"/,"Shared icon set must include a right chevron");
assert.match(brand,/halieus-brand-mark-tile/,"Shared Halieus mark must expose a themeable tile");
assert.match(brand,/halieus-brand-mark-h/,"Shared Halieus mark must expose a themeable H");

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

for (const name of ["HGR - Start.lnk","HGR - Restart.lnk","HGR - Close.lnk","HGR - Update Site.lnk","HGR - PowerShell.lnk","HGR - OpenShard TUI.lnk"]) {
  assert.ok(shortcuts.includes(name),`Launcher shortcut family must include ${name}`);
}
assert.match(shortcuts,/Close the local Halieus Game Room desktop app window only/,"Close shortcut must state that it only closes the local app window");
assert.match(shortcuts,/OpenShard-HGR\.cmd/,"OpenShard shortcut must route through the HGR helper rather than calling a global tool blindly");
assert.match(shortcuts,/openshard\.ico/,"OpenShard must have its own dedicated launcher-art path");
assert.match(shortcuts,/OpenShardIconPath = Resolve-HalieusIconPath[\s\S]*?-Fallback \$PowerShellIconPath/,"OpenShard may fall back safely until its dedicated ICO is generated");
assert.match(shortcuts,/\$openShard\.IconLocation = "\$OpenShardIconPath,0"/,"OpenShard shortcut must use its dedicated resolved icon variable");
assert.match(shortcuts,/ProjectLauncherDirectory = Join-Path \$ProjectRoot 'HGR Launchers'/,"Developer shortcuts must share one HGR Launchers folder");
assert.match(shortcuts,/StartMenuLauncherDirectory = Join-Path \$ProgramsRoot 'Halieus Game Room'/,"Start Menu shortcuts must share one Halieus Game Room folder");
assert.match(shortcuts,/ tui`""/,"OpenShard shortcut must open the receipt dashboard/TUI");
assert.match(packagedShortcuts,/Close HGR App\.lnk/,"Packaged launcher must use the same Close HGR App wording");
assert.match(packagedShortcuts,/desktop app window only/,"Packaged Close shortcut must not imply cloud shutdown");

const recoveryStart=updater.indexOf('for /f "delims=" %%F in (\'git ls-tree -r --name-only HEAD -- "assets/branding/launchers" "assets/branding/references"\') do (');
assert.ok(recoveryStart >= 0,"Updater must repair missing protected launcher/reference assets after autostash");
assert.ok(recoveryStart < updater.indexOf("STEP 2 - Preparing release identity"),"Protected-brand recovery must run before release preparation");
assert.match(updater,/for %%F in \("assets\/branding\/Halieus Game Room\.ico" "assets\/branding\/Halieus Game Room\.png"\) do \(/,"Updater must protect the canonical base brand assets");
assert.match(updater,/git ls-tree -r --name-only HEAD -- "assets\/branding\/launchers" "assets\/branding\/references"/,"Updater must derive the protected launcher/reference inventory from the current tracked HEAD");
assert.match(updater,/if not exist "%%F"[\s\S]*?git restore --source=HEAD --staged --worktree -- "%%F"/,"Updater must restore only missing tracked protected assets");

assert.match(guilds,/id: "members", label: "Members", icon: "players"/,"Guild Members tab must use the shared HGR players SVG icon");
assert.match(guilds,/<HgrIcon name=\{tab\.icon\} size=\{16\} \/>/,"Guild tabs must render through the shared HGR icon system");
assert.doesNotMatch(guilds,/👥 Members|💬 Chat|🏆 Leaderboard|🎲 Rooms/,"Guild tabs must not depend on platform-specific emoji glyphs");
assert.match(guilds,/className="halieus-guild-member-row"[\s\S]*?player=\{\{[\s\S]*?profilePicture: member\.profilePicture[\s\S]*?playerColor: member\.playerColor/,"Guild member rows must use the shared player identity component and real HGR profile artwork");
assert.match(guilds,/halieus-guild-heading-actions/,"Guild Join/Create actions must live in the page heading");
assert.doesNotMatch(guilds,/<div className="halieus-guild-actions">/,"Guild landing must not render a second full-width setup bar");
assert.match(guilds,/setGuildAction\("join"\)/,"Guild heading must open the Join modal");
assert.match(guilds,/setGuildAction\("create"\)/,"Guild heading must open the Create modal");

console.log("HGR brand, theme and launcher coherence regression: PASS");
