import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const source = await readFile(new URL("../client/public/control/control.js", import.meta.url), "utf8");
const css = await readFile(new URL("../client/public/control/control.css", import.meta.url), "utf8");
const cloud = await readFile(new URL("../client/public/control/cloud-update.js", import.meta.url), "utf8");
const html = await readFile(new URL("../client/public/control/index.html", import.meta.url), "utf8");
assert.match(html, /id="operationToast"/);
assert.match(html, /id="operationProgressBar"/);
assert.match(html, /id="operationProgressTrack" role="progressbar"/);
assert.doesNotMatch(html, /id="controlUpdateMeter"/);
assert.match(css, /\.operation-toast\.is-minimized\[data-action="update"\] \.operation-progress\s*\{[\s\S]*?display:block!important/);
assert.match(css, /\.operation-toast\[data-action="update"\] \.operation-progress\s*\{[\s\S]*?height:12px/);
assert.match(cloud, /querySelector\(['"]\.operation-grid button\[data-operation="update"\]['"]\)/,
  "Update tile must be selected by exact action ID instead of label text.");
assert.match(css, /operation-toast:not\(\[data-action="update"\]\) \.operation-progress/);
assert.match(css, /operation-toast\[data-state="running"\]\[data-action="restart"\] \.operation-icon::before/);
assert.match(css, /operation-toast\[data-state="running"\]\[data-action="close"\] \.operation-icon::before/);
assert.match(css, /operation-toast\[data-state="succeeded"\] \.operation-icon::before/,
  "Completed lifecycle actions must preserve the static success tick.");
assert.match(css, /operation-toast\[data-state="failed"\] \.operation-icon::before/,
  "Failed lifecycle actions must preserve their failure symbol.");
const elements = new Map();
function el(id) {
  if (!elements.has(id)) {
    const item = { id, dataset:{}, style:{}, hidden:false, title:"", textContent:"",
      dateTime:"", parentElement:null, attrs:{},
      classList: { contains:()=>false, add(){}, remove(){}, toggle(){} },
      setAttribute(k,v){this.attrs[k]=v;}, getAttribute(k){return this.attrs[k];} };
    elements.set(id,item);
  }
  return elements.get(id);
}
el("operationProgressBar").parentElement = el("operationProgressTrack");
const document = {
  getElementById: el,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement:()=>({classList:{add(){},remove(){}},style:{},append(){}}),
};
const window = { matchMedia:()=>({matches:false}), addEventListener(){}, innerWidth:900 };
const sandbox = { window, document, localStorage:{getItem:()=>null,setItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){}}, console,
  Date, setInterval(){}, clearInterval(){}, setTimeout, clearTimeout };
const exposed = source.replace("  void initialise();", "  globalThis.__hgrTest = { normaliseOperation, setOperation };");
assert.notEqual(exposed, source, "Could not expose actual Control functions for the isolated regression test.");
vm.runInNewContext(exposed, sandbox);
const control = sandbox.__hgrTest;
assert.ok(control, "Control must expose operation functions in isolated test VM.");
for(const action of ["start", "restart", "close"]) {
  const value = control.normaliseOperation({
    id:"test-"+action, action, title:action+" HGR window",
    phase:"Waiting for owner PC", state:"running", progress:42,
    startedAt:"2026-10-29T00:00:00Z", updatedAt:"2026-10-29T00:00:00Z",
  });
  control.setOperation(value);
  assert.equal(el("operationToast").dataset.action, action);
  assert.equal(el("operationPercent").hidden, true, action+" should never display an Update percent.");
  assert.equal(el("operationProgressTrack").hidden, true, action+" should never display an Update progress bar.");
  assert.equal(el("operationProgressBar").style.width, "0%", action+" should not animate the software updater.");
  assert.doesNotMatch(el("operationTitle").textContent, /updat/i, action + " must not be labeled Update.");
  control.setOperation(control.normaliseOperation({id:"done-"+action,action,title:action+" HGR window",state:"succeeded",progress:100}));
  assert.match(el("operationTitle").textContent, new RegExp(action === "start"?"Open":action === "restart"?"Restart":"Close"), action);
}
const update = control.normaliseOperation({ id:"test-update",action:"update",
  title:"Update HGR",phase:"Installing build",state:"running",progress:42 });
control.setOperation(update);
assert.equal(el("operationToast").dataset.action,"update");
assert.equal(el("operationPercent").hidden,false);
assert.equal(el("operationProgressTrack").hidden,false);
assert.equal(el("operationProgressBar").style.width,"42%");
assert.equal(el("operationPercent").textContent,"42%");
assert.equal(el("operationProgressTrack").attrs["aria-valuenow"], "42");
assert.equal(el("operationProgressTrack").attrs["aria-hidden"], "false");
control.setOperation(control.normaliseOperation({
  id:"old-failed-update",action:"update",title:"Update HGR",phase:"Publishing",
  state:"failed",progress:88,reason:"Oracle local health was unavailable",
  startedAt:"2026-10-31T01:43:00Z",updatedAt:"2026-10-31T01:53:00Z",
}));
assert.equal(el("operationTitle").textContent,"Last update attempt failed",
  "The historical failed attempt must not be presented as the live site status");
assert.equal(el("operationProgressBar").style.width,"88%",
  "A failed operation must retain actual reported progress, not invent 100%");

const unknown = control.normaliseOperation({ id:"unknown",title:"unknown",phase:"Unknown",state:"running",progress:99 });
control.setOperation(unknown);
assert.equal(el("operationToast").dataset.action,"unknown");
assert.equal(el("operationProgressTrack").hidden,true,"Missing action must never be interpreted as an Update.");
assert.equal(el("operationProgressTrack").attrs["aria-hidden"],"true");
console.log("PASS HGR Control: Open/Restart/Close render no Update spinner or progress bar; Update alone displays percentages, missing action cannot impersonate updater.");
