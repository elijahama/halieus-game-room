import { hostname } from "node:os";

import { APP_VERSION } from "../../shared/version.js";
import {
  HGR_CONTROL_CLOUD_PROTOCOL,
  HGR_CONTROL_CLOUD_READ_ACTIONS,
  type HalieusCloudRelayCommand,
} from "../../shared/platform/control-cloud.js";

const cloudUrl = normaliseCloudUrl(process.env.HGR_CONTROL_CLOUD_URL);
const deviceId = process.env.HGR_CONTROL_DEVICE_ID?.trim() || "";
const deviceToken = process.env.HGR_CONTROL_DEVICE_TOKEN?.trim() || "";
const localToken = process.env.HGR_CONTROL_TOKEN?.trim() || "";
const localHost = process.env.HGR_CONTROL_HOST?.trim() || "127.0.0.1";
const localPort = Number.parseInt(process.env.HGR_CONTROL_PORT?.trim() || "43127", 10);
const localUrl = `http://${localHost}:${localPort}`;
const agentStartedAt = new Date().toISOString();
const machineName = hostname();

let stopping = false;
let backoffMs = 3000;

function normaliseCloudUrl(value: string | undefined): string {
  const raw = value?.trim() || "";
  if (!raw) throw new Error("HGR_CONTROL_CLOUD_URL is required for the outbound Control connector.");
  const parsed = new URL(raw);
  const localDevelopment = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  if (parsed.protocol !== "https:" && !(localDevelopment && parsed.protocol === "http:")) {
    throw new Error("HGR Control cloud credentials require HTTPS (HTTP is allowed only for local development). ");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

if (!deviceId) throw new Error("HGR_CONTROL_DEVICE_ID is required for the outbound Control connector.");
if (!deviceToken) throw new Error("HGR_CONTROL_DEVICE_TOKEN is required for the outbound Control connector.");
if (!localToken) throw new Error("HGR_CONTROL_TOKEN is required so the cloud connector can authenticate to the loopback Control Agent.");
if (!Number.isInteger(localPort) || localPort < 1 || localPort > 65535) {
  throw new Error("HGR_CONTROL_PORT must be a valid TCP port.");
}
if (!["127.0.0.1", "::1", "localhost"].includes(localHost)) {
  throw new Error("The cloud connector only talks to a loopback HGR Control Agent.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cloudFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${deviceToken}`);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  return await fetch(`${cloudUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function localFetch(path: string): Promise<unknown> {
  const response = await fetch(`${localUrl}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${localToken}`,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const reason = body && typeof body === "object" && "reason" in body
      ? String((body as { reason?: unknown }).reason || "")
      : `Local Control request failed (${response.status}).`;
    throw new Error(reason || `Local Control request failed (${response.status}).`);
  }
  return body;
}

async function heartbeat(): Promise<void> {
  const response = await cloudFetch("/control/agent/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      deviceId,
      machineName,
      hgrVersion: APP_VERSION,
      agentStartedAt,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { reason?: unknown } | null;
    throw new Error(String(body?.reason || `Cloud heartbeat failed (${response.status}).`));
  }
}

function isReadCommand(value: unknown): value is HalieusCloudRelayCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const command = value as Partial<HalieusCloudRelayCommand>;
  return (
    command.protocol === HGR_CONTROL_CLOUD_PROTOCOL &&
    typeof command.requestId === "string" &&
    command.requestId.length > 0 &&
    command.deviceId === deviceId &&
    typeof command.action === "string" &&
    (HGR_CONTROL_CLOUD_READ_ACTIONS as readonly string[]).includes(command.action)
  );
}

async function postResult(
  command: HalieusCloudRelayCommand,
  state: "succeeded" | "failed" | "rejected",
  payload: unknown,
  reason: string | null,
): Promise<void> {
  const response = await cloudFetch("/control/agent/results", {
    method: "POST",
    body: JSON.stringify({
      protocol: HGR_CONTROL_CLOUD_PROTOCOL,
      requestId: command.requestId,
      deviceId,
      action: command.action,
      state,
      payload,
      reason: reason ? reason.slice(0, 500) : null,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { reason?: unknown } | null;
    throw new Error(String(body?.reason || `Cloud result upload failed (${response.status}).`));
  }
}

async function executeReadCommand(command: HalieusCloudRelayCommand): Promise<void> {
  try {
    if (command.action === "status") {
      const status = await localFetch("/api/status");
      await postResult(command, "succeeded", status, null);
      return;
    }
    if (command.action === "logs") {
      const body = await localFetch("/api/logs");
      const entries = body && typeof body === "object" && "entries" in body
        ? (body as { entries?: unknown }).entries
        : null;
      if (!Array.isArray(entries)) throw new Error("Local Control returned an invalid audit-log payload.");
      await postResult(command, "succeeded", entries, null);
      return;
    }
    await postResult(command, "rejected", null, "Action is not enabled for the 4.5.4 read-only cloud relay.");
  } catch (error) {
    await postResult(
      command,
      "failed",
      null,
      error instanceof Error ? error.message : "Cloud Control read action failed.",
    );
  }
}

async function pollOnce(): Promise<number> {
  await heartbeat();
  const response = await cloudFetch(`/control/agent/poll?deviceId=${encodeURIComponent(deviceId)}`);
  const body = await response.json().catch(() => null) as { commands?: unknown; pollAfterMs?: unknown; reason?: unknown } | null;
  if (!response.ok) throw new Error(String(body?.reason || `Cloud poll failed (${response.status}).`));

  const commands = Array.isArray(body?.commands) ? body.commands : [];
  for (const raw of commands) {
    if (!isReadCommand(raw)) {
      console.warn("HGR Control cloud connector ignored an invalid or non-read relay command.");
      continue;
    }
    await executeReadCommand(raw);
  }

  const requestedDelay = Number(body?.pollAfterMs);
  return Number.isFinite(requestedDelay)
    ? Math.min(15_000, Math.max(1_500, Math.floor(requestedDelay)))
    : 3000;
}

async function run(): Promise<void> {
  console.log(`HGR Control cloud connector: ${cloudUrl}`);
  console.log(`Registered device: ${deviceId}`);
  console.log(`Loopback Control Agent: ${localUrl}`);
  console.log("Cloud relay mode: read-only Status + Logs (mutating actions disabled in Batch 1).");

  while (!stopping) {
    try {
      const delay = await pollOnce();
      backoffMs = 3000;
      await sleep(delay);
    } catch (error) {
      console.error("HGR Control cloud connection failed:", error instanceof Error ? error.message : error);
      await sleep(backoffMs);
      backoffMs = Math.min(30_000, Math.max(3000, backoffMs * 2));
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => { stopping = true; });
}

void run().catch((error) => {
  console.error("HGR Control cloud connector stopped:", error);
  process.exitCode = 1;
});
