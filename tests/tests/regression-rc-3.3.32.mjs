import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'client/src/App.tsx'), 'utf8');
const poker = fs.readFileSync(path.join(root, 'client/src/games/poker/PokerScreen.tsx'), 'utf8');
const report = fs.readFileSync(path.join(root, 'client/src/games/poker/utils/gameReport.ts'), 'utf8');
const feedback = fs.readFileSync(path.join(root, 'client/src/platform/components/FeedbackForm.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'client/src/index.css'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(poker.includes('Download Game Report'), 'Poker menu must expose a game-report export action.');
assert(poker.includes('Send feedback'), 'Poker menu must expose feedback.');
assert(poker.includes('downloadPokerGameReport(state)'), 'Poker report action must export the current authoritative public state.');
assert(report.includes('HALIEUS GAME ROOM — POKER MATCH REPORT'), 'Poker report generator heading is missing.');
assert(report.includes('Recovery keys, socket IDs, IP addresses and authentication data are intentionally excluded.'), 'Poker report must explicitly exclude sensitive recovery/network data.');
assert(feedback.includes('category: `${gameName} / ${category}`'), 'Shared feedback form must identify the active game.');

assert(css.includes('.home-game-poker .button-outline'), 'Poker setup must scope outline controls to the Poker accent.');
assert(css.includes('color: #be123c !important'), 'Poker light-mode outline controls must not inherit Mega green.');
assert(css.includes('@media (max-width: 980px)'), 'Poker waiting-room responsive breakpoint is missing.');
assert(css.includes('.poker-lobby-actions-v2 {\n    grid-template-columns: 1fr !important;'), 'Poker host controls must stack before they can clip.');

// The 3.3.32 single-rail experiment was superseded in 3.3.33 after live testing
// exposed excessive unused space on wide screens. Preserve the board-priority goal,
// but accept the balanced dual-rail v3 layout as the current implementation.
assert(app.includes('mega-live-layout-v3'), 'Mega Board live layout v3 class is missing.');
assert(app.includes('leftRailPlayers') && app.includes('rightRailPlayers'), 'Mega Board v3 must balance players across two useful desktop rails.');
assert(css.includes('.game-layout.mega-live-layout-v3'), 'Mega Board live layout v3 desktop grid is missing.');

assert(css.includes('.board-decision-card-shell > .card-reveal-panel'), 'Mega Board card notification no-scroll override is missing.');
assert(css.includes('scrollbar-width: none !important'), 'Mega Board card notifications must not render internal scrollbars.');
assert(css.includes('.bus-ticket-event-popup {\n  overflow: hidden !important;'), 'Bus Ticket notifications must not render internal scrolling.');

console.log('3.3.32 regression checks passed.');
