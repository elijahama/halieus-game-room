import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const updater = readFileSync(join(root, "Update HGR GitHub.cmd"), "utf8");
const resolver = readFileSync(join(root, "scripts/windows/manual-oracle-deploy.ps1"), "utf8");
assert.match(updater, /scripts\\windows\\manual-oracle-deploy\.ps1" -DeployHelperPath "%ORACLE_DEPLOY_PS1%"/);
assert.doesNotMatch(updater, /-UseDefaultSshAuth/, "Manual fallback must not assume an ssh-agent identity is loaded");
assert.match(resolver, /owner-update\.json/, "Read only the existing owner-approved saved key configuration");
assert.match(resolver, /HALIEUS_ORACLE_KEY/, "Allow the existing explicit environment override");
assert.match(resolver, /Get-Content -LiteralPath \$keyPath -TotalCount 1/, "Only validate the key header; do not log key contents");
assert.match(resolver, /& \$DeployHelperPath -KeyPath \$keyPath/, "Pass explicit identity to canonical deploy helper");
assert.doesNotMatch(resolver, /ssh-add|Set-Service|Start-Service|Get-ChildItem|Read-Host|OpenFileDialog|copy-item/i,
  "No credential scan, SSH-agent manipulation or copying secrets into project files");
assert.match(resolver, /HGR_UPDATE_NONINTERACTIVE/, "Cloud Update must keep its own separately authorized path");

if (process.platform === "win32") {
  const temp = mkdtempSync(join(tmpdir(), "hgr-oracle-key-resolver-"));
  try {
    const fakeRoot = join(temp, "Halieus Game Room");
    mkdirSync(fakeRoot);
    const savedKey = join(temp, "fake-saved-key");
    const overrideKey = join(temp, "fake-override-key");
    const malformed = join(temp, "not-a-private-key");
    for (const p of [savedKey, overrideKey]) {
      // A header-only fixture: NEVER a real SSH private key.
      writeFileSync(p, "-----BEGIN OPENSSH PRIVATE KEY-----\nTEST-ONLY-NO-CREDENTIAL\n", "utf8");
    }
    writeFileSync(malformed, "not a key\n");
    const cfg = join(fakeRoot, "owner-update.json");
    const output = join(temp, "stub-received.txt");
    const helper = join(temp, "mock-helper.ps1");
    writeFileSync(helper, [
      "param([string]$KeyPath)",
      "if (-not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) { throw 'No key file received' }",
      "if ($env:HGR_TEST_FAIL_HELPER -eq '1') { throw 'mock deployment refused' }",
      "Set-Content -LiteralPath $env:HGR_TEST_OUTPUT -Value ([IO.Path]::GetFileName($KeyPath)) -NoNewline",
      "Write-Host 'SIMULATED_DEPLOY_ONLY'",
    ].join("\r\n"), "utf8");
    const run = ({ configKey = savedKey, envKey = "", invalidJson = false,
      cloud = false, failHelper = false } = {}) => {
      if (existsSync(output)) rmSync(output);
      writeFileSync(cfg, invalidJson ? "{bad-json" : JSON.stringify({KeyPath: configKey}));
      return spawnSync("powershell.exe", [
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        join(root, "scripts/windows/manual-oracle-deploy.ps1"),
        "-DeployHelperPath", helper,
      ], {
        cwd: root,
        encoding: "utf8",
        timeout: 18000,
        env: {
          ...process.env, LOCALAPPDATA: temp,
          HALIEUS_ORACLE_KEY: envKey,
          HGR_UPDATE_NONINTERACTIVE: cloud ? "1" : "",
          HGR_TEST_OUTPUT: output,
          HGR_TEST_FAIL_HELPER: failHelper ? "1" : "",
        },
      });
    };
    const saved = run();
    assert.equal(saved.status, 0, (saved.stdout ?? "") + (saved.stderr ?? ""));
    assert.match(saved.stdout, /SIMULATED_DEPLOY_ONLY/);
    assert.equal(readFileSync(output, "utf8"), "fake-saved-key");

    const over = run({ configKey: malformed, envKey: overrideKey });
    assert.equal(over.status, 0, over.stderr);
    assert.equal(readFileSync(output, "utf8"), "fake-override-key", "Explicit environment override wins");

    const missing = run({ configKey: join(temp, "missing") });
    assert.notEqual(missing.status, 0);
    assert(!existsSync(output), "Missing key must never invoke deployment");

    const invalid = run({ configKey: malformed });
    assert.notEqual(invalid.status, 0);
    assert(!existsSync(output), "Invalid key header must never invoke deployment");

    const corrupt = run({ invalidJson: true });
    assert.notEqual(corrupt.status, 0);
    assert(!existsSync(output));

    const noninteractive = run({ cloud: true });
    assert.notEqual(noninteractive.status, 0);
    assert(!existsSync(output), "Cloud mode cannot call manual wrapper");

    const failed = run({ failHelper: true });
    assert.notEqual(failed.status, 0, "Helper failure must propagate to updater");
    assert(!existsSync(output));
    for (const result of [saved, over, missing, invalid, corrupt, noninteractive, failed]) {
      const consoleOutput = (result.stdout ?? "") + (result.stderr ?? "");
      assert(!consoleOutput.includes("TEST-ONLY-NO-CREDENTIAL"));
      assert(!consoleOutput.includes(savedKey) && !consoleOutput.includes(overrideKey),
        "Never print the full owner key path");
    }
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
console.log("PASS 4.6.6 Oracle manual saved-key fallback: saved/override/missing/invalid/cloud/helper errors; zero real deployment");
