/**
 * Privacy-limited outbound OpenShard metadata relay.
 * No remote PC shell, local file URL, raw prompt, native task text or credential
 * is ever stored in a relay snapshot or returned to Control.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { getHalieusDataRoot } from "./dataPaths.js";

export type RelayEvent = {
  at: string;
  source: "bridge" | "openshard";
  kind: string;
  status: string;
  id: string;
  taskId: string | null;
  changedFiles?: number;
};
export type RelaySnapshot = {
  source: "available" | "partial";
  latestAt: string | null;
  events: RelayEvent[];
};
type StoredRelay = {
  version: 1;
  deviceId: string;
  sentAt: string;
  receivedAt: string;
  nonce: string;
  snapshot: RelaySnapshot;
};

export const RELAY_MAX_EVENTS = 12;
export const RELAY_STALE_MS = 120_000;
const SKEW_MS = 120_000;
const BRIDGE_KINDS = new Set(["prompt", "plan", "started", "checkpoint", "completed", "blocked"]);
const BRIDGE_STATES = new Set(["prompt", "plan", "started", "checkpoint", "blocked", "milestone-reported"]);
const RUN_STATES = new Set(["not-verified", "verification-passed", "verification-failed"]);
const textId = (s: unknown, limit = 160): s is string =>
  typeof s === "string" && s.length > 0 && s.length <= limit && /^[A-Za-z0-9_.:-]+$/.test(s);
const keys = (item: Record<string, unknown>, allowed: readonly string[], required: readonly string[] = allowed) =>
  Object.keys(item).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(item, k));
function dict(item: unknown): Record<string, unknown> | null {
  return item !== null && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : null;
}
function canonicalTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}
export function validateRelaySnapshot(raw: unknown): RelaySnapshot | null {
  const snapshot = dict(raw);
  if (!snapshot || !keys(snapshot, ["source", "latestAt", "events"])
    || !["available", "partial"].includes(String(snapshot.source))
    || !(snapshot.latestAt === null || canonicalTime(snapshot.latestAt))
    || !Array.isArray(snapshot.events) || snapshot.events.length > RELAY_MAX_EVENTS) return null;

  const items: RelayEvent[] = [];
  for (const rawEvent of snapshot.events) {
    const entry = dict(rawEvent);
    if (!entry || !keys(entry, ["at", "source", "kind", "status", "id", "taskId", "changedFiles"],
      ["at", "source", "kind", "status", "id", "taskId"])
      || !canonicalTime(entry.at) || !textId(entry.id)
      || !(entry.taskId === null || textId(entry.taskId, 128))) return null;
    const isBridge = entry.source === "bridge";
    const isNative = entry.source === "openshard";
    if ((!isBridge && !isNative)
      || (isBridge && (!BRIDGE_KINDS.has(String(entry.kind)) ||
        !BRIDGE_STATES.has(String(entry.status)) ||
        (entry.kind === "completed" && entry.status !== "milestone-reported") ||
        (entry.kind !== "completed" && entry.status !== entry.kind) ||
        Object.hasOwn(entry, "changedFiles")))
      || (isNative && (entry.kind !== "receipt" || !RUN_STATES.has(String(entry.status))))
      || (Object.hasOwn(entry, "changedFiles") &&
        (typeof entry.changedFiles !== "number" || !Number.isSafeInteger(entry.changedFiles)
        || entry.changedFiles < 0 || entry.changedFiles > 50_000))) return null;
    items.push({
      at: entry.at, source: entry.source as RelayEvent["source"], kind: String(entry.kind),
      status: String(entry.status), id: entry.id, taskId: entry.taskId as string | null,
      ...(isNative && Object.hasOwn(entry, "changedFiles") ? { changedFiles: entry.changedFiles as number } : {}),
    });
  }
  if (items.some((e, i) => i > 0 && e.at > items[i - 1].at)) return null;
  if (items.length && snapshot.latestAt !== items[0].at) return null;
  if (!items.length && snapshot.latestAt !== null) return null;
  return { source: snapshot.source as RelaySnapshot["source"],
    latestAt: snapshot.latestAt as string | null, events: items };
}

export type RelayUpload = { sentAt: string; nonce: string; snapshot: RelaySnapshot };
export function validateRelayUpload(raw: unknown, nowMs = Date.now()): RelayUpload | null {
  const body = dict(raw);
  if (!body || !keys(body, ["sentAt", "nonce", "snapshot"]) ||
    !canonicalTime(body.sentAt) || !Number.isFinite(Date.parse(body.sentAt)) ||
    Math.abs(Date.parse(body.sentAt) - nowMs) > SKEW_MS ||
    typeof body.nonce !== "string" || !/^[a-f0-9]{32}$/.test(body.nonce)) return null;
  const snapshot = validateRelaySnapshot(body.snapshot);
  return snapshot ? { sentAt: body.sentAt, nonce: body.nonce, snapshot } : null;
}

const configuredRoot = getHalieusDataRoot();
const dataDir = configuredRoot
  ? resolve(configuredRoot, "control-cloud")
  : resolve(process.cwd(), "data", "control-cloud");
export const relayPath = resolve(dataDir, "development-relay.json");
const deviceStatePath = resolve(dataDir, "state.json");
let writeTail: Promise<void> = Promise.resolve();
async function fileJson(filename: string): Promise<unknown> {
  try { return JSON.parse(await readFile(filename, "utf8")) as unknown; }
  catch { return null; }
}
function parseStored(raw: unknown): StoredRelay | null {
  const x = dict(raw);
  if (!x || x.version !== 1 || !textId(x.deviceId, 96) ||
      !canonicalTime(x.sentAt) || !canonicalTime(x.receivedAt) ||
      typeof x.nonce !== "string" || !/^[a-f0-9]{32}$/.test(x.nonce)) return null;
  const snapshot = validateRelaySnapshot(x.snapshot);
  return snapshot ? { version: 1, deviceId: x.deviceId, sentAt: x.sentAt,
    receivedAt: x.receivedAt, nonce: x.nonce, snapshot } : null;
}

/** A signed-in approved Control Cloud Agent uploads a sanitized snapshot only. */
export async function storeRelaySnapshot(deviceId: string, raw: unknown, now = Date.now(),
  filename = relayPath): Promise<"accepted" | "replay" | "invalid"> {
  if (!textId(deviceId, 96)) return "invalid";
  const upload = validateRelayUpload(raw, now);
  if (!upload) return "invalid";
  let status: "accepted" | "replay" = "accepted";
  const run = writeTail.catch(() => undefined).then(async () => {
    const previous = parseStored(await fileJson(filename));
    if (previous &&
      (Date.parse(upload.sentAt) <= Date.parse(previous.sentAt) ||
       previous.nonce === upload.nonce)) { status = "replay"; return; }
    const result: StoredRelay = {
      version: 1, deviceId, sentAt: upload.sentAt, nonce: upload.nonce,
      receivedAt: new Date(now).toISOString(), snapshot: upload.snapshot,
    };
    await mkdir(dirname(filename), { recursive: true });
    const temp = filename + "." + randomUUID() + ".tmp";
    await writeFile(temp, JSON.stringify(result) + "\n", { encoding: "utf8", mode: 0o600 });
    await rename(temp, filename);
  });
  writeTail = run.then(() => undefined, () => undefined);
  await run;
  return status;
}
export type RelayRead = {
  state: "unavailable" | "fresh" | "stale";
  lastReceivedAt: string | null;
  snapshot: RelaySnapshot | null;
};
export async function readOwnerRelay(now = Date.now(), filename = relayPath,
  deviceFilename = deviceStatePath): Promise<RelayRead> {
  const empty: RelayRead = { state: "unavailable", lastReceivedAt: null, snapshot: null };
  const stored = parseStored(await fileJson(filename));
  if (!stored) return empty;
  const deviceStore = dict(await fileJson(deviceFilename));
  const devices = Array.isArray(deviceStore?.devices) ? deviceStore.devices : [];
  const approved = devices.some(item => {
    const d = dict(item);
    return d?.deviceId === stored.deviceId && d?.approval === "approved";
  });
  if (!approved) return empty; // revoked/unapproved devices cannot publish prior data
  const age = now - Date.parse(stored.receivedAt);
  if (!Number.isFinite(age) || age < -30_000) return empty;
  return {
    state: age <= RELAY_STALE_MS ? "fresh" : "stale",
    lastReceivedAt: stored.receivedAt, snapshot: stored.snapshot,
  };
}
