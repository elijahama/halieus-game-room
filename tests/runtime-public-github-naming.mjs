import assert from "node:assert/strict";
import { checkPublicNameEvent, publicNameViolations } from "../scripts/check-public-github-naming.mjs";

assert.deepEqual(publicNameViolations({ title:"fix(mobile): flat Join control (4.6.7)",branch:"fix/mobile-join-flat-control-fullscreen" }),[]);
assert.deepEqual(publicNameViolations({ title:"HGR Part 33 — Fix", branch:"fix/mobile-join" }),["PR title"]);
assert.deepEqual(publicNameViolations({ title:"fix: stable fullscreen",branch:"feat/part33-fullscreen" }),["PR branch"]);
assert.deepEqual(publicNameViolations({ title:"fix: stable fullscreen",branch:"feat/part-33-fullscreen" }),["PR branch"]);
assert.deepEqual(checkPublicNameEvent({pull_request:{
  created_at:"2026-10-26T23:00:00Z",title:"HGR Part 33",head:{ref:"feat/part33-history"},
}}),{enforced:false,violations:[]},"Older PRs remain available without blocking CI");
assert.deepEqual(checkPublicNameEvent({pull_request:{
  created_at:"2026-10-27T05:00:00Z",title:"fix: new PR",head:{ref:"fix/control-fullscreen"},
}}),{enforced:true,violations:[]});
assert.deepEqual(checkPublicNameEvent({pull_request:{
  created_at:"2026-10-27T05:00:00Z",title:"Part 33 update",head:{ref:"feat/part33-branch"},
}}),{enforced:true,violations:["PR title","PR branch"]});
assert.deepEqual(checkPublicNameEvent({pull_request:{
  created_at:"INVALID",title:"fix: update",head:{ref:"fix/update"},
}}),{enforced:true,violations:["Missing PR creation date"]});
console.log("PASS HGR public GitHub naming: descriptive names, legacy PR continuity, enforce newly created PRs");
