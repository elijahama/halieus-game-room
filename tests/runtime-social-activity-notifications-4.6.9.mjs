import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerProgressionIdentity, verifiedRoomAccountIds } from "../server/src/platform/progression.ts";
import { deriveSocialActivityNotices } from "../client/src/platform/socialActivityTransitions.ts";

const root=resolve(import.meta.dirname,"..");
const make=(accountId,beta=false)=>({accountId,beta});
const releaseA=registerProgressionIdentity("user-a",()=>make("account-a"));
const releaseB=registerProgressionIdentity("user-b",()=>make("account-b"));
const releaseBeta=registerProgressionIdentity("beta",()=>make("beta-account",true));
try {
  const players=[
    {id:"user-a",isAi:false,isConnected:true},
    {id:"user-a",isAi:false,isConnected:true},
    {id:"user-b",isAi:false,isConnected:false},
    {id:"beta",isAi:false,isConnected:true},
    {id:"bot",isAi:true,isConnected:true},
    {id:"guest",isAi:false,isConnected:true},
    {id:"user-b",isAi:false,isConnected:true,hasLeft:true},
  ];
  assert.deepEqual(verifiedRoomAccountIds(players),["account-a"],"Only verified connected human accounts qualify");
  assert.deepEqual(verifiedRoomAccountIds([{id:"user-b",isConnected:true}]),["account-b"]);
  assert.deepEqual(verifiedRoomAccountIds([{id:"guest",isConnected:true}]),[],"Display-name-only guests must not create social activity");
} finally { releaseA();releaseB();releaseBeta(); }

const a={accountId:"friend-a",displayName:"Alex",online:false,game:null};
const b={accountId:"friend-b",displayName:"Bea",online:true,game:null};
const online={...a,online:true};
const game={id:"mega-board",title:"Mega Board",started:false,code:"MM1234"};
const playing={...a,online:true,game};
const at=Date.now();
assert.deepEqual(deriveSocialActivityNotices(null,[online],at),[],"First fetch never manufactures a new-online event");
assert.deepEqual(deriveSocialActivityNotices([online],[online],at),[],"Stable status does not re-notify");
const live=deriveSocialActivityNotices([a,b],[online,b],at);
assert.equal(live.length,1);
assert.equal(live[0].kind,"online");
assert.equal(live[0].title,"Alex is online");
assert.equal(live[0].roomCode,null);
const join=deriveSocialActivityNotices([a],[playing],at);
assert.equal(join.length,1,"Online+room change yields one specific notice, never two");
assert.equal(join[0].kind,"game");
assert.equal(join[0].gameId,"mega-board");
assert.equal(join[0].roomCode,"MM1234");
assert.deepEqual(deriveSocialActivityNotices([playing],[playing],at),[],"No duplicate on polling");
assert.equal(deriveSocialActivityNotices([playing],[{...playing,game:{...game,code:"MM5678"}}],at).length,1,"Changing real rooms generates a new notice");
assert.deepEqual(deriveSocialActivityNotices([b],[],at),[],"Contact disappearing must not be mistaken for a new presence");
assert.deepEqual(deriveSocialActivityNotices([a],[{...a,online:false}],at),[],"Offline events are not emitted/noisy");
assert.deepEqual(deriveSocialActivityNotices([b],[{...b,displayName:"New name"}],at),[],"Renaming alone does not trigger a notice");

const accounts=readFileSync(resolve(root,"server/src/platform/accounts.ts"),"utf8");
const roomTypes=readFileSync(resolve(root,"shared/platform/live-games.ts"),"utf8");
assert.match(accounts,/app\.get\("\/accounts\/social\/activity"/,"Account-only social activity endpoint");
assert.match(accounts,/const contacts = playerDirectory\(auth\.account, "social"\)/,"Server filters relationships and hidden players");
assert.match(accounts,/entry\.verifiedAccountIds\?\.includes\(contact\.id\)/,"In-game evidence requires verified account IDs");
assert.match(accounts,/\(\{ verifiedAccountIds: _internalIds, \.\.\.room \}\)/,"Public room API must discard internal IDs");
assert.match(roomTypes,/SERVER-ONLY authenticated socket identities/);
for(const name of [
  "server/src/index.ts","server/src/games/ayo/handlers.ts","server/src/games/blackjack/rebuild.ts",
  "server/src/games/classic-table/handlers.ts","server/src/games/connect-four/handlers.ts",
  "server/src/games/hidden-dictator/handlers.ts","server/src/games/ludo/handlers.ts",
  "server/src/games/poker/handlers.ts","server/src/games/whot/rebuild.ts",
  "server/src/games/word-arena/handlers.ts","server/src/games/word-board/handlers.ts",
]) {
 const content=readFileSync(resolve(root,name),"utf8");
 assert.match(content,/verifiedAccountIds:\s*verifiedRoomAccountIds\(room\.players\)/,"All 14 games share verified presence: "+name);
}
const home=readFileSync(resolve(root,"client/src/platform/components/HomeScreen.tsx"),"utf8");
assert.match(home,/socialActivity\.unreadCount/);
assert.match(home,/verifiedSocialRoomByAccountId\.get\(person\.id\)/);
console.log("PASS HGR social activity: socket identity, 14 games, privacy, stable transitions, unread Inbox wiring");
