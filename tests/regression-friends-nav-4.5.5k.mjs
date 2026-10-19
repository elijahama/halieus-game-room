import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
const root=resolve(import.meta.dirname,"..");
const read=(p)=>readFile(resolve(root,p),"utf8");
const [home,guilds,ignore]=await Promise.all([
  read("client/src/platform/components/HomeScreen.tsx"),
  read("client/src/platform/components/GuildsPanel.tsx"),
  read(".gitignore"),
]);
assert.match(home,/<h1>Friends<\/h1>/,"The social page title must be Friends");
assert.match(home,/<HgrIcon name="players" size=\{20\} \/><span>Friends<\/span>/,
  "The fixed phone bottom navigation must call the roster Friends");
assert.match(home,/<b>Friends<\/b>/,"Desktop sidebar must call the roster Friends");
assert.match(guilds,/>← Friends<\/button>/,"Guilds must return to Friends, not the obsolete global Players directory");
assert.match(home,/No friends or guild members are online right now\./,
  "Empty presence disclosure may not imply the whole platform is offline");
assert.match(ignore,/^server\/data\/feedback\/\s*$/m,
  "Live feedback data must remain local, untracked and private");
console.log("PASS 4.5.5k Friends navigation consistency and ignored private feedback runtime data");
