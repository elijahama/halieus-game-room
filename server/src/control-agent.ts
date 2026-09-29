import { execFile } from "node:child_process";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  HGR_CONTROL_ACTIONS,
  type HalieusControlActiveOperation,
  type HalieusControlAuditEntry,
  type HalieusControlStatus,
} from "../../shared/platform/control.js";

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));

function isHgrRepositoryRoot(candidate: string): boolean {
  if (!existsSync(resolve(candidate, "VERSION"))) return false;
  if (!existsSync(resolve(candidate, "package.json"))) return false;
  if (!existsSync(resolve(candidate, "client"))) return false;
  if (!existsSync(resolve(candidate, "server"))) return false;
  if (!existsSync(resolve(candidate, "shared"))) return false;

  try {
    const metadata = JSON.parse(
      readFileSync(resolve(candidate, "package.json"), "utf8"),
    ) as { name?: string };
    return metadata.name === "halieus-game-room";
  } catch {
    return false;
  }
}

function findProjectRoot(): string {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
    resolve(here, "../.."),
    resolve(here, "../../.."),
    resolve(here, "../../../.."),
  ];
  const root = candidates.find(isHgrRepositoryRoot);
  if (!root) {
    throw new Error(
      "Unable to locate the HGR repository root (VERSION + root package/client/server/shared required).",
    );
  }
  return root;
}

const projectRoot = findProjectRoot();
const host = process.env.HGR_CONTROL_HOST?.trim() || "127.0.0.1";
const port = Number.parseInt(process.env.HGR_CONTROL_PORT || "43127", 10);
const token = process.env.HGR_CONTROL_TOKEN?.trim() || "";

const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);
const remoteBinding = !loopbackHosts.has(host);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("HGR_CONTROL_PORT must be a valid TCP port.");
}
if (remoteBinding && !token) {
  throw new Error(
    "Refusing to expose HGR Control beyond loopback without HGR_CONTROL_TOKEN.",
  );
}

const auditDirectory = resolve(projectRoot, "server", "data", "runtime");
const auditFile = resolve(auditDirectory, "hgr-control-audit.ndjson");
const restartScript = resolve(projectRoot, "Restart Halieus Game Room.cmd");
let activeOperation: HalieusControlActiveOperation | null = null;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function bearerTokenMatches(request: IncomingMessage): boolean {
  if (!token) return false;
  const provided = request.headers.authorization;
  if (!provided) return false;

  const expectedBytes = Buffer.from(`Bearer ${token}`, "utf8");
  const providedBytes = Buffer.from(provided, "utf8");
  if (expectedBytes.length !== providedBytes.length) return false;
  return timingSafeEqual(expectedBytes, providedBytes);
}

function readRequestAuthorised(request: IncomingMessage): boolean {
  if (!token) return true;
  return bearerTokenMatches(request);
}

function mutableRequestAuthorised(request: IncomingMessage): boolean {
  return Boolean(token) && bearerTokenMatches(request);
}

async function gitValue(args: string[], allowEmpty = false): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: projectRoot,
      timeout: 2500,
      windowsHide: true,
      encoding: "utf8",
    });
    const value = stdout.trim();
    return value || (allowEmpty ? "" : null);
  } catch {
    return null;
  }
}

async function writeAudit(entry: HalieusControlAuditEntry): Promise<void> {
  await mkdir(auditDirectory, { recursive: true });
  await appendFile(auditFile, `${JSON.stringify(entry)}\n`, "utf8");
}

async function readRecentAudit(limit = 20): Promise<HalieusControlAuditEntry[]> {
  try {
    const source = await readFile(auditFile, "utf8");
    return source
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((line) => JSON.parse(line) as HalieusControlAuditEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function buildStatus(): Promise<HalieusControlStatus> {
  const [version, branch, commit, porcelain] = await Promise.all([
    readFile(resolve(projectRoot, "VERSION"), "utf8").then((value) => value.trim()),
    gitValue(["rev-parse", "--abbrev-ref", "HEAD"]),
    gitValue(["rev-parse", "--short", "HEAD"]),
    gitValue(["status", "--porcelain", "--untracked-files=no"], true),
  ]);

  return {
    ok: true,
    agent: "online",
    hgrVersion: version,
    machine: {
      name: hostname(),
      platform: process.platform,
    },
    repository: {
      branch,
      commit,
      dirty: porcelain === null ? null : porcelain.length > 0,
    },
    security: {
      tokenConfigured: Boolean(token),
      remoteBinding,
      mutableActionsRequireAuthentication: true,
    },
    activeOperation,
    actions: HGR_CONTROL_ACTIONS.map((action) => ({
      id: action.id,
      label: action.label,
      kind: action.kind,
      confirmation: action.confirmation,
      implemented: action.id === "status" || action.id === "restart" || action.id === "logs",
    })),
    timestamp: new Date().toISOString(),
  };
}

async function runRestart(response: ServerResponse): Promise<void> {
  if (!token) {
    sendJson(response, 503, {
      ok: false,
      reason: "Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions.",
    });
    return;
  }

  if (activeOperation) {
    const now = new Date().toISOString();
    const rejected: HalieusControlAuditEntry = {
      id: randomUUID(),
      action: "restart",
      state: "rejected",
      startedAt: now,
      finishedAt: now,
      exitCode: null,
      reason: `Another HGR Control action is already running: ${activeOperation.action}.`,
    };
    await writeAudit(rejected);
    sendJson(response, 409, {
      ok: false,
      reason: rejected.reason,
      activeOperation,
    });
    return;
  }

  if (process.platform !== "win32") {
    sendJson(response, 501, {
      ok: false,
      reason: "Restart HGR is currently implemented for the Windows owner machine only.",
    });
    return;
  }

  if (!existsSync(restartScript)) {
    sendJson(response, 500, {
      ok: false,
      reason: "Restart Halieus Game Room.cmd is missing from the HGR repository root.",
    });
    return;
  }

  const operation: HalieusControlActiveOperation = {
    id: randomUUID(),
    action: "restart",
    startedAt: new Date().toISOString(),
  };
  activeOperation = operation;
  await writeAudit({
    id: operation.id,
    action: operation.action,
    state: "running",
    startedAt: operation.startedAt,
    finishedAt: null,
    exitCode: null,
    reason: null,
  });

  try {
    const commandProcessor = process.env.ComSpec?.trim() || "cmd.exe";
    await execFileAsync(
      commandProcessor,
      ["/d", "/s", "/c", `"${restartScript}"`],
      {
        cwd: projectRoot,
        timeout: 45_000,
        windowsHide: true,
        encoding: "utf8",
      },
    );

    const finishedAt = new Date().toISOString();
    await writeAudit({
      id: operation.id,
      action: operation.action,
      state: "succeeded",
      startedAt: operation.startedAt,
      finishedAt,
      exitCode: 0,
      reason: null,
    });
    sendJson(response, 200, {
      ok: true,
      action: "restart",
      operationId: operation.id,
      startedAt: operation.startedAt,
      finishedAt,
      message: "HGR restart command completed successfully.",
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const exitCode =
      typeof (error as { code?: unknown }).code === "number"
        ? (error as { code: number }).code
        : null;
    await writeAudit({
      id: operation.id,
      action: operation.action,
      state: "failed",
      startedAt: operation.startedAt,
      finishedAt,
      exitCode,
      reason: "Restart Halieus Game Room.cmd failed.",
    });
    console.error("HGR Control restart failed:", error);
    sendJson(response, 500, {
      ok: false,
      action: "restart",
      operationId: operation.id,
      reason: "HGR restart failed. Check the local HGR Control audit/log output.",
    });
  } finally {
    activeOperation = null;
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/status") {
    if (!readRequestAuthorised(request)) {
      sendJson(response, 401, { ok: false, reason: "HGR Control authentication required." });
      return;
    }
    try {
      sendJson(response, 200, await buildStatus());
    } catch (error) {
      console.error("HGR Control status failed:", error);
      sendJson(response, 500, { ok: false, reason: "HGR Control status is unavailable." });
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/logs") {
    if (!mutableRequestAuthorised(request)) {
      sendJson(response, token ? 401 : 503, {
        ok: false,
        reason: token
          ? "HGR Control authentication required."
          : "Set HGR_CONTROL_TOKEN before reading HGR Control audit logs.",
      });
      return;
    }
    try {
      sendJson(response, 200, { ok: true, entries: await readRecentAudit() });
    } catch (error) {
      console.error("HGR Control audit read failed:", error);
      sendJson(response, 500, { ok: false, reason: "HGR Control audit log is unavailable." });
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/actions/restart") {
    if (!mutableRequestAuthorised(request)) {
      sendJson(response, token ? 401 : 503, {
        ok: false,
        reason: token
          ? "HGR Control authentication required."
          : "Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions.",
      });
      return;
    }
    await runRestart(response);
    return;
  }

  sendJson(response, 404, {
    ok: false,
    reason: "Unknown HGR Control endpoint.",
  });
});

server.listen(port, host, () => {
  console.log(`HGR Control listening on http://${host}:${port}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(token ? "Bearer-token authentication: ON" : "Bearer-token authentication: OFF (status only)");
  console.log("Mutable actions: Restart HGR is available only with HGR_CONTROL_TOKEN.");
});
