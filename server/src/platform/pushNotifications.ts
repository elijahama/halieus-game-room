import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Express, Request, Response } from "express";
import webPush from "web-push";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import { getHalieusDataRoot } from "./dataPaths.js";

/**
 * HGR 4.5.5t: background PWA push delivery is opt-in per browser/device.
 * VAPID private key and subscriptions live in durable, untracked runtime
 * data, never in Git, client bundles, or the public account store.
 */
export type HgrPushTopic = "invites" | "messages";
export interface HgrPushMessage {
  topic: HgrPushTopic;
  title: string;
  body: string;
  url: string;
  tag: string;
}

interface DeviceSubscription {
  accountId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  topics: HgrPushTopic[];
  updatedAt: number;
}
interface StoredPush {
  version: 1;
  vapid: { publicKey: string; privateKey: string };
  subscriptions: DeviceSubscription[];
}
const dir = getHalieusDataRoot()
  ? resolve(getHalieusDataRoot()!, "notifications")
  : resolve(process.cwd(), "data", "notifications");
const file = resolve(dir, "push-subscriptions.json");
const knownProviders = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "push.services.mozilla.com",
  "push.apple.com",
];
let state: StoredPush | null = null;
let writes = Promise.resolve();

export function isTrustedPushEndpoint(input: unknown): input is string {
  if (typeof input !== "string" || input.length < 32 || input.length > 2048) return false;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password
      && (!url.port || url.port === "443")
      && (knownProviders.includes(host) || (host.endsWith(".notify.windows.com") && host.length < 100))
      && url.pathname.length > 4;
  } catch { return false; }
}
function validKeys(keys: unknown): keys is DeviceSubscription["keys"] {
  if (!keys || typeof keys !== "object") return false;
  const obj = keys as Record<string,unknown>;
  return typeof obj.p256dh === "string" && /^[A-Za-z0-9_-]{40,160}$/.test(obj.p256dh)
    && typeof obj.auth === "string" && /^[A-Za-z0-9_-]{14,64}$/.test(obj.auth);
}
const supportedTopic = (item: unknown): item is HgrPushTopic =>
  item === "invites" || item === "messages";

async function save(): Promise<void> {
  if (!state) return;
  const snapshot = JSON.stringify(state);
  writes = writes.then(async () => {
    await mkdir(dir, {recursive:true});
    const temp = file + ".tmp";
    await writeFile(temp, snapshot, {encoding:"utf8",mode:0o600});
    await rename(temp, file);
    if (process.platform !== "win32") await chmod(file, 0o600);
  });
  await writes;
}
export async function initializePushNotifications(): Promise<boolean> {
  try {
    await mkdir(dir, {recursive:true});
    if (existsSync(file)) {
      const loaded = JSON.parse(await readFile(file,"utf8")) as Partial<StoredPush>;
      if (loaded.vapid?.publicKey && loaded.vapid.privateKey) {
        state = {version:1,vapid:loaded.vapid,
          subscriptions: Array.isArray(loaded.subscriptions)
            ? loaded.subscriptions.filter(item=>item && typeof item.accountId==="string"
              && isTrustedPushEndpoint(item.endpoint) && validKeys(item.keys)
              && Array.isArray(item.topics)).slice(-2000) : []};
      }
    }
    if (!state) {
      const vapid = webPush.generateVAPIDKeys();
      state={version:1,vapid,subscriptions:[]};
      await save();
    }
    webPush.setVapidDetails("https://halieus.remotewire.net",state.vapid.publicKey,state.vapid.privateKey);
    return true;
  } catch {
    state=null;
    console.warn("[HGR] Browser push is unavailable; in-app invitations and messages still work.");
    return false;
  }
}
type AccountResolver = (request: Request) => HalieusAccountSummary | null;

export function registerPushRoutes(app: Express, accountFor: AccountResolver): void {
  function loggedIn(request: Request, response: Response): HalieusAccountSummary | null {
    const account = accountFor(request);
    if (!account) response.status(401).json({ok:false,reason:"Sign in first."});
    return account;
  }
  app.get("/accounts/push/config", (request,response) => {
    if (!loggedIn(request,response)) return;
    response.json({ok:true,available:Boolean(state),publicKey:state?.vapid.publicKey ?? null});
  });
  app.post("/accounts/push/status", (request,response) => {
    const account=loggedIn(request,response);
    if (!account) return;
    const endpoint=request.body?.endpoint;
    const active=state?.subscriptions.find((item)=>
      item.accountId===account.id && item.endpoint===endpoint);
    response.json({ok:true,enabled:Boolean(active),topics:active?.topics ?? []});
  });
  app.post("/accounts/push/subscribe", async (request,response) => {
    const account=loggedIn(request,response);
    if (!account) return;
    if (!state) {response.status(503).json({ok:false,reason:"Push is temporarily unavailable."});return;}
    const sub=request.body?.subscription as {endpoint?:unknown;keys?:unknown} | undefined;
    const topicsInput=request.body?.topics;
    if (!sub || !isTrustedPushEndpoint(sub.endpoint) || !validKeys(sub.keys)
      || !Array.isArray(topicsInput) || topicsInput.length === 0
      || topicsInput.length > 2 || !topicsInput.every(supportedTopic)) {
      response.status(400).json({ok:false,reason:"Use a valid browser push subscription and notification topics."});return;
    }
    const endpoint = sub.endpoint;
    // A browser subscription belongs to only one current account. Account
    // switching may not leak another player's messages to this device.
    state.subscriptions=state.subscriptions.filter(item=>item.endpoint!==endpoint);
    const duplicates=[...new Set(topicsInput as HgrPushTopic[])];
    state.subscriptions.push({accountId:account.id,endpoint,keys:sub.keys,
      topics:duplicates,updatedAt:Date.now()});
    const mine=state.subscriptions.filter(item=>item.accountId===account.id)
      .sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,5);
    state.subscriptions=state.subscriptions.filter(item=>item.accountId!==account.id).concat(mine);
    await save();
    response.json({ok:true,topics:duplicates});
  });
  app.post("/accounts/push/unsubscribe", async (request,response) => {
    const account=loggedIn(request,response);
    if (!account) return;
    if (!state) {response.json({ok:true});return;}
    const endpoint=request.body?.endpoint;
    if (!isTrustedPushEndpoint(endpoint)) {
      response.status(400).json({ok:false,reason:"Provide a valid push endpoint."});return;
    }
    state.subscriptions=state.subscriptions.filter(item=>item.accountId!==account.id || item.endpoint!==endpoint);
    await save();
    response.json({ok:true});
  });
}

/** Non-blocking and isolated: notification delivery can never fail a game action. */
export async function sendHgrPush(accountIds: readonly string[], notice: HgrPushMessage): Promise<void> {
  const s=state;
  if (!s || !accountIds.length || !supportedTopic(notice.topic)) return;
  const recipients=new Set(accountIds);
  const subscriptions=s.subscriptions.filter(item=>recipients.has(item.accountId) && item.topics.includes(notice.topic));
  if (!subscriptions.length) return;
  // Keep notification copy short; previews can appear on lock screens.
  const payload=JSON.stringify({
    title:String(notice.title).slice(0,100),
    body:String(notice.body).slice(0,160),
    url:notice.url.startsWith("/?") ? notice.url.slice(0,250) : "/?inbox=1",
    tag:String(notice.tag).slice(0,120),
  });
  const expired=new Set<string>();
  await Promise.allSettled(subscriptions.map(async (item) => {
    try {
      await webPush.sendNotification({endpoint:item.endpoint,keys:item.keys},payload,{TTL:7200,urgency:"normal"});
    } catch (e) {
      const status=typeof e==="object" && e && "statusCode" in e
        ? Number((e as {statusCode:unknown}).statusCode) : 0;
      if (status===404 || status===410) expired.add(item.endpoint);
    }
  }));
  if (expired.size && state===s) {
    state.subscriptions=state.subscriptions.filter(item=>!expired.has(item.endpoint));
    await save();
  }
}
