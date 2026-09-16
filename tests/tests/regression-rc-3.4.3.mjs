import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const version = read("VERSION").trim();
const app = read("client/src/App.tsx");
const home = read("client/src/platform/components/HomeScreen.tsx");
const panel = read("client/src/platform/accounts/AccountPanel.tsx");
const accounts = read("server/src/platform/accounts.ts");
const server = read("server/src/index.ts");
const catalog = read("client/src/platform/games/catalog.ts");
const css = read("client/src/index.css");
const whot = read("client/src/games/whot/WhotScreen.tsx");
const poker = read("client/src/games/poker/PokerScreen.tsx");
const blackjack = read("client/src/games/blackjack/BlackjackScreen.tsx");
const ludo = read("client/src/games/ludo/LudoScreen.tsx");
const connect = read("client/src/games/connect-four/ConnectFourScreen.tsx");
const hidden = read("client/src/games/hidden-dictator/HiddenDictatorScreen.tsx");
const megaLobby = read("client/src/games/mega-board/components/LobbyScreen.tsx");
const connectServer = read("server/src/games/connect-four/handlers.ts");
const hiddenServer = read("server/src/games/hidden-dictator/handlers.ts");
const blackjackTypes = read("shared/games/blackjack/types.ts");

assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i);
assert.equal(version, pkg.version);

// One canonical catalogue owns game names, icons and current accents. Hidden Dictator's original red beta accent was superseded by the approved orange social-game identity in 3.5.5.
for (const [id, icon, accent] of [
  ["mega-board", "/game-icons/mega-board.svg", "#16a34a"],
  ["poker", "/game-icons/poker.svg", "#be123c"],
  ["whot", "/game-icons/whot.svg", "#8b1e2d"],
  ["ludo", "/game-icons/ludo.svg", "#d97706"],
  ["blackjack", "/game-icons/blackjack.svg", "#2563eb"],
  ["hidden-dictator", "/game-icons/hidden-dictator.svg", "#ea580c"],
  ["connect-four", "/game-icons/connect-four.svg", "#2563eb"],
]) {
  assert.match(catalog, new RegExp(`id: "${id}"[\\s\\S]{0,180}icon: "${icon.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"[\\s\\S]{0,120}accent: "${accent}"`));
  assert.ok(statSync(`client/public${icon}`).size > 150, `${id} icon should exist`);
}
for (const screen of [poker, blackjack, whot, ludo, connect, hidden]) assert.match(screen, /GameBrandIcon game=/);
assert.match(megaLobby, /GameBrandIcon game="mega-board"/);
assert.match(poker, /GAME_BY_ID\["poker"\]\.accent/);
assert.match(blackjack, /GAME_BY_ID\["blackjack"\]\.accent/);
assert.match(whot, /GAME_BY_ID\["whot"\]\.accent/);
assert.match(ludo, /GAME_BY_ID\["ludo"\]\.accent/);
assert.match(connect, /GAME_BY_ID\["connect-four"\]\.accent/);
assert.match(hidden, /GAME_BY_ID\["hidden-dictator"\]\.accent/);

// WHOT is a real table redesign, not the old fixed-seat layout painted differently.
for (const marker of ["whot344-table", "whot344-opponents", "whot344-centre", "whot344-local", "whot344-hand"]) assert.match(whot, new RegExp(marker));
assert.match(css, /\.whot344-table\s*\{/);
assert.match(css, /\.whot344-opponents\s*\{/);
assert.match(css, /\.whot344-hand\s*\{/);

// Match-mode bars accurately reflect real modes: Mega gets Blitz, the others do not.
assert.match(home, /aria-label="Mega Board match type"[\s\S]{0,900}>⚡ Blitz</);
for (const game of ["Poker", "WHOT", "Ludo", "Blackjack", "Connect Four", "Hidden Dictator"]) {
  assert.match(home, new RegExp(`aria-label="${game} match type"`));
}
assert.match(blackjackTypes, /BlackjackMatchMode = "casual" \| "ranked"/);
assert.match(blackjack, /state\.matchMode === "ranked"/);

// Poker exposes only Hold'em as playable and labels the rest honestly.
assert.match(home, /Texas Hold’em[\s\S]{0,120}Live now/);
assert.match(home, /Omaha <i>Coming soon<\/i>/);
assert.match(home, /Five-Card Draw <i>Planned<\/i>/);
assert.match(home, /Seven-Card Stud <i>Planned<\/i>/);
assert.doesNotMatch(home, /onPokerVariantChange\("omaha"\)/);

// Hidden Dictator and Connect Four are actual routed/server-backed games.
assert.match(app, /ConnectFourScreen/);
assert.match(app, /HiddenDictatorScreen/);
assert.match(server, /registerConnectFourHandlers\(io, socket\)/);
assert.match(server, /registerHiddenDictatorHandlers\(io, socket\)/);
assert.match(server, /closeAllConnectFourRooms\(\)/);
assert.match(server, /closeAllHiddenDictatorRooms\(\)/);
assert.match(connectServer, /currentTurnPlayerId\s*===\s*oldId/);
assert.match(hiddenServer, /speakerPlayerId\s*===\s*oldId/);
assert.match(hiddenServer, /nominatedDeputyId\s*===\s*oldId/);

// Presence comes from heartbeat-derived server state everywhere, not account status.
assert.match(accounts, /PRESENCE_TIMEOUT_MS/);
assert.match(accounts, /lastSeenAt/);
assert.match(accounts, /onlineAccountIds/);
assert.match(accounts, /\/auth\/heartbeat/);
assert.match(panel, /onlineAccountIds\.includes\(player\.id\)/);
assert.match(home, /person\.online \? "Online" : "Offline"/);

// Admin testing stays isolated and global room shutdown includes the new games.
assert.match(panel, /Test Lab/);
assert.match(panel, /Isolated identity/);
assert.match(app, /\[BETA\]/);
assert.match(panel, /Close all rooms/);
assert.match(server, /getConnectFourRoomCount\(\)/);
assert.match(server, /getHiddenDictatorRoomCount\(\)/);

// Native browser confirmations must not be used by game UI because they break fullscreen.
const clientSources = [app, home, panel, poker, blackjack, whot, ludo, connect, hidden, megaLobby].join("\n");
assert.doesNotMatch(clientSources, /window\.confirm|\bconfirm\(/);
for (const screen of [poker, blackjack, whot, ludo, connect, hidden]) assert.match(screen, /ConfirmDialog/);

// Theme changes and ambient game motifs soften rather than flash.
assert.match(css, /theme-transitioning/);
assert.match(css, /transition-duration:\s*(?:320|680)ms/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(home, /halieus-game-atmosphere/);
for (const tone of ["mega-board", "poker", "whot", "ludo", "blackjack", "hidden-dictator", "connect-four"]) assert.match(css, new RegExp(`game-bg-${tone}`));
assert.match(css, /halieus(?:AmbientFloat|344-float)/);

console.log("RC 3.4.3 consistency/new-games/accessibility regression passed.");
