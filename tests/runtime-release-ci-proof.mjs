import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { validateReleaseCiProof } from "../scripts/verify-release-ci-proof.mjs";

const repo = "elijahama/halieus-game-room";
const sha = "a".repeat(40), parent = "b".repeat(40), sourceHash = "c".repeat(64);
const fixture = () => ({
  local: {commitSha:sha,version:"4.8.7",fingerprint:"hgr-4.8.7-"+sourceHash.slice(0,16),sourceHash},
  commit: {sha,parents:[{sha:parent}],commit:{message:"chore: refresh HGR release identity"}},
  status: {sha,statuses:[{context:"hgr/validated-release-v1",state:"success",creator:{login:"github-actions[bot]",type:"Bot"},description:"sha256:"+sourceHash,target_url:"https://github.com/"+repo+"/actions/runs/123/attempts/2"}]},
  run: {id:123,run_attempt:2,repository:{full_name:repo},head_repository:{full_name:repo},path:".github/workflows/release-identity.yml",head_branch:"main",event:"push",head_sha:parent,status:"completed",conclusion:"success"},
  jobs:{total_count:2,jobs:["refresh-release-identity","updater-windows-full-validation"].map(name=>({name,run_id:123,run_attempt:2,status:"completed",conclusion:"success"}))}
});
assert.equal(validateReleaseCiProof(fixture()).verified,true);
const current=fixture();current.run.head_sha=sha;assert.equal(validateReleaseCiProof(current).verified,true);
const cases = [
  x=>{x.local.fingerprint="hgr-4.8.7-invalid";},
  x=>{x.commit.sha=parent;},
  x=>{x.run.head_sha="d".repeat(40);},
  x=>{x.commit.parents.push({sha:"d".repeat(40)});},
  x=>{x.commit.commit.message="manual identity";},
  x=>{x.run.repository.full_name="fork/halieus-game-room";},
  x=>{x.run.head_repository.full_name="fork/halieus-game-room";},
  x=>{x.run.head_branch="feature";},
  x=>{x.run.path=".github/workflows/pull-request-validation.yml";},
  x=>{x.run.event="pull_request";},
  x=>{x.run.conclusion="failure";},
  x=>{x.run.status="in_progress";},
  x=>{x.status.sha=parent;},
  x=>{x.status.statuses=[];},
  x=>{x.status.statuses[0].state="failure";},
  x=>{x.status.statuses[0].creator.login="owner";},
  x=>{x.status.statuses[0].description="sha256:"+"d".repeat(64);},
  x=>{x.status.statuses[0].target_url="https://github.com/"+repo+"/actions/runs/123/attempts/1";},
  x=>{x.status.statuses.push({...x.status.statuses[0]});},
  x=>{x.jobs.total_count=3;},
  x=>{x.jobs.jobs[1].name="updater-windows-smoke";},
  x=>{x.jobs.jobs[1].run_attempt=1;},
  x=>{x.jobs.jobs[1].run_id=456;},
  x=>{x.jobs.jobs[1].conclusion="skipped";},
  x=>{x.jobs.jobs[1].conclusion="failure";}
];
for (const mutate of cases) {const data=fixture();mutate(data);assert.equal(validateReleaseCiProof(data).verified,false);}
assert.equal(validateReleaseCiProof().verified,false);
console.log("PASS exact release CI proof: 2 acceptance and "+(cases.length+1)+" rejection fixtures; no deployment authorization");

const workflow = readFileSync(new URL("../.github/workflows/release-identity.yml", import.meta.url),"utf8");
assert.match(workflow,/updater-windows-full-validation:\s*\n\s*needs: refresh-release-identity/);
assert.match(workflow,/publish-fast-path-receipt:\s*\n\s*needs: \[refresh-release-identity, updater-windows-full-validation\]/);
assert.match(workflow,/ref: \$\{\{ needs\.refresh-release-identity\.outputs\.release_sha \}\}/);
assert.ok(workflow.includes("Release identity changed during Linux validation."));
assert.ok(workflow.includes("Validated source hash changed"));
assert.ok(workflow.includes("gh api --method POST"));
assert.ok(workflow.includes("context=hgr/validated-release-v1"));
assert.ok(workflow.includes("description=sha256:$SOURCE_HASH"));
assert.ok(workflow.includes("actions/runs/$GITHUB_RUN_ID/attempts/$GITHUB_RUN_ATTEMPT"));
