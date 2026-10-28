import { randomBytes, randomUUID } from "node:crypto";
import { loadLocalDevelopmentTimeline } from "./platform/control-development-timeline.js";
import { validateRelaySnapshot, RELAY_MAX_EVENTS } from "./platform/control-development-relay.js";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
  progress?: number;
  phase?: string;
  operationId?: string;
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
const pendingPath = resolve(runtimeDirectory, "hgr-control-cloud-pending.json");
interface PendingUpdate {
  requestId: string;
  localOperationId: string;
  markerStartedBefore: string | null;
  deadline: number;
}
const localBase = "http://127.0.0.1:43127";
const cloudBase = (process.env.HGR_CONTROL_CLOUD_URL?.trim() || "https://halieus.remotewire.net").replace(/\/+$/, "");
const pollDelayMs = 2_500;
let stopping = false;
let inFlightRequestId: string | null = null;
// Privacy: local evidence sync is disabled unless the owner explicitly enables it.
// No new agent process, inbound PC port, or dynamic destination is added.
const evidenceSyncEnabled = process.env.HGR_DEVELOPMENT_TIMELINE_SYNC === "1";
const EVIDENCE_INTERVAL_MS = 60_000;
let lastEvidenceAttempt = 0;

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

async function localRequest(path: string, init: RequestInit = {}, timeoutMs = 8_000): Promise<Response> {
  const token = await localToken();
  if (!token) throw new Error("Local HGR Control credential is unavailable.");
  return fetch(`${localBase}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
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
  // The update result marker can become terminal a moment before the local
  // Control Agent appends its matching failed audit entry. Retry long enough to
  // bridge that write race, but only on a failed operation and only on loopback.
  for (let attempt = 0; attempt < 16; attempt += 1) {
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
    if (attempt < 15) await delay(300);
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

async function publishDevelopmentEvidence(identity: DeviceIdentity): Promise<void> {
  if (!evidenceSyncEnabled) return;
  // Credentials and sanitized metadata must never be posted over cleartext HTTP.
  const destination = new URL(cloudBase);
  if (destination.protocol !== "https:" || destination.hostname !== "halieus.remotewire.net") return;
  const now = Date.now();
  if (now - lastEvidenceAttempt < EVIDENCE_INTERVAL_MS) return;
  lastEvidenceAttempt = now;
  const local = loadLocalDevelopmentTimeline(projectRoot);
  if (local.source === "unavailable") return;
  // Strictly reconstruct the allowlisted schema rather than forwarding the journal.
  const events = local.events.slice(0, RELAY_MAX_EVENTS).map(entry => ({
    at: entry.at, source: entry.source, kind: entry.kind,
    status: entry.status, id: entry.id, taskId: entry.taskId,
    ...(entry.source === "openshard" ? { changedFiles: entry.changedFiles } : {}),
  }));
  const snapshot = validateRelaySnapshot({
    source: local.source, latestAt: events[0]?.at ?? null, events,
  });
  if (!snapshot) return;
  try {
    const result = await cloudRequest("/control/cloud/agent/development-evidence", {
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      deviceId: identity.deviceId,
      secret: identity.secret,
      sentAt: new Date().toISOString(),
      nonce: randomBytes(16).toString("hex"),
      snapshot,
    });
    if (!result.ok && result.status !== 404) {
      console.error("HGR Control development evidence sync unavailable (HTTP " + result.status + ").");
    }
  } catch {
    console.error("HGR Control development evidence sync could not connect.");
  }
}

async function reportProgress(
  identity: DeviceIdentity,
  requestId: string,
  state: "running" | "succeeded" | "failed" | "rejected",
  progress: number,
  phase: string,
  reason: string | null,
  localOperationId: string | null,
): Promise<boolean> {
  try {
    const response = await cloudRequest("/control/cloud/agent/progress", {
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
    if (!response.ok) throw new Error(`Progress report returned HTTP ${response.status}`);
    return true;
  } catch (error) {
    console.error("HGR Control Cloud progress report failed:", error instanceof Error ? error.message : error);
    return false;
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
  deadline: number,
): Promise<boolean> {
  // These values represent the latest progress that the cloud has actually
  // acknowledged, not merely the latest local marker we observed. If the
  // website is briefly unavailable during deployment/restart, the same marker
  // must remain eligible for retry instead of being silently skipped forever.
  let lastProgress = 3;
  let lastPhase = "Starting approved updater";
  let terminalObserved = false;
  while (!stopping) {
    const marker = await readUpdateMarker();
    const markerHasOperationId = typeof marker?.operationId === "string" && marker.operationId.trim().length > 0;
    const markerIsCurrent = markerHasOperationId
      ? marker?.operationId === localOperationId
      : Boolean(marker?.startedAt && marker.startedAt !== markerStartedBefore);
    if (markerIsCurrent) {
      const markerLimit = marker?.state === "succeeded" ? 100 : 99;
      const markerProgress = Math.max(lastProgress, Math.min(markerLimit, Number(marker?.progress) || lastProgress));
      const markerPhase = typeof marker?.phase === "string" && marker.phase.trim() ? marker.phase.trim() : lastPhase;
      if (marker?.state === "succeeded") {
        terminalObserved = true;
        if (await reportProgress(identity, requestId, "succeeded", 100, "Update complete", null, localOperationId)) return true;
        if (Date.now() >= deadline) break;
        await delay(2_000);
        continue;
      }
      if (marker?.state === "failed") {
        terminalObserved = true;
        const detailedReason = await localAuditFailureReason(localOperationId);
        if (await reportProgress(identity, requestId, "failed", markerProgress, markerPhase || "Update failed", detailedReason || marker.reason || "Approved HGR updater failed on the owner PC.", localOperationId)) return true;
        if (Date.now() >= deadline) break;
        await delay(2_000);
        continue;
      }
      if (marker?.state === "running" && (markerProgress !== lastProgress || markerPhase !== lastPhase)) {
        if (await reportProgress(identity, requestId, "running", markerProgress, markerPhase, null, localOperationId)) {
          lastProgress = markerProgress;
          lastPhase = markerPhase;
        }
      }
    }
    if (Date.now() >= deadline) break;
    const status = await localStatus();
    if (status?.activeOperation?.id === localOperationId) {
      const progress = Math.max(lastProgress, Math.min(99, Number(status.activeOperation.progress) || lastProgress));
      const phase = status.activeOperation.phase || lastPhase;
      if (progress !== lastProgress || phase !== lastPhase) {
        if (await reportProgress(identity, requestId, "running", progress, phase, null, localOperationId)) {
          lastProgress = progress;
          lastPhase = phase;
        }
      }
    } else if (!status && lastProgress >= 80 && !(markerIsCurrent && marker?.state === "running")) {
      const restartPhase = "Owner Control Agent restarting";
      if (lastPhase !== restartPhase) {
        if (await reportProgress(identity, requestId, "running", lastProgress, restartPhase, null, localOperationId)) {
          lastPhase = restartPhase;
        }
      }
    }
    await delay(2_000);
  }
  if (stopping || terminalObserved) return false;
  return reportProgress(identity, requestId, "failed", lastProgress, "Update status timed out", "The cloud bridge stopped receiving a final result from the approved owner-PC updater.", localOperationId);
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
    const pending: PendingUpdate = { requestId: request.requestId, localOperationId, markerStartedBefore, deadline: Date.now() + 50 * 60 * 1000 };
    await atomicJson(pendingPath, pending);
    await reportProgress(identity, request.requestId, "running", 3, "Starting approved updater", null, localOperationId);
    if (await waitForUpdateResult(identity, request.requestId, localOperationId, markerStartedBefore, pending.deadline)) await rm(pendingPath, { force: true });
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

async function reportLifecycleTerminal(
  identity: DeviceIdentity,
  requestId: string,
  state: "succeeded" | "failed" | "rejected",
  progress: number,
  phase: string,
  reason: string | null,
  localOperationId: string | null,
): Promise<void> {
  // Retry the *receipt*, never the completed Windows command.
  for (let attempt = 0; attempt < 12 && !stopping; attempt += 1) {
    if (await reportProgress(identity, requestId, state, progress, phase, reason, localOperationId)) return;
    await delay(2_500);
  }
  console.error("HGR owner-PC lifecycle result could not be acknowledged by Cloud; inspect the local audit before retrying.");
}

type LifecycleAction = "start" | "restart" | "close";
const LIFECYCLE_ACTIONS = new Set<LifecycleAction>(["start", "restart", "close"]);

/** Dispatch exactly one fixed owner-PC Control Agent action. Never retry on
 * timeout: a Windows launcher may have completed after the HTTP cutoff.
 */
async function executeLifecycle(identity: DeviceIdentity, request: HalieusCloudControlRequest): Promise<void> {
  const action = request.action;
  if (!LIFECYCLE_ACTIONS.has(action as LifecycleAction)) return;
  if (inFlightRequestId) {
    await reportLifecycleTerminal(identity, request.requestId, "rejected", 0, "Owner PC busy",
      "Another Control action is already being handled.", null);
    return;
  }
  inFlightRequestId = request.requestId;
  let localOperationId: string | null = null;
  const actionLabel = action[0].toUpperCase() + action.slice(1);
  try {
    const status = await localStatus();
    if (!status || status.activeOperation) {
      await reportLifecycleTerminal(identity, request.requestId, "rejected", 0, "Owner PC unavailable",
        status ? "Another local Control operation is running." : "Authenticated local Control Agent is not available.", null);
      return;
    }
    await reportProgress(identity, request.requestId, "running", 12, `Starting approved ${actionLabel} action`, null, null);
    let body: string | undefined;
    if (action === "close") {
      const reply = await localRequest("/api/confirm", {
        method: "POST", body: JSON.stringify({ action: "close" }),
      });
      const confirmation = await reply.json().catch(() => null) as { confirmation?: string; reason?: string } | null;
      if (!reply.ok || !confirmation?.confirmation) {
        await reportLifecycleTerminal(identity, request.requestId, "rejected", 0, "Local Close confirmation rejected",
          confirmation?.reason || "Local Control Agent did not issue a Close confirmation.", null);
        return;
      }
      body = JSON.stringify({ confirmation: confirmation.confirmation });
    }
    const result = await localRequest(`/api/actions/${action}`, {
      method: "POST", ...(body ? { body } : {}),
    }, 55_000);
    const response = await result.json().catch(() => null) as { operationId?: string; reason?: string; ok?: boolean } | null;
    localOperationId = response?.operationId || null;
    if (!result.ok || !response?.ok) {
      await reportLifecycleTerminal(identity, request.requestId, "failed", 0, `${actionLabel} not completed`,
        response?.reason || "Approved owner-PC lifecycle action failed.", localOperationId);
      return;
    }
    await reportLifecycleTerminal(identity, request.requestId, "succeeded", 100, `${actionLabel} HGR window complete on owner PC · Public site unchanged`,
      null, localOperationId);
  } catch {
    // No automatic retries of mutable commands. State is explicit and auditable.
    await reportLifecycleTerminal(identity, request.requestId, "failed", 0, `${actionLabel} completion unconfirmed`,
      "Could not verify the owner's local Control Agent reply. Check the owner PC before retrying; the action may have run.",
      localOperationId);
  } finally {
    inFlightRequestId = null;
  }
}

async function resumePendingUpdate(identity: DeviceIdentity): Promise<void> {
  if (inFlightRequestId) return;
  let pending: PendingUpdate;
  try { pending = JSON.parse(await readFile(pendingPath, "utf8")) as PendingUpdate; }
  catch { return; }
  if (!pending.requestId || !pending.localOperationId || !Number.isFinite(pending.deadline)) return;
  inFlightRequestId = pending.requestId;
  // Resume observation only. Never repeat the destructive Update action.
  void waitForUpdateResult(identity, pending.requestId, pending.localOperationId, pending.markerStartedBefore, pending.deadline)
    .then(async (delivered) => { if (delivered) await rm(pendingPath, { force: true }); })
    .catch((error) => console.error("Cloud Update recovery failed:", error instanceof Error ? error.message : error))
    .finally(() => { inFlightRequestId = null; });
}

async function cycle(identity: DeviceIdentity): Promise<void> {
  await resumePendingUpdate(identity);
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

  await publishDevelopmentEvidence(identity);

  const pollResponse = await cloudRequest("/control/cloud/agent/poll", {
    protocol: HGR_CONTROL_CLOUD_PROTOCOL,
    deviceId: identity.deviceId,
    secret: identity.secret,
  });
  if (!pollResponse.ok) return;
  const poll = await pollResponse.json() as { request?: HalieusCloudControlRequest | null };
  if (poll.request?.action === "update" && !inFlightRequestId) {
    void executeUpdate(identity, poll.request);
  } else if (poll.request && LIFECYCLE_ACTIONS.has(poll.request.action as LifecycleAction) && !inFlightRequestId) {
    void executeLifecycle(identity, poll.request);
  }
}

async function main(): Promise<void> {
  const identity = await readOrCreateIdentity();
  console.log(`HGR Control Cloud bridge started for ${identity.deviceId}.`);
  console.log(`Cloud relay: ${cloudBase}`);
  console.log("Outbound actions accepted from cloud: approved Update, Start, Restart and Close HGR only.");
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
