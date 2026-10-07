import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { expireUnreportedUpdates } from '../server/src/platform/control-operation-recovery.ts';

const now=Date.now(), old=new Date(now-56*60*1000).toISOString();
const entries=['running','succeeded','failed','queued'].map(state=>({state,updatedAt:old,phase:'original',reason:null}));
entries.push({state:'running',updatedAt:new Date(now-1000).toISOString(),phase:'fresh',reason:null});
expireUnreportedUpdates(entries,now);
assert.equal(entries[0].state,'failed');
assert.match(entries[0].reason,/could not be confirmed/);
assert.deepEqual(entries.slice(1).map(e=>e.state),['succeeded','failed','queued','running']);
const unchanged=JSON.stringify(entries);expireUnreportedUpdates(entries,now+1000);assert.equal(JSON.stringify(entries),unchanged);

// Execute the actual observer and restart recovery functions with isolated I/O.
const source=await readFile(new URL('../server/src/control-cloud-agent.ts',import.meta.url),'utf8');
const observer=source.slice(source.indexOf('async function waitForUpdateResult('),source.indexOf('async function executeUpdate('));
const recovery=source.slice(source.indexOf('async function resumePendingUpdate('),source.indexOf('async function cycle('));
let marker={state:'succeeded',startedAt:'new'},delivered=false,removed=0,reports=[],stopAfterDelay=true;
const pending={requestId:'cloud-original',localOperationId:'local-original',markerStartedBefore:'old',deadline:now+60000};
const ctx=vm.createContext({Date,Number,Boolean,Math,JSON,console,stopping:false,inFlightRequestId:null,pendingPath:'fixture',
 readFile:async()=>JSON.stringify(pending),rm:async()=>{removed++},readUpdateMarker:async()=>marker,
 localAuditFailureReason:async()=>null,localStatus:async()=>null,delay:async()=>{if(stopAfterDelay)ctx.stopping=true},
 reportProgress:async(...args)=>{reports.push(args);return delivered}});
vm.runInContext(ts.transpile(observer+recovery,{target:ts.ScriptTarget.ES2022}),ctx);
await ctx.resumePendingUpdate({});await new Promise(setImmediate);
assert.equal(removed,0,'Unacknowledged terminal report must retain journal');
assert.equal(reports[0][1],'cloud-original');assert.equal(reports[0][6],'local-original');
ctx.stopping=false;stopAfterDelay=false;delivered=true;await ctx.resumePendingUpdate({});await new Promise(setImmediate);
assert.equal(removed,1,'Acknowledged recovery clears journal');assert.equal(reports[1][2],'succeeded');
marker={state:'failed',startedAt:'new',reason:'updater failed'};
await ctx.waitForUpdateResult({},'c','l','old',now+60000);
assert.equal(reports.at(-1)[2],'failed');assert.equal(reports.at(-1)[5],'updater failed');
marker={state:'running',startedAt:'new'};
await ctx.waitForUpdateResult({},'c','l','old',now-1);
assert.equal(reports.at(-1)[4],'Update status timed out');
ctx.stopping=true;const before=reports.length;
assert.equal(await ctx.waitForUpdateResult({},'c','l','old',now+60000),false);
assert.equal(reports.length,before,'Shutdown preserves journal without inventing a result');

const durableReports=[];
const durableCtx=vm.createContext({Date,Number,Boolean,Math,JSON,console,stopping:false,
 readUpdateMarker:async()=>({state:'running',startedAt:'new',progress:54,phase:'Oracle package preflight'}),
 localAuditFailureReason:async()=>null,localStatus:async()=>null,
 delay:async()=>{durableCtx.stopping=true},
 reportProgress:async(...args)=>{durableReports.push(args);return true}});
vm.runInContext(ts.transpile(observer,{target:ts.ScriptTarget.ES2022}),durableCtx);
assert.equal(await durableCtx.waitForUpdateResult({},'cloud-durable','local-durable','old',now+60000),false);
assert.equal(durableReports.length,1,'Persistent marker progress should report without an in-memory local operation');
assert.equal(durableReports[0][2],'running');
assert.equal(durableReports[0][3],54);
assert.equal(durableReports[0][4],'Oracle package preflight');

const retryReports=[];let retryAttempts=0;
const retryCtx=vm.createContext({Date,Number,Boolean,Math,JSON,console,stopping:false,
 readUpdateMarker:async()=>({state:'running',startedAt:'new',progress:70,phase:'Final release identity'}),
 localAuditFailureReason:async()=>null,localStatus:async()=>null,
 delay:async()=>{if(retryAttempts>=2)retryCtx.stopping=true},
 reportProgress:async(...args)=>{retryReports.push(args);retryAttempts++;return retryAttempts>=2}});
vm.runInContext(ts.transpile(observer,{target:ts.ScriptTarget.ES2022}),retryCtx);
assert.equal(await retryCtx.waitForUpdateResult({},'cloud-retry','local-retry','old',now+60000),false);
assert.equal(retryReports.length,2,'A dropped running progress report must be retried');
assert.equal(retryReports[0][3],70);
assert.equal(retryReports[1][3],70);
assert.equal(retryReports[1][4],'Final release identity');

console.log('PASS Control update restart recovery, retryable progress delivery, expiry and truthful terminal states');
