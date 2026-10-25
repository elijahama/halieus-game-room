import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const controller = read("scripts/windows/control-update.ps1");
const helper = read("scripts/windows/control-update-isolated-main.ps1");
const finalizer = read("scripts/windows/control-update-finalize.ps1");
const legacy = read("Update HGR GitHub.cmd");

// The existing manual updater remains strict about main and still owns all
// interactive rebasing / GitHub push and optional launcher refresh.
assert.match(legacy, /git branch --show-current/);
assert.match(legacy, /Current branch is/);
assert.match(legacy, /git rebase --autostash/);

// Only Cloud Update (authenticated, fixed action) switches to isolated deploy
// when the checked-out source is not main.
assert.match(controller, /\$currentBranch = \(& git -C \$projectRoot branch --show-current/);
assert.match(controller, /\$useIsolatedMain = \$currentBranch -ne "main"/);
assert.match(controller, /\$isolatedMainHelper = Join-Path \$PSScriptRoot "control-update-isolated-main\.ps1"/);
assert.match(controller, /if \(\$useIsolatedMain\) \{/);
assert.match(controller, /"powershell\.exe -NoProfile -ExecutionPolicy Bypass -File/);
assert.match(controller, /else \{\s*\$escapedLauncher =/);
assert.match(controller, /handoff = "isolated-main"/);
assert.match(controller, /\$env:HGR_CONTROL_UPDATE_ISOLATED_MAIN = "1"/);
assert.doesNotMatch(controller, /state\s*=\s*"succeeded"/);
assert.match(finalizer, /\$handoff -eq "isolated-main"/);
assert.match(finalizer, /\$isolatedFlag/);
assert.match(finalizer, /if \(\$isIsolatedMain\)/);
assert.match(finalizer, /state = "succeeded"/);
assert.match(controller, /\$finalizerStarted = \$true/);
assert.match(controller, /\$exitCode -ne 0/);
assert.doesNotMatch(controller, /git (?:checkout|switch|reset --hard)/);

// The detached release clone must be canonical and must never import local
// repository history, untracked assets or credentials.
assert.match(helper, /\$repoUrl = "https:\/\/github\.com\/elijahama\/halieus-game-room\.git"/);
assert.match(helper, /git clone --no-tags --single-branch --depth 1 --branch main \$repoUrl \$checkout/);
assert.ok(helper.includes('$env:GIT_TERMINAL_PROMPT = "0"'));
assert.match(helper, /\$branch -ne "main" -or \$origin -ne \$repoUrl -or \$dirty.Count -ne 0/);
assert.match(helper, /node "scripts\\release-integrity\.mjs" --verify/);
assert.match(helper, /\$AuditOnly/);
assert.ok(helper.includes('$env:HGR_UPDATE_NONINTERACTIVE -ne "1"'));
assert.ok(helper.includes('$env:HGR_CONTROL_DEFER_REFRESH -ne "1"'));
assert.match(helper, /npm\.cmd audit --audit-level=high/);
assert.match(helper, /npm\.cmd run test:regression/);
assert.match(helper, /cloud-oracle-deploy\.ps1/);
assert.match(helper, /Remove-Item -LiteralPath \$checkout -Recurse -Force/);
assert.doesNotMatch(helper, /git (?:push|rebase|reset --hard|switch|checkout|remote set-url)/);
assert.doesNotMatch(helper, /ssh -o StrictHostKeyChecking=no|set-url https:\/\/.*@/i);
assert.doesNotMatch(helper, /\.openshard\/bridge\/prompt-journal|server\\data\\accounts/);

if (process.platform === "win32") {
  // Exercise the real finalizer against a private throwaway fixture, never the
  // owner's installed HGR Control service or actual operation marker.
  const fixture = mkdtempSync(path.join(os.tmpdir(), "hgr-isolated-handoff-"));
  try {
    const scripts = path.join(fixture, "scripts", "windows");
    const runtime = path.join(fixture, "server", "data", "runtime");
    mkdirSync(scripts, { recursive: true });
    mkdirSync(runtime, { recursive: true });
    const finalizerPath = path.join(scripts, "control-update-finalize.ps1");
    const refreshed = path.join(runtime, "refresh-triggered.txt");
    const markerPath = path.join(runtime, "hgr-control-update-result.json");
    copyFileSync(new URL("../scripts/windows/control-update-finalize.ps1", import.meta.url), finalizerPath);
    writeFileSync(path.join(scripts, "refresh-control-after-update.ps1"),
      `[IO.File]::WriteAllText('${refreshed.replaceAll("'", "''")}', 'called')`);
    const operationId = "fixture-operation-123";
    const marker = (handoff) => ({
      state: "running", startedAt: "2026-10-25T07:33:00.000Z",
      operationId, progress: 97, phase: "Finalizing",
      ...(handoff ? { handoff } : {}),
    });
    const run = (isolated) => spawnSync("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", finalizerPath,
    ], { encoding: "utf8", timeout: 15000, env: {
      ...process.env,
      HGR_CONTROL_UPDATE_ISOLATED_MAIN: isolated ? "1" : "0",
    } });

    writeFileSync(markerPath, JSON.stringify(marker("isolated-main")));
    let done = run(true);
    assert.equal(done.status, 0, done.stdout + done.stderr);
    let result = JSON.parse(readFileSync(markerPath, "utf8"));
    assert.equal(result.state, "succeeded");
    assert.equal(result.progress, 100);
    assert.equal(result.phase, "Update complete");
    assert.match(done.stdout, /owner Control stayed on its original checkout/);
    assert.ok(!existsSync(refreshed), "Isolated Oracle release must never restart owner Control");

    writeFileSync(markerPath, JSON.stringify(marker("isolated-main")));
    done = run(false);
    assert.notEqual(done.status, 0, "Finalizer cannot be tricked into isolated mode without matching flag");
    assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).state, "running");
    assert.ok(!existsSync(refreshed));

    writeFileSync(markerPath, JSON.stringify(marker(null)));
    done = run(false);
    assert.equal(done.status, 0, done.stdout + done.stderr);
    assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).state, "succeeded");
    assert.ok(existsSync(refreshed), "Original main-flow finalizer still runs owner Control refresh");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

console.log("PASS Control feature-branch Cloud Update isolation: GitHub main source only, exact release gates, finalizer-only completion and original Control handoff preserved");
