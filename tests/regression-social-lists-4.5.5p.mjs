import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

const [home, css, entry, guild, server, socialTest] = await Promise.all([
  "client/src/platform/components/HomeScreen.tsx",
  "client/src/styles/hgr-4.5.5p-social-lists.css",
  "client/src/main.tsx",
  "client/src/platform/components/GuildsPanel.tsx",
  "server/src/platform/accounts.ts",
  "tests/runtime-friends-guild-4.5.5h.mjs",
].map(read));

assert.match(home, /const \[socialListSection, setSocialListSection\] = useState<"friends" \| "guild-contacts">\("friends"\)/,
  "Friends should be the default social segment");
assert.match(home, /const friends = directory\.filter\(\(person\) => accepted\.has\(person\.id\)\)/,
  "Friends segment must contain accepted friendships only");
assert.match(home, /const guildContacts = directory\.filter\(\(person\) => !accepted\.has\(person\.id\)\)/,
  "Guild contacts must not automatically count as friends");
assert.match(home, /if \(!friendListReady\) return \{ friends: \[\], guildContacts: \[\] \}/,
  "Never misclassify relationships before friend status is available");
assert.match(home, /const loadFriends = async \(\) =>/,
  "Friendship fetch must be independent of game, guild invite, and stats requests");
assert.match(home, /const load = \(\) => \{ void loadDirectory\(\); void loadOtherData\(\); void loadFriends\(\); \}/,
  "Both directory and accepted-friend status must refresh");
assert.match(home, /aria-label="Choose social list"/);
assert.match(home, /aria-pressed=\{socialListSection === "friends"\}/);
assert.match(home, /aria-pressed=\{socialListSection === "guild-contacts"\}/);
assert.match(home, /setSocialListSection\("friends"\); setPlayerSearch\("?"\); setPlayerFilter\("all"\)/,
  "Section switches must not strand an active filter");
assert.match(home, /setSocialListSection\("guild-contacts"\); setPlayerSearch\("?"\); setPlayerFilter\("all"\)/);
assert.match(home, /className="halieus-player-directory is-social-list"/);
assert.match(home, /<PlayerIdentityCard[\s\S]*?\bcompact\b/,
  "Social roster should use compact, readable player rows");
assert.match(home, /Your friends list is empty/);
assert.match(home, /No guild-only contacts yet/);
assert.match(home, /setView\("guilds"\)/, "Separate Guilds page must remain accessible");
assert.match(guild, /onBackToPlayers/, "Guilds return navigation must be preserved");
assert.match(server, /socialPeerIds\(viewer\.id\)/, "Server must keep privacy filtering authoritative");
assert.match(server, /function acceptedFriendIds\(accountId: string\)/);
assert.match(socialTest, /Shared guild member visible without friending/,
  "The server-level independence contract must remain covered");
assert.match(css, /grid-template-columns: minmax\(0,1fr\) !important/,
  "Contacts must show as rows, not a grid of large tiles");
assert.match(css, /min-height: 44px/, "Section controls must have usable touch targets");
assert.match(entry, /import "\.\/styles\/hgr-4\.5\.5p-social-lists\.css";/,
  "The new social layout stylesheet must be shipped");
assert.doesNotMatch(css, /\.halieus-theme-atmosphere|\.board-space-name/,
  "Do not change thematic glyphs or game board text");
console.log("PASS 4.5.5p: Friends / guild contacts navigation, distinct membership, independent status fetch, compact row list and privacy boundaries");
