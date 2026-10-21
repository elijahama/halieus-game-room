import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const client = join(root, "client");
const port = 39587, base = "http://127.0.0.1:" + port;
const prefix = "__hgr_push_recovery_" + process.pid;
const htmlFile = join(client, prefix + ".html");
const appFile = join(client, prefix + ".tsx");
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/' + prefix + '.tsx"></script></body></html>';
const app = [
  'import React from "react";',
  'import {createRoot} from "react-dom/client";',
  'import {NotificationPermissionButton} from "./src/platform/components/NotificationPermissionButton";',
  'createRoot(document.getElementById("app")).render(<NotificationPermissionButton accountId="qa-account" />);',
].join("\n");

let preview, browser;
try {
  await writeFile(htmlFile, html);
  await writeFile(appFile, app);
  preview = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"),
    "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {cwd: client, stdio: "pipe"});
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(base + "/" + prefix + ".html")).ok) {ready = true;break;} } catch {}
    if (preview.exitCode !== null) break;
    await new Promise(done => setTimeout(done, 150));
  }
  assert.ok(ready, "Push recovery Vite fixture could not launch");
  browser = await chromium.launch({headless: true});
  for (const width of [360, 820]) {
    const context = await browser.newContext({viewport: {width, height: 800}});
    await context.grantPermissions(["notifications"], {origin: base});
    const page = await context.newPage();
    let backendSubscribeCount = 0;
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(Notification, "permission", {configurable:true,get:() => "granted"});
      Notification.requestPermission = async () => "granted";
      window.PushManager = class PushManager {};
      window.__qaFailPush = true;
      const subscription = {
        endpoint: "https://fcm.googleapis.com/fcm/send/qa-browser-valid-length",
        toJSON: () => ({
          endpoint: "https://fcm.googleapis.com/fcm/send/qa-browser-valid-length",
          keys: {p256dh: "A".repeat(87), auth: "B".repeat(22)},
        }),
        unsubscribe: async () => true,
      };
      const registration = {
        pushManager: {
          getSubscription: async () => window.__qaFailPush ? null : null,
          subscribe: async () => {
            if (window.__qaFailPush) throw new DOMException("Registration failed - push service error", "AbortError");
            return subscription;
          },
        },
      };
      navigator.serviceWorker.getRegistration = async () => registration;
    });
    await page.route("**/accounts/push/config", route => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ok:true,available:true,publicKey:"B".repeat(87)}),
    }));
    await page.route("**/accounts/push/subscribe", route => {
      backendSubscribeCount++;
      return route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify({ok:true})});
    });
    await page.goto(base + "/" + prefix + ".html", {waitUntil:"domcontentloaded"});
    await page.getByRole("button", {name:"Enable PWA alerts"}).click();
    await page.getByRole("alert").getByText(/browser could not register with its push service/i).waitFor();
    assert.equal(await page.getByRole("alert").getByText(/Use Google services for push messaging/i).isVisible(), true);
    assert.equal(await page.getByRole("alert").getByText(/Inbox and in-app alerts still work/i).isVisible(), true);
    assert.equal(backendSubscribeCount, 0, "Never send failed browser subscription to account backend");
    assert.equal(await page.getByRole("button", {name:"Enable PWA alerts"}).isEnabled(), true, "Allow explicit retry");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, "Push recovery must not break narrow settings layout");
    await page.evaluate(() => {window.__qaFailPush=false;});
    await page.getByRole("button", {name:"Enable PWA alerts"}).click();
    await page.getByRole("button", {name:"Disable PWA alerts"}).waitFor();
    assert.equal(backendSubscribeCount, 1, "Successful browser subscription must reach HGR account route exactly once");
    assert.deepEqual(errors, [], "No React page errors");
    console.log("PASS 4.5.5v push-provider rejection, readable recovery, no false success, explicit retry at " + width + "px");
    await context.close();
  }
} finally {
  await browser?.close();
  preview?.kill("SIGTERM");
  await rm(htmlFile, {force:true});
  await rm(appFile, {force:true});
}
