import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import net from "node:net";

const project = resolve(import.meta.dirname, "..");
const code = readFileSync(join(project, "server/src/control-agent.ts"), "utf8");
assert.match(code, /const gameRoot = configuredGameRoot \? resolve\(configuredGameRoot\) : projectRoot/);
assert.match(code, /if \(!isHgrRepositoryRoot\(gameRoot\)\)/);
for (const name of ["startScript","restartScript","closeScript","startBridge","restartBridge","closeBridge"]) {
  assert.match(code, new RegExp("const " + name + " = resolve\\(gameRoot, "));
}
assert.match(code, /const updateBridge = resolve\(projectRoot, "scripts", "windows", "control-update\.ps1"\)/);
assert.match(code, /const auditDirectory = resolve\(projectRoot, "server", "data", "runtime"\)/);
assert.match(code, /cwd: gameRoot/);
assert.match(code, /readFile\(resolve\(gameRoot, "VERSION"\)/);

const fixture = mkdtempSync(join(tmpdir(), "hgr-control-split-"));
const fakeGame = join(fixture,"game");
const executeGit = (args) => {
  const out = spawnSync("git", args, {cwd: fakeGame, encoding:"utf8"});
  assert.equal(out.status, 0, out.stderr);
};
let child;
try {
  mkdirSync(fakeGame);
  for (const dir of ["server", "client", "shared"]) mkdirSync(join(fakeGame,dir));
  writeFileSync(join(fakeGame,"VERSION"),"9.8.7\n");
  writeFileSync(join(fakeGame,"package.json"),JSON.stringify({name:"halieus-game-room",version:"9.8.7"}));
  executeGit(["init","-b","feature-fixture"]);
  executeGit(["add","."]);
  executeGit(["-c","user.name=HGR Test", "-c","user.email=hgr-test@example.invalid", "commit","-m","test fixture"]);
  const port = await new Promise((res,rej) => {
    const s=net.createServer();s.once("error",rej);s.listen(0,"127.0.0.1",() => {
      const p=s.address().port;s.close(()=>res(p));
    });
  });
  const token = "synthetic-control-test-token-not-real";
  child = spawn(process.execPath, ["--import", "tsx", "server/src/control-agent.ts"], {
    cwd:project, stdio:["ignore","pipe","pipe"],
    env: {
      ...process.env, HGR_CONTROL_GAME_ROOT:fakeGame,
      HGR_CONTROL_HOST:"127.0.0.1", HGR_CONTROL_PORT:String(port),
      HGR_CONTROL_TOKEN:token,
      HGR_CONTROL_PAIR_CODE:"", HGR_CONTROL_PAIR_EXPIRES_AT:"0",
    }
  });
  let exited=false, output="";
  child.once("exit",()=>{exited=true});
  child.stdout.on("data",x=>{output+=String(x)});
  child.stderr.on("data",x=>{output+=String(x)});
  let status;
  for(let attempt=0; attempt<60; attempt++){
    if(exited) throw new Error("Local Control listener exited: "+output.slice(-900));
    try {
      const response=await fetch("http://127.0.0.1:"+port+"/api/status",{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(1000)});
      if(response.ok){status=await response.json();break;}
    }catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(status,"Cannot reach isolated Control listener: "+output.slice(-900));
  assert.equal(status.hgrVersion,"9.8.7","Status must describe game checkout not Control source checkout");
  assert.equal(status.repository.branch,"feature-fixture","Git operations must target owner game root");
  assert.equal(status.repository.dirty,false);
  const response=await fetch("http://127.0.0.1:"+port+"/api/actions/update",{
    method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({confirmation:"not-approved"}),
  });
  assert.ok(!response.ok,"Unapproved Update must be refused");
  assert.equal(existsSync(join(fakeGame,"scripts")),false,"Fixture launcher must not run");
  console.log("PASS Control split roots: owner game branch/version and action launchers preserved; updater source isolated; unauthorised Update rejected");
} finally {
  if(child) {
    child.kill();
    if(process.platform==="win32"){spawnSync("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,encoding:"utf8",timeout:6000});}
  }
  rmSync(fixture,{recursive:true,force:true});
}
