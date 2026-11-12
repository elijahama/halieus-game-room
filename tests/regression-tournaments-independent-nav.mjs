import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const home = await readFile(resolve(root, "client/src/platform/components/HomeScreen.tsx"), "utf8");
const hub = await readFile(resolve(root, "client/src/platform/components/TournamentHub.tsx"), "utf8");
const solo = await readFile(resolve(root, "client/src/platform/components/SoloTournamentPanel.tsx"), "utf8");
const guild = await readFile(resolve(root, "client/src/platform/components/GuildFixturesPanel.tsx"), "utf8");
const guildsPage = await readFile(resolve(root, "client/src/platform/components/GuildsPanel.tsx"), "utf8");

// Standalone Tournament Mode may not disappear when the Solo feature flag is off.
assert.match(home, /type HomeView\s*=.*"tournaments"/);
assert.match(home, /\{view === "tournaments" && account && <section/, "Tournament route is always reachable when signed in");
assert.doesNotMatch(home, /view === "tournaments" && account && soloAvailable/,
  "Solo feature toggle cannot hide all Tournament Mode");
assert.match(home, /<TournamentHub key=\{account\.id\}/);
assert.match(home, /onOpenLiveRoom=\{openLiveRoom\}/);
assert.match(home, /onCreateRoom=\{\(\) => \{ onMatchModeChange\("casual"\)/,
  "Tournament-created rooms retain the existing unranked Mega Board flow");

const desktopEntry = home.match(/<nav className="halieus-side-nav">([\s\S]*?)<\/nav>/)?.[1];
assert.ok(desktopEntry, "Desktop navigation must exist");
assert.match(desktopEntry, /view === "tournaments"\s*\? "is-active"/,
  "Tournament Mode must have its own desktop navigation selection");
assert.match(desktopEntry, /<b>Tournaments<\/b>/);
const mobileMore = home.match(/<nav className="halieus-mobile-more-nav">([\s\S]*?)<\/nav>/)?.[1];
assert.ok(mobileMore, "Mobile More menu must exist");
assert.match(mobileMore, /setView\("tournaments"\)/,
  "Tournament Mode must be independently available in mobile navigation");

// Preserve the owner's confirmed five-button phone bar (Join in the centre).
const bottomBar = home.match(/<nav className="halieus-mobile-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(bottomBar);
assert.equal((bottomBar.match(/<button\b/g)??[]).length, 5, "Do not add a sixth bottom navigation item");
assert.ok(bottomBar.indexOf("halieus-mobile-join-game") >
  bottomBar.indexOf('view === "games"'), "Join remains the central action");
assert.ok(bottomBar.indexOf("halieus-mobile-join-game") <
  bottomBar.indexOf('view === "players"'), "Join remains between Games and Friends");

// The hub must contain both independent entry points, not re-label Guilds.
assert.match(hub, /import \{ SoloTournamentPanel \}/);
assert.match(hub, /import \{ GuildFixturesPanel \}/);
assert.match(hub, /type TournamentFormat = "solo" \| "guild"/);
assert.match(hub, /format === "solo" && \(soloAvailable/,
  "Only the Solo actions, not Tournament Mode navigation, are capability-gated");
assert.match(hub, /format === "guild" && \(/);
assert.match(hub, /role="group" aria-label="Tournament format"/);
assert.match(hub, /aria-pressed=\{format === "solo"\}/);
assert.match(hub, /aria-pressed=\{format === "guild"\}/);
assert.match(hub, /setFormat\("guild"\)/);
assert.match(hub, /\/guilds\//, "Guild details remain verified by the server");
assert.match(hub, /<GuildFixturesPanel key=\{selectedGuild\.id\}/);
assert.match(hub, /onOpenGuilds\}/, "Guild management remains accessible for non-members");

// Preserve the actual server-confirmed tournament authorities.
assert.match(solo, /accountApi/);
assert.match(solo, /\/tournaments\/solo/);
assert.match(guild, /\/guild-fixtures/);
assert.match(guild, /guild\.canManage/, "Only authorised Guild members can manage fixtures");
assert.match(guildsPage, /GuildFixturesPanel/, "Existing Guild route remains functional");
assert.doesNotMatch(hub, /setWinner|manualWinner|forceWin|adminAward/i,
  "The new navigation does not invent winners or game authority");

console.log("PASS HGR Tournament Mode: independent desktop/mobile navigation, Solo/Guild formats, server gating and mobile Join layout intact");
