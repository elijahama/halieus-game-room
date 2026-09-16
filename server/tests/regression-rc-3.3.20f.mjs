import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/platform/components/HomeScreen.tsx"), "utf8");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const lobby = readFileSync(resolve(root, "client/src/games/mega-board/components/LobbyScreen.tsx"), "utf8");
const invite = readFileSync(resolve(root, "client/src/games/mega-board/components/InviteLobbyPanel.tsx"), "utf8");
const turnOrder = readFileSync(resolve(root, "client/src/games/mega-board/components/TurnOrderScreen.tsx"), "utf8");
const bank = readFileSync(resolve(root, "client/src/games/mega-board/components/AvailablePropertiesModal.tsx"), "utf8");
const board = readFileSync(resolve(root, "client/src/games/mega-board/components/GameBoard.tsx"), "utf8");

assert.match(home, /<h1>Halieus Game Room<\/h1>/);
assert.match(home, /<strong>Mega Board<\/strong>/);
assert.match(home, /<p className="modal-eyebrow">\{pokerSelected \? "Poker" : "Mega Board"\}<\/p>/);
assert.doesNotMatch(home, /<strong>Property Trading<\/strong>/);

assert.match(app, /<p style=\{styles\.eyebrow\}>Halieus Game Room<\/p>/);
assert.match(app, /<h1 style=\{styles\.gameTitle\}>Mega Board<\/h1>/);
assert.doesNotMatch(app, /<p style=\{styles\.eyebrow\}>Mega Monopoly<\/p>/);

assert.match(lobby, /Mega Board lobby/);
assert.match(invite, /Mega Board room \$\{roomCode\}/);
assert.match(invite, /Join my Mega Board lobby\./);
assert.match(turnOrder, /Mega Board setup/);
assert.match(bank, /Mega Board Bank/);
assert.match(board, /aria-label="Mega Board board"/);

console.log("3.3.20f Mega Board public-surface branding regression PASS");
