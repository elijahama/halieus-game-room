import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const updater = readFileSync(join(root, "Update HGR GitHub.cmd"), "utf8");
const begin = updater.indexOf("echo STEP 1B - Verifying LOCAL release build dependencies...");
const end = updater.indexOf("echo STEP 2 - Preparing release identity BEFORE the browser build...");
const typecheck = updater.indexOf("call npm run typecheck");
assert(begin > 0 && end > begin && typecheck > end,
  "Dependency bootstrap must run after checkout sync and before prepare/typecheck");
const bootstrap = updater.slice(begin, end);
assert.match(bootstrap, /npm ci --include=dev --no-audit --no-fund/,
  "Fresh checkouts install locked development build tools, never global tools");
assert.match(bootstrap, /if errorlevel 1 \([\s\S]*?goto :PAUSE_EXIT/,
  "A failed install must stop the updater before build/push/deploy");
assert.match(bootstrap, /node_modules\\\.bin\\tsc.cmd/);
assert.match(bootstrap, /node_modules\\\.bin\\vite.cmd/);
assert.match(bootstrap, /node_modules\\tsx\\package.json/);
assert.doesNotMatch(bootstrap, /npm install -g|git push|deploy-from-windows\.ps1/i,
  "Bootstrap must never push or deploy and cannot install global tools");

if (process.platform === "win32") {
  const temp = mkdtempSync(join(tmpdir(), "hgr-update-prereq-"));
  try {
    const stub = join(temp, "stub");
    mkdirSync(stub);
    const npmScript = [
      "@echo off",
      'if /I "%~1"=="ls" (',
      '  echo ls>> "%HGR_TEST_LOG%"',
      '  if "%HGR_TEST_LS_FAIL%"=="1" exit /b 1',
      '  exit /b 0',
      ')',
      'if /I "%~1"=="ci" (',
      '  echo ci>> "%HGR_TEST_LOG%"',
      '  if "%HGR_TEST_FAIL_INSTALL%"=="1" exit /b 55',
      '  if not exist "node_modules\\.bin" md "node_modules\\.bin"',
      '  if not exist "node_modules\\tsx" md "node_modules\\tsx"',
      '  echo @echo off> "node_modules\\.bin\\tsc.cmd"',
      '  if not "%HGR_TEST_PARTIAL%"=="1" echo @echo off> "node_modules\\.bin\\vite.cmd"',
      '  echo {}> "node_modules\\tsx\\package.json"',
      '  exit /b 0',
      ')',
      'exit /b 67',
    ].join("\r\n") + "\r\n";
    writeFileSync(join(stub, "npm.cmd"), npmScript, "utf8");
    const script = join(temp, "exercise.cmd");
    writeFileSync(script,
      "@echo off\r\nsetlocal EnableExtensions EnableDelayedExpansion\r\n" +
      bootstrap.replaceAll("\n", "\r\n") +
      "\r\necho SUCCESS_END\r\nexit /b 0\r\n:PAUSE_EXIT\r\necho STOPPED_END\r\nexit /b 13\r\n",
      "utf8");
    const run = ({ preset = false, fail = false, partial = false, lsFail = false } = {}) => {
      const folder = mkdtempSync(join(temp, "case-"));
      if (preset) {
        mkdirSync(join(folder, "node_modules", ".bin"), { recursive: true });
        mkdirSync(join(folder, "node_modules", "tsx"), { recursive: true });
        for (const name of ["tsc.cmd", "vite.cmd"]) writeFileSync(join(folder, "node_modules", ".bin", name), "@echo off\r\n");
        writeFileSync(join(folder, "node_modules", "tsx", "package.json"), "{}");
      }
      const log = join(folder, "calls.txt");
      const result = spawnSync("cmd.exe", ["/d", "/c", script], {
        cwd: folder, encoding: "utf8", timeout: 15000,
        env: {
          ...process.env,
          PATH: stub + delimiter + (process.env.PATH ?? ""),
          HGR_TEST_LOG: log, HGR_TEST_FAIL_INSTALL: fail ? "1" : "",
          HGR_TEST_PARTIAL: partial ? "1" : "",
          HGR_TEST_LS_FAIL: lsFail ? "1" : "",
        },
      });
      const calls = existsSync(log) ? readFileSync(log, "utf8") : "";
      return { result, calls };
    };
    const fresh = run();
    assert.equal(fresh.result.status, 0, fresh.result.stdout + fresh.result.stderr);
    assert.match(fresh.result.stdout, /SUCCESS_END/);
    assert.match(fresh.calls, /ci/);
    const present = run({ preset: true });
    assert.equal(present.result.status, 0, present.result.stdout + present.result.stderr);
    assert.match(present.calls, /ls/);
    assert.doesNotMatch(present.calls, /ci/);
    const stale = run({ preset: true, lsFail: true });
    assert.equal(stale.result.status, 0, stale.result.stdout + stale.result.stderr);
    assert.match(stale.calls, /ci/, "Invalid dependency tree must be refreshed from lockfile");
    const failed = run({ fail: true });
    assert.equal(failed.result.status, 13, failed.result.stdout + failed.result.stderr);
    assert.match(failed.result.stdout, /STOPPED_END/);
    assert.doesNotMatch(failed.result.stdout, /SUCCESS_END/);
    const partial = run({ partial: true });
    assert.equal(partial.result.status, 13, "Partial install must stop before TypeScript");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
console.log("PASS Windows Update dependency bootstrap: missing, present, stale, install failure, partial install and early abort");
