import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mergeTimeline, timelineFromRepo, readJsonlTail } from "../scripts/hgr-development-timeline.mjs";

const root = mkdtempSync(path.join(os.tmpdir(), "hgr-timeline-fixture-"));
const script = fileURLToPath(new URL("../scripts/hgr-development-timeline.mjs", import.meta.url));
const bridge = path.join(root, ".openshard", "bridge");
const runs = path.join(root, ".openshard", "runs.jsonl");
function line(x) { return JSON.stringify(x); }
try {
  mkdirSync(bridge, { recursive: true });
  mkdirSync(path.join(root, "docs"));
  writeFileSync(path.join(root, "VERSION"), "4.5.6\n");
  writeFileSync(path.join(root, "docs", "HGR_MASTERBOOK.md"), "# Fixture\n");
  const journal = [
    { schema: "hgr-openshard-bridge.prompt.v1", id: "msg-1", at: "2026-10-25T06:02:00Z", kind: "prompt", message: "Never expose this raw prompt", taskId: null },
    { schema: "hgr-openshard-bridge.prompt.v1", id: "msg-2", at: "2026-10-25T06:04:00Z", kind: "blocked", message: "Out of credits", taskId: "task-test" },
    { schema: "hgr-openshard-bridge.prompt.v1", id: "bad-date", at: "bad", kind: "prompt", message: "Ignored" },
  ];
  const receipts = [
    { timestamp: "2026-10-25T06:03:00Z", shard_id: "shard-1", receipt_id: "rcpt-1", task_id: "task-test", task: "Do not show raw native task", verification: { status: "not_run" }, files_created: 0, files_updated: 0 },
    { timestamp: "2026-10-25T06:01:00Z", shard_id: "shard-2", receipt_id: "rcpt-2", task_id: null, task: "A verified run", verification: { status: "passed" }, files_created: 1, files_updated: 2 },
  ];
  const journalPath = path.join(bridge, "prompt-journal.jsonl");
  writeFileSync(journalPath, journal.map(line).join("\n") + "\nBAD JSON\n");
  writeFileSync(runs, receipts.map(line).join("\n") + "\n");
  const before = [statSync(journalPath).size, statSync(runs).size];
  const t = timelineFromRepo(root, { limit: 10 });
  assert.equal(t.sources.bridge, "available");
  assert.equal(t.sources.openshard, "available");
  assert.deepEqual(t.totals, { bridge: 2, receipts: 2, invalid: 2 });
  assert.deepEqual(t.events.map(e => e.id), ["msg-2", "rcpt-1", "msg-1", "rcpt-2"]);
  assert.equal(t.events[0].taskId, "task-test");
  assert.equal(t.events[1].taskId, "task-test");
  assert.equal(t.events[1].verified, false, "Captured but untested receipt cannot be verified");
  assert.equal(t.events[1].status, "not-verified");
  assert.equal(t.events[3].verified, true);
  assert.equal(t.events[3].changedFiles, 3);
  assert.ok(t.events.every(x => !Object.hasOwn(x, "text")), "Raw prompt text hidden by default");
  const details = timelineFromRepo(root, { showText: true, limit: 10 });
  assert.equal(details.events[2].text, "Never expose this raw prompt");
  assert.equal(details.events[1].text, "Do not show raw native task");
  assert.deepEqual(mergeTimeline({ limit: 1, journalLines: [line(journal[0])], receiptLines: [line(receipts[0])] }).events.map(e => e.id), ["rcpt-1"]);
  assert.throws(() => mergeTimeline({ limit: 101 }), /limit/);
  assert.throws(() => mergeTimeline({ limit: 0 }), /limit/);
  const json = JSON.parse(execFileSync(process.execPath, [script, "--repo-root", root, "--json", "--limit", "3"], { encoding: "utf8" }));
  assert.equal(json.events.length, 3);
  assert.equal(json.schema, "hgr.development-timeline.v1");
  assert.ok(!JSON.stringify(json).includes("Never expose this raw prompt"));
  const small = readJsonlTail(journalPath, 30);
  assert.equal(small.truncated, true);
  const empty = timelineFromRepo(mkdtempFixture(), { limit: 10 });
  assert.equal(empty.sources.bridge, "missing");
  assert.equal(empty.sources.openshard, "missing");
  assert.equal(empty.events.length, 0);
  assert.deepEqual([statSync(journalPath).size, statSync(runs).size], before, "Timeline must not write sources");
  console.log("PASS HGR local timeline: bounded merge, privacy, verification truth, task links, missing/corrupt data, CLI JSON, no writes");
} finally { rmSync(root, { recursive: true, force: true }); }

function mkdtempFixture() {
  const other = path.join(root, "empty");
  mkdirSync(path.join(other, "docs"), { recursive: true });
  writeFileSync(path.join(other, "VERSION"), "4.5.6");
  writeFileSync(path.join(other, "docs", "HGR_MASTERBOOK.md"), "# Fixture");
  return other;
}
