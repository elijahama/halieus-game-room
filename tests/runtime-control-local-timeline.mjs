import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLocalDevelopmentTimeline } from "../server/src/platform/control-development-timeline.ts";

const root = mkdtempSync(join(tmpdir(), "hgr-control-timeline-"));
function fixture(filename, rows) {
  mkdirSync(join(root, ".openshard", filename.startsWith("bridge") ? "bridge" : ""), { recursive: true });
  writeFileSync(join(root, ".openshard", filename), rows.map(row => JSON.stringify(row)).join("\n") + "\n");
}
try {
  assert.equal(loadLocalDevelopmentTimeline(null).source, "unavailable");
  mkdirSync(join(root, ".git"));
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "VERSION"), "4.5.6\n");
  writeFileSync(join(root, "docs", "HGR_MASTERBOOK.md"), "# Test fixture\n");
  assert.equal(loadLocalDevelopmentTimeline(root).source, "unavailable");
  const secret = "PRIVATE_HGR_PROMPT_MUST_NOT_BE_EXPOSED";
  fixture("bridge/prompt-journal.jsonl", [
    { schema: "hgr-openshard-bridge.prompt.v1", id: "journal-1", at: "2026-10-25T06:01:00Z", kind: "prompt", message: secret, taskId: null },
    { schema: "hgr-openshard-bridge.prompt.v1", id: "journal-2", at: "2026-10-25T06:04:00Z", kind: "completed", message: "Claimed done", taskId: "task-123" },
    { schema: "hgr-openshard-bridge.prompt.v1", id: "<script>", at: "2026-10-25T06:09:00Z", kind: "prompt", message: secret },
  ]);
  let snapshot = loadLocalDevelopmentTimeline(root);
  assert.equal(snapshot.source, "partial");
  assert.equal(snapshot.events.length, 2);
  assert.ok(!JSON.stringify(snapshot).includes(secret));
  assert.equal(snapshot.events[0].status, "milestone-reported");
  assert.equal(snapshot.events[0].taskId, "task-123");
  fixture("runs.jsonl", [
    { timestamp: "2026-10-25T06:03:00Z", shard_id: "shard-1", receipt_id: "receipt-1", task_id: null, task: secret, verification: { status: "not_run" }, files_updated: 0 },
    { timestamp: "2026-10-25T06:05:00Z", shard_id: "shard-2", receipt_id: "receipt-2", task_id: "task-123", task: "Corrected theme", verification: { status: "passed" }, files_created: 2 },
    { timestamp: "2026-10-25T06:06:00Z", shard_id: "shard-3", receipt_id: "receipt-3", task: "Failed run", verification: { status: "failed" } },
  ]);
  snapshot = loadLocalDevelopmentTimeline(root);
  assert.equal(snapshot.source, "available");
  assert.equal(snapshot.events.length, 5);
  assert.deepEqual(snapshot.events.map(event => event.id), ["receipt-3", "receipt-2", "journal-2", "receipt-1", "journal-1"]);
  assert.equal(snapshot.events[0].status, "verification-failed");
  assert.equal(snapshot.events[1].status, "verification-passed");
  assert.equal(snapshot.events[1].changedFiles, 2);
  assert.equal(snapshot.events[3].status, "not-verified");
  assert.equal(snapshot.events[3].taskId, null, "No fake task linkage");
  assert.ok(!JSON.stringify(snapshot).includes(secret), "Never leak raw prompts or task text");
  assert.ok(!JSON.stringify(snapshot).includes(".openshard"), "No sensitive absolute file paths in response");
  assert.ok(!JSON.stringify(snapshot).includes("role"), "No account details in response");
  // Unexpectedly large source must still produce bounded, parseable output.
  const before = readFileSync(join(root, ".openshard", "runs.jsonl"), "utf8");
  for(let i=0;i<400;i++){
    const row = { timestamp: "2026-10-25T06:07:00Z", shard_id: "shard-"+(i+10), receipt_id: "receipt-"+(i+10), task: secret };
    writeFileSync(join(root, ".openshard", "runs.jsonl"), JSON.stringify(row) + "\n", { flag: "a" });
  }
  snapshot = loadLocalDevelopmentTimeline(root);
  assert.ok(snapshot.events.length <= 18);
  assert.ok(!JSON.stringify(snapshot).includes(secret));
  assert.ok(readFileSync(join(root, ".openshard", "runs.jsonl"), "utf8").startsWith(before), "Read-only loader");
  const source = readFileSync(new URL("../server/src/platform/control-cloud-ui-preload.ts", import.meta.url), "utf8");
  assert.match(source, /path === "\/control\/development-timeline"/);
  assert.match(source, /account\.role !== "owner"/, "Local evidence must be stricter than admin access");
  assert.match(source, /sendJson\(response, 403/);
  const html = readFileSync(new URL("../client/public/control/index.html", import.meta.url), "utf8");
  const controlJs = readFileSync(new URL("../client/public/control/development.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../client/public/control/control.css", import.meta.url), "utf8");
  for (const id of ["developmentLocalEntries", "developmentLocalState", "developmentLocalHint"]) assert.ok(html.includes('id="'+id+'"'));
  assert.match(controlJs, /fetch\("\/control\/development-timeline"/);
  assert.match(controlJs, /credentials: "include"/);
  assert.doesNotMatch(controlJs, /innerHTML|Math\.random|progressPercent/);
  assert.match(css, /\.development-local/);
  const mobileNav = html.split('<nav class="control-mobile-nav"')[1]?.split("</nav>")[0] || "";
  assert.equal((mobileNav.match(/<button /g) || []).length, 5);
  console.log("PASS Control owner-only local timeline: missing/partial/available, correct verification, no private content, capped reads, unchanged mobile nav");
} finally { rmSync(root, { recursive: true, force: true }); }
