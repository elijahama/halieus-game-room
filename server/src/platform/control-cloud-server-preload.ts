import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";

import {
  HGR_CONTROL_CLOUD_PROTOCOL,
  type HalieusCloudControlRequest,
} from "../../../shared/platform/control-cloud.js";
import type { Request as ExpressRequest } from "express";
import { getAuthenticatedAccount } from "./accounts.js";
import { getHalieusDataRoot } from "./dataPaths.js";

type DeviceApproval = "pending" | "approved" | "revoked";
type CloudOperationState = "queued" | "running" | "succeeded" | "failed" | "rejected";

interface StoredDevice {
  deviceId: string;
  secretHash: string;
  approval: DeviceApproval;
  machineName: string;
  hgrVersion: string | null;
  createdAt: string;
  approvedAt: string | null;
  lastSeenAt: string;
  localControlOnline: boolean;
}

interface StoredRequest {
  requestId: string;
  deviceId: string;
  action: "update";
  state: CloudOperationState;
  requestedAt: string;
  dispatchedAt: string | null;
  updatedAt: string;
  phase: string;
  progress: number;
  reason: string | null;
  localOperationId: string | null;
}

interface CloudStore {
  version: 1;
  devices: StoredDevice[];
  requests: StoredRequest[];
}

interface ConfirmationRecord {
  actorId: string;
  deviceId: string;
  expiresAt: number;
}

const ONLINE_WINDOW_MS = 20_000;
const CONFIRMATION_TTL_MS = 30_000;
const MAX_PENDING_DEVICES = 8;
const MAX_REQUEST_HISTORY = 40;
const MAX_BODY_BYTES = 8 * 1024;
const pendingExpiryMs = 24 * 60 * 60 * 1000;
const confirmations = new Map<string, ConfirmationRecord>();

const configuredRoot = getHalieusDataRoot();
const stateDirectory = configuredRoot
  ? resolve(configuredRoot, "control-cloud")
  : resolve(process.cwd(), "data", "control-cloud");
const statePath = resolve(stateDirectory, "state.json");
let loadedStore: CloudStore | null = null;
let mutationTail: Promise<void> = Promise.resolve();

function emptyStore(): CloudStore {
  return { version: 1, devices: [], requests: [] };
}

async function readStore(): Promise<CloudStore> {
  if (loadedStore) return loadedStore;
  if (!existsSync(statePath)) {
    loadedStore = emptyStore();
    return loadedStore;
  }
  try {
    const parsed = JSON.parse(await readFile(statePath, "utf8")) as Partial<CloudStore>;
    loadedStore = {
      version: 1,
      devices: Array.isArray(parsed.devices) ? parsed.devices : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    };
  } catch (error) {
    console.error("HGR Control Cloud state could not be read:", error);
    loadedStore = emptyStore();
  }
  return loadedStore;
}

async function saveStore(store: CloudStore): Promise<void> {
  await mkdir(stateDirectory, { recursive: true });
  const temporary = `${statePath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporary, statePath);
}

async function mutateStore<T>(mutator: (store: CloudStore) => T | Promise<T>): Promise<T> {
  let result!: T;
  const run = mutationTail
    .catch(() => undefined)
    .then(async () => {
      const store = await readStore();
      result = await mutator(store);
      store.requests = store.requests
        .slice()
        .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))
        .slice(0, MAX_REQUEST_HISTORY);
      await saveStore(store);
    });
  mutationTail = run.then(() => undefined, () => undefined);
  await run;
  return result;
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Frame-Options", "DENY");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  setSecurityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function exactKeys(body: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(body).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function boundedText(value: unknown, maximum: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function validDeviceId(value: string): boolean {
  return /^[A-Za-z0-9._-]{8,96}$/.test(value);
}

function hashSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeHashMatches(expected: string, secret: string): boolean {
  const actual = hashSecret(secret);
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function isSameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers.host;
  if (!host) return false;
  const forwarded = request.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || "http";
  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

function adminAccount(request: IncomingMessage) {
  const account = getAuthenticatedAccount(request as unknown as ExpressRequest);
  if (!account || (account.role !== "owner" && account.role !== "admin")) return null;
  return account;
}

function requireAdmin(request: IncomingMessage, response: ServerResponse) {
  const account = adminAccount(request);
  if (!account) {
    sendJson(response, 403, { ok: false, reason: "Owner or administrator access is required." });
    return null;
  }
  if (request.method === "POST" && !isSameOrigin(request)) {
    sendJson(response, 403, { ok: false, reason: "Cross-origin Control requests are not accepted." });
    return null;
  }
  return account;
}

function deviceOnline(device: StoredDevice): boolean {
  return Date.now() - Date.parse(device.lastSeenAt) <= ONLINE_WINDOW_MS;
}

function publicOperation(request: StoredRequest | null) {
  if (!request) return null;
  return {
    id: request.requestId,
    action: "update",
    title: "Updating HGR",
    phase: request.phase,
    progress: request.progress,
    state: request.state === "queued" ? "running" : request.state,
    startedAt: request.requestedAt,
    reason: request.reason,
  };
}

function latestLiveRequest(store: CloudStore): StoredRequest | null {
  return store.requests
    .filter((entry) => entry.state === "queued" || entry.state === "running")
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0] ?? null;
}

async function handleHeartbeat(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request); }
  catch { sendJson(response, 400, { ok: false, reason: "Invalid Control Agent heartbeat." }); return; }

  const protocol = boundedText(body.protocol, 64);
  const deviceId = boundedText(body.deviceId, 96);
  const secret = boundedText(body.secret, 256);
  const machineName = boundedText(body.machineName, 80) || "Owner PC";
  const hgrVersion = boundedText(body.hgrVersion, 40) || null;
  const localControlOnline = body.localControlOnline === true;
  if (protocol !== HGR_CONTROL_CLOUD_PROTOCOL || !validDeviceId(deviceId) || secret.length < 32) {
    sendJson(response, 400, { ok: false, reason: "Invalid Control Agent identity." });
    return;
  }

  const result = await mutateStore((store) => {
    const now = new Date().toISOString();
    const cutoff = Date.now() - pendingExpiryMs;
    store.devices = store.devices.filter((device) => device.approval !== "pending" || Date.parse(device.lastSeenAt) >= cutoff);
    let device = store.devices.find((candidate) => candidate.deviceId === deviceId);
    if (!device) {
      if (store.devices.filter((candidate) => candidate.approval === "pending").length >= MAX_PENDING_DEVICES) {
        return { status: 429, body: { ok: false, reason: "Too many unapproved owner-PC enrollment attempts." } };
      }
      device = {
        deviceId,
        secretHash: hashSecret(secret),
        approval: "pending",
        machineName,
        hgrVersion,
        createdAt: now,
        approvedAt: null,
        lastSeenAt: now,
        localControlOnline,
      };
      store.devices.push(device);
      return { status: 200, body: { ok: true, approved: false, enrollment: "pending" } };
    }
    if (!safeHashMatches(device.secretHash, secret)) {
      return { status: 403, body: { ok: false, reason: "Control Agent credential was not accepted." } };
    }
    if (device.approval === "revoked") {
      return { status: 403, body: { ok: false, reason: "This owner-PC Control enrollment was revoked." } };
    }
    device.machineName = machineName;
    device.hgrVersion = hgrVersion;
    device.lastSeenAt = now;
    device.localControlOnline = localControlOnline;
    return { status: 200, body: { ok: true, approved: device.approval === "approved", enrollment: device.approval } };
  });
  sendJson(response, result.status, result.body);
}

async function authenticatedAgent(
  body: Record<string, unknown>,
): Promise<{ store: CloudStore; device: StoredDevice } | null> {
  const protocol = boundedText(body.protocol, 64);
  const deviceId = boundedText(body.deviceId, 96);
  const secret = boundedText(body.secret, 256);
  if (protocol !== HGR_CONTROL_CLOUD_PROTOCOL || !validDeviceId(deviceId) || secret.length < 32) return null;
  const store = await readStore();
  const device = store.devices.find((candidate) => candidate.deviceId === deviceId);
  if (!device || device.approval !== "approved" || !safeHashMatches(device.secretHash, secret)) return null;
  return { store, device };
}

async function handlePoll(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request); }
  catch { sendJson(response, 400, { ok: false, reason: "Invalid Control Agent poll." }); return; }
  const auth = await authenticatedAgent(body);
  if (!auth) { sendJson(response, 403, { ok: false, reason: "Approved Control Agent credential required." }); return; }

  const result = await mutateStore((store) => {
    const device = store.devices.find((candidate) => candidate.deviceId === auth.device.deviceId)!;
    device.lastSeenAt = new Date().toISOString();
    const queued = store.requests
      .filter((entry) => entry.deviceId === device.deviceId && entry.action === "update" && entry.state === "queued")
      .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt))[0] ?? null;
    if (!queued) return null;
    queued.state = "running";
    queued.dispatchedAt = new Date().toISOString();
    queued.updatedAt = queued.dispatchedAt;
    queued.phase = "Sent to owner PC";
    queued.progress = Math.max(queued.progress, 1);
    const cloudRequest: HalieusCloudControlRequest = {
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      requestId: queued.requestId,
      deviceId: queued.deviceId,
      action: "update",
      requestedAt: queued.requestedAt,
    };
    return cloudRequest;
  });
  sendJson(response, 200, { ok: true, request: result });
}

async function handleProgress(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request); }
  catch { sendJson(response, 400, { ok: false, reason: "Invalid Control Agent progress report." }); return; }
  const auth = await authenticatedAgent(body);
  if (!auth) { sendJson(response, 403, { ok: false, reason: "Approved Control Agent credential required." }); return; }

  const requestId = boundedText(body.requestId, 96);
  const state = boundedText(body.state, 20) as CloudOperationState;
  const allowedStates = new Set<CloudOperationState>(["running", "succeeded", "failed", "rejected"]);
  if (!requestId || !allowedStates.has(state)) {
    sendJson(response, 400, { ok: false, reason: "Invalid update operation state." });
    return;
  }
  const progress = Math.max(0, Math.min(100, Number(body.progress) || 0));
  const phase = boundedText(body.phase, 160) || (state === "succeeded" ? "Update complete" : "Updating HGR");
  const reason = boundedText(body.reason, 900) || null;
  const localOperationId = boundedText(body.localOperationId, 96) || null;

  const found = await mutateStore((store) => {
    const operation = store.requests.find((entry) => entry.requestId === requestId && entry.deviceId === auth.device.deviceId && entry.action === "update");
    if (!operation) return false;
    operation.state = state;
    operation.progress = state === "succeeded" ? 100 : Math.max(operation.progress, progress);
    operation.phase = phase;
    operation.reason = reason;
    operation.localOperationId = localOperationId ?? operation.localOperationId;
    operation.updatedAt = new Date().toISOString();
    const device = store.devices.find((candidate) => candidate.deviceId === auth.device.deviceId);
    if (device) device.lastSeenAt = operation.updatedAt;
    return true;
  });
  if (!found) { sendJson(response, 404, { ok: false, reason: "Unknown cloud Update request." }); return; }
  sendJson(response, 200, { ok: true });
}

async function handleStatus(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!requireAdmin(request, response)) return;
  const store = await readStore();
  const active = latestLiveRequest(store);
  sendJson(response, 200, {
    ok: true,
    protocol: HGR_CONTROL_CLOUD_PROTOCOL,
    devices: store.devices.map((device) => ({
      deviceId: device.deviceId,
      machineName: device.machineName,
      hgrVersion: device.hgrVersion,
      approval: device.approval,
      online: deviceOnline(device),
      lastSeenAt: device.lastSeenAt,
      localControlOnline: device.localControlOnline,
    })),
    activeOperation: publicOperation(active),
  });
}

async function handleApprove(request: IncomingMessage, response: ServerResponse, deviceId: string): Promise<void> {
  const actor = requireAdmin(request, response);
  if (!actor) return;
  const approved = await mutateStore((store) => {
    const device = store.devices.find((candidate) => candidate.deviceId === deviceId);
    if (!device || device.approval === "revoked") return false;
    device.approval = "approved";
    device.approvedAt = new Date().toISOString();
    return true;
  });
  if (!approved) { sendJson(response, 404, { ok: false, reason: "Pending owner PC was not found." }); return; }
  sendJson(response, 200, { ok: true, deviceId, approvedBy: actor.id });
}

async function ensureUpdateReady(deviceId: string): Promise<{ ok: true; device: StoredDevice } | { ok: false; status: number; reason: string }> {
  const store = await readStore();
  const device = store.devices.find((candidate) => candidate.deviceId === deviceId);
  if (!device || device.approval !== "approved") return { ok: false, status: 404, reason: "Approved owner PC was not found." };
  if (!deviceOnline(device)) return { ok: false, status: 409, reason: "Owner PC is offline. Start HGR Control on the owner PC before updating." };
  if (!device.localControlOnline) return { ok: false, status: 409, reason: "Owner PC is reachable, but the local HGR Control Agent is unavailable." };
  const active = store.requests.find((entry) => entry.deviceId === deviceId && (entry.state === "queued" || entry.state === "running"));
  if (active) return { ok: false, status: 409, reason: "Another owner-PC Control operation is already running." };
  return { ok: true, device };
}

async function handleConfirmUpdate(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const actor = requireAdmin(request, response);
  if (!actor) return;
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request); }
  catch { sendJson(response, 400, { ok: false, reason: "Invalid Update confirmation request." }); return; }
  if (!exactKeys(body, ["deviceId"])) { sendJson(response, 400, { ok: false, reason: "Update confirmation accepts only the owner-PC device ID." }); return; }
  const deviceId = boundedText(body.deviceId, 96);
  const ready = await ensureUpdateReady(deviceId);
  if (!ready.ok) { sendJson(response, ready.status, { ok: false, reason: ready.reason }); return; }
  const confirmationId = randomBytes(24).toString("base64url");
  confirmations.set(hashSecret(confirmationId), {
    actorId: actor.id,
    deviceId,
    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
  });
  sendJson(response, 200, {
    ok: true,
    deviceId,
    confirmationId,
    expiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString(),
  });
}

async function handleQueueUpdate(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const actor = requireAdmin(request, response);
  if (!actor) return;
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request); }
  catch { sendJson(response, 400, { ok: false, reason: "Invalid Update request." }); return; }
  if (!exactKeys(body, ["deviceId", "confirmationId"])) {
    sendJson(response, 400, { ok: false, reason: "Cloud Update accepts only a device ID and one-time confirmation ID." });
    return;
  }
  const deviceId = boundedText(body.deviceId, 96);
  const confirmationId = boundedText(body.confirmationId, 128);
  const confirmationKey = hashSecret(confirmationId);
  const confirmation = confirmations.get(confirmationKey);
  confirmations.delete(confirmationKey);
  if (!confirmation || confirmation.expiresAt <= Date.now() || confirmation.actorId !== actor.id || confirmation.deviceId !== deviceId) {
    sendJson(response, 409, { ok: false, reason: "Update HGR requires a fresh one-time confirmation." });
    return;
  }
  const ready = await ensureUpdateReady(deviceId);
  if (!ready.ok) { sendJson(response, ready.status, { ok: false, reason: ready.reason }); return; }

  const operation = await mutateStore((store) => {
    const now = new Date().toISOString();
    const entry: StoredRequest = {
      requestId: randomUUID(),
      deviceId,
      action: "update",
      state: "queued",
      requestedAt: now,
      dispatchedAt: null,
      updatedAt: now,
      phase: "Waiting for owner PC",
      progress: 0,
      reason: null,
      localOperationId: null,
    };
    store.requests.unshift(entry);
    return entry;
  });
  sendJson(response, 202, { ok: true, operation: publicOperation(operation) });
}

async function handleCloudRoute(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url || "/", "http://hgr-control.invalid");
  const path = url.pathname;
  if (request.method === "POST" && path === "/control/cloud/agent/heartbeat") return handleHeartbeat(request, response);
  if (request.method === "POST" && path === "/control/cloud/agent/poll") return handlePoll(request, response);
  if (request.method === "POST" && path === "/control/cloud/agent/progress") return handleProgress(request, response);
  if (request.method === "GET" && path === "/control/cloud/status") return handleStatus(request, response);
  const approve = path.match(/^\/control\/cloud\/devices\/([A-Za-z0-9._-]{8,96})\/approve$/);
  if (request.method === "POST" && approve) return handleApprove(request, response, approve[1]);
  if (request.method === "POST" && path === "/control/cloud/actions/update/confirm") return handleConfirmUpdate(request, response);
  if (request.method === "POST" && path === "/control/cloud/actions/update") return handleQueueUpdate(request, response);
  sendJson(response, 404, { ok: false, reason: "Unknown HGR Control Cloud endpoint." });
}

function isCloudControlPath(url: string | undefined): boolean {
  if (!url) return false;
  try { return new URL(url, "http://hgr-control.invalid").pathname.startsWith("/control/cloud/"); }
  catch { return false; }
}

function wrapListener(listener: RequestListener): RequestListener {
  return (request, response) => {
    if (!isCloudControlPath(request.url)) {
      listener(request, response);
      return;
    }
    void handleCloudRoute(request, response).catch((error) => {
      console.error("HGR Control Cloud route failed:", error);
      if (!response.headersSent) sendJson(response, 500, { ok: false, reason: "HGR Control Cloud is temporarily unavailable." });
      else response.end();
    });
  };
}

// The production server imports createServer as a named Node builtin export.
// Patch only that factory before the application module loads, then synchronise
// the builtin ESM export. This keeps cloud-control routes isolated from the
// gameplay server without adding a second public listener or inbound PC port.
const require = createRequire(import.meta.url);
const httpModule = require("node:http") as typeof import("node:http");
const originalCreateServer = httpModule.createServer.bind(httpModule);
(httpModule as unknown as { createServer: (...args: unknown[]) => unknown }).createServer = (...args: unknown[]) => {
  const listenerIndex = typeof args[0] === "function" ? 0 : typeof args[1] === "function" ? 1 : -1;
  if (listenerIndex >= 0) args[listenerIndex] = wrapListener(args[listenerIndex] as RequestListener);
  return (originalCreateServer as (...values: unknown[]) => unknown)(...args);
};
syncBuiltinESMExports();
