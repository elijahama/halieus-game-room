import { execFile } from "node:child_process";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  HGR_CONTROL_ACTIONS,
  type HalieusControlActionId,
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
const pairCode = process.env.HGR_CONTROL_PAIR_CODE?.trim() || "";
const pairExpiresAt = Number.parseInt(
  process.env.HGR_CONTROL_PAIR_EXPIRES_AT?.trim() || "0",
  10,
);

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
const startScript = resolve(projectRoot, "Start Halieus Game Room.cmd");
const restartScript = resolve(projectRoot, "Restart Halieus Game Room.cmd");
const closeScript = resolve(projectRoot, "Close Halieus Game Room.cmd");
const updateScript = resolve(projectRoot, "Update HGR GitHub.cmd");
const startBridge = resolve(projectRoot, "scripts", "windows", "control-start.ps1");
const restartBridge = resolve(projectRoot, "scripts", "windows", "control-restart.ps1");
const closeBridge = resolve(projectRoot, "scripts", "windows", "control-close.ps1");
const updateBridge = resolve(projectRoot, "scripts", "windows", "control-update.ps1");
const controlUiDirectory = resolve(projectRoot, "server", "control-ui");
const appIcon192 = resolve(projectRoot, "client", "public", "app-icon-192.png");
const appIcon512 = resolve(projectRoot, "client", "public", "app-icon-512.png");

const MOBILE_SESSION_COOKIE = "hgr_control_session";
const MOBILE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PAIR_FAILURE_LIMIT = 5;
const PAIR_BLOCK_MS = 60 * 1000;
const ACTION_CONFIRMATION_TTL_MS = 30 * 1000;
const mobileSessions = new Map<string, number>();
const actionConfirmations = new Map<string, {
  action: "close" | "update";
  authIdentity: string;
  expiresAt: number;
}>();
let pairFailureCount = 0;
let pairBlockedUntil = 0;
let activeOperation: HalieusControlActiveOperation | null = null;

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  setSecurityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function sendAsset(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: string | Buffer,
  cacheControl = "no-store",
): void {
  setSecurityHeaders(response);
  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", cacheControl);
  if (contentType.startsWith("text/html")) {
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'",
    );
  }
  response.end(body);
}

function timingSafeTextMatches(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const providedBytes = Buffer.from(provided, "utf8");
  if (expectedBytes.length !== providedBytes.length) return false;
  return timingSafeEqual(expectedBytes, providedBytes);
}

function bearerTokenMatches(request: IncomingMessage): boolean {
  if (!token) return false;
  const provided = request.headers.authorization;
  if (!provided) return false;
  return timingSafeTextMatches(`Bearer ${token}`, provided);
}

function sessionDigest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function readCookie(request: IncomingMessage, name: string): string | null {
  const source = request.headers.cookie;
  if (!source) return null;

  for (const part of source.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join("="));
    } catch {
      return null;
    }
  }
  return null;
}

function mobileSessionMatches(request: IncomingMessage): boolean {
  const raw = readCookie(request, MOBILE_SESSION_COOKIE);
  if (!raw) return false;
  const digest = sessionDigest(raw);
  const expiresAt = mobileSessions.get(digest);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    mobileSessions.delete(digest);
    return false;
  }
  return true;
}

function requestAuthIdentity(request: IncomingMessage): string | null {
  if (bearerTokenMatches(request)) {
    return `bearer:${sessionDigest(token)}`;
  }

  const raw = readCookie(request, MOBILE_SESSION_COOKIE);
  if (!raw) return null;
  const digest = sessionDigest(raw);
  const expiresAt = mobileSessions.get(digest);
  if (!expiresAt) return null;
  if (expiresAt <= Date.now()) {
    mobileSessions.delete(digest);
    return null;
  }
  return `session:${digest}`;
}

function readRequestAuthorised(request: IncomingMessage): boolean {
  if (requestAuthIdentity(request)) return true;
  return !token;
}

function mutableRequestAuthorised(request: IncomingMessage): boolean {
  return Boolean(requestAuthIdentity(request));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 4096) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};
  const source = Buffer.concat(chunks).toString("utf8");
  const parsed = JSON.parse(source) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function mobileSessionCookie(value: string, maxAgeSeconds: number): string {
  return [
    `${MOBILE_SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

async function handlePair(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const now = Date.now();
  if (!pairCode || !Number.isFinite(pairExpiresAt) || pairExpiresAt <= now) {
    sendJson(response, 503, {
      ok: false,
      reason: "Mobile pairing is unavailable or the pairing code has expired. Restart HGR Control Mobile on the owner PC.",
    });
    return;
  }

  if (pairBlockedUntil > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((pairBlockedUntil - now) / 1000));
    response.setHeader("Retry-After", String(retryAfterSeconds));
    sendJson(response, 429, {
      ok: false,
      reason: "Too many incorrect pairing attempts. Try again shortly.",
      retryAfterSeconds,
    });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { ok: false, reason: "Invalid pairing request." });
    return;
  }

  const providedCode = typeof body.code === "string" ? body.code.trim() : "";
  if (!timingSafeTextMatches(pairCode, providedCode)) {
    pairFailureCount += 1;
    if (pairFailureCount >= PAIR_FAILURE_LIMIT) {
      pairFailureCount = 0;
      pairBlockedUntil = Date.now() + PAIR_BLOCK_MS;
    }
    sendJson(response, 401, { ok: false, reason: "Pairing code not accepted." });
    return;
  }

  pairFailureCount = 0;
  pairBlockedUntil = 0;
  const sessionToken = randomBytes(32).toString("base64url");
  const sessionExpiresAt = Date.now() + MOBILE_SESSION_TTL_MS;
  mobileSessions.set(sessionDigest(sessionToken), sessionExpiresAt);

  response.setHeader(
    "Set-Cookie",
    mobileSessionCookie(sessionToken, Math.floor(MOBILE_SESSION_TTL_MS / 1000)),
  );
  sendJson(response, 200, {
    ok: true,
    paired: true,
    sessionExpiresAt: new Date(sessionExpiresAt).toISOString(),
  });
}

function handleUnpair(request: IncomingMessage, response: ServerResponse): void {
  const raw = readCookie(request, MOBILE_SESSION_COOKIE);
  if (raw) mobileSessions.delete(sessionDigest(raw));
  response.setHeader("Set-Cookie", mobileSessionCookie("", 0));
  sendJson(response, 200, { ok: true, paired: false });
}

async function handleActionConfirmation(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const authIdentity = requestAuthIdentity(request);
  if (!authIdentity) {
    sendJson(response, token ? 401 : 503, {
      ok: false,
      reason: token
        ? "HGR Control authentication required."
        : "Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions.",
    });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { ok: false, reason: "Invalid confirmation request." });
    return;
  }

  const action = body.action;
  if (action !== "close" && action !== "update") {
    sendJson(response, 400, {
      ok: false,
      reason: "Only Close HGR and Update HGR use action confirmations.",
    });
    return;
  }

  const confirmation = randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + ACTION_CONFIRMATION_TTL_MS;
  actionConfirmations.set(sessionDigest(confirmation), {
    action,
    authIdentity,
    expiresAt,
  });
  sendJson(response, 200, {
    ok: true,
    action,
    confirmation,
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

function consumeActionConfirmation(
  request: IncomingMessage,
  action: "close" | "update",
  body: Record<string, unknown>,
): boolean {
  const authIdentity = requestAuthIdentity(request);
  const raw = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
  if (!authIdentity || !raw) return false;

  const digest = sessionDigest(raw);
  const stored = actionConfirmations.get(digest);
  actionConfirmations.delete(digest);
  if (!stored) return false;
  if (stored.expiresAt <= Date.now()) return false;
  return stored.action === action && stored.authIdentity === authIdentity;
}

async function gitValue(args: string[], allowEmpty = false): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: projectRoot,
      timeout: 2500,
      windowsHide: true,
      encoding: "utf8",
    });
    // Porcelain output uses leading columns to encode index/worktree state.
    // Preserve those leading spaces when callers explicitly allow empty output;
    // trimming them corrupts paths such as " M RELEASE.json".
    const value = allowEmpty
      ? stdout.replace(/(?:\r?\n)+$/, "")
      : stdout.trim();
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
      implemented: action.id !== "open-site" && action.id !== "open-github",
    })),
    timestamp: new Date().toISOString(),
  };
}

async function runFixedBridgeAction(
  action: "start" | "close",
  bridgePath: string,
  launcherPath: string,
  response: ServerResponse,
  successMessage: string,
): Promise<void> {
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
      action,
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
      reason: `${action === "start" ? "Start" : "Close"} HGR is currently implemented for the Windows owner machine only.`,
    });
    return;
  }

  if (!existsSync(launcherPath) || !existsSync(bridgePath)) {
    sendJson(response, 500, {
      ok: false,
      reason: `The fixed HGR ${action} launcher or Control bridge is missing.`,
    });
    return;
  }

  const operation: HalieusControlActiveOperation = {
    id: randomUUID(),
    action,
    startedAt: new Date().toISOString(),
    phase: action === "start" ? "Opening HGR" : "Closing HGR",
    progress: 20,
  };
  activeOperation = operation;

  try {
    await writeAudit({
      id: operation.id,
      action: operation.action,
      state: "running",
      startedAt: operation.startedAt,
      finishedAt: null,
      exitCode: null,
      reason: null,
    });

    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", bridgePath],
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
      action,
      operationId: operation.id,
      startedAt: operation.startedAt,
      finishedAt,
      message: successMessage,
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const exitCode =
      typeof (error as { code?: unknown }).code === "number"
        ? (error as { code: number }).code
        : null;
    try {
      await writeAudit({
        id: operation.id,
        action: operation.action,
        state: "failed",
        startedAt: operation.startedAt,
        finishedAt,
        exitCode,
        reason: error instanceof Error
          ? `${action} bridge failed: ${error.message}`
          : `${action} bridge failed.`,
      });
    } catch (auditError) {
      console.error("HGR Control failure audit could not be written:", auditError);
    }
    console.error(`HGR Control ${action} failed:`, error);
    sendJson(response, 500, {
      ok: false,
      action,
      operationId: operation.id,
      reason: `HGR ${action} failed. Check the local HGR Control output or audit log.`,
    });
  } finally {
    activeOperation = null;
  }
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

  if (!existsSync(restartScript) || !existsSync(restartBridge)) {
    sendJson(response, 500, {
      ok: false,
      reason: "The fixed HGR restart launcher or Control bridge is missing.",
    });
    return;
  }

  const operation: HalieusControlActiveOperation = {
    id: randomUUID(),
    action: "restart",
    startedAt: new Date().toISOString(),
  };
  activeOperation = operation;

  try {
    await writeAudit({
      id: operation.id,
      action: operation.action,
      state: "running",
      startedAt: operation.startedAt,
      finishedAt: null,
      exitCode: null,
      reason: null,
    });

    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        restartBridge,
      ],
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
    try {
      await writeAudit({
        id: operation.id,
        action: operation.action,
        state: "failed",
        startedAt: operation.startedAt,
        finishedAt,
        exitCode,
        reason: error instanceof Error
          ? `Restart bridge failed: ${error.message}`
          : "Restart bridge failed.",
      });
    } catch (auditError) {
      console.error("HGR Control failure audit could not be written:", auditError);
    }
    console.error("HGR Control restart failed:", error);
    sendJson(response, 500, {
      ok: false,
      action: "restart",
      operationId: operation.id,
      reason: "HGR restart failed. Check the local HGR Control output or audit log.",
    });
  } finally {
    activeOperation = null;
  }
}


const UPDATE_PROGRESS_MARKERS: Array<{
  match: string;
  phase: string;
  progress: number;
}> = [
  { match: "STEP 1 - Updating LOCAL files from GitHub", phase: "Syncing from GitHub", progress: 10 },
  { match: "STEP 2 - Preparing release identity", phase: "Preparing release identity", progress: 22 },
  { match: "STEP 3 - HGR validation", phase: "Typecheck, build and regressions", progress: 38 },
  { match: "STEP 3B - Validating the real Oracle deployment package", phase: "Oracle package preflight", progress: 54 },
  { match: "STEP 4 - Reviewing local SOURCE changes", phase: "Reviewing source state", progress: 62 },
  { match: "STEP 8 - Regenerating final release identity", phase: "Final release identity", progress: 70 },
  { match: "STEP 8B - Final release check", phase: "Validating final release", progress: 78 },
  { match: "STEP 9 - Publishing the validated HGR release", phase: "Publishing to Oracle", progress: 88 },
  { match: "FINAL STEP - Refreshing the HGR client", phase: "Refreshing HGR client", progress: 96 },
];

function updateOperationProgress(line: string): void {
  if (!activeOperation || activeOperation.action !== "update") return;
  for (const marker of UPDATE_PROGRESS_MARKERS) {
    if (!line.includes(marker.match)) continue;
    activeOperation = {
      ...activeOperation,
      phase: marker.phase,
      progress: marker.progress,
    };
    break;
  }
}

async function blockingRemoteUpdateChanges(): Promise<string[] | null> {
  const porcelain = await gitValue(["status", "--porcelain", "--untracked-files=no"], true);
  if (porcelain === null) return null;
  const generated = new Set(["RELEASE.json", "shared/release.ts"]);
  return porcelain
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const path = line.slice(3).trim();
      const renameTarget = path.includes(" -> ") ? path.split(" -> ").at(-1) || path : path;
      return renameTarget.replace(/^"|"$/g, "");
    })
    .filter((path) => !generated.has(path));
}

async function runUpdate(response: ServerResponse): Promise<void> {
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
      action: "update",
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
      reason: "Update HGR is currently implemented for the Windows owner machine only.",
    });
    return;
  }

  if (!existsSync(updateScript) || !existsSync(updateBridge)) {
    sendJson(response, 500, {
      ok: false,
      reason: "The fixed HGR update launcher or Control bridge is missing.",
    });
    return;
  }

  const blockingChanges = await blockingRemoteUpdateChanges();
  if (blockingChanges === null) {
    sendJson(response, 503, {
      ok: false,
      reason: "Git status is unavailable, so remote Update was not started.",
    });
    return;
  }
  if (blockingChanges.length > 0) {
    const now = new Date().toISOString();
    const rejected: HalieusControlAuditEntry = {
      id: randomUUID(),
      action: "update",
      state: "rejected",
      startedAt: now,
      finishedAt: now,
      exitCode: null,
      reason: "Remote Update refused because tracked source changes are present on the owner PC.",
    };
    await writeAudit(rejected);
    sendJson(response, 409, {
      ok: false,
      reason: rejected.reason,
      files: blockingChanges.slice(0, 8),
    });
    return;
  }

  const operation: HalieusControlActiveOperation = {
    id: randomUUID(),
    action: "update",
    startedAt: new Date().toISOString(),
    phase: "Starting approved updater",
    progress: 3,
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

  let outputCarry = "";
  try {
    const child = execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", updateBridge],
      {
        cwd: projectRoot,
        timeout: 45 * 60 * 1000,
        windowsHide: true,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      },
      (error) => {
        void (async () => {
          const finishedAt = new Date().toISOString();
          const exitCode =
            typeof (error as { code?: unknown } | null)?.code === "number"
              ? (error as { code: number }).code
              : error
                ? null
                : 0;
          try {
            await writeAudit({
              id: operation.id,
              action: operation.action,
              state: error ? "failed" : "succeeded",
              startedAt: operation.startedAt,
              finishedAt,
              exitCode,
              reason: error
                ? "Approved HGR update flow failed. Review the updater output on the owner PC."
                : null,
            });
          } catch (auditError) {
            console.error("HGR Control update audit could not be written:", auditError);
          }
          if (error) console.error("HGR Control update failed:", error);
          if (activeOperation?.id === operation.id) activeOperation = null;
        })();
      },
    );

    child.stdout?.on("data", (chunk: string | Buffer) => {
      outputCarry += chunk.toString();
      const lines = outputCarry.split(/\r?\n/);
      outputCarry = lines.pop() || "";
      for (const line of lines) updateOperationProgress(line);
    });
    child.stderr?.on("data", (chunk: string | Buffer) => {
      const text = chunk.toString();
      if (text.trim()) console.error("HGR updater:", text.trim());
    });
  } catch (error) {
    activeOperation = null;
    await writeAudit({
      id: operation.id,
      action: operation.action,
      state: "failed",
      startedAt: operation.startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: null,
      reason: "The approved HGR update process could not be started.",
    });
    console.error("HGR Control could not start Update:", error);
    sendJson(response, 500, {
      ok: false,
      action: "update",
      operationId: operation.id,
      reason: "HGR Update could not be started.",
    });
    return;
  }

  sendJson(response, 202, {
    ok: true,
    action: "update",
    operationId: operation.id,
    startedAt: operation.startedAt,
    message: "HGR Update started. Progress will continue on the owner PC.",
  });
}

const staticAssets = new Map<string, { path: string; contentType: string; cacheControl: string }>([
  ["/", { path: resolve(controlUiDirectory, "index.html"), contentType: "text/html; charset=utf-8", cacheControl: "no-store" }],
  ["/control.css", { path: resolve(controlUiDirectory, "control.css"), contentType: "text/css; charset=utf-8", cacheControl: "no-cache" }],
  ["/control.js", { path: resolve(controlUiDirectory, "control.js"), contentType: "text/javascript; charset=utf-8", cacheControl: "no-cache" }],
  ["/manifest.webmanifest", { path: resolve(controlUiDirectory, "manifest.webmanifest"), contentType: "application/manifest+json; charset=utf-8", cacheControl: "no-cache" }],
  ["/sw.js", { path: resolve(controlUiDirectory, "sw.js"), contentType: "text/javascript; charset=utf-8", cacheControl: "no-cache" }],
  ["/icon-192.png", { path: appIcon192, contentType: "image/png", cacheControl: "public, max-age=86400" }],
  ["/icon-512.png", { path: appIcon512, contentType: "image/png", cacheControl: "public, max-age=86400" }],
]);

async function serveStaticAsset(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const requestUrl = new URL(request.url || "/", "http://hgr-control.local");
  const asset = staticAssets.get(requestUrl.pathname);
  if (!asset) return false;

  try {
    const body = await readFile(asset.path);
    sendAsset(response, 200, asset.contentType, request.method === "HEAD" ? "" : body, asset.cacheControl);
  } catch (error) {
    console.error("HGR Control UI asset failed:", error);
    sendJson(response, 500, { ok: false, reason: "HGR Control UI is unavailable." });
  }
  return true;
}

const server = createServer(async (request, response) => {
  if (await serveStaticAsset(request, response)) return;

  if (request.method === "POST" && request.url === "/api/pair") {
    await handlePair(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/unpair") {
    handleUnpair(request, response);
    return;
  }

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

  if (request.method === "POST" && request.url === "/api/confirm") {
    await handleActionConfirmation(request, response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/actions/start") {
    if (!mutableRequestAuthorised(request)) {
      sendJson(response, token ? 401 : 503, {
        ok: false,
        reason: token
          ? "HGR Control authentication required."
          : "Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions.",
      });
      return;
    }
    await runFixedBridgeAction(
      "start",
      startBridge,
      startScript,
      response,
      "HGR start command completed successfully.",
    );
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

  if (request.method === "POST" && request.url === "/api/actions/close") {
    if (!mutableRequestAuthorised(request)) {
      sendJson(response, token ? 401 : 503, {
        ok: false,
        reason: token
          ? "HGR Control authentication required."
          : "Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions.",
      });
      return;
    }
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { ok: false, reason: "Invalid Close HGR request." });
      return;
    }
    if (!consumeActionConfirmation(request, "close", body)) {
      sendJson(response, 409, {
        ok: false,
        reason: "Close HGR requires a fresh one-time confirmation.",
      });
      return;
    }
    await runFixedBridgeAction(
      "close",
      closeBridge,
      closeScript,
      response,
      "HGR close command completed successfully.",
    );
    return;
  }

  if (request.method === "POST" && request.url === "/api/actions/update") {
    if (!mutableRequestAuthorised(request)) {
      sendJson(response, token ? 401 : 503, {
        ok: false,
        reason: token
          ? "HGR Control authentication required."
          : "Set HGR_CONTROL_TOKEN before enabling mutable HGR Control actions.",
      });
      return;
    }
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(request);
    } catch {
      sendJson(response, 400, { ok: false, reason: "Invalid Update HGR request." });
      return;
    }
    if (!consumeActionConfirmation(request, "update", body)) {
      sendJson(response, 409, {
        ok: false,
        reason: "Update HGR requires a fresh one-time confirmation.",
      });
      return;
    }
    await runUpdate(response);
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
  console.log(pairCode ? "Mobile pairing: ON (short-lived code supplied by launcher)" : "Mobile pairing: OFF");
  console.log("Mutable actions: Start, Restart, Close and Update are available only with authenticated Control access.");
});
