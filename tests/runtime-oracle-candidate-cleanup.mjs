import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, stat, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const installer = await readFile(new URL("./dev-tools/Oracle Quick Deploy/quick-install.sh", import.meta.url), "utf8");
const block = installer.split("# BEGIN OWNED CANDIDATE CLEANUP\n")[1]?.split("# END OWNED CANDIDATE CLEANUP")[0];
assert.ok(block, "Test the actual installer exit handler");
assert.match(installer, /mktemp -d "\$\{APP_DIR\}\.candidate-\$\{STAMP\}\.XXXXXX"/);
assert.match(installer, /chmod 0755 "\$CANDIDATE_DIR"/);
assert.match(installer, /mv "\$CANDIDATE_DIR" "\$APP_DIR"[\s\S]*?CANDIDATE_DIR=""/);
assert.match(installer, /if ! flock -n 9; then/);
const syntax = spawnSync("bash", ["-n"], { input: installer, encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr);
const root = await mkdtemp(join(tmpdir(), "hgr-candidate-cleanup-"));
const app = join(root,"app"), backup = app+".backup-old", prior = app+".candidate-old", failed = app+".failed-old", data = join(root,"data");
const exists = async p => stat(p).then(()=>true,()=>false);
const make = async p => { await mkdir(p); await writeFile(join(p,"marker"),"preserve"); };
try {
  for (const p of [app,backup,prior,failed,data]) await make(p);
  const run = async (suffix, action, expected) => {
    const stage=join(root,"stage-"+suffix), candidate=app+".candidate-"+suffix;
    await make(stage); await make(candidate);
    const out=spawnSync("bash",["-c", "set -euo pipefail\n"+block+"\n"+action],{env:{...process.env,APP_DIR:app,STAGE:stage,CANDIDATE_DIR:candidate},encoding:"utf8"});
    assert.equal(out.status,expected,out.stderr);
    assert.equal(await exists(stage),false,"owned stage removed");
    assert.equal(await exists(candidate),false,"owned candidate removed or promoted");
    for (const p of [backup,prior,failed,data]) assert.equal(await readFile(join(p,"marker"),"utf8"),"preserve",p);
  };
  await run("refused","exit 19",19);
  assert.equal(await readFile(join(app,"marker"),"utf8"),"preserve");
  await run("build-error","false",1);
  await run("success",'mv "$APP_DIR" "$APP_DIR.backup-promoted"\nmv "$CANDIDATE_DIR" "$APP_DIR"\nCANDIDATE_DIR=""\nexit 0',0);
  assert.equal(await readFile(join(app,"marker"),"utf8"),"preserve");
  assert.equal(await exists(app+".backup-promoted"),true);
  const link=app+".candidate-link";
  await symlink(data,link,"dir");
  const out=spawnSync("bash",["-c", "set -euo pipefail\n"+block+"\nexit 3"],{env:{...process.env,APP_DIR:app,STAGE:"",CANDIDATE_DIR:link},encoding:"utf8"});
  assert.equal(out.status,3);
  assert.equal(await readFile(join(data,"marker"),"utf8"),"preserve");
  assert.equal(await exists(link),true);
  console.log("PASS Oracle candidate cleanup: refusal, failure, promotion, exit status, protected prior candidates, backup, data and symlink");
} finally { await rm(root,{recursive:true,force:true}); }
