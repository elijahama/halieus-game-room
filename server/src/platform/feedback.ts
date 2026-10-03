import type { Express, Request, Response } from "express";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import type {
  HalieusFeedbackSource,
  HalieusFeedbackStatus,
  HalieusFeedbackSummary,
} from "../../../shared/platform/feedback.js";
import { APP_VERSION } from "../../../shared/version.js";
import { registerControlCloudRoutes } from "./controlCloud.js";
import { getFeedbackDataDirectory, getFeedbackFilePath } from "./dataPaths.js";

interface FeedbackStore {
  version: 1;
  entries: HalieusFeedbackSummary[];
}

type AccountResolver = (request: Request) => HalieusAccountSummary | null;
type AdminResolver = (request: Request) => boolean;

const dataDirectory = getFeedbackDataDirectory();
const storePath = resolve(dataDirectory, "feedback.json");
const legacyPath = getFeedbackFilePath();
const MAX_FEEDBACK = 2000;

let store: FeedbackStore = { version: 1, entries: [] };
let saveQueue: Promise<void> = Promise.resolve();

function cleanString(value: unknown, max: number, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function makeId(): string {
  return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function normaliseStatus(value: unknown): HalieusFeedbackStatus {
  return value === "reviewing" || value === "answered" || value === "closed" ? value : "open";
}

function normaliseStoredEntry(value: any): HalieusFeedbackSummary | null {
  if (!value || typeof value !== "object") return null;
  const details = cleanString(value.details, 4000);
  if (details.length < 4) return null;
  return {
    id: cleanString(value.id, 120) || makeId(),
    submittedAt: Number.isFinite(Number(value.submittedAt)) ? Number(value.submittedAt) : Date.now(),
    source: value.source === "profile" ? "profile" : "game",
    category: cleanString(value.category, 80, "Other"),
    details,
    gameId: cleanString(value.gameId, 80) || null,
    gameName: cleanString(value.gameName, 100) || null,
    roomCode: cleanString(value.roomCode, 12).toUpperCase() || null,
    submitterAccountId: cleanString(value.submitterAccountId, 120) || null,
    submitterDisplayName: cleanString(value.submitterDisplayName, 80, "Unknown player"),
    submitterUsername: cleanString(value.submitterUsername, 80) || null,
    pageUrl: cleanString(value.pageUrl, 500),
    appVersion: cleanString(value.appVersion, 40, APP_VERSION),
    status: normaliseStatus(value.status),
    ownerReply: value.ownerReply && typeof value.ownerReply === "object" && cleanString(value.ownerReply.message, 4000)
      ? {
          message: cleanString(value.ownerReply.message, 4000),
          at: Number.isFinite(Number(value.ownerReply.at)) ? Number(value.ownerReply.at) : Date.now(),
          responderAccountId: cleanString(value.ownerReply.responderAccountId, 120),
          responderDisplayName: cleanString(value.ownerReply.responderDisplayName, 80, "Halieus"),
        }
      : null,
  };
}

async function migrateLegacyFeedback(): Promise<HalieusFeedbackSummary[]> {
  if (!existsSync(legacyPath)) return [];
  try {
    const raw = await readFile(legacyPath, "utf8");
    return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
      try {
        const legacy = JSON.parse(line);
        const rawCategory = cleanString(legacy.category, 160, "Other");
        const pieces = rawCategory.split(" / ");
        const gameName = pieces.length > 1 ? pieces.shift() || null : null;
        const category = pieces.length ? pieces.join(" / ") : rawCategory;
        const submittedAt = Date.parse(String(legacy.submittedAt ?? ""));
        return [{
          id: cleanString(legacy.id, 120) || makeId(),
          submittedAt: Number.isFinite(submittedAt) ? submittedAt : Date.now(),
          source: gameName ? "game" as const : "profile" as const,
          category,
          details: cleanString(legacy.details, 4000),
          gameId: null,
          gameName,
          roomCode: cleanString(legacy.roomCode, 12).toUpperCase() || null,
          submitterAccountId: null,
          submitterDisplayName: cleanString(legacy.playerName, 80, "Unknown player"),
          submitterUsername: null,
          pageUrl: cleanString(legacy.pageUrl, 500),
          appVersion: cleanString(legacy.appVersion, 40, APP_VERSION),
          status: "open" as const,
          ownerReply: null,
        }];
      } catch {
        return [];
      }
    }).filter((entry) => entry.details.length >= 4);
  } catch (error) {
    console.error("Unable to migrate legacy feedback:", error);
    return [];
  }
}

export async function loadFeedbackStore(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  if (existsSync(storePath)) {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as Partial<FeedbackStore>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.map(normaliseStoredEntry).filter((entry): entry is HalieusFeedbackSummary => Boolean(entry)) : [];
    store = { version: 1, entries };
  } else {
    store = { version: 1, entries: await migrateLegacyFeedback() };
  }
  store.entries.sort((a, b) => b.submittedAt - a.submittedAt);
  if (store.entries.length > MAX_FEEDBACK) store.entries.length = MAX_FEEDBACK;
  await saveStore();
}

function requireAccount(request: Request, response: Response, getAccount: AccountResolver): HalieusAccountSummary | null {
  const account = getAccount(request);
  if (!account) response.status(401).json({ ok: false, reason: "Sign in to use feedback conversations." });
  return account;
}

function requireAdmin(request: Request, response: Response, hasAdmin: AdminResolver, getAccount: AccountResolver): HalieusAccountSummary | null {
  const account = getAccount(request);
  if (!account || !hasAdmin(request)) {
    response.status(403).json({ ok: false, reason: "Administrator access is required." });
    return null;
  }
  return account;
}

export function registerFeedbackRoutes(app: Express, getAccount: AccountResolver, hasAdmin: AdminResolver): void {
  // Control Cloud reuses the canonical HGR account/admin authentication boundary.
  // It is registered alongside the existing platform admin routes so it does not
  // duplicate or re-parse private session cookies.
  registerControlCloudRoutes(app, getAccount, hasAdmin);

  app.post("/feedback", async (request, response) => {
    const account = getAccount(request);
    const details = cleanString(request.body?.details, 4000);
    if (details.length < 4) {
      response.status(400).json({ ok: false, reason: "Feedback details are required." });
      return;
    }

    const source: HalieusFeedbackSource = request.body?.source === "profile" ? "profile" : "game";
    const gameName = cleanString(request.body?.gameName, 100) || null;
    const entry: HalieusFeedbackSummary = {
      id: makeId(),
      submittedAt: Date.now(),
      source,
      category: cleanString(request.body?.category, 80, "Other"),
      details,
      gameId: cleanString(request.body?.gameId, 80) || null,
      gameName,
      roomCode: cleanString(request.body?.roomCode, 12).toUpperCase() || null,
      submitterAccountId: account?.id ?? null,
      submitterDisplayName: account?.displayName ?? cleanString(request.body?.playerName, 80, "Unknown player"),
      submitterUsername: account?.username ?? null,
      pageUrl: cleanString(request.body?.pageUrl, 500),
      appVersion: APP_VERSION,
      status: "open",
      ownerReply: null,
    };

    store.entries.unshift(entry);
    if (store.entries.length > MAX_FEEDBACK) store.entries.length = MAX_FEEDBACK;
    await saveStore();
    response.status(201).json({ ok: true, feedback: entry });
  });

  app.get("/feedback/mine", (request, response) => {
    const account = requireAccount(request, response, getAccount);
    if (!account) return;
    response.json({
      ok: true,
      feedback: store.entries.filter((entry) => entry.submitterAccountId === account.id).slice(0, 100),
    });
  });

  app.get("/admin/feedback", (request, response) => {
    if (!requireAdmin(request, response, hasAdmin, getAccount)) return;
    response.json({ ok: true, feedback: store.entries.slice(0, 500) });
  });

  app.post("/admin/feedback/:feedbackId/reply", async (request, response) => {
    const actor = requireAdmin(request, response, hasAdmin, getAccount);
    if (!actor) return;
    const entry = store.entries.find((candidate) => candidate.id === request.params.feedbackId);
    if (!entry) {
      response.status(404).json({ ok: false, reason: "Feedback item not found." });
      return;
    }
    const message = cleanString(request.body?.message, 4000);
    if (message.length < 2) {
      response.status(400).json({ ok: false, reason: "Write a reply first." });
      return;
    }
    entry.ownerReply = {
      message,
      at: Date.now(),
      responderAccountId: actor.id,
      responderDisplayName: actor.displayName,
    };
    entry.status = "answered";
    await saveStore();
    response.json({ ok: true, feedback: entry });
  });

  app.post("/admin/feedback/:feedbackId/status", async (request, response) => {
    if (!requireAdmin(request, response, hasAdmin, getAccount)) return;
    const entry = store.entries.find((candidate) => candidate.id === request.params.feedbackId);
    if (!entry) {
      response.status(404).json({ ok: false, reason: "Feedback item not found." });
      return;
    }
    const status = request.body?.status;
    if (!["open", "reviewing", "answered", "closed"].includes(status)) {
      response.status(400).json({ ok: false, reason: "Invalid feedback status." });
      return;
    }
    entry.status = status as HalieusFeedbackStatus;
    await saveStore();
    response.json({ ok: true, feedback: entry });
  });
}
