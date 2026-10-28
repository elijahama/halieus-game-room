import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

const [
  serverRelay,
  uiRelay,
  ownerBridge,
  cloudUi,
  startCmd,
  stopCmd,
  updateBridge,
  rootUpdater,
  refreshControl,
  service,
  contract,
] = await Promise.all([
  read("server/src/platform/control-cloud-server-preload.ts"),
  read("server/src/platform/control-cloud-ui-preload.ts"),
  read("server/src/control-cloud-agent.ts"),
  read("client/public/control/cloud-update.js"),
  read("Start HGR Control.cmd"),
  read("Stop HGR Control.cmd"),
  read("scripts/windows/control-update.ps1"),
  read("Update HGR GitHub.cmd"),
  read("scripts/windows/refresh-control-after-update.ps1"),
  read("deploy/oracle/halieus-game-room.service"),
  read("shared/platform/control-cloud.ts"),
]);

assert.match(contract, /"update"/);
assert.match(serverRelay, /\/control\/cloud\/actions\/update\/confirm/);
assert.match(serverRelay, /\/control\/cloud\/actions\/update/);
assert.match(serverRelay, /exactKeys\(body, \["deviceId", "confirmationId"\]\)/);
assert.match(serverRelay, /Cross-origin Control requests are not accepted/);
assert.match(serverRelay, /Owner or administrator access is required/);
assert.doesNotMatch(serverRelay, /node:child_process|execFile|spawn\(/, "Cloud relay must never execute owner-PC commands itself");
assert.doesNotMatch(serverRelay, /body\.(command|path|args|executable|shell)/, "Cloud requests must not accept free-form command fields");

assert.match(ownerBridge, /https:\/\/halieus\.remotewire\.net/);
assert.match(ownerBridge, /\/api\/confirm/);
assert.match(ownerBridge, /\/api\/actions\/update/);
assert.match(ownerBridge, /action: "update"/);
assert.doesNotMatch(ownerBridge, /node:child_process|execFile|spawn\(/, "Outbound bridge must delegate to the existing fixed local Control Agent");
assert.match(ownerBridge, /LIFECYCLE_ACTIONS\.has\(poll\.request\.action as LifecycleAction\)/, "Later approved lifecycle actions use an exact allowlist");

assert.match(startCmd, /start-control\.ps1/);
assert.match(startCmd, /start-control-cloud\.ps1/);
assert.match(stopCmd, /stop-control-cloud\.ps1/);
assert.match(stopCmd, /stop-control\.ps1/);
assert.match(updateBridge, /hgr-control-update-result\.json/);
assert.match(updateBridge, /HGR_UPDATE_NONINTERACTIVE/);
assert.match(rootUpdater, /HGR_UPDATE_SNAPSHOT/,"The tracked updater must execute from a stable snapshot before Git can replace itself");
assert.match(rootUpdater, /copy \/Y "%~f0" "!HGR_UPDATE_SNAPSHOT_PATH!"/,"Updater must snapshot its own current bytes before STEP 1");
assert.match(rootUpdater, /pushd "%HGR_PROJECT_ROOT%"/,"Snapshot execution must continue from the real HGR repository root");
assert.doesNotMatch(rootUpdater, /pushd "%~dp0"/,"The temp snapshot must never treat the TEMP directory as the HGR repository root");
assert.match(rootUpdater, /STEP 7B - Safe re-push check/,"Updater must check for validated local commits that are still ahead of GitHub");
assert.match(rootUpdater, /commits ahead of GitHub\./, "Repush block output must not contain CMD-breaking literal parentheses");
assert.doesNotMatch(rootUpdater, /commit\(s\) ahead/, "Parenthesized echo caused Windows 'ahead was unexpected' regression");
assert.match(rootUpdater, /git remote get-url %REMOTE%/, "Updater must report effective remote URL after migration");
assert.match(rootUpdater, /git config --get remote\.origin\.url/, "Updater must examine the configured origin before changing any URL");
assert.match(rootUpdater, /Laijee27\/halieus-game-room\.git/, "Only the known legacy owner mapping may be migrated");
assert.match(rootUpdater, /git remote set-url %REMOTE% "!HGR_CANONICAL_ORIGIN!"/, "Updater must safely migrate the HGR origin URL without rewriting history");
assert.match(rootUpdater, /if defined HGR_CANONICAL_ORIGIN \(/, "No other Git remote must be changed");
assert.match(await read("package.json"), /github\.com\/elijahama\/halieus-game-room\.git/, "Repository metadata must use the verified current owner");
const lifecycleTest = await read("tests/runtime-control-lifecycle.mjs");
const isolatedPowerShell = await read("tests/runtime-control-update.ps1");
assert.match(lifecycleTest, /delete isolatedTestEnvironment\.HGR_CONTROL_DEFER_REFRESH/, "Cloud Update must not contaminate the mocked lifecycle regression process");
assert.match(lifecycleTest, /env: isolatedTestEnvironment/, "Isolated environment must actually be passed to the test subprocess");
assert.match(isolatedPowerShell, /Remove-Item Env:HGR_CONTROL_DEFER_REFRESH -ErrorAction SilentlyContinue/, "Direct PowerShell fixture execution must also be isolated");
assert.match(isolatedPowerShell, /Cloud Update deferral must retain the captured Control snapshot/, "Deferred restart protection must remain explicitly tested");
assert.match(rootUpdater, /\[STOPPED\] GitHub sync and build completed, but WEBSITE DEPLOYMENT DID NOT RUN/, "A missing Oracle helper must never return a false Update success");
assert.doesNotMatch(rootUpdater, /goto :PAUSE_SUCCESS|:PAUSE_SUCCESS/, "The updater must not report completed when deploy is skipped");
assert.match(rootUpdater, /if \/i not "%HGR_UPDATE_NONINTERACTIVE%"=="1" \([\s\S]*?pause[\s\S]*?\)/, "Manual updater success must keep result visible without blocking remote Control");
assert.match(rootUpdater, /git merge-base --is-ancestor %REMOTE%\/%BRANCH% HEAD/,"Safe re-push must refuse divergent history");
assert.match(rootUpdater, /git rev-list --count %REMOTE%\/%BRANCH%\.\.HEAD/,"Safe re-push must count pending local commits");
assert.match(rootUpdater, /git push %REMOTE% %BRANCH%[\s\S]*Safe re-push failed/,"Ahead commits must be pushed without force");
assert.doesNotMatch(rootUpdater, /^\s*git\s+push\s+(?:--force|-f)\b/im,"Updater must never execute a force-push during re-push");
assert.match(refreshControl, /start-control-cloud\.ps1/);
assert.match(refreshControl, /in-flight cloud Update is not killed/);

assert.match(service, /--import \/opt\/halieus-game-room\/server\/dist\/server\/src\/platform\/control-cloud-server-preload\.js/);
assert.match(service, /--import \/opt\/halieus-game-room\/server\/dist\/server\/src\/platform\/control-cloud-ui-preload\.js/);
assert.match(uiRelay, /\/control\/control\.js/);
assert.match(uiRelay, /cloud-update\.js/);
assert.match(uiRelay, /\/control\/operation-status/);

assert.match(cloudUi, /Approve owner PC/);
assert.match(cloudUi, /Owner-PC Control ready/,"Owner-PC window commands must not be presented as an active deployment");
assert.match(cloudUi, /\/control\/cloud\/actions\/update\/confirm/);
assert.match(cloudUi, /\/control\/cloud\/actions\/update/);
assert.match(cloudUi, /window\.confirm/);
assert.match(cloudUi, /actorRole !== "owner"/, "Remote lifecycle buttons require the owner role");

await import("./runtime-windows-update-dependency-bootstrap.mjs");
console.log("PASS 4.5.4.5 + Part 28: Cloud Update remains fixed-action, survives self-rebase and safely re-pushes validated ahead commits");
