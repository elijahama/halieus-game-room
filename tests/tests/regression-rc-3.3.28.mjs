import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const app = readFileSync(resolve(root, 'client/src/App.tsx'), 'utf8');
const home = readFileSync(resolve(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const gameChrome = readFileSync(resolve(root, 'client/src/platform/components/GameChrome.tsx'), 'utf8');
const inviteBar = readFileSync(resolve(root, 'client/src/platform/components/InviteLobbyBar.tsx'), 'utf8');
const megaLobby = readFileSync(resolve(root, 'client/src/games/mega-board/components/LobbyScreen.tsx'), 'utf8');
const poker = readFileSync(resolve(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const pokerLeaderboard = readFileSync(resolve(root, 'client/src/games/poker/components/PokerLeaderboardModal.tsx'), 'utf8');
const pokerHandlers = readFileSync(resolve(root, 'server/src/games/poker/handlers.ts'), 'utf8');
const css = readFileSync(resolve(root, 'client/src/index.css'), 'utf8');

// The compact Poker invite strip is now a shared Halieus multiplayer pattern.
assert.match(inviteBar, /Room invites/);
assert.match(inviteBar, /Invite players/);
assert.match(poker, /<InviteLobbyBar/);
assert.match(megaLobby, /<InviteLobbyBar/);
assert.match(megaLobby, /setInviteOpen\(true\)/);
assert.match(css, /\.halieus-invite-bar/);

// Poker AI difficulty is one room-level host setting, not three large main-setup cards or per-seat labels.
assert.match(poker, /poker-global-ai-control/);
assert.match(poker, /Applies to all AI players/);
assert.match(poker, /player\.isAi \? "AI player"/);
assert.doesNotMatch(poker, /poker-ai-difficulty-panel/);
assert.doesNotMatch(home, /poker-ai-setup-options/);
assert.doesNotMatch(home, /onPokerAiDifficultyChange/);
assert.match(pokerHandlers, /room\.aiDifficulty = payload\.difficulty/);
assert.match(app, /aiDifficulty: "normal"/);

// Ranked Poker has its own leaderboard destination and does not reuse Mega Board's ranking modal.
assert.match(home, /onOpenPokerLeaderboard/);
assert.match(home, /onOpenPokerLeaderboard/);
assert.match(home, /View Poker leaderboard/);
assert.match(app, /PokerLeaderboardModal/);
assert.match(pokerLeaderboard, /Poker leaderboard/);
assert.match(pokerLeaderboard, /independent from Mega Board/);
assert.match(pokerLeaderboard, /Calibration stage/);

// Mega Board waiting room uses the redesigned overview + content hierarchy.
assert.match(megaLobby, /lobby-card-v2/);
assert.match(megaLobby, /lobby-overview-grid/);
assert.match(megaLobby, /lobby-main-grid/);
assert.match(megaLobby, /lobby-side-panel/);
assert.match(css, /\.lobby-main-grid/);

// Game Room and Menu labels share the Menu typography standard.
assert.match(gameChrome, /Game Room/);
assert.match(css, /\.halieus-game-chrome \.game-room-back-label,[\s\S]*\.halieus-game-menu-trigger > span:last-child[\s\S]*font-size: 12px/);

console.log('3.3.28 shared invite bar + Poker leaderboard/global AI + Mega lobby redesign regression PASS');
