import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  HGR_CONTROL_ACTIONS,
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
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("HGR_CONTROL_PORT must be a valid TCP port.");
}
if (!loopbackHosts.has(host) && !token) {
  throw new Error(
    "Refusing to expose HGR Control beyond loopback without HGR_CONTROL_TOKEN.",
  );
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function authorised(request: IncomingMessage): boolean {
  if (!token) return true;
  return request.headers.authorization === `Bearer ${token}`;
}

async function gitValue(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: projectRoot,
      timeout: 2500,
      windowsHide: true,
      encoding: "utf8",
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function buildStatus(): Promise<HalieusControlStatus> {
  const [version, branch, commit, porcelain] = await Promise.all([
    readFile(resolve(projectRoot, "VERSION"), "utf8").then((value) => value.trim()),
    gitValue(["rev-parse", "--abbrev-ref", "HEAD"]),
    gitValue(["rev-parse", "--short", "HEAD"]),
    gitValue(["status", "--porcelain", "--untracked-files=no"]),
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
    actions: HGR_CONTROL_ACTIONS.map((action) => ({
      id: action.id,
      label: action.label,
      kind: action.kind,
      confirmation: action.confirmation,
      // Foundation stage is deliberately read-only. Process actions are wired
      // only after authentication, locking and audit logging are implemented.
      implemented: action.id === "status",
    })),
    timestamp: new Date().toISOString(),
  };
}

const server = createServer(async (request, response) => {
  if (!authorised(request)) {
    sendJson(response, 401, { ok: false, reason: "HGR Control authentication required." });
    return;
  }

  if (request.method === "GET" && request.url === "/api/status") {
    try {
      sendJson(response, 200, await buildStatus());
    } catch (error) {
      console.error("HGR Control status failed:", error);
      sendJson(response, 500, { ok: false, reason: "HGR Control status is unavailable." });
    }
    return;
  }

  sendJson(response, 404, {
    ok: false,
    reason: "Unknown HGR Control endpoint.",
  });
});

server.listen(port, host, () => {
  console.log(`HGR Control foundation listening on http://${host}:${port}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(token ? "Bearer-token authentication: ON" : "Bearer-token authentication: OFF (loopback only)");
});
