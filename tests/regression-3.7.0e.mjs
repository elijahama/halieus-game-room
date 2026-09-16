import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

const currentVersion=read('VERSION').trim();
assert.match(currentVersion,/^(?:3\.7\.0[e-l]|4\.0\.0)$/,'3.7.0e stabilization regression must remain valid through later 3.7.0 patch releases');
const expectedNpmVersion=currentVersion==='4.0.0'?'4.0.0':`3.7.0-${currentVersion.slice(-1)}`;
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,expectedNpmVersion,`${file} version mismatch`);
}


const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0d\.mjs.*regression-3\.7\.0e\.mjs/s,'Regression chain must preserve 3.7.0d before 3.7.0e');

// Hidden-information boundary: Blackjack clients only receive their own cards.
const bjServer=read('server/src/games/blackjack/rebuild.ts');
const bjShared=read('shared/games/blackjack/types.ts');
const bjClient=read('client/src/games/blackjack/BlackjackRebuildScreen.tsx');
assert.match(bjServer,/hand:\s*player\.id\s*===\s*viewerId\s*\?\s*player\.hand\s*:\s*\[\]/,'Blackjack must redact opponent hands server-side');
assert.match(bjServer,/cardCount:\s*player\.hand\.length/,'Blackjack public state must retain opponent card count');
assert.match(bjShared,/cardCount:\s*number/,'Blackjack public player contract must expose card count');
assert.match(bjClient,/Array\.from\(\{\s*length:\s*p\.cardCount\s*\}/,'Blackjack UI must render hidden opponent cards from count only');

// Resolved game requests must not resurrect after the linked room is opened/left.
const accountTypes=read('shared/platform/accounts.ts');
const accountServer=read('server/src/platform/accounts.ts');
const home=read('client/src/platform/components/HomeScreen.tsx');
assert.match(accountTypes,/"closed"/,'Game-request status must include closed');
assert.match(accountServer,/game-requests\/\:requestId\/close/,'Server must expose a close transition for accepted requests');
assert.match(accountServer,/item\.status\s*=\s*"closed"/,'Close transition must persist closed status');
assert.match(home,/game-requests\/\$\{encodeURIComponent\(request\.id\)\}\/close/,'Opening an accepted request must close it before room launch');

// Finished games must have a reliable escape and stale local recovery must be forgotten.
const results=read('client/src/platform/components/GameResultsScreen.tsx');
const app=read('client/src/App.tsx');
assert.match(results,/results-escape-button/,'Results must expose an always-visible escape control');
assert.match(results,/← Game Room/,'Results escape must return to Game Room');
assert.match(app,/nextState\.phase\s*===\s*"finished"[^\n]*clearCardSession\(BLACKJACK_SESSION_KEY\)/,'Finished Blackjack must clear saved recovery');
assert.match(app,/nextState\.phase\s*===\s*"finished"[^\n]*clearCardSession\(AYO_SESSION_KEY\)/,'Finished Ayo must clear saved recovery');
assert.match(app,/nextState\.phase\s*===\s*"finished"[^\n]*clearCardSession\(WORD_BOARD_SESSION_KEY\)/,'Finished Word Board must clear saved recovery');
assert.match(app,/nextState\.phase\s*===\s*"finished"[^\n]*updateWordArenaSavedSession\(nextState\.game,\s*null\)/,'Finished word-arena games must clear saved recovery');
assert.match(app,/nextState\.phase\s*===\s*"finished"[^\n]*updateClassicSavedSession\(nextState\.game,\s*null\)/,'Finished classic-table games must clear saved recovery');

// Word Board: complete rules plus a redistributable broad dictionary and broad/slang mode.
const wbTypes=read('shared/games/word-board/types.ts');
const wbServer=read('server/src/games/word-board/handlers.ts');
const wbScreen=read('client/src/games/word-board/WordBoardScreen.tsx');
const dictionary=read('server/data/word-board/scowl-en-us.dic');
const dictionaryCopyright=read('server/data/word-board/SCOWL-COPYRIGHT.txt');
assert.match(wbTypes,/"standard"\s*\|\s*"challenge"\s*\|\s*"open"/,'Word Board must expose standard/challenge/open dictionary modes');
assert.match(wbServer,/scowl-en-us\.dic/,'Word Board server must load bundled SCOWL dictionary');
assert.ok(dictionary.split(/\r?\n/).length>70000,'Bundled Word Board dictionary must contain broad English coverage');
assert.match(dictionaryCopyright,/Permission to use, copy, modify, distribute and sell these word\s+lists/i,'Bundled dictionary redistribution notice must be retained');
assert.match(wbServer,/first word must cross the centre square/i,'Opening word must cross centre');
assert.match(wbServer,/play must connect to the existing board/i,'Later plays must connect to existing board');
assert.match(wbServer,/resolved\.length===7\)total\+=50/,'Seven-tile play must award +50');
assert.match(wbServer,/room\.bag\.length<7/,'Tile exchange must require at least seven tiles in bag');
assert.match(wbServer,/consecutivePasses>=6/,'Six scoreless turns must end Word Board');
assert.match(wbServer,/dictionaryMode==="open"&&OPEN_PLAY_WORDS\.has/,'Open mode must support explicit informal/slang vocabulary');
assert.match(wbScreen,/word-board-play-area/,'Word Board must use compact play-area composition');
assert.match(wbScreen,/word-board-control-deck/,'Word Board rack/actions must occupy the side control deck');

// Password: actual two-team game, not individual free-for-all.
const waTypes=read('shared/games/word-arena/types.ts');
const waServer=read('server/src/games/word-arena/handlers.ts');
const waScreen=read('client/src/games/word-arena/WordArenaScreen.tsx');
assert.match(waTypes,/PasswordTeam\s*=\s*"violet"\s*\|\s*"gold"/,'Password must define two teams');
assert.match(waTypes,/passwordActiveTeam/,'Password public state must publish active team');
assert.match(waTypes,/passwordTeamScores/,'Password public state must publish team scores');
assert.match(waServer,/game==="password"\?4/,'Password must require four players');
assert.match(waServer,/passwordTeamScores=\{violet:0,gold:0\}/,'Password must reset team scores on match start');
assert.match(waScreen,/password-team-scoreboard/,'Password UI must expose a team scoreboard');
assert.match(waScreen,/team==="violet"\?"Violet":"Gold"/,'Password UI must label Violet and Gold teams');
assert.match(waScreen,/The other team is playing this round/,'Opposing team must not act during active team turn');

// Profile-picture support must be optional, validated server-side and visible across account/social surfaces.
const accountsShared=read('shared/platform/accounts.ts');
const accountsServer=read('server/src/platform/accounts.ts');
const accountPanel=read('client/src/platform/accounts/AccountPanel.tsx');
assert.match(accountsShared,/profilePicture:\s*string\s*\|\s*null/,'Account summaries must include optional profile picture');
assert.match(accountsServer,/profilePictureRaw[^\n]*png\|jpeg\|webp/,'Server must only accept supported PNG, JPEG or WebP image data URLs');
assert.match(accountsServer,/under 1 MB/,'Server must enforce profile-picture size limit');
assert.match(accountPanel,/Upload profile picture/,'Account panel must support picture upload');
assert.match(accountPanel,/Remove picture/,'Account panel must support picture removal');
assert.match(home,/person\.profilePicture/,'Game Room player surfaces must render uploaded pictures');

// Ayo keeps culturally grounded rules/presentation but AI uses neutral HGR bot identities.
const ayoServer=read('server/src/games/ayo/handlers.ts');
assert.match(ayoServer,/\["Atlas","Nova","Rook","Echo","Mira","Juno","Sol","Vale"\]/,'Ayo must use standard HGR AI names');
assert.doesNotMatch(ayoServer,/Ayo AI/,'Ayo must not label a bot as Ayo AI');
assert.doesNotMatch(ayoServer,/Adunni|Kola|Tayo|Sade|Kunle|Bisi|Femi|Yemi/,'Ayo AI names must not use ethnicity/culture as bot flavour');

// Ayo and Word Board share the normal room chat infrastructure.
const roomChat=read('server/src/platform/roomChat.ts');
assert.match(roomChat,/value === "ayo"/,'Ayo room chat must resolve the game');
assert.match(roomChat,/value === "word-board"/,'Word Board room chat must resolve the game');

// Game Room/home lifecycle and recommendations.
assert.match(home,/featuredRotationIndex/,'Home recommendations must rotate');
assert.match(home,/RECOMMENDED NOW/,'Home must distinguish recommendations from an active seat');
assert.match(home,/Start \{featuredGame\.name\}/,'Home recommendation CTA must say Start, not Continue');
assert.match(home,/Continue \{currentSeat\.game\}/,'Continue must be reserved for an actual saved seat');

// Responsive/presentation invariants.
const css=read('client/src/index.css');
assert.match(css,/\.word-board-play-area/,'Word Board responsive composition CSS must exist');
assert.match(css,/@media\s*\(min-width:760px\)\s*and\s*\(max-width:1366px\)/,'Tablet-specific responsive rules must exist');
assert.match(css,/\.card-game-brand-lockup \.halieus-game-brand-icon[\s\S]*border:0 !important/,'In-game card header icons must not show the library frame');
assert.match(css,/\.word-arena-brand \.halieus-game-brand-icon/,'Word-arena in-game icon frame override must exist');
assert.match(css,/\.rebuild-game-title>\.halieus-game-brand-icon/,'Rebuilt game in-game icon frame override must exist');
assert.doesNotMatch(css,/(?:html|body|#root)\s*\{[^}]*\bzoom\s*:/i,'Do not introduce a global zoom hack');
assert.doesNotMatch(css,/(?:html|body|#root)\s*\{[^}]*transform\s*:\s*scale\(/i,'Do not introduce a global root scale hack');

console.log('Halieus Game Room 3.7.0e stabilization regression: PASS');
