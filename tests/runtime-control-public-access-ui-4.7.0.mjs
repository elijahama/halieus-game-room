import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const script = await readFile(new URL("../client/public/control/control.js", import.meta.url), "utf8");
const accountRoutes = await readFile(new URL("../server/src/platform/accounts.ts", import.meta.url), "utf8");
const html = await readFile(new URL("../client/public/control/index.html", import.meta.url), "utf8");
assert.match(accountRoutes, /const expected = closed \? "CLOSE PUBLIC GAME ROOM" : "REOPEN PUBLIC GAME ROOM"/);
assert.match(accountRoutes, /getRoomCount\(\)/);
assert.match(accountRoutes, /Cross-site public access changes are forbidden/);
assert.match(html, /id="publicAccessReason"/);
assert.match(html, /id="publicAccessToggle"/);
assert.doesNotMatch(script.slice(script.indexOf("async function togglePublicAccess()"),
  script.indexOf("function bindUi()")), /window\.prompt/,
  "Do not silently cancel maintenance when an owner types the reason in an extra confirmation prompt.");

let closed = false;
let httpStatus = 503;
let gatePath = null;
let mutationBodies = [];
let confirmations = [];
let promptCalled = false;
const elements = new Map();
function el(id) {
  if (!elements.has(id)) elements.set(id, { id, hidden: false, disabled: false,
    textContent:"", value:"", title:"", dataset:{}, style:{},
    setAttribute(){}, classList:{ contains:()=>false, add(){},remove(){} } });
  return elements.get(id);
}
el("publicAccessReason").value = "This is a test closure ⚠️";
el("publicAccessDuration").value = "60";
const fetch = async (url,options={}) => {
  if (url === "/admin/public-access" && !options.method) {
    return { ok:true,status:200,json:async()=>({ ok:true,state:{closed,reason:el("publicAccessReason").value},
      activeRooms:0 }) };
  }
  if (url === "/admin/public-access" && options.method==="POST") {
    const body=JSON.parse(options.body);
    mutationBodies.push(body);
    if (body.confirmation !== (body.state==="closed"?"CLOSE PUBLIC GAME ROOM":"REOPEN PUBLIC GAME ROOM")) {
      return {ok:false,status:409,json:async()=>({ok:false,reason:"Confirmation token mismatch"})};
    }
    closed=body.state==="closed";
    return {ok:true,status:200,json:async()=>({ok:true,state:{closed,reason:body.reason}})};
  }
  if (url.startsWith("/?hgr-public-access-check=")) {
    gatePath=url;
    return {ok:closed?false:true,status:closed?httpStatus:200,text:async()=>closed?"Maintenance":"HGR"};
  }
  throw Error("Unexpected fetch "+url);
};
const context={
  document:{getElementById:el, querySelector:()=>null, querySelectorAll:()=>[]},
  window:{confirm:(s)=>{confirmations.push(s);return true;},
    prompt:()=>{promptCalled=true;throw Error("Old prompt must not be used");}},
  fetch, console, Date,
  localStorage:{getItem:()=>null,setItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){}},
};
const exposed=script.replace("  void initialise();",
  '  globalThis.__testControl = { togglePublicAccess, refreshPublicAccess, setOwner: () => { state.account = { role:"owner" }; }, setGate: (gate) => { publicAccessState = gate; } };');
assert.notEqual(exposed,script);
vm.runInNewContext(exposed,context);
const control=context.__testControl;
control.setOwner();
control.setGate({closed:false});
await control.togglePublicAccess();
assert.equal(promptCalled,false);
assert.equal(mutationBodies[0].state,"closed");
assert.equal(mutationBodies[0].reason,"This is a test closure ⚠️");
assert.equal(mutationBodies[0].confirmation,"CLOSE PUBLIC GAME ROOM");
assert.ok(mutationBodies[0].reopenAt > Date.now() + 59 * 60_000, "One-hour closure sends a UTC deadline");
assert.ok(gatePath?.startsWith("/?hgr-public-access-check="));
assert.equal(closed,true);
assert.match(el("publicAccessStatus").textContent,/Verified: public website is serving HTTP 503 maintenance/);
assert.match(confirmations[0],/does NOT close the owner-PC window or run an Update/);

await control.togglePublicAccess();
assert.equal(mutationBodies[1].state,"open");
assert.equal(mutationBodies[1].confirmation,"REOPEN PUBLIC GAME ROOM");
assert.equal(mutationBodies[1].reopenAt, null, "Manual reopen clears expiry");
assert.equal(closed,false);
assert.match(el("publicAccessStatus").textContent,/Verified: public website has reopened/);

httpStatus=200;
el("publicAccessDuration").value = "manual";
await control.togglePublicAccess();
assert.equal(mutationBodies[2].reopenAt, null, "Manual closure remains indefinite");
assert.equal(closed,true,"The server did close, but the public gate probe disagrees.");
assert.match(el("publicAccessStatus").textContent,/website did not return its maintenance page/,
  "Never claim closure worked when reverse proxy still serves normal visitor HTML.");
console.log("PASS HGR 4.7 Control: explicit owner maintenance confirmation without duplicate reason prompt, correct close/reopen token, true visitor 503 verification, truthful probe failure.");
