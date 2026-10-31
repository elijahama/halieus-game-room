import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
const root = new URL("../", import.meta.url);
const html = await readFile(new URL("client/public/control/index.html", root), "utf8");
const css = await readFile(new URL("client/public/control/control.css", root), "utf8");
const js = await readFile(new URL("client/public/control/development.js", root), "utf8");
const start = html.indexOf('<section class="control-section" data-panel="development"');
const end = html.indexOf('<section class="control-section" data-panel="audit"', start);
assert.ok(start > 0 && end > start);
const section = html.slice(start, end).replace('class="control-section"', 'class="control-section is-active"');
const mobile = html.match(/<nav class="control-mobile-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0] || "";
assert.ok(mobile);
let timeline = {
  ok: true, source: "available", latestAt: "2026-10-25T06:00:00Z",
  events: [
    { id: "test-bridge-id", at: "2026-10-25T06:00:00Z", source: "bridge", kind: "prompt", status: "prompt", taskId: null },
    { id: "test-receipt-id", at: "2026-10-25T05:59:00Z", source: "openshard", kind: "receipt", status: "not-verified", taskId: null }
  ]
};
const browser = await chromium.launch({ headless: true });
try {
  for (const size of [{width:360,height:780}, {width:820,height:900}, {width:1440,height:900}]) {
    const page = await browser.newPage({ viewport: size });
    await page.route("http://hgr.local/**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/control/development-timeline")
        return route.fulfill({ status: timeline.code || 200, contentType: "application/json", body: JSON.stringify(timeline) });
      if (pathname === "/control/development-status")
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok:true,pulls:[
          {number:187,state:"draft",title:"Notification progress"},
          {number:188,state:"open",title:"Android icons"},
          {number:190,state:"merged",title:"Oracle diagnostics"},
        ],runs:[],pullsAvailable:true,runsAvailable:true,fetchedAt:"2026-10-31T04:00:00Z" }) });
      if (pathname === "/test.css")
        return route.fulfill({ status:200, contentType:"text/css",body:css });
      if (pathname === "/control/development.js")
        return route.fulfill({ status:200, contentType:"text/javascript",body:js });
      return route.fulfill({status:200,contentType:"text/html",body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"></head><body><main class="control-main">'+section+'</main>'+mobile+'<script defer src="/control/development.js"></script></body></html>'});
    });
    timeline = { ok: true, source: "available", latestAt: "2026-10-25T06:00:00Z",
      events: [{ id: "test-bridge-id", at: "2026-10-25T06:00:00Z", source: "bridge", kind: "prompt", status: "prompt" },
        { id: "test-receipt-id", at: "2026-10-25T05:59:00Z", source: "openshard", kind: "receipt", status: "not-verified" }] };
    await page.goto("http://hgr.local/");
    await page.locator("#refreshDevelopment").click();
    await page.getByText("Local history available on this server").waitFor();
    assert.equal(await page.locator(".development-local-entry").count(), 2);
    assert.equal(await page.locator("#developmentDeliveryBatches > li").count(), 8,
      "Eight explicit audited batches remain in owner Control");
    assert.equal(await page.locator("#developmentTournamentRoadmap > article").count(), 5,
      "4.6-5.0 release stages remain visible");
    assert.match(await page.locator("#developmentTournamentRoadmap").innerText(), /5\.0\.0[\s\S]*owner sign-off/i);
    assert.match(await page.locator("#developmentDeliveryBatches").innerText(), /Merged.*production separate/i,
      "GitHub merge must not pretend an Oracle release was deployed");

    assert.ok((await page.locator("#developmentLocalEntries").innerText()).includes("Not verified"));
    assert.ok(!(await page.locator("body").innerText()).includes("secret prompt"));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 2, "Horizontal overflow at "+size.width+": "+overflow);
    if(size.width===360) assert.equal(await page.locator(".control-mobile-nav button").count(),5);
    timeline = { ok: true, source: "available", transport: "cloud-relay", stale: false,
      lastReceivedAt: "2026-10-25T06:01:00Z", latestAt: "2026-10-25T06:00:00Z",
      events: [{ id: "remote-receipt-1", source: "openshard", kind: "receipt", status: "not-verified", at: "2026-10-25T06:00:00Z", taskId: null }] };
    await page.locator("#refreshDevelopment").click();
    await page.getByText("Owner-PC timeline received").waitFor();
    assert.ok((await page.locator("#developmentLocalHint").innerText()).includes("Last sync:"));
    timeline = { ...timeline, source: "stale", stale: true };
    await page.locator("#refreshDevelopment").click();
    await page.getByText("Owner-PC timeline stale").waitFor();
    assert.equal(await page.locator(".development-local-entry").count(), 1, "Stale history labelled, not hidden or shown as live");
    timeline = { ok: true, source: "unavailable", transport: "disconnected", events:[], latestAt:null };
    await page.locator("#refreshDevelopment").click();
    await page.getByText("Local OpenShard source unavailable").waitFor();
    assert.equal(await page.locator(".development-local-entry").count(), 0);
    timeline = { code:403, ok:false };
    await page.locator("#refreshDevelopment").click();
    await page.getByText("Owner sign-in is required for local evidence").waitFor();
    await page.close();
  }
  console.log("PASS Control timeline browser: 360px phone, 820px tablet, 1440px desktop, verified/unavailable/403, no overflow");
} finally { await browser.close(); }
