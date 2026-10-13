import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (process.platform !== "win32") throw new Error("This must run on a real Windows CMD runner.");
const root = resolve(import.meta.dirname, "..");
const updater = readFileSync(join(root, "Update HGR GitHub.cmd"), "utf8");
const fixture = mkdtempSync(join(tmpdir(), "hgr-cmd-smoke-"));

function run(file, args, options = {}) {
  const result = spawnSync(file, args, { encoding: "utf8", cwd: fixture, ...options });
  assert.equal(result.status, 0, (result.stdout || "") + (result.stderr || "") + " (exit " + result.status + ")");
  return (result.stdout || "") + (result.stderr || "");
}

function runCmd(content) {
  const cmdPath = join(fixture, "probe-" + Math.random().toString(36).slice(2) + ".cmd");
  writeFileSync(cmdPath, content.split("\n").join("\r\n"), "ascii");
  const output = run("cmd.exe", ["/d", "/c", cmdPath]);
  assert.doesNotMatch(output, /unexpected at this time/i);
  return output;
}

try {
  // Extract and actually execute the real protected branch, not a retyped copy.
  const repush = updater.match(/^if not "!HGR_AHEAD_COUNT!"=="0" \(\r?\n[\s\S]*?^\) else \(\r?\n[\s\S]*?^\)/m);
  assert.ok(repush, "Tracked STEP 7B repush IF block must exist");
  const safeBlock = repush[0].replace("git push %REMOTE% %BRANCH%", "cmd.exe /d /c exit 0");
  for (const ahead of [0, 1]) {
    const batch = [
      "@echo off",
      "setlocal EnableDelayedExpansion",
      'set "REMOTE=origin"',
      'set "BRANCH=main"',
      'set "HGR_AHEAD_COUNT=' + ahead + '"',
      safeBlock,
      "exit /b 0",
    ].join("\n");
    const output = runCmd(batch);
    assert.match(output, ahead ? /commits ahead of GitHub/ : /No pending local commits need re-pushing/);
  }

  // Exercise the real owner-rename block against a disposable local Git repo.
  const originalBlock = updater.match(/^rem The repository owner changed from Laijee27 to elijahama\.\r?\n[\s\S]*?(?=^rem RELEASE\.json and shared\/release\.ts)/m);
  assert.ok(originalBlock, "Tracked owner-migration block must exist");
  const gitRepo = join(fixture, "git-fixture");
  mkdirSync(gitRepo);
  run("git", ["init", "-q", gitRepo]);
  run("git", ["-C", gitRepo, "remote", "add", "origin", "https://github.com/Laijee27/halieus-game-room.git"]);
  run("git", ["-C", gitRepo, "remote", "add", "backup", "https://example.com/other/repo.git"]);
  const probe = [
    "@echo off",
    "setlocal EnableDelayedExpansion",
    'set "REMOTE=origin"',
    'pushd "' + gitRepo + '"',
    originalBlock[0],
    "popd",
    "exit /b 0",
  ].join("\n");
  const migrationOutput = runCmd(probe);
  assert.match(migrationOutput, /github.com\/elijahama\/halieus-game-room.git/i);
  const origin = run("git", ["-C", gitRepo, "config", "--get", "remote.origin.url"]).trim();
  const backup = run("git", ["-C", gitRepo, "config", "--get", "remote.backup.url"]).trim();
  assert.equal(origin, "https://github.com/elijahama/halieus-game-room.git");
  assert.equal(backup, "https://example.com/other/repo.git");
  // Execute the REAL client-handoff branch from the updater on Windows.
  // Cloud Update must never touch interactive Edge, even without a GUI session.
  const clientBlock = updater.match(/^set "HGR_WINDOW_RESULT=SKIPPED_BACKGROUND_ONLY"\r?\n[\s\S]*?^:CLIENT_HANDOFF_DONE/m);
  assert.ok(clientBlock, "Tracked owner/cloud client handoff must exist");
  const windowScripts = join(fixture, "scripts", "windows");
  mkdirSync(windowScripts, { recursive: true });
  writeFileSync(join(windowScripts, "post-update-client.ps1"),
    'param([switch]$ShowWindow)\nif (-not $ShowWindow) { exit 5 }\nWrite-Output "MANUAL_WINDOW_VERIFIED"\n');
  for (const cloud of [true, false]) {
    const batch = [
      "@echo off",
      "setlocal EnableDelayedExpansion",
      'set "HGR_PROJECT_ROOT=' + fixture + '\\\\"',
      'set "HGR_UPDATE_NONINTERACTIVE=' + (cloud ? "1" : "0") + '"',
      clientBlock[0],
      'echo WINDOW_RESULT=!HGR_WINDOW_RESULT!',
      "exit /b 0",
    ].join("\n");
    const output = runCmd(batch);
    if (cloud) {
      assert.match(output, /Skipping interactive Windows window detection and launch/);
      assert.match(output, /WINDOW_RESULT=SKIPPED_BACKGROUND_ONLY/);
      assert.doesNotMatch(output, /MANUAL_WINDOW_VERIFIED/);
    } else {
      assert.match(output, /MANUAL_WINDOW_VERIFIED/);
      assert.match(output, /WINDOW_RESULT=VERIFIED/);
    }
  }
  console.log("PASS real Windows CMD safe repush, Git origin migration and manual-vs-Cloud GUI handoff");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
