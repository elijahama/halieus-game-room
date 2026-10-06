import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const trackedRoot = resolve(
  process.env.HGR_TRACKED_ORACLE_DIR ||
    join(repoRoot, "tests", "dev-tools", "Oracle Quick Deploy"),
);
const localRoot = resolve(
  process.env.HGR_LOCAL_ORACLE_DIR ||
    join(repoRoot, "dev-tools", "Oracle Quick Deploy"),
);
const shouldSync =
  process.platform === "win32" || process.env.HGR_FORCE_ORACLE_HELPER_SYNC === "1";
const requiredFiles = ["deploy-from-windows.ps1", "quick-install.sh"];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function readCanonicalSet() {
  const files = [];
  for (const name of requiredFiles) {
    const source = join(trackedRoot, name);
    let bytes;
    try {
      bytes = await readFile(source);
    } catch (error) {
      throw new Error(`Canonical Oracle deployment helper is missing or unreadable: ${source}`, {
        cause: error,
      });
    }
    files.push({ name, source, bytes, hash: sha256(bytes) });
  }
  return files;
}

const canonicalFiles = await readCanonicalSet();

if (!shouldSync) {
  console.log(
    `Oracle helper source verified (${requiredFiles.join(", ")}); local mirror sync is Windows-only.`,
  );
  process.exit(0);
}

await mkdir(localRoot, { recursive: true });

for (const file of canonicalFiles) {
  const destination = join(localRoot, file.name);
  await copyFile(file.source, destination);
}

for (const file of canonicalFiles) {
  const destination = join(localRoot, file.name);
  const copied = await readFile(destination);
  const copiedHash = sha256(copied);
  if (copiedHash !== file.hash) {
    throw new Error(
      `Oracle helper sync verification failed for ${file.name}: expected ${file.hash}, got ${copiedHash}`,
    );
  }
}

console.log(
  `Oracle helper mirror verified from canonical source: ${trackedRoot} -> ${localRoot}`,
);
