#!/usr/bin/env node
/**
 * HGR local development timeline. Read-only; no network calls.
 * Combines explicitly captured Bridge instructions with observed OpenShard
 * receipts. An instruction is never presented as evidence that code ran.
 */
import { existsSync, openSync, readSync, closeSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_SOURCE_BYTES = 512 * 1024;
const MAX_RECORDS = 2000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const EVENT_KINDS = new Set(["prompt", "plan", "started", "checkpoint", "completed", "blocked"]);

function utc(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
function safeId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,160}$/.test(value) ? value : null;
}
function shortText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").slice(0, 180);
}

/** Bounded tail read; ignores a partial first line if a source was truncated. */
export function readJsonlTail(filename, maxBytes = MAX_SOURCE_BYTES) {
  if (!existsSync(filename)) return { lines: [], missing: true, truncated: false };
  const size = statSync(filename).size;
  const start = Math.max(0, size - maxBytes);
  const bytes = size - start;
  const buffer = Buffer.alloc(bytes);
  const fd = openSync(filename, "r");
  try {
    let offset = 0;
    while (offset < bytes) {
      const length = readSync(fd, buffer, offset, bytes - offset, start + offset);
      if (!length) break;
      offset += length;
    }
  } finally { closeSync(fd); }
  let text = buffer.toString("utf8");
  if (start > 0) {
    const firstNewline = text.indexOf("\n");
    text = firstNewline < 0 ? "" : text.slice(firstNewline + 1);
  }
  return { lines: text.split(/\r?\n/).filter(Boolean).slice(-MAX_RECORDS), missing: false, truncated: start > 0 };
}

function parseRecords(lines) {
  const entries = [];
  let invalid = 0;
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record && typeof record === "object" && !Array.isArray(record)) entries.push(record);
      else invalid++;
    } catch { invalid++; }
  }
  return { entries, invalid };
}

function bridgeEvent(row, showText) {
  const at = utc(row.at);
  const id = safeId(row.id);
  if (!at || !id || !EVENT_KINDS.has(row.kind) || row.schema !== "hgr-openshard-bridge.prompt.v1") return null;
  const result = {
    at, source: "bridge", kind: row.kind, status: row.kind === "completed" ? "milestone-reported" : row.kind,
    id, taskId: safeId(row.taskId), receiptId: null, verified: false,
    summary: row.kind === "prompt" ? "Instruction recorded" : "Bridge " + row.kind + " event",
  };
  if (showText) result.text = shortText(row.message);
  return result;
}

function receiptEvent(row, showText) {
  const at = utc(row.timestamp);
  const id = safeId(row.receipt_id);
  if (!at || !id || !safeId(row.shard_id)) return null;
  const verification = row.verification?.status;
  const passed = verification === "passed" || (verification == null && row.verification_passed === true);
  const failed = verification === "failed" || (verification == null && row.verification_passed === false);
  const status = passed ? "verification-passed" : failed ? "verification-failed" : "not-verified";
  const created = Number.isFinite(row.files_created) ? row.files_created : 0;
  const updated = Number.isFinite(row.files_updated) ? row.files_updated : 0;
  const deleted = Number.isFinite(row.files_deleted) ? row.files_deleted : 0;
  const result = {
    at, source: "openshard", kind: "receipt", status,
    id, taskId: safeId(row.task_id), receiptId: id, shardId: row.shard_id,
    verified: passed, verification: verification || "not_run",
    changedFiles: created + updated + deleted,
    summary: "OpenShard session captured" + (passed ? "; checks passed" : failed ? "; checks failed" : "; checks not verified"),
  };
  if (showText) result.text = shortText(row.task_title || row.task);
  return result;
}

/** Pure merge for fixture-driven regression tests and a future local UI. */
export function mergeTimeline({ journalLines = [], receiptLines = [], limit = DEFAULT_LIMIT, showText = false } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new RangeError("limit must be from 1 to 100");
  const journal = parseRecords(journalLines);
  const receipts = parseRecords(receiptLines);
  let ignored = 0;
  const events = [];
  for (const x of journal.entries) {
    const item = bridgeEvent(x, showText);
    if (item) events.push(item); else ignored++;
  }
  for (const x of receipts.entries) {
    const item = receiptEvent(x, showText);
    if (item) events.push(item); else ignored++;
  }
  events.sort((a, b) => b.at.localeCompare(a.at) || a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
  return {
    schema: "hgr.development-timeline.v1",
    totals: {
      bridge: events.filter(e => e.source === "bridge").length,
      receipts: events.filter(e => e.source === "openshard").length,
      invalid: journal.invalid + receipts.invalid + ignored,
    },
    events: events.slice(0, limit),
  };
}

export function timelineFromRepo(root, options = {}) {
  if (!existsSync(path.join(root, "VERSION")) || !existsSync(path.join(root, "docs", "HGR_MASTERBOOK.md"))) {
    throw new Error("Expected a verified HGR repository root");
  }
  const bridge = readJsonlTail(path.join(root, ".openshard", "bridge", "prompt-journal.jsonl"));
  const receipts = readJsonlTail(path.join(root, ".openshard", "runs.jsonl"));
  const result = mergeTimeline({ journalLines: bridge.lines, receiptLines: receipts.lines, ...options });
  result.sources = {
    bridge: bridge.missing ? "missing" : bridge.truncated ? "tail-only" : "available",
    openshard: receipts.missing ? "missing" : receipts.truncated ? "tail-only" : "available",
  };
  return result;
}

function main() {
  const args = process.argv.slice(2);
  let root = fileURLToPath(new URL("../", import.meta.url));
  let json = false, showText = false, limit = DEFAULT_LIMIT;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") json = true;
    else if (arg === "--show-text") showText = true;
    else if (arg === "--limit" && i + 1 < args.length) limit = Number(args[++i]);
    else if (arg === "--repo-root" && i + 1 < args.length) root = path.resolve(args[++i]);
    else throw new Error("Unknown timeline argument: " + arg);
  }
  const result = timelineFromRepo(root, { limit, showText });
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }
  process.stdout.write("HGR development timeline (local, read-only)\n");
  process.stdout.write("Bridge: " + result.sources.bridge + " | OpenShard: " + result.sources.openshard + "\n");
  if (result.totals.invalid) process.stdout.write("Ignored invalid records: " + result.totals.invalid + "\n");
  if (!result.events.length) process.stdout.write("No local development records found.\n");
  for (const x of result.events) {
    const id = x.receiptId || x.id;
    const task = x.taskId ? " task=" + x.taskId : "";
    process.stdout.write(x.at + " [" + x.source + "/" + x.kind + "] " + x.summary + " (" + x.status + ") " + id + task + "\n");
    if (showText && x.text) process.stdout.write("  " + x.text + "\n");
  }
  process.stdout.write("A prompt record is not an execution receipt. Unverified receipts do not prove a completed task.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    process.stderr.write("HGR timeline: " + error.message + "\n");
    process.exitCode = 1;
  }
}
