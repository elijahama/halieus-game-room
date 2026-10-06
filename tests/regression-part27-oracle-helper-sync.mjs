import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const syncScript = resolve(root, "scripts", "sync-oracle-helper.mjs");
const tempRoot = await mkdtemp(join(tmpdir(), "hgr-oracle-helper-sync-"));
const trackedRoot = join(tempRoot, "tracked");
const localRoot = join(tempRoot, "local");
const deployName = "deploy-from-windows.ps1";
const installerName = "quick-install.sh";

await mkdir(trackedRoot, { recursive: true });
await mkdir(localRoot, { recursive: true });

const runSync = () =>
  spawnSync(process.execPath, [syncScript], {
    encoding: "utf8",
    env: {
      ...process.env,
      HGR_TRACKED_ORACLE_DIR: trackedRoot,
      HGR_LOCAL_ORACLE_DIR: localRoot,
      HGR_FORCE_ORACLE_HELPER_SYNC: "1",
    },
  });

try {
  await writeFile(join(trackedRoot, deployName), "canonical deploy v1\n");
  await writeFile(join(trackedRoot, installerName), "canonical install v1\n");
  await writeFile(join(localRoot, deployName), "stale deploy\n");
  await writeFile(join(localRoot, installerName), "stale install\n");

  const first = runSync();
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(
    await readFile(join(localRoot, deployName), "utf8"),
    "canonical deploy v1\n",
  );
  assert.equal(
    await readFile(join(localRoot, installerName), "utf8"),
    "canonical install v1\n",
  );

  await writeFile(join(trackedRoot, deployName), "canonical deploy v2\n");
  await unlink(join(trackedRoot, installerName));

  const missingCanonical = runSync();
  assert.notEqual(
    missingCanonical.status,
    0,
    "sync must stop when either canonical helper file is missing",
  );
  assert.match(
    `${missingCanonical.stderr}\n${missingCanonical.stdout}`,
    /Canonical Oracle deployment helper is missing or unreadable/,
  );
  assert.equal(
    await readFile(join(localRoot, deployName), "utf8"),
    "canonical deploy v1\n",
    "preflight must validate the full canonical set before overwriting the local mirror",
  );

  await writeFile(join(trackedRoot, installerName), "canonical install v2\n");
  const recovery = runSync();
  assert.equal(recovery.status, 0, recovery.stderr || recovery.stdout);
  assert.equal(
    await readFile(join(localRoot, deployName), "utf8"),
    "canonical deploy v2\n",
  );
  assert.equal(
    await readFile(join(localRoot, installerName), "utf8"),
    "canonical install v2\n",
  );

  console.log(
    "PASS Part 27: Oracle deployment helper sync copies only a complete canonical pair and verifies the local mirror",
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
