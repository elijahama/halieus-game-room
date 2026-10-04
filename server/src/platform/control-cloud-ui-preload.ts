import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";

import type { Request as ExpressRequest } from "express";
import { getAuthenticatedAccount } from "./accounts.js";
import { getHalieusDataRoot } from "./dataPaths.js";

interface StoredRequest {
  requestId: string;
  action: "update";
  state: "queued" | "running" | "succeeded" | "failed" | "rejected";
  requestedAt: string;
  updatedAt: string;
  phase: string;
  progress: number;
  reason: string | null;
}

interface CloudStore {
  requests?: StoredRequest[];
}

const configuredRoot = getHalieusDataRoot();
const statePath = configuredRoot
  ? resolve(configuredRoot, "control-cloud", "state.json")
  : resolve(process.cwd(), "data", "control-cloud", "state.json");
const controlScriptPath = resolve(process.cwd(), "../client/dist/control/control.js");
const cloudUpdateScriptPath = resolve(process.cwd(), "../client/dist/control/cloud-update.js");

function security(response: ServerResponse): void {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  security(response);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function hasAdmin(request: IncomingMessage): boolean {
  const account = getAuthenticatedAccount(request as unknown as ExpressRequest);
  return Boolean(account && (account.role === "owner" || account.role === "admin"));
}

function publicOperation(entry: StoredRequest | null) {
  if (!entry) return null;
  return {
    id: entry.requestId,
    action: "update",
    title: "Updating HGR",
    phase: entry.phase,
    progress: entry.progress,
    state: entry.state === "queued" ? "running" : entry.state,
    startedAt: entry.requestedAt,
    reason: entry.reason,
  };
}

async function serveOperationStatus(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!hasAdmin(request)) {
    sendJson(response, 403, { ok: false, reason: "Owner or administrator access is required." });
    return;
  }
  if (!existsSync(statePath)) {
    sendJson(response, 200, { ok: true, operation: null });
    return;
  }
  try {
    const store = JSON.parse(await readFile(statePath, "utf8")) as CloudStore;
    const latest = (Array.isArray(store.requests) ? store.requests : [])
      .slice()
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0] ?? null;
    sendJson(response, 200, { ok: true, operation: publicOperation(latest) });
  } catch (error) {
    console.error("HGR Control latest operation could not be read:", error);
    sendJson(response, 500, { ok: false, reason: "Cloud operation status is unavailable." });
  }
}

async function serveCombinedControlScript(response: ServerResponse): Promise<void> {
  try {
    const [base, cloud] = await Promise.all([
      readFile(controlScriptPath, "utf8"),
      readFile(cloudUpdateScriptPath, "utf8"),
    ]);
    security(response);
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");
    response.end(`${base}\n\n/* HGR 4.5.4.5 Cloud Update */\n${cloud}\n`);
  } catch (error) {
    console.error("HGR Control combined script could not be served:", error);
    sendJson(response, 500, { ok: false, reason: "HGR Control client script is unavailable." });
  }
}

function wrapListener(listener: RequestListener): RequestListener {
  return (request, response) => {
    const path = (() => {
      try { return new URL(request.url || "/", "http://hgr-control.invalid").pathname; }
      catch { return ""; }
    })();
    if (request.method === "GET" && path === "/control/operation-status") {
      void serveOperationStatus(request, response);
      return;
    }
    if (request.method === "GET" && path === "/control/control.js") {
      void serveCombinedControlScript(response);
      return;
    }
    listener(request, response);
  };
}

const require = createRequire(import.meta.url);
const httpModule = require("node:http") as typeof import("node:http");
const originalCreateServer = httpModule.createServer.bind(httpModule);
(httpModule as unknown as { createServer: (...args: unknown[]) => unknown }).createServer = (...args: unknown[]) => {
  const listenerIndex = typeof args[0] === "function" ? 0 : typeof args[1] === "function" ? 1 : -1;
  if (listenerIndex >= 0) args[listenerIndex] = wrapListener(args[listenerIndex] as RequestListener);
  return (originalCreateServer as (...values: unknown[]) => unknown)(...args);
};
syncBuiltinESMExports();
