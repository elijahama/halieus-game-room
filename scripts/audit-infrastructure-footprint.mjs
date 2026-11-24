// Read-only HGR storage inventory. No file contents, credentials, process commands,
// network requests, writes, moves or deletes. Run locally on the audited host.
import { lstat, readdir, statfs } from "node:fs/promises";
import { resolve, dirname, basename, join } from "node:path";
import { totalmem, freemem, loadavg, availableParallelism, platform } from "node:os";
import { pathToFileURL } from "node:url";

export async function measure(root, limit = 250000) {
  const result = { logicalBytes: 0, files: 0, directories: 0, skippedLinks: 0, unreadable: 0, truncated: false, exists: false };
  const pending = [root];
  let visited = 0;
  while (pending.length) {
    if (visited++ >= limit) { result.truncated = true; break; }
    const path = pending.pop();
    let info;
    try { info = await lstat(path); }
    catch (error) {
      if (path === root && error.code === "ENOENT") return result;
      result.unreadable++; continue;
    }
    if (path === root) result.exists = true;
    if (info.isSymbolicLink()) { result.skippedLinks++; continue; }
    if (info.isFile()) { result.files++; result.logicalBytes += info.size; continue; }
    if (!info.isDirectory()) continue;
    result.directories++;
    try {
      const entries = await readdir(path);
      for (const entry of entries) pending.push(join(path, entry));
    } catch { result.unreadable++; }
  }
  return result;
}

async function disk(root) {
  try {
    const s = await statfs(root);
    return { totalBytes: s.blocks * s.bsize, availableBytes: s.bavail * s.bsize };
  } catch { return null; }
}
async function namedGroup(label, paths) {
  const totals = { label, roots: paths.length, existingRoots: 0, logicalBytes: 0, files: 0, directories: 0, skippedLinks: 0, unreadable: 0, truncated: false };
  for (const path of paths) {
    const s = await measure(path);
    totals.existingRoots += Number(s.exists);
    for (const key of ["logicalBytes", "files", "directories", "skippedLinks", "unreadable"]) totals[key] += s[key];
    totals.truncated ||= s.truncated;
  }
  return totals;
}
async function children(root, pattern) {
  try {
    return (await readdir(root, { withFileTypes: true })).filter(e => e.isDirectory() && !e.isSymbolicLink() && pattern.test(e.name)).map(e => join(root, e.name));
  } catch { return null; }
}
export async function inventory({ app, data, laptopRoot, legacy }) {
  const groups = [];
  const add = async (label, paths) => groups.push(paths === null ? {label, unavailable: true} : await namedGroup(label, paths));
  if (app) {
    await add("Oracle active application", [app]);
    const parent = dirname(app);
    const name = basename(app).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const kind of ["backup", "failed", "candidate"]) await add("Oracle " + kind + " directories", await children(parent, new RegExp("^" + name + "\\." + kind + "(?:-|$)")));
    await add("Oracle temporary build stages", await children("/tmp", /^halieus-stage\./));
  }
  if (data) await add("Durable production data (protected)", [data]);
  if (laptopRoot) {
    for (const name of ["Release Checkout", "Owner Control Bridge", "isolated-cloud-updates", "update-backups", "Cloud Bridge Recovery", "Background Launch"]) {
      await add(name, [join(laptopRoot, name)]);
    }
  }
  if (legacy) await add("Legacy development checkout (protected pending review)", [legacy]);
  const disks = {};
  for (const [label, path] of Object.entries({app, data, laptopRoot, legacy})) if (path) disks[label] = await disk(path);
  return { generatedAt: new Date().toISOString(), platform: platform(), hostMemory: { totalBytes: totalmem(), freeBytes: freemem() }, availableParallelism: availableParallelism(), loadAverage: loadavg(), disks, groups, notes: ["Logical file bytes, not allocated disk blocks; hardlinked files may be counted twice.", "Links are not followed. Unreadable or truncated groups are incomplete.", "Host memory is not HGR process heap. Load average is not CPU percent.", "No account or file contents collected. No cleanup performed."] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = {};
  const names = {"--app":"app", "--data":"data", "--laptop-root":"laptopRoot", "--legacy":"legacy"};
  for (let i=2; i<process.argv.length; i+=2) {
    const key=names[process.argv[i]], path=process.argv[i+1];
    if (!key || !path || path.startsWith("--") || args[key]) throw Error("Use explicit --app, --data, --laptop-root or --legacy directory arguments.");
    args[key]=resolve(path);
  }
  if (!Object.keys(args).length) throw Error("No audit root specified. No default scan is performed.");
  console.log(JSON.stringify(await inventory(args),null,2));
}
