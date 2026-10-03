import type { Express, Request, Response } from "express";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import {
  HGR_CONTROL_CLOUD_ACTIONS,
  HGR_CONTROL_CLOUD_PROTOCOL,
  HGR_CONTROL_CLOUD_READ_ACTIONS,
  type HalieusCloudControlActionId,
  type HalieusCloudControlResult,
  type HalieusCloudDeviceSummary,
  type HalieusCloudRelayCommand,
  type HalieusCloudRelayPayload,
} from "../../../shared/platform/control-cloud.js";
import { getControlCloudDataDirectory } from "./dataPaths.js";

type AccountResolver = (request: Request) => HalieusAccountSummary | null;
type AdminResolver = (request: Request) => boolean;

interface StoredControlCloudDevice {
  deviceId: string;
  label: string;
  ownerAccountId: string;
  machineName: string;
  tokenHash: string;
  createdAt: number;
  lastSeenAt: number | null;
  revokedAt: number | null;
  hgrVersion: string | null;
  agentStartedAt: string | null;
}

interface ControlCloudStore {
  version: 1;
  devices: StoredControlCloudDevice[];
}

type RelayState = "queued" | "dispatched" | "succeeded" | "failed" | "rejected";

interface RelayRequestRecord extends HalieusCloudRelayCommand {
  requestedByAccountId: string;
  state: RelayState;
  dispatchedAt: string | null;
  result: HalieusCloudControlResult | null;
}

const dataDirectory = getControlCloudDataDirectory();
const storePath = resolve(dataDirectory, "devices.json");
const DEVICE_ONLINE_MS = 20_000;
const MAX_ACTIVE_DEVICES_PER_ACCOUNT = 12;
const MAX_RELAY_REQUESTS = 250;
const MAX_RESULT_PAYLOAD_BYTES = 64 * 1024;
const RELAY_REQUEST_RETENTION_MS = 15 * 60 * 1000;

let store: ControlCloudStore = { version: 1, devices: [] };
let storeLoad: Promise<void> | null = null;
let saveQueue: Promise<void> = Promise.resolve();
const relayRequests = new Map<string, RelayRequestRecord>();

function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function hashToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function tokenHashMatches(expectedHash: string, providedToken: string): boolean {
  if (!expectedHash || !providedToken) return false;
  const actualHash = hashToken(providedToken);
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function bearerToken(request: Request): string {
  const value = request.header("authorization")?.trim() ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function saveStore(): Promise<void> {
  const snapshot = JSON.stringify(store, null, 2);
  saveQueue = saveQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const temporary = `${storePath}.tmp`;
    await writeFile(temporary, snapshot, "utf8");
    await rename(temporary, storePath);
  });
  return saveQueue;
}

async function loadStore(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  if (existsSync(storePath)) {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as Partial<ControlCloudStore>;
    store = {
      version: 1,
      devices: Array.isArray(parsed.devices)
        ? parsed.devices.filter((device): device is StoredControlCloudDevice => Boolean(
            device &&
            typeof device === "object" &&
            typeof device.deviceId === "string" &&
            typeof device.tokenHash === "string",
          ))
        : [],
    };
  }
  await saveStore();
}

function ensureStore(): Promise<void> {
  if (!storeLoad) storeLoad = loadStore();
  return storeLoad;
}

function isOnline(device: StoredControlCloudDevice): boolean {
  return device.revokedAt === null && device.lastSeenAt !== null && Date.now() - device.lastSeenAt <= DEVICE_ONLINE_MS;
}

function publicDevice(device: StoredControlCloudDevice): HalieusCloudDeviceSummary {
  return {
    protocol: HGR_CONTROL_CLOUD_PROTOCOL,
    deviceId: device.deviceId,
    label: device.label,
    ownerAccountId: device.ownerAccountId,
    machineName: device.machineName,
    createdAt: new Date(device.createdAt).toISOString(),
    lastSeenAt: device.lastSeenAt === null ? null : new Date(device.lastSeenAt).toISOString(),
    revokedAt: device.revokedAt === null ? null : new Date(device.revokedAt).toISOString(),
    hgrVersion: device.hgrVersion,
    online: isOnline(device),
  };
}

function requireAdmin(
  request: Request,
  response: Response,
  getAccount: AccountResolver,
  hasAdmin: AdminResolver,
): HalieusAccountSummary | null {
  const account = getAccount(request);
  if (!account || !hasAdmin(request)) {
    response.status(403).json({ ok: false, reason: "Administrator access is required." });
    return null;
  }
  return account;
}

function findActiveDevice(deviceId: string): StoredControlCloudDevice | null {
  const device = store.devices.find((candidate) => candidate.deviceId === deviceId);
  return device && device.revokedAt === null ? device : null;
}

function authenticateAgent(request: Request, deviceId: string): StoredControlCloudDevice | null {
  const device = findActiveDevice(deviceId);
  const token = bearerToken(request);
  if (!device || !token || !tokenHashMatches(device.tokenHash, token)) return null;
  return device;
}

function touchDevice(
  device: StoredControlCloudDevice,
  machineName: unknown,
  hgrVersion: unknown,
  agentStartedAt: unknown,
): void {
  const nextName = cleanString(machineName, 80);
  const nextVersion = cleanString(hgrVersion, 40);
  const nextStarted = cleanString(agentStartedAt, 80);
  if (nextName) device.machineName = nextName;
  if (nextVersion) device.hgrVersion = nextVersion;
  if (nextStarted) device.agentStartedAt = nextStarted;
  device.lastSeenAt = Date.now();
}

function isCloudAction(value: unknown): value is HalieusCloudControlActionId {
  return typeof value === "string" && (HGR_CONTROL_CLOUD_ACTIONS as readonly string[]).includes(value);
}

function isReadRelayAction(value: unknown): value is HalieusCloudRelayCommand["action"] {
  return typeof value === "string" && (HGR_CONTROL_CLOUD_READ_ACTIONS as readonly string[]).includes(value);
}

function pruneRelayRequests(): void {
  const cutoff = Date.now() - RELAY_REQUEST_RETENTION_MS;
  for (const [requestId, request] of relayRequests) {
    const requestedAt = Date.parse(request.requestedAt);
    if (!Number.isFinite(requestedAt) || requestedAt < cutoff) relayRequests.delete(requestId);
  }
  while (relayRequests.size > MAX_RELAY_REQUESTS) {
    const oldest = relayRequests.keys().next().value as string | undefined;
    if (!oldest) break;
    relayRequests.delete(oldest);
  }
}

function validateResultPayload(action: HalieusCloudRelayCommand["action"], payload: unknown): HalieusCloudRelayPayload | null {
  if (payload === null || payload === undefined) return null;
  if (action === "status") {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  } else if (action === "logs") {
    if (!Array.isArray(payload)) return null;
  }
  let serialized = "";
  try { serialized = JSON.stringify(payload); } catch { return null; }
  if (Buffer.byteLength(serialized, "utf8") > MAX_RESULT_PAYLOAD_BYTES) return null;
  return payload as HalieusCloudRelayPayload;
}

export function registerControlCloudRoutes(
  app: Express,
  getAccount: AccountResolver,
  hasAdmin: AdminResolver,
): void {
  app.get("/admin/control/devices", async (request, response) => {
    const actor = requireAdmin(request, response, getAccount, hasAdmin);
    if (!actor) return;
    await ensureStore();
    response.setHeader("Cache-Control", "no-store");
    response.json({
      ok: true,
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      devices: store.devices.map(publicDevice),
    });
  });

  app.post("/admin/control/devices", async (request, response) => {
    const actor = requireAdmin(request, response, getAccount, hasAdmin);
    if (!actor) return;
    await ensureStore();

    const activeForActor = store.devices.filter((device) => device.ownerAccountId === actor.id && device.revokedAt === null).length;
    if (activeForActor >= MAX_ACTIVE_DEVICES_PER_ACCOUNT) {
      response.status(409).json({ ok: false, reason: "Too many active Control devices. Revoke an old device first." });
      return;
    }

    const machineName = cleanString(request.body?.machineName, 80) || "Owner PC";
    const label = cleanString(request.body?.label, 80) || machineName;
    const token = randomBytes(32).toString("base64url");
    const device: StoredControlCloudDevice = {
      deviceId: `control-pc-${randomUUID()}`,
      label,
      ownerAccountId: actor.id,
      machineName,
      tokenHash: hashToken(token),
      createdAt: Date.now(),
      lastSeenAt: null,
      revokedAt: null,
      hgrVersion: null,
      agentStartedAt: null,
    };
    store.devices.push(device);
    await saveStore();
    response.setHeader("Cache-Control", "no-store");
    response.status(201).json({ ok: true, device: publicDevice(device), token });
  });

  app.post("/admin/control/devices/:deviceId/revoke", async (request, response) => {
    const actor = requireAdmin(request, response, getAccount, hasAdmin);
    if (!actor) return;
    await ensureStore();
    const device = store.devices.find((candidate) => candidate.deviceId === request.params.deviceId);
    if (!device) {
      response.status(404).json({ ok: false, reason: "Control device not found." });
      return;
    }
    if (device.revokedAt === null) device.revokedAt = Date.now();
    await saveStore();
    response.json({ ok: true, device: publicDevice(device) });
  });

  app.post("/control/agent/heartbeat", async (request, response) => {
    await ensureStore();
    const deviceId = cleanString(request.body?.deviceId, 120);
    const device = authenticateAgent(request, deviceId);
    if (!device) {
      response.status(401).json({ ok: false, reason: "Control device credential was not accepted." });
      return;
    }
    if (request.body?.protocol !== HGR_CONTROL_CLOUD_PROTOCOL) {
      response.status(400).json({ ok: false, reason: "Unsupported HGR Control cloud protocol." });
      return;
    }
    touchDevice(device, request.body?.machineName, request.body?.hgrVersion, request.body?.agentStartedAt);
    await saveStore();
    response.setHeader("Cache-Control", "no-store");
    response.json({ ok: true, device: publicDevice(device), pollAfterMs: 3000 });
  });

  app.get("/control/agent/poll", async (request, response) => {
    await ensureStore();
    const deviceId = cleanString(request.query.deviceId, 120);
    const device = authenticateAgent(request, deviceId);
    if (!device) {
      response.status(401).json({ ok: false, reason: "Control device credential was not accepted." });
      return;
    }
    device.lastSeenAt = Date.now();
    await saveStore();
    pruneRelayRequests();

    const commands = [...relayRequests.values()]
      .filter((entry) => entry.deviceId === device.deviceId && entry.state === "queued")
      .slice(0, 4);
    const dispatchedAt = new Date().toISOString();
    for (const command of commands) {
      command.state = "dispatched";
      command.dispatchedAt = dispatchedAt;
    }

    response.setHeader("Cache-Control", "no-store");
    response.json({
      ok: true,
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      device: publicDevice(device),
      commands: commands.map(({ requestedByAccountId: _requestedByAccountId, state: _state, dispatchedAt: _dispatchedAt, result: _result, ...command }) => command),
      pollAfterMs: 3000,
    });
  });

  app.post("/control/agent/results", async (request, response) => {
    await ensureStore();
    const deviceId = cleanString(request.body?.deviceId, 120);
    const device = authenticateAgent(request, deviceId);
    if (!device) {
      response.status(401).json({ ok: false, reason: "Control device credential was not accepted." });
      return;
    }
    if (request.body?.protocol !== HGR_CONTROL_CLOUD_PROTOCOL) {
      response.status(400).json({ ok: false, reason: "Unsupported HGR Control cloud protocol." });
      return;
    }

    const requestId = cleanString(request.body?.requestId, 120);
    const entry = relayRequests.get(requestId);
    if (!entry || entry.deviceId !== device.deviceId) {
      response.status(404).json({ ok: false, reason: "Control relay request not found." });
      return;
    }
    if (request.body?.action !== entry.action) {
      response.status(400).json({ ok: false, reason: "Control relay action identity did not match." });
      return;
    }

    const state = request.body?.state;
    if (state !== "succeeded" && state !== "failed" && state !== "rejected") {
      response.status(400).json({ ok: false, reason: "Invalid Control relay result state." });
      return;
    }
    const payload = validateResultPayload(entry.action, request.body?.payload);
    if (request.body?.payload !== null && request.body?.payload !== undefined && payload === null) {
      response.status(400).json({ ok: false, reason: "Control relay result payload was invalid or too large." });
      return;
    }

    touchDevice(device, device.machineName, device.hgrVersion, device.agentStartedAt);
    entry.state = state;
    entry.result = {
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      requestId: entry.requestId,
      deviceId: entry.deviceId,
      action: entry.action,
      state,
      finishedAt: new Date().toISOString(),
      reason: cleanString(request.body?.reason, 500) || null,
      payload,
    };
    await saveStore();
    response.json({ ok: true });
  });

  app.post("/admin/control/requests", async (request, response) => {
    const actor = requireAdmin(request, response, getAccount, hasAdmin);
    if (!actor) return;
    await ensureStore();
    pruneRelayRequests();

    const body = request.body && typeof request.body === "object" && !Array.isArray(request.body)
      ? request.body as Record<string, unknown>
      : {};
    const unexpectedFields = Object.keys(body).filter((key) => key !== "deviceId" && key !== "action");
    if (unexpectedFields.length > 0) {
      response.status(400).json({ ok: false, reason: "Control relay requests do not accept command arguments or arbitrary payloads." });
      return;
    }

    const deviceId = cleanString(body.deviceId, 120);
    const action = body.action;
    if (!isCloudAction(action)) {
      response.status(400).json({ ok: false, reason: "Unknown HGR Control action." });
      return;
    }
    if (!isReadRelayAction(action)) {
      response.status(409).json({
        ok: false,
        reason: "This 4.5.4 Control batch enables only cloud Status and Logs. Mutating actions remain disabled until relay QA is complete.",
      });
      return;
    }

    const device = findActiveDevice(deviceId);
    if (!device) {
      response.status(404).json({ ok: false, reason: "Control device not found or revoked." });
      return;
    }
    if (!isOnline(device)) {
      response.status(409).json({ ok: false, reason: "Owner PC is currently offline." });
      return;
    }

    const command: RelayRequestRecord = {
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      requestId: randomUUID(),
      deviceId: device.deviceId,
      action,
      requestedAt: new Date().toISOString(),
      requestedByAccountId: actor.id,
      state: "queued",
      dispatchedAt: null,
      result: null,
    };
    relayRequests.set(command.requestId, command);
    pruneRelayRequests();
    response.status(202).json({
      ok: true,
      requestId: command.requestId,
      deviceId: command.deviceId,
      action: command.action,
      state: command.state,
    });
  });

  app.get("/admin/control/requests/:requestId", async (request, response) => {
    const actor = requireAdmin(request, response, getAccount, hasAdmin);
    if (!actor) return;
    await ensureStore();
    pruneRelayRequests();
    const entry = relayRequests.get(request.params.requestId);
    if (!entry) {
      response.status(404).json({ ok: false, reason: "Control relay request not found." });
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    response.json({
      ok: true,
      request: {
        protocol: entry.protocol,
        requestId: entry.requestId,
        deviceId: entry.deviceId,
        action: entry.action,
        requestedAt: entry.requestedAt,
        state: entry.state,
        dispatchedAt: entry.dispatchedAt,
        result: entry.result,
      },
    });
  });
}
