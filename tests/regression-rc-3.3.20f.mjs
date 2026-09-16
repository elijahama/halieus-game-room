import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/platform/components/HomeScreen.tsx"), "utf8");
const catalog = readFileSync(resolve(root, "client/src/platform/games/catalog.ts"), "utf8");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const lobby = readFileSync(resolve(root, "client/src/games/mega-board/components/LobbyScreen.tsx"), "utf8");
const invite = readFileSync(resolve(root, "client/src/games/mega-board/components/InviteLobbyPanel.tsx"), "utf8");
const turnOrder = readFileSync(resolve(root, "client/src/games/mega-board/components/TurnOrderScreen.tsx"), "utf8");
const bank = readFileSync(resolve(root, "client/src/games/mega-board/components/AvailablePropertiesModal.tsx"), "utf8");
const board = readFileSync(resolve(root, "client/src/games/mega-board/components/GameBoard.tsx"), "utf8");

assert.match(home, /Halieus Game Room/);
assert.match(catalog, /id: "mega-board", name: "Mega Board"/);
assert.match(home, /halieus-game-library/);
assert.doesNotMatch(home, /<strong>Property Trading<\/strong>/);

assert.match(app, /className="card-game-brand-lockup mega-game-brand-lockup"/);
assert.match(app, /<GameBrandIcon game="mega-board" className="card-game-letter-token" \/>/);
assert.match(app, /<p>Halieus Game Room<\/p><h1>Mega Board<\/h1>/);
assert.doesNotMatch(app, /<p style=\{styles\.eyebrow\}>Mega Monopoly<\/p>/);

assert.match(lobby, /Mega Board lobby/);
assert.match(invite, /Mega Board room \$\{roomCode\}/);
assert.match(invite, /Join my Mega Board lobby\./);
assert.match(turnOrder, /Mega Board setup/);
assert.match(bank, /Mega Board Bank/);
assert.match(board, /aria-label="Mega Board board"/);

console.log("3.3.20f Mega Board public-surface branding regression PASS");
