import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const main = await readFile(new URL("../client/public/control/control.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../client/public/control/cloud-update.js", import.meta.url), "utf8");
const markup = await readFile(new URL("../client/public/control/index.html", import.meta.url), "utf8");
const styles = await readFile(new URL("../client/public/control/control.css", import.meta.url), "utf8");

assert.match(markup, /id="ownerPcDetail"/);
assert.match(markup, /id="ownerPcCheckout"[^>]+hidden/);
assert.match(markup, /control\/control\.css\?v=4\.7\.2-source-label-activity-chart/);
assert.match(markup, /control\/control\.js\?v=4\.7\.2-source-label-activity-chart/);
assert.match(bridge, /HGR_CONTROL_GAME_ROOT/);
assert.match(bridge, /Local development source:/);
assert.match(bridge, /not the public release/);
assert.doesNotMatch(bridge, /detail\.textContent = `\$\{device\.machineName\}\$\{device\.hgrVersion/, "Local source version must not impersonate deployed release.");
assert.match(styles, /\.owner-pc-checkout/);
assert.match(styles, /\.line-chart \.chart-point\.chart-line-a/);

function node(name) {
  const attrs = {};
  const children = [];
  return {
    name, attrs, children, textContent: "",
    setAttribute(k, v) { attrs[k] = String(v); },
    appendChild(x) { children.push(x); return x; },
    removeChild(x) { const i = children.indexOf(x); if (i >= 0) children.splice(i, 1); },
    get firstChild() { return children[0] || null; },
  };
}
const screen = node("svg");
const document = { createElementNS(_ns, name) { return node(name); } };
const source = main.replace("  void initialise();", "  globalThis.__dashboardAudit = { state, renderChart };");
assert.notEqual(source, main);
const context = { document, console, Date, window: {} };
vm.runInNewContext(source, context);
const { state, renderChart } = context.__dashboardAudit;
renderChart(screen, 720, 220);
assert.equal(screen.children.filter(n => n.name === "circle").length, 0, "No sample must never be fabricated as a zero.");
assert.match(screen.children.find(n => n.name === "text")?.textContent || "", /Awaiting first live sample/);

state.samples.push({ clients: 1, players: 1, rooms: 0, at: Date.now() });
renderChart(screen, 720, 220);
assert.equal(screen.children.filter(n => n.name === "polyline").length, 0, "Single sample does not create a fake time-series segment.");
const firstPoints = screen.children.filter(n => n.name === "circle");
assert.equal(firstPoints.length, 3, "All three real series must display a point immediately.");
for (const p of firstPoints) {
  assert.equal(Number(p.attrs.cx), 360, "First sample must render in chart centre, not cropped at left edge.");
  assert.equal(Number(p.attrs.r), 5);
}
assert.match(screen.children.find(n => n.name === "text")?.textContent || "", /Collecting activity history/);

state.samples.push({ clients: 2, players: 1, rooms: 1, at: Date.now() + 2000 });
renderChart(screen, 720, 220);
assert.equal(screen.children.filter(n => n.name === "polyline").length, 3, "Two observations must form the real three line series.");
assert.equal(screen.children.filter(n => n.name === "circle").length, 3, "Most recent observation has a visible marker.");
assert.equal(screen.children.filter(n => n.name === "text").length, 0, "Collecting hint clears as soon as a trend exists.");
assert.equal(screen.children.find(n => n.name === "polyline").attrs.points.split(" ").length, 2);
console.log("PASS HGR 4.7.2 Control: actual development checkout identified separately from live website; first sample visible; two samples draw real lines; no fabricated zero data.");
