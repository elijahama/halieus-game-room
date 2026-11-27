import assert from "node:assert/strict";
import { estimateControlUpdate } from "../shared/platform/control-update-progress.ts";
const tasks = [
  {id:"fetch",stage:0,historicalDurationsMs:[1000,1000,2000]},
  {id:"typecheck",stage:1,historicalDurationsMs:[9000,10000,11000]},
  {id:"tests",stage:1,historicalDurationsMs:[19000,20000,21000]},
  {id:"verify",stage:2,historicalDurationsMs:[1000,1000,1000]},
];
const input = {tasks,observations:[],observedAtMs:1000,nowMs:1000,staleAfterMs:30000,operationState:"running",finalReceiptVerified:false};
const calc = (overrides={}) => estimateControlUpdate({...input,...overrides});
assert.equal(calc().eta.remainingMs,22000,"parallel stage estimates count longest path, not both durations");
assert.equal(calc().weightBasis,"historical");
const active = [{id:"fetch",state:"passed"},{id:"typecheck",state:"running",startedAtMs:1000},{id:"tests",state:"running",startedAtMs:1000}];
const start = calc({observations:active});
const later = calc({observations:active,nowMs:6000});
assert.equal(start.percent,later.percent,"Elapsed time cannot create verified progress");
assert.deepEqual(later.active,["typecheck","tests"]);
assert.equal(later.eta.remainingMs,16000);
const measured = [{...active[0]},{...active[1],units:{completed:5,total:10}},{...active[2],units:{completed:2,total:10}}];
const partial = calc({observations:measured,observedAtMs:6000,nowMs:6000});
assert.ok(partial.percent>start.percent);
assert.equal(partial.eta.remainingMs,21000,"actual task throughput can increase estimate");
const late = calc({observations:active,observedAtMs:25000,nowMs:25000});
assert.equal(late.percent,start.percent);
assert.deepEqual(late.eta,{status:"overrun",remainingMs:null});
assert.deepEqual(calc({observations:active,nowMs:32000}).eta,{status:"stale",remainingMs:null});
const finished = tasks.map(({id})=>({id,state:"passed"}));
assert.equal(calc({observations:finished}).percent,99);
assert.equal(calc({observations:finished,operationState:"succeeded"}).percent,99);
assert.equal(calc({observations:finished,operationState:"succeeded",finalReceiptVerified:true}).percent,100);
assert.equal(calc({observations:active,operationState:"succeeded",finalReceiptVerified:true}).percent,start.percent);
const cold = tasks.map(task=>({...task,historicalDurationsMs:[]}));
assert.equal(calc({tasks:cold}).weightBasis,"task-count");
assert.deepEqual(calc({tasks:cold}).eta,{status:"calculating",remainingMs:null});
assert.equal(calc({tasks:cold,observations:[{id:"fetch",state:"passed"}]}).percent,25);
assert.throws(()=>calc({observations:[{id:"fetch",state:"skipped"}]}),/unauthorized/);
assert.throws(()=>calc({observations:[{id:"unknown",state:"passed"}]}),/unknown/);
const optional=tasks.map(task=>task.id==="fetch"?{...task,allowSkip:true}:task);
assert.equal(calc({tasks:optional,observations:[{id:"fetch",state:"skipped"}]}).skipped,1);
assert.equal(calc({observations:[{id:"fetch",state:"failed"}]}).eta.status,"unavailable");
assert.equal(calc({observations:[{id:"fetch",state:"running",startedAtMs:0,units:{completed:200,total:10}}]}).percent,0);
assert.equal(calc({observations:[{id:"fetch",state:"running",startedAtMs:0,units:{completed:10,total:10}}]}).percent,3,"units alone never finish a task");
assert.throws(()=>calc({observedAtMs:2000,nowMs:1000}),/timing/);
console.log("PASS Control update progress: actual task evidence, history/units ETA, parallel stages, overrun, stale, cold start, skip/failure and receipt gate");
