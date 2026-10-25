/**
 * Local OpenShard evidence for owner-only HGR Control.
 * Never accepts a URL/path from an HTTP request, uploads raw data, or starts a task.
 * A remote Oracle process without the local journal must return unavailable.
 */
import { closeSync, existsSync, fstatSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";

type SafeEvent = {
  at: string;
  source: "bridge" | "openshard";
  kind: string;
  status: string;
  id: string;
  taskId: string | null;
  changedFiles?: number;
};

export type LocalTimelineSnapshot = {
  ok: true;
  source: "available" | "partial" | "unavailable";
  checkedAt: string;
  sources: { bridge: string; openshard: string };
  latestAt: string | null;
  events: SafeEvent[];
  note: string;
};

const MAX_BYTES = 256 * 1024;
const MAX_EVENTS = 18;
const MAX_SCAN = 300;
const allowedKinds = new Set(["prompt", "plan", "started", "checkpoint", "completed", "blocked"]);
const safeId = (value: unknown): string | null =>
  typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,160}$/.test(value) ? value : null;
const validTime = (value: unknown): string | null => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
};
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
function tailJsonl(filename: string): { source: string; entries: Record<string, unknown>[] } {
  if (!existsSync(filename)) return { source: "missing", entries: [] };
  let fd: number | null = null;
  try {
    fd = openSync(filename, "r");
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - MAX_BYTES);
    const buffer = Buffer.alloc(size - start);
    let copied = 0;
    while (copied < buffer.length) {
      const count = readSync(fd, buffer, copied, buffer.length - copied, start + copied);
      if (!count) break;
      copied += count;
    }
    let contents = buffer.toString("utf8", 0, copied);
    if (start > 0) {
      const pos = contents.indexOf("\n");
      contents = pos < 0 ? "" : contents.slice(pos + 1);
    }
    const entries: Record<string, unknown>[] = [];
    for (const line of contents.split(/\r?\n/).filter(Boolean).slice(-MAX_SCAN)) {
      try {
        const parsed = record(JSON.parse(line));
        if (parsed) entries.push(parsed);
      } catch { /* Ignore malformed records without echoing their contents. */ }
    }
    return { source: start > 0 ? "tail-only" : "available", entries };
  } catch {
    return { source: "unreadable", entries: [] };
  } finally { if (fd !== null) closeSync(fd); }
}
function isLocalRoot(root: string): boolean {
  return existsSync(resolve(root, ".git"))
    && existsSync(resolve(root, "VERSION"))
    && existsSync(resolve(root, "docs", "HGR_MASTERBOOK.md"));
}
export function localTimelineRoot(): string | null {
  // These are fixed process-local candidates, never caller-supplied URLs or paths.
  const candidates = [resolve(process.cwd(), ".."), resolve(process.cwd())];
  return candidates.find(isLocalRoot) ?? null;
}
export function loadLocalDevelopmentTimeline(root: string | null = localTimelineRoot()): LocalTimelineSnapshot {
  const checkedAt = new Date().toISOString();
  const absent = (): LocalTimelineSnapshot => ({
    ok: true, source: "unavailable", checkedAt,
    sources: { bridge: "missing", openshard: "missing" },
    latestAt: null, events: [],
    note: "The owner's local OpenShard history is not connected to this server. This is not a live activity feed.",
  });
  if (!root || !isLocalRoot(root)) return absent();
  const bridge = tailJsonl(resolve(root, ".openshard", "bridge", "prompt-journal.jsonl"));
  const native = tailJsonl(resolve(root, ".openshard", "runs.jsonl"));
  const evidence: SafeEvent[] = [];
  for (const entry of bridge.entries) {
    const at = validTime(entry.at), id = safeId(entry.id), kind = entry.kind;
    if (entry.schema !== "hgr-openshard-bridge.prompt.v1" || !at || !id
        || typeof kind !== "string" || !allowedKinds.has(kind)) continue;
    evidence.push({
      at, source: "bridge", kind,
      status: kind === "completed" ? "milestone-reported" : kind,
      id, taskId: safeId(entry.taskId),
    });
  }
  for (const entry of native.entries) {
    const at = validTime(entry.timestamp), id = safeId(entry.receipt_id);
    if (!at || !id || !safeId(entry.shard_id)) continue;
    const validation = record(entry.verification);
    const verification = validation?.status;
    const passed = verification === "passed" || (verification == null && entry.verification_passed === true);
    const failed = verification === "failed" || (verification == null && entry.verification_passed === false);
    const changedFiles = [entry.files_created, entry.files_updated, entry.files_deleted]
      .reduce<number>((sum, item) => sum + (typeof item === "number" && Number.isSafeInteger(item) && item > 0 ? item : 0), 0);
    evidence.push({
      at, source: "openshard", kind: "receipt", id,
      status: passed ? "verification-passed" : failed ? "verification-failed" : "not-verified",
      taskId: safeId(entry.task_id), changedFiles,
    });
  }
  evidence.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
  const available = (source: string) => source === "available" || source === "tail-only";
  const sources = { bridge: bridge.source, openshard: native.source };
  const source = available(bridge.source) && available(native.source) ? "available"
    : available(bridge.source) || available(native.source) ? "partial" : "unavailable";
  return {
    ok: true, checkedAt, source, sources,
    events: evidence.slice(0, MAX_EVENTS), latestAt: evidence[0]?.at ?? null,
    note: source === "unavailable"
      ? "Local evidence is not available on this server. No live HGR laptop connection is implied."
      : "Historical local records only. Captured prompts are not task completion; receipt verification is independent.",
  };
}
