import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  classifyRelease, newerRelease, currentReleaseAvailability,
  RELEASE_AVAILABILITY_TTL_MS, verifyPackagedRelease, createControlReleaseCheck
} from "../server/src/platform/control-release-availability.ts";

const valid=(version,hashChar="a")=>{
  const sourceHash=hashChar.repeat(64);
  return {
    product:"Halieus Game Room",version,sourceHash,algorithm:"sha256",
    fingerprint:"hgr-"+version+"-"+sourceHash.slice(0,16),
    integrityFileCount:592,
  };
};
const now="2026-11-03T04:00:00.000Z";
assert.equal(newerRelease("4.7.14","4.7.13"),true);
assert.equal(newerRelease("4.8.0","4.7.99"),true);
assert.equal(newerRelease("5.0.0","4.9.9"),true);
assert.equal(newerRelease("4.7.13","4.7.13"),false);
assert.equal(newerRelease("4.7.12","4.7.13"),false);
assert.equal(newerRelease("4.8.5","4.9.0"),false);
assert.equal(newerRelease("5.0.0","5.0.5"),false);
assert.equal(newerRelease("4.85","4.8.0"),false);
assert.equal(newerRelease("abc","4.7.13"),false);
assert.equal(RELEASE_AVAILABILITY_TTL_MS,300000);
const installedFingerprint="hgr-4.7.13-"+ "a".repeat(16);
const options=(doc,version="4.7.13",fingerprint=installedFingerprint)=>
  classifyRelease(doc,version,fingerprint,now);
assert.equal(options(valid("4.7.14")).status,"available");
assert.equal(options(valid("4.8.5")).status,"available");
assert.equal(options(valid("4.7.13")).status,"current");
assert.equal(options(valid("4.7.12")).status,"unverified","older main is never an upgrade");
assert.equal(options(valid("4.7.13","b")).status,"unverified","same version changed fingerprint is not an approved update");
assert.equal(options({...valid("4.8.0"),fingerprint:"forged"}).status,"unverified");
assert.equal(options({...valid("4.8.0"),sourceHash:"Z".repeat(64)}).status,"unverified");
assert.equal(options({...valid("4.8.0"),integrityFileCount:0}).status,"unverified");
assert.equal(options({...valid("4.8.0"),product:"Another product"}).status,"unverified");
assert.equal(options(null).status,"unverified");

let fetchCount=0;
const fetcher=async (url,options)=>{
  fetchCount++;
  assert.equal(url,"https://raw.githubusercontent.com/elijahama/halieus-game-room/main/RELEASE.json");
  assert.equal(options.redirect,"error");
  return {ok:true,json:async()=>valid("99.0.0")};
};
const response=await currentReleaseAvailability(fetcher);
assert.equal(response.status,"available");
assert.equal(response.candidateVersion,"99.0.0");
assert.equal((await currentReleaseAvailability(fetcher)).candidateVersion,"99.0.0");
assert.equal(fetchCount,1,"cache avoids continuous upstream fetches");

const server=await readFile(new URL("../server/src/platform/control-cloud-ui-preload.ts",import.meta.url),"utf8");
const page=await readFile(new URL("../client/public/control/index.html",import.meta.url),"utf8");
const js=await readFile(new URL("../client/public/control/release-notice.js",import.meta.url),"utf8");
assert.match(server,/path === "\/control\/release-availability"/);
assert.match(server,/async function serveReleaseAvailability[\s\S]*if \(!hasAdmin\(request\)\)/);
assert.match(server,/sendJson\(response, 503, \{ ok: false, reason: "Release availability could not be verified\."/);
assert.match(page,/id="controlReleaseNotice"[\s\S]*id="controlReleaseReview"/);
assert.match(page,/release-notice\.js\?v=control-release-notice-1/);
assert.match(js,/credentials: "include"/);
assert.match(js,/release\.status !== "available"/);
assert.doesNotMatch(js,/innerHTML|location\.href|fetch\([^)]*,\s*\{\s*method:\s*"POST"/i);
console.log("PASS Control release availability: only valid newer merged-main RELEASE identity not dev PRs, same-version mismatch rejects, admin-only/no-store, cached GitHub discovery and read-only UI");


// A newer manifest alone must never trigger the background alert.
const candidate = options(valid("4.8.0"));
const head = "a".repeat(40);
const parent = "b".repeat(40);
const commit = { sha: head, parents: [{sha:parent}], commit:{message:"chore: refresh HGR release identity"} };
const run = {head_sha:parent,head_branch:"main",path:".github/workflows/release-identity.yml",status:"completed",conclusion:"success"};
function githubFixture({commitDoc=commit,manifest=valid("4.8.0"),runs=[run]}={}) {
  return async url => ({
    ok:true,
    json:async()=>url.endsWith("/commits/main") ? commitDoc :
      url.endsWith("/"+head+"/RELEASE.json") ? manifest :
      url.includes("head_sha="+parent) ? {workflow_runs:runs} : null,
  });
}
assert.equal(await verifyPackagedRelease(candidate,githubFixture()),true);
assert.equal(await verifyPackagedRelease(candidate,githubFixture({runs:[{...run,status:"in_progress",conclusion:null}]})),false);
assert.equal(await verifyPackagedRelease(candidate,githubFixture({runs:[{...run,conclusion:"failure"}]})),false);
assert.equal(await verifyPackagedRelease(candidate,githubFixture({runs:[{...run,head_sha:"c".repeat(40)}]})),false);
assert.equal(await verifyPackagedRelease(candidate,githubFixture({manifest:valid("4.8.0","c")})),false);
assert.equal(await verifyPackagedRelease(candidate,githubFixture({commitDoc:{...commit,commit:{message:"unpackaged changes"}}})),false);
assert.equal(await verifyPackagedRelease(candidate,async()=>{throw Error("offline")}),false);

let subscribers=false, reads=0, sends=0, ready=false, needs=true;
let releaseGate;
const check=createControlReleaseCheck({
  hasSubscribers:()=>subscribers,
  readRelease:async()=>{reads++;return candidate;},
  needsNotice:()=>needs,
  verify:async()=>{if(releaseGate)await releaseGate;return ready;},
  notify:async()=>{sends++;needs=false;},
});
await check();assert.equal(reads,0,"no opted-in device means no upstream polling");
subscribers=true;await check();assert.equal(sends,0,"unverified package cannot notify");
ready=true;let resolveGate;releaseGate=new Promise(resolve=>{resolveGate=resolve;});
const firstCheck=check();await check();assert.equal(reads,2,"overlapping checks are suppressed");
resolveGate();await firstCheck;assert.equal(sends,1);
await check();assert.equal(sends,1,"already reserved release cannot notify again");
const push=await readFile(new URL("../server/src/platform/pushNotifications.ts",import.meta.url),"utf8");
const sw=await readFile(new URL("../client/public/control/sw.js",import.meta.url),"utf8");
assert.match(push,/setInterval\(\(\) => \{ void check\(\); \}, RELEASE_AVAILABILITY_TTL_MS\)/);
assert.match(push,/item\.lastReleaseFingerprint = fingerprint;[\s\S]*?await save\(\);[\s\S]*?webPush\.sendNotification/);
assert.match(push,/role === "owner" \|\| role === "admin"/);
assert.match(sw,/\/control\/\?review=update/);
assert.match(sw,/\/notification-badges\/control\.png/);
console.log("PASS Control background release discovery: verified workflow, exact pinned manifest, no overlapping checks, opt-in suppression and durable reservation source guards");
