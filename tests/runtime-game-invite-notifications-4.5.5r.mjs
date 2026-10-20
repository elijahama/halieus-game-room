import assert from "node:assert/strict";
import {
  incomingGameNotifications,
  readSeenGameNotifications,
  saveSeenGameNotifications,
} from "../client/src/platform/components/gameInviteNotifications.ts";

const now = 1_800_000_000_000;
const request = (id, recipientAccountId, status, createdAt, expiresAt=now+50_000) => ({
  id, senderAccountId:"sender", senderDisplayName:"Invite Sender",
  recipientAccountId, recipientDisplayName:"Recipient",
  game:"ludo",gameTitle:"Ludo",status,createdAt,expiresAt,roomCode:null,respondedAt:null,
});
const room = (id, recipientAccountId, createdAt, expiresAt=now+50_000) => ({
  id, senderAccountId:"sender", senderDisplayName:"Room Host",
  recipientAccountId, game:"mega-board",gameTitle:"Mega Board",
  roomCode:"QK3W7Z",createdAt,expiresAt,
});
const requests=[
  request("active-1","person-a","pending",now-5_000),
  request("accepted-1","person-a","accepted",now-500),
  request("declined-1","person-a","declined",now-200),
  request("expired-1","person-a","pending",now-100,now-10),
  request("different-person","person-b","pending",now-50),
  request("active-2","person-a","pending",now-10_000),
];
const rooms=[
  room("room-1","person-a",now-2_000),
  room("room-expired","person-a",now-1_000,now-1),
  room("room-other","person-b",now-200),
];
const visible=incomingGameNotifications("person-a",requests,rooms,now);
assert.deepEqual(visible.map(item=>item.key),["room:room-1","request:active-1","request:active-2"]);
assert.equal(visible[0].kind,"room");
assert.equal(visible[0].roomCode,"QK3W7Z");
assert.equal(visible[1].sender,"Invite Sender");
assert.deepEqual(incomingGameNotifications("person-b",requests,rooms,now).map(item=>item.key),[
  "request:different-person","room:room-other",
]);
assert.deepEqual(incomingGameNotifications(undefined,requests,rooms,now),[],
  "Signed-out users cannot receive personal game notices");

// The visible toast and browser/PWA notifications each have their own
// account-scoped dedup store. Muting the toast never deletes the Inbox record.
const data=new Map();
globalThis.window={
  localStorage:{
    getItem:key=>data.get(key)??null,
    setItem:(key,value)=>data.set(key,value),
  },
};
const displayed=new Set([visible[0].key,visible[1].key]);
saveSeenGameNotifications("person-a","in-app",displayed);
assert.deepEqual([...readSeenGameNotifications("person-a","in-app")].sort(),[
  "request:active-1","room:room-1",
]);
assert.equal(readSeenGameNotifications("person-a","system").size,0,
  "The optional system notification must not be muted by the foreground toast");
assert.equal(readSeenGameNotifications("person-b","in-app").size,0,
  "One player's previous invitations must not affect another player");
assert.deepEqual(visible.filter(item=>!readSeenGameNotifications("person-a","in-app").has(item.key))
  .map(item=>item.key),["request:active-2"],
  "The same two alerts must not reappear on every 10-second refresh");
const many=new Set(Array.from({length:210},(_,i)=>"room:many-"+i));
saveSeenGameNotifications("person-a","in-app",many);
assert.equal(readSeenGameNotifications("person-a","in-app").size,160,
  "Remembered alert IDs must remain storage-bounded");
data.set("halieus-notices-v1:system:person-a","not-json");
assert.equal(readSeenGameNotifications("person-a","system").size,0,
  "A corrupt local notification cache must not break the social UI");
globalThis.window={localStorage:{getItem:()=>{throw Error("restricted");},setItem:()=>{throw Error("restricted");}}};
assert.doesNotThrow(()=>saveSeenGameNotifications("person-a","in-app",displayed),
  "Storage restrictions must never block an invitation response");
assert.equal(readSeenGameNotifications("person-a","in-app").size,0);

console.log("PASS 4.5.5r: recipient-only, pending/unexpired, newest first, request + live-room, account/channel-scoped dedup, bounded and disabled localStorage");
