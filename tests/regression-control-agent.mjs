import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const contract = read("shared/platform/control.ts");
const agent = read("server/src/control-agent.ts");
const rootPackage = JSON.parse(read("package.json"));
const serverPackage = JSON.parse(read("server/package.json"));
const masterbook = read("docs/HGR_MASTERBOOK.md");
const controlDoc = read("docs/HGR_MOBILE_CONTROL.md");
const docsIndex = read("docs/README.md");
const projectReadme = read("README.md");
const controlStartHelper = read("scripts/windows/start-control-agent.ps1");
const controlClientHelper = read("scripts/windows/hgr-control-client.ps1");
const controlLauncher = read("Start HGR Control.cmd");
const controlLauncherAlias = read("Start-HGR-Control.cmd");
const controlClientEntry = read("HGR-Control.cmd");
const controlRestartBridge = read("scripts/windows/control-restart.ps1");
const gitignore = read(".gitignore");

for (const id of [
  "status",
  "start",
  "restart",
  "close",
  "update",
  "logs",
  "open-site",
  "open-github",
]) {
  assert.match(contract, new RegExp(`id: "${id}"`), `HGR Control contract must include ${id}`);
}

assert.doesNotMatch(
  contract,
  /(?:command|executable|shell|argv|args)\s*:/i,
  "Phone-facing control contract must never expose arbitrary command/executable fields",
);
assert.match(
  contract,
  /id: "restart"[\s\S]*?without updating or deploying/s,
  "Restart must remain troubleshooting-only in the shared control contract",
);
assert.match(
  contract,
  /id: "update"[\s\S]*?update\/validation\/deploy flow[\s\S]*?restart on success/s,
  "Update must retain the full update/deploy/restart responsibility",
);
assert.match(
  contract,
  /id: "close"[\s\S]*?confirmation: "confirm"/s,
  "Close must require confirmation",
);
assert.match(
  contract,
  /id: "update"[\s\S]*?confirmation: "confirm"/s,
  "Update must require confirmation",
);

assert.match(agent, /function isHgrRepositoryRoot\(candidate: string\)/, "Control agent must verify the real HGR repository root rather than any VERSION file");
assert.match(agent, /metadata\.name === "halieus-game-room"/, "Control agent must identify the root package by the canonical repository package name");
assert.match(agent, /existsSync\(resolve\(candidate, "client"\)\)[\s\S]*?existsSync\(resolve\(candidate, "server"\)\)[\s\S]*?existsSync\(resolve\(candidate, "shared"\)\)/s, "Control root detection must require the HGR workspace directories");
assert.doesNotMatch(agent, /candidates\.find\(\(candidate\) => existsSync\(resolve\(candidate, "VERSION"\)\)\)/, "A nested VERSION file must never be enough to identify the repository root");
assert.match(agent, /HGR_CONTROL_HOST\?\.trim\(\) \|\| "127\.0\.0\.1"/, "Control agent must bind to loopback by default");
assert.match(agent, /HGR_CONTROL_PORT \|\| "43127"/, "Control agent must keep one documented default port");
assert.match(agent, /Refusing to expose HGR Control beyond loopback without HGR_CONTROL_TOKEN/, "Non-loopback control must require a token");
assert.match(agent, /request\.method === "GET" && request\.url === "\/api\/status"/, "Foundation agent must expose a read-only status endpoint");
assert.match(agent, /implemented: action\.id === "status" \|\| action\.id === "restart" \|\| action\.id === "logs"/, "Stage 2 must expose only status, restart and logs as implemented");
assert.match(agent, /execFileAsync\("git"/, "Foundation agent may use fixed read-only Git inspection");
assert.match(agent, /gitValue\(\["status", "--porcelain", "--untracked-files=no"\], true\)/, "Clean git status output must be preserved as an empty string rather than null");
assert.match(agent, /dirty: porcelain === null \? null : porcelain\.length > 0/, "Repository dirty state must distinguish clean false from unavailable null");
assert.doesNotMatch(agent, /\bexec\s*\(/, "Control agent must not use shell exec");
assert.doesNotMatch(agent, /\bspawn\s*\(/, "Control agent foundation must not spawn arbitrary processes");
assert.doesNotMatch(agent, /request\.(?:body|query)[\s\S]*?(?:command|exe|args)/i, "Control endpoint must not accept arbitrary execution input");
assert.match(agent, /timingSafeEqual\(expectedBytes, providedBytes\)/, "Bearer token comparison must use timing-safe equality");
assert.match(agent, /Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions/, "Mutable actions must refuse to run without an explicit token");
assert.match(agent, /request\.method === "POST" && request\.url === "\/api\/actions\/restart"/, "Restart must be exposed only through the fixed restart endpoint");
assert.match(agent, /const restartScript = resolve\(projectRoot, "Restart Halieus Game Room\.cmd"\)/, "Restart action must map to the fixed repository restart launcher");
assert.match(agent, /const restartBridge = resolve\(projectRoot, "scripts", "windows", "control-restart\.ps1"\)/, "Restart action must use the fixed Windows bridge");
assert.match(agent, /execFileAsync\([\s\S]*?"powershell\.exe"[\s\S]*?"-File",[\s\S]*?restartBridge/s, "Restart action must invoke the fixed bridge without cmd.exe quoting");
assert.doesNotMatch(agent, /ComSpec|cmd\.exe[\s\S]*?restartScript/i, "Control Agent must not launch the spaced restart CMD through cmd.exe quoting");
assert.match(agent, /activeOperation: HalieusControlActiveOperation \| null = null/, "Mutable control actions must have a single-operation lock");
assert.match(agent, /if \(activeOperation\)/, "Restart must reject concurrent mutable operations");
assert.match(agent, /hgr-control-audit\.ndjson/, "Mutable actions must write a dedicated audit trail");
assert.match(agent, /state: "running"/, "Restart audit must record operation start");
assert.match(agent, /state: "succeeded"/, "Restart audit must record success");
assert.match(agent, /state: "failed"/, "Restart audit must record failure");
assert.match(agent, /request\.method === "GET" && request\.url === "\/api\/logs"/, "Authenticated audit log endpoint must exist");
assert.doesNotMatch(agent, /execFileAsync\([^,]+,\s*request\./s, "Request data must never become an executable or command path");
assert.doesNotMatch(agent, /restartScript\s*=\s*request\./, "Restart script path must never come from the request");

assert.equal(rootPackage.scripts["control:dev"], "npm --workspace server run control:dev");
assert.equal(rootPackage.scripts["control:start"], "npm --workspace server run control:start");
assert.equal(serverPackage.scripts["control:dev"], "tsx src/control-agent.ts");
assert.equal(serverPackage.scripts["control:start"], "node dist/server/src/control-agent.js");
assert.match(rootPackage.scripts["test:regression"], /regression-control-agent\.mjs/, "Control regression must remain in the full regression chain");

assert.match(masterbook, /Living project summary and engineering map/, "Masterbook must state its source-of-truth role");
assert.match(masterbook, /human-directed, AI-assisted engineering/i, "Masterbook must document HGR's development model");
assert.match(masterbook, /HGR Control — phone launcher\/control plane/, "Masterbook must include the mobile-control architecture");
assert.match(controlDoc, /The goal is not “remote command prompt from a phone\.”/, "Control documentation must reject generic remote-shell design");
assert.match(controlDoc, /Loopback by default/, "Control documentation must explain the initial network boundary");
assert.match(controlDoc, /Stage A — understand one GET endpoint/, "Control documentation must contain the guided implementation walkthrough");
assert.match(controlDoc, /POST \/api\/actions\/restart/, "Control documentation must explain the authenticated restart endpoint");
assert.match(controlStartHelper, /node -e "process\.stdout\.write\(require\('node:crypto'\)\.randomBytes\(32\)\.toString\('base64'\)\)"/, "Control launcher helper must use HGR's Node runtime for cryptographic token generation");
assert.doesNotMatch(controlDoc, /node -e "process\.stdout\.write\(require\('node:crypto'\)\.randomBytes\(32\)/, "Operator docs must not require manual token generation now that the launcher owns it");
assert.match(controlDoc, /\.\\Start HGR Control\.cmd/, "Control walkthrough must use the stable local Control launcher");
assert.match(controlDoc, /hgr-control-client\.ps1 status/, "Control walkthrough must use the allow-listed local client helper for status");
assert.match(controlDoc, /hgr-control-client\.ps1 restart/, "Control walkthrough must use the allow-listed local client helper for restart");
assert.doesNotMatch(controlDoc, /Set-Clipboard|Get-Clipboard|PASTE-THE-TOKEN-HERE/, "Control walkthrough must not depend on fragile clipboard/manual token handoff");
assert.doesNotMatch(controlDoc, /RandomNumberGenerator\]::(?:Create|GetBytes)/, "Control docs must not depend on PowerShell/.NET RNG API differences");
assert.match(controlDoc, /one mutable operation at a time/i, "Control documentation must explain the operation lock");
assert.match(controlDoc, /hgr-control-audit\.ndjson/, "Control documentation must identify the local audit trail");
assert.match(docsIndex, /HGR_MASTERBOOK\.md/, "Documentation index must expose the Masterbook");
assert.match(docsIndex, /HGR_MOBILE_CONTROL\.md/, "Documentation index must expose HGR Mobile Control");
assert.match(projectReadme, /docs\/HGR_MASTERBOOK\.md/, "Root README must link the Masterbook");
assert.match(controlStartHelper, /randomBytes\(32\)\.toString\('base64'\)/, "Local Control launcher helper must generate a cryptographic token with Node");
assert.match(controlStartHelper, /server\\data\\runtime/, "Local Control launcher helper must store transient state only in ignored runtime data");
assert.match(controlStartHelper, /Remove-Item -LiteralPath \$tokenPath -Force/, "Local Control launcher helper must remove the temporary token when it exits");
assert.doesNotMatch(controlStartHelper, /Write-Host\s+\$token|Write-Output\s+\$token/, "Local Control launcher must not print the bearer token");
assert.match(controlClientHelper, /ValidateSet\("status", "restart", "logs"\)/, "Local Control client must expose only the approved development actions");
assert.match(controlClientHelper, /"restart"[\s\S]*?\/api\/actions\/restart/s, "Local Control restart helper must target only the fixed restart endpoint");
assert.doesNotMatch(controlClientHelper, /Invoke-Expression|Start-Process|cmd\.exe|powershell\.exe/i, "Local Control client must not become a general process runner");
assert.match(controlLauncher, /start-control-agent\.ps1/i, "Stable HGR Control CMD entrypoint must delegate to the fixed PowerShell helper");
assert.match(controlLauncherAlias, /call "%~dp0Start HGR Control\.cmd"/i, "PowerShell-safe HGR Control alias must delegate to the canonical spaced launcher");
assert.match(controlClientEntry, /hgr-control-client\.ps1/i, "Stable HGR Control client entrypoint must delegate to the allow-listed PowerShell client");
assert.match(controlStartHelper, /HGR-Control\.cmd' status/, "Running agent must print an absolute status client command");
assert.match(controlStartHelper, /HGR-Control\.cmd' restart/, "Running agent must print an absolute restart client command");
assert.match(controlStartHelper, /HGR-Control\.cmd' logs/, "Running agent must print an absolute logs client command");
assert.match(controlDoc, /\.\\Start-HGR-Control\.cmd/, "PowerShell walkthrough must use the no-space launcher alias");
assert.match(controlDoc, /\.\\HGR-Control\.cmd status/, "PowerShell walkthrough must use the stable root Control client");
assert.match(gitignore, /server\/data\/runtime\//, "Temporary HGR Control token and audit files must remain ignored by Git");
assert.match(controlRestartBridge, /Join-Path \$projectRoot "Restart Halieus Game Room\.cmd"/, "Windows restart bridge must resolve only the canonical restart launcher");
assert.match(controlRestartBridge, /& \$restartLauncher/, "Windows restart bridge must invoke the fixed launcher path directly");
assert.doesNotMatch(controlRestartBridge, /param\([\s\S]*?Command|Invoke-Expression|Start-Process/i, "Windows restart bridge must not accept or evaluate arbitrary commands");

console.log("HGR Control foundation / Masterbook regression: PASS");
