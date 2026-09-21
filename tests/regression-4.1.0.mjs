import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

/*
 * HGR 4.1.0 regression contract.
 *
 * Guilds are a persistent platform/social layer. They may reserve and organise
 * normal HGR rooms, but they must not become a second game-state authority.
 * Authentication, role permissions and persistence therefore stay server-side,
 * while game creation hands back to the existing HGR room setup flow.
 */

assert.equal(read('VERSION').trim(),'4.1.0');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,'4.1.0',`${file} version mismatch`);
}

const rootPackage=json('package.json');
assert.match(
  rootPackage.scripts['test:regression'],
  /regression-4\.0\.2\.mjs.*regression-4\.1\.0\.mjs/s,
  'Regression chain must preserve 4.0.2 before 4.1.0',
);

const contracts=read('shared/platform/guilds.ts');
const accounts=read('server/src/platform/accounts.ts');
const guildServer=read('server/src/platform/guilds.ts');
const server=read('server/src/index.ts');
const archive=read('server/src/platform/sessionArchive.ts');
const home=read('client/src/platform/components/HomeScreen.tsx');
const guildPanel=read('client/src/platform/components/GuildsPanel.tsx');
const css=read('client/src/index.css');
const sw=read('client/public/sw.js');
const intro=read('client/src/platform/components/HalieusIntro.tsx');
const html=read('client/index.html');
const readme=read('README.md');

assert.match(contracts,/HalieusGuildRole = "owner" \| "admin" \| "moderator" \| "member"/,'Guild role contract missing');
assert.match(contracts,/HalieusGuildRoomPolicy = "members" \| "moderators" \| "admins"/,'Guild room permission contract missing');
assert.match(contracts,/interface HalieusGuildDetail/,'Guild detail contract missing');
assert.match(contracts,/participantAccountIds: string\[\]/,'Guild history must retain stable participant account ids');

assert.match(accounts,/export function getAuthenticatedAccount\(/,'Guilds must authenticate through the canonical account store');

assert.match(guildServer,/export function registerGuildRoutes\(/,'Guild REST routes missing');
assert.match(guildServer,/app\.post\("\/guilds\/join"/,'Private guild invite-code join route missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/messages"/,'Persistent guild chat route missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/rooms"/,'Guild room reservation route missing');
assert.match(guildServer,/app\.post\("\/guilds\/:guildId\/members\/:accountId\/role"/,'Guild role-management route missing');
assert.match(guildServer,/function canCreateRoom\(/,'Server-side guild room permissions missing');
assert.match(guildServer,/export async function recordGuildSessionResult\(/,'Guild result projection missing');
assert.doesNotMatch(guildServer,/app\.get\("\/guilds\/search"/,'4.1.0 guilds must remain private/invite-led');

assert.match(server,/registerGuildRoutes\(app, getAuthenticatedAccount\)/,'Server must register Guild routes');
assert.match(server,/await loadGuildStore\(\)/,'Server must load persistent guild data at startup');
assert.match(server,/\["\/auth", "\/accounts", "\/admin", "\/guilds"\]/,'Guild responses must use no-store cache policy');

assert.match(
  archive,
  /await recordGuildSessionResult\(game, code, status, payload, summary\)/,
  'Canonical session completion must project into matching guild history',
);
assert.match(
  archive,
  /await writeFile\(finalPath,[\s\S]*?await recordGuildSessionResult/s,
  'Guild result projection must happen only after the canonical final archive write',
);

assert.match(home,/type HomeView = "home" \| "games" \| "players" \| "guilds"/,'Guilds must live in the Game Room social navigation');
assert.match(home,/import \{ GuildsPanel \} from "\.\/GuildsPanel"/,'Game Room must import the Guilds surface');
assert.match(home,/function openGuildCreate\(game: GameId, roomCode: string\)/,'Guild rooms must hand off to the existing game create flow');
assert.match(home,/view === "players" \|\| view === "guilds"/,'Players navigation must remain active while browsing Guilds');

assert.match(guildPanel,/type GuildView = "rooms" \| "chat" \| "leaderboard" \| "members"/,'Guild UI must expose Rooms, Chat, Leaderboard and Members');
assert.match(guildPanel,/Guilds is deliberately REST-backed rather than tied to a game socket/,'Guild architecture comment missing');
assert.match(guildPanel,/setInterval\(\(\) => void loadDetail\(selectedGuildId, true\), 5000\)/,'Guild chat/detail persistence polling missing');
assert.match(guildPanel,/Create guild room/,'Guild room creation action missing');
assert.match(guildPanel,/PRIVATE INVITE CODE/,'Private guild invite UI missing');

assert.match(css,/HGR 4\.1\.0 — Guilds & persistent groups/,'4.1.0 Guild CSS marker missing');
assert.match(css,/@media \(max-width: 680px\)[\s\S]*?\.halieus-guilds-panel/s,'Guilds need an explicit phone layout');

assert.match(sw,/halieus-shell-v4-1-0/,'PWA shell cache must be 4.1.0');
assert.match(intro,/app-icon-192\.png\?v=4\.1\.0/,'Intro asset cache-buster must match 4.1.0');
assert.doesNotMatch(html,/\?v=4\.0\.2/,'Static browser assets must not retain the 4.0.2 cache identity');
assert.match(readme,/Current milestone:\*\* 4\.1\.0/,'README must advertise HGR 4.1.0');

console.log('Halieus Game Room 4.1.0 Guilds regression: PASS');
