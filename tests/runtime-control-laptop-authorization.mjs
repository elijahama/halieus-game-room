import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("client/public/control/index.html");
const css = read("client/public/control/control.css");
const source = read("client/public/control/cloud-update.js");
const cloud = read("server/src/platform/control-cloud-server-preload.ts");
const runbook = read("docs/HGR_CONTROL_CLOUD.md");
const master = read("docs/HGR_MASTERBOOK.md");

assert.match(html, /id="controlEnrollment"[^>]+hidden/, "Authorisation panel starts hidden.");
assert.match(html, /id="controlEnrollmentList"/, "Every pending laptop gets its own action.");
assert.match(html, /id="controlEnrollmentFeedback" role="status" aria-live="polite"/, "Accessible status feedback.");
assert.match(css, /\.control-enrollment-panel/);
assert.match(css, /@media\(max-width:600px\)/);
assert.match(cloud, /const actor = requireAdmin\(request, response\)/, "Approval is authenticated on Oracle.");
assert.match(cloud, /if \(request\.method === "POST" && !isSameOrigin\(request\)\)/, "No cross-origin approval.");
assert.match(source, /device\.approval === "pending" && device\.online === true/, "Only fresh pending laptops prompt.");
assert.match(source, /authorisationInFlight\.has\(device\.deviceId\)/, "Prevent duplicate approvals.");
assert.match(source, /device\.deviceId\)\}\/approve/, "Approval targets the selected registered ID.");
assert.match(source, /window\.confirm\(/, "Never silently approve.");
assert.doesNotMatch(source, /automaticApproval|autoApprove|resetDeviceSecret/);
assert.match(runbook, /pending cloud-device enrollment/i);
assert.match(master, /device approval \/ stale-device selection incident/i);

class Element {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.handlers = {};
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this.textContent = "";
  }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.children.push(item); }
  replaceChildren(...items) { this.children = [...items]; }
  addEventListener(name, callback) { this.handlers[name] = callback; }
}
const controls = new Map([
  ["controlEnrollment", new Element()],
  ["controlEnrollmentList", new Element()],
  ["controlEnrollmentFeedback", new Element()],
]);
const $ = id => controls.get(id) ?? null;
const document = {
  readyState: "loading",
  getElementById: $,
  createElement: tag => new Element(tag),
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: selector => selector === "#controlEnrollmentList button"
    ? controls.get("controlEnrollmentList").children.flatMap(row => row.children.filter(child => child.tag === "button")) : [],
};
let consent = false;
let serverDevices = [];
let serverActorRole = "owner";
const calls = [];
const window = {
  setTimeout, clearTimeout, setInterval, clearInterval,
  addEventListener: () => {},
  confirm: () => consent,
  dispatchEvent: () => {},
};
const fetch = async (url, options = {}) => {
  calls.push({ url, method: options.method ?? "GET" });
  if (url === "/control/cloud/status") return {
    ok: true,
    json: async () => ({actorRole:serverActorRole,devices:serverDevices,operations:[],activeOperation:null})
  };
  if (/\/control\/cloud\/devices\/[^/]+\/approve$/.test(url) && options.method === "POST") {
    const id = decodeURIComponent(url.split("/").at(-2));
    const device = serverDevices.find(d => d.deviceId === id);
    if (!device || device.approval !== "pending") return {ok:false,status:409,json:async()=>({reason:"Not pending"})};
    device.approval = "approved";
    return {ok:true,json:async()=>({ok:true})};
  }
  if (url === "/control/operation-status") return {ok:true,json:async()=>({operation:null})};
  if (url === "/control/operation-history") return {ok:true,json:async()=>({operations:[]})};
  throw Error("Unexpected network access: " + url);
};
const injection = "  window.__test = { setRole: role => { actorRole = role; }, renderPendingEnrollments, authoriseDevice };\n";
const injected = source.replace('  window.addEventListener("pagehide", stopRefreshLoop);',
  injection + '  window.addEventListener("pagehide", stopRefreshLoop);');
assert.notEqual(injected,source,"Test hook must inject once into the existing closure.");
vm.runInNewContext(injected, { document, window, fetch, AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
  CustomEvent: class {}, console });
const api = window.__test;
assert.ok(api, "Test must reach real Control component, not duplicate its implementation.");
api.setRole("owner");
const staleApproved={deviceId:"old-offline",machineName:"Old laptop",approval:"approved",online:false};
const current={deviceId:"lagz-123456",machineName:"Lagz",releaseCheckoutVersion:"4.7.11",approval:"pending",online:true};
const another={deviceId:"another-789456",machineName:"Lagz",approval:"pending",online:true};
serverDevices=[staleApproved,current,another];

api.renderPendingEnrollments(serverDevices);
assert.equal(controls.get("controlEnrollment").hidden,false,"Pending laptop visible even with stale approved device.");
assert.equal(controls.get("controlEnrollmentList").children.length,2,"Every pending online laptop has its own card.");
let buttons=document.querySelectorAll("#controlEnrollmentList button");
assert.deepEqual(buttons.map(x=>x.dataset.deviceId),["another-789456","lagz-123456"].sort(),
  "Identically named devices must retain distinct IDs.");
const originalButton=buttons[0];
api.renderPendingEnrollments(serverDevices);
assert.equal(document.querySelectorAll("#controlEnrollmentList button")[0],originalButton,
  "Heartbeat polling must preserve focused buttons instead of rebuilding them.");
api.setRole("player");
api.renderPendingEnrollments(serverDevices);
assert.equal(controls.get("controlEnrollment").hidden,true,"Non-owner/non-admin cannot see authorisation.");
api.setRole("admin");
api.renderPendingEnrollments(serverDevices);
assert.equal(controls.get("controlEnrollment").hidden,false,"Existing administrator role remains supported.");
api.setRole("owner");
api.renderPendingEnrollments(serverDevices);

consent=false;
await api.authoriseDevice(current);
assert.equal(calls.filter(x=>x.method==="POST").length,0,"Cancel must never approve.");
consent=true;
current.online=false;
await api.authoriseDevice(current);
assert.equal(calls.filter(x=>x.method==="POST").length,0,"Lost heartbeat must not approve stale laptop.");
current.online=true;
current.approval="revoked";
await api.authoriseDevice(current);
assert.equal(calls.filter(x=>x.method==="POST").length,0,"Revoked device cannot be silently re-approved.");
current.approval="pending";
serverActorRole="player";
await api.authoriseDevice(current);
assert.equal(calls.filter(x=>x.method==="POST").length,0,"Authorisation recheck must reject lost owner role.");
serverActorRole="owner";
await api.authoriseDevice(current);
assert.equal(calls.filter(x=>x.method==="POST").length,1,"Fresh, explicitly confirmed owner approval must send exactly one POST.");
assert.equal(current.approval,"approved");
assert.equal(controls.get("controlEnrollment").hidden,false,"A second pending device remains actionable.");
api.renderPendingEnrollments([staleApproved,{...current,approval:"approved"}, {...another,approval:"approved"}]);
assert.equal(controls.get("controlEnrollment").hidden,true,"Approved devices do not retain a false approval prompt.");
console.log("PASS Control laptop authorisation: stale approved masking, multiple identical-name IDs, focus retention, explicit consent, stale/revoked/role guards, success and accessible banner.");
