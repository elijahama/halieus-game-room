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
  'createRoot(document.getElementById("app")).render(<><section id="enrollment"><NotificationPermissionButton accountId="qa-account" /></section><section id="settings"><NotificationPermissionButton accountId="qa-account" mode="settings" /></section></>);',
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
    let backendTopics = ["invites", "messages"];
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(Notification, "permission", {configurable:true,get:() => "granted"});
      Notification.requestPermission = async () => "granted";
      window.PushManager = class PushManager {};
      window.__qaFailPush = true;
      window.__qaSubscribed = false;
      window.__qaHangPush = false;
      const subscription = {
        endpoint: "https://fcm.googleapis.com/fcm/send/qa-browser-valid-length",
        toJSON: () => ({
          endpoint: "https://fcm.googleapis.com/fcm/send/qa-browser-valid-length",
          keys: {p256dh: "A".repeat(87), auth: "B".repeat(22)},
        }),
        unsubscribe: async () => {window.__qaSubscribed=false;return true;},
      };
      const registration = {
        pushManager: {
          getSubscription: async () => window.__qaSubscribed ? subscription : null,
          subscribe: async () => {
            if (window.__qaHangPush) return new Promise(() => {});
            if (window.__qaFailPush) throw new DOMException("Registration failed - push service error", "AbortError");
            window.__qaSubscribed = true;
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
    await page.route("**/accounts/push/status", route => route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,enabled:true,topics:backendTopics})}));
    await page.route("**/accounts/push/unsubscribe", route => route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true})}));
    await page.route("**/accounts/push/subscribe", route => {
      backendSubscribeCount++;
      backendTopics = JSON.parse(route.request().postData() || "{}").topics;
      return route.fulfill({status: 200, contentType: "application/json", body: JSON.stringify({ok:true})});
    });
    await page.goto(base + "/" + prefix + ".html", {waitUntil:"domcontentloaded"});
    await page.locator("#enrollment").getByRole("button", {name:"Enable PWA alerts"}).click();
    await page.getByRole("alert").getByText(/browser could not register with its push service/i).waitFor();
    assert.equal(await page.getByRole("alert").getByText(/Use Google services for push messaging/i).isVisible(), true);
    assert.equal(await page.getByRole("alert").getByText(/Inbox and in-app alerts still work/i).isVisible(), true);
    assert.equal(backendSubscribeCount, 0, "Never send failed browser subscription to account backend");
    assert.equal(await page.locator("#enrollment").getByRole("button", {name:"Enable PWA alerts"}).isEnabled(), true, "Allow explicit retry");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, "Push recovery must not break narrow settings layout");
    // An unresponsive browser push provider must time out and release the button.
    if (width === 360) {
      await page.evaluate(() => {window.__qaFailPush=false;window.__qaHangPush=true;});
      await page.locator("#enrollment").getByRole("button", {name:"Enable PWA alerts"}).click();
      await page.locator("#enrollment").getByRole("alert").getByText(/timed out/i).waitFor({timeout:16_000});
      assert.equal(await page.locator("#enrollment").getByRole("button", {name:"Enable PWA alerts"}).isEnabled(),true,"A hung provider must release the enrolment control");
      assert.equal(backendSubscribeCount,0,"A hung browser subscribe must never report enrolment to the server");
    }
    await page.evaluate(() => {window.__qaFailPush=false;window.__qaHangPush=false;});
    await page.locator("#enrollment").getByRole("button", {name:"Enable PWA alerts"}).click();
    const settings=page.locator("#settings");
    const enrollment=page.locator("#enrollment");
    await settings.getByRole("button", {name:"Disable PWA alerts"}).waitFor();
    assert.equal(await enrollment.getByRole("button").count(), 0, "Main PWA enrollment bar disappears after verified opt-in");
    assert.equal(await settings.getByText("Enabled on this device.").isVisible(), true, "Profile Settings reflects opt-in");
    assert.equal(backendSubscribeCount, 1, "Successful browser subscription must reach HGR account route exactly once");
    assert.deepEqual(backendTopics, ["invites","messages"], "Existing push enrollment must not silently opt in turns");
    await settings.getByRole("button", {name:"Enable turn alerts"}).click();
    await settings.getByRole("button", {name:"Disable turn alerts"}).waitFor();
    assert.deepEqual(backendTopics, ["invites","messages","turns"], "Explicit user turn consent added without losing old topics");
    await settings.getByRole("button", {name:"Disable turn alerts"}).click();
    await settings.getByRole("button", {name:"Enable turn alerts"}).waitFor();
    assert.deepEqual(backendTopics, ["invites","messages"], "Per-device opt-out keeps invitation/message alerts");
    await settings.getByRole("button", {name:"Disable PWA alerts"}).click();
    await enrollment.getByRole("button", {name:"Enable PWA alerts"}).waitFor();
    assert.equal(await settings.getByText("Not enabled on this device.").isVisible(), true, "Profile Settings reflects opt-out");
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
