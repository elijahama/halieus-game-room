import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  HGR_CONTROL_CLOUD_PROTOCOL,
  type HalieusCloudControlRequest,
} from "../../shared/platform/control-cloud.js";

interface DeviceIdentity {
  version: 1;
  deviceId: string;
  secret: string;
  createdAt: string;
}

interface LocalControlStatus {
  ok: true;
  hgrVersion: string;
  repository?: { commit?: string | null };
  activeOperation?: {
    id: string;
    action: string;
    phase?: string;
    progress?: number;
  } | null;
}

interface LocalControlAuditEntry {
  id?: string;
  action?: string;
  state?: string;
  reason?: string | null;
}

interface UpdateResultMarker {
  state?: "running" | "succeeded" | "failed";
  startedAt?: string;
  finishedAt?: string | null;
  exitCode?: number | null;
  reason?: string | null;
}

const here = dirname(fileURLToPath(import.meta.url));

function isHgrRepositoryRoot(candidate: string): boolean {
  if (!existsSync(resolve(candidate, "VERSION"))) return false;
  if (!existsSync(resolve(candidate, "package.json"))) return false;
  try {
    const metadata = JSON.parse(readFileSync(resolve(candidate, "package.json"), "utf8")) as { name?: string };
    return metadata.name === "halieus-game-room";
  } catch {
    return false;
  }
}

function findProjectRoot(): string {
  const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(here, "../.."), resolve(here, "../../..")];
  const root = candidates.find(isHgrRepositoryRoot);
  if (!root) throw new Error("Unable to locate the HGR repository root for Control Cloud.");
  return root;
}

const projectRoot = findProjectRoot();
const runtimeDirectory = resolve(projectRoot, "server", "data", "runtime");
const identityPath = resolve(runtimeDirectory, ".hgr-control-cloud-device.json");
const localTokenPath = resolve(runtimeDirectory, ".hgr-control-token");
const updateResultPath = resolve(runtimeDirectory, "hgr-control-update-result.json");
const localBase = "http://127.0.0.1:43127";
const cloudBase = (process.env.HGR_CONTROL_CLOUD_URL?.trim() || "https://halieus.remotewire.net").replace(/\/+$/, "");
const pollDelayMs = 2_500;
let stopping = false;
let inFlightRequestId: string | null = null;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function readOrCreateIdentity(): Promise<DeviceIdentity> {
  await mkdir(runtimeDirectory, { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(identityPath, "utf8")) as Partial<DeviceIdentity>;
    if (parsed.version === 1 && typeof parsed.deviceId === "string" && typeof parsed.secret === "string" && parsed.secret.length >= 32) {
      return parsed as DeviceIdentity;
    }
  } catch { /* Create a fresh persistent identity below. */ }
  const identity: DeviceIdentity = {
    version: 1,
    deviceId: randomUUID(),
    secret: randomBytes(32).toString("base64url"),
    createdAt: new Date().toISOString(),
  };
  await atomicJson(identityPath, identity);
  return identity;
}

async function localToken(): Promise<string | null> {
  try {
    const value = (await readFile(localTokenPath, "utf8")).trim();
    return value || null;
  } catch {
    return null;
  }
}

async function localRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await localToken();
  if (!token) throw new Error("Local HGR Control credential is unavailable.");
  return fetch(`${localBase}${path}`, {
    ...init,
    signal: AbortSignal.timeout(8_000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
}

async function localStatus(): Promise<LocalControlStatus | null> {
  try {
    const response = await localRequest("/api/status");
    if (!response.ok) return null;
    return await response.json() as LocalControlStatus;
  } catch {
    return null;
  }
}

async function localAuditFailureReason(localOperationId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await localRequest("/api/logs");
      if (response.ok) {
        const body = await response.json() as { entries?: LocalControlAuditEntry[] };
        const entry = (Array.isArray(body.entries) ? body.entries : []).find((candidate) =>
          candidate.id === localOperationId
          && candidate.action === "update"
          && (candidate.state === "failed" || candidate.state === "rejected"),
        );
        const reason = typeof entry?.reason === "string" ? entry.reason.trim().slice(0, 900) : "";
        if (reason) return reason;
      }
    } catch { /* The local agent may be rotating credentials; retry briefly. */ }
    if (attempt < 5) await delay(250);
  }
  return null;
}

async function cloudRequest(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${cloudBase}${path}`, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function reportProgress(
  identity: DeviceIdentity,
  requestId: string,
  state: "running" | "succeeded" | "failed" | "rejected",
  progress: number,
  phase: string,
  reason: string | null,
  localOperationId: string | null,
): Promise<void> {
  try {
    await cloudRequest("/control/cloud/agent/progress", {
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      deviceId: identity.deviceId,
      secret: identity.secret,
      requestId,
      state,
      progress,
      phase,
      reason,
      localOperationId,
    });
  } catch (error) {
    console.error("HGR Control Cloud progress report failed:", error instanceof Error ? error.message : error);
  }
}

async function readUpdateMarker(): Promise<UpdateResultMarker | null> {
  try { return JSON.parse(await readFile(updateResultPath, "utf8")) as UpdateResultMarker; }
  catch { return null; }
}

async function waitForUpdateResult(
  identity: DeviceIdentity,
  requestId: string,
  localOperationId: string,
  markerStartedBefore: string | null,
): Promise<void> {
  let lastProgress = 3;
  let lastPhase = "Starting approved updater";
  const deadline = Date.now() + 50 * 60 * 1000;
  while (!stopping && Date.now() < deadline) {
    const marker = await readUpdateMarker();
    const markerIsCurrent = Boolean(marker?.startedAt && marker.startedAt !== markerStartedBefore);
    if (markerIsCurrent && marker?.state === "succeeded") {
      await reportProgress(identity, requestId, "succeeded", 100, "Update complete", null, localOperationId);
      return;
    }
    if (markerIsCurrent && marker?.state === "failed") {
      const detailedReason = await localAuditFailureReason(localOperationId);
      await reportProgress(
        identity,
        requestId,
        "failed",
        lastProgress,
        "Update failed",
        detailedReason || marker.reason || "Approved HGR updater failed on the owner PC.",
        localOperationId,
      );
      return;
    }

    const status = await localStatus();
    if (status?.activeOperation?.id === localOperationId) {
      const progress = Math.max(lastProgress, Math.min(99, Number(status.activeOperation.progress) || lastProgress));
      const phase = status.activeOperation.phase || lastPhase;
      if (progress !== lastProgress || phase !== lastPhase) {
        lastProgress = progress;
        lastPhase = phase;
        await reportProgress(identity, requestId, "running", progress, phase, null, localOperationId);
      }
    } else if (!status && lastProgress >= 80) {
      lastPhase = "Owner Control Agent restarting";
      await reportProgress(identity, requestId, "running", lastProgress, lastPhase, null, localOperationId);
    }
    await delay(2_000);
  }
  await reportProgress(identity, requestId, "failed", lastProgress, "Update status timed out", "The cloud bridge stopped receiving a final result from the approved owner-PC updater.", localOperationId);
}

async function executeUpdate(identity: DeviceIdentity, request: HalieusCloudControlRequest): Promise<void> {
  if (inFlightRequestId) {
    await reportProgress(identity, request.requestId, "rejected", 0, "Update rejected", "Another cloud Update is already being handled by this owner PC.", null);
    return;
  }
  inFlightRequestId = request.requestId;
  let localOperationId: string | null = null;
  try {
    const statusBefore = await localStatus();
    if (!statusBefore) {
      await reportProgress(identity, request.requestId, "rejected", 0, "Owner PC unavailable", "The local HGR Control Agent is not running on the owner PC.", null);
      return;
    }
    const markerBefore = await readUpdateMarker();
    const markerStartedBefore = markerBefore?.startedAt || null;

    const confirmationResponse = await localRequest("/api/confirm", {
      method: "POST",
      body: JSON.stringify({ action: "update" }),
    });
    const confirmationBody = await confirmationResponse.json() as { confirmation?: string; reason?: string };
    if (!confirmationResponse.ok || !confirmationBody.confirmation) {
      await reportProgress(identity, request.requestId, "rejected", 0, "Local confirmation rejected", confirmationBody.reason || "The owner PC did not issue an Update confirmation.", null);
      return;
    }

    const updateResponse = await localRequest("/api/actions/update", {
      method: "POST",
      body: JSON.stringify({ confirmation: confirmationBody.confirmation }),
    });
    const updateBody = await updateResponse.json() as { operationId?: string; reason?: string };
    if (!updateResponse.ok || !updateBody.operationId) {
      await reportProgress(identity, request.requestId, "rejected", 0, "Update was not started", updateBody.reason || "The approved owner-PC updater refused the request.", null);
      return;
    }
    localOperationId = updateBody.operationId;
    await reportProgress(identity, request.requestId, "running", 3, "Starting approved updater", null, localOperationId);
    await waitForUpdateResult(identity, request.requestId, localOperationId, markerStartedBefore);
  } catch (error) {
    await reportProgress(
      identity,
      request.requestId,
      "failed",
      0,
      "Cloud Update bridge failed",
      error instanceof Error ? error.message.slice(0, 900) : "Cloud Update bridge failed.",
      localOperationId,
    );
  } finally {
    inFlightRequestId = null;
  }
}

async function cycle(identity: DeviceIdentity): Promise<void> {
  const status = await localStatus();
  let heartbeatResponse: Response;
  try {
    heartbeatResponse = await cloudRequest("/control/cloud/agent/heartbeat", {
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      deviceId: identity.deviceId,
      secret: identity.secret,
      machineName: hostname(),
      hgrVersion: status?.hgrVersion || "unknown",
      localControlOnline: Boolean(status),
    });
  } catch (error) {
    console.error("HGR Control Cloud heartbeat failed:", error instanceof Error ? error.message : error);
    return;
  }
  const heartbeat = await heartbeatResponse.json().catch(() => null) as { approved?: boolean; enrollment?: string } | null;
  if (!heartbeatResponse.ok || !heartbeat?.approved) return;

  const pollResponse = await cloudRequest("/control/cloud/agent/poll", {
    protocol: HGR_CONTROL_CLOUD_PROTOCOL,
    deviceId: identity.deviceId,
    secret: identity.secret,
  });
  if (!pollResponse.ok) return;
  const poll = await pollResponse.json() as { request?: HalieusCloudControlRequest | null };
  if (poll.request?.action === "update" && !inFlightRequestId) {
    void executeUpdate(identity, poll.request);
  }
}

async function main(): Promise<void> {
  const identity = await readOrCreateIdentity();
  console.log(`HGR Control Cloud bridge started for ${identity.deviceId}.`);
  console.log(`Cloud relay: ${cloudBase}`);
  console.log("Outbound actions accepted from cloud: Update HGR only.");
  while (!stopping) {
    await cycle(identity).catch((error) => console.error("HGR Control Cloud cycle failed:", error));
    await delay(pollDelayMs);
  }
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

void main().catch((error) => {
  console.error("HGR Control Cloud bridge could not start:", error);
  process.exitCode = 1;
});
