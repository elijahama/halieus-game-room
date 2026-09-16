import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const home = fs.readFileSync(path.join(root, 'client/src/platform/components/HomeScreen.tsx'), 'utf8');
const poker = fs.readFileSync(path.join(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const megaLobby = fs.readFileSync(path.join(root, 'client/src/games/mega-board/components/LobbyScreen.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'client/src/index.css'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(!home.includes('Forgiving decisions'), 'Poker landing page must not include the old AI difficulty cards.');
assert(!home.includes('Balanced table play'), 'Poker landing page must not include the old Normal AI card.');
assert(!home.includes('Tighter, more disciplined'), 'Poker landing page must not include the old Hard AI card.');
assert(poker.includes('Applies to all AI players'), 'Poker waiting room must expose one table-wide AI difficulty setting.');
assert(megaLobby.includes('data-ui-revision="mega-lobby-v2"'), 'Mega Board must use the redesigned waiting-room layout.');
assert(megaLobby.includes('Bring everyone in, set the table'), 'Mega Board lobby v2 heading copy is missing.');
assert(css.includes('html[data-theme="light"] .halieus-shell'), 'Light-mode signed-in shell contrast support is missing.');
assert(css.includes('color: var(--mm-text) !important'), 'Light-mode library titles must use readable theme text.');
assert(css.includes('.halieus-game-chrome .game-room-back-label'), 'Shared Game Room/Menu typography rule is missing.');

console.log('3.3.31 regression checks passed.');
