import assert from "node:assert/strict";
import express from "express";
import {createReleaseWakeHandler,signReleaseWake} from "../server/src/platform/control-release-wake.ts";
import {createReleaseAlertScheduler} from "../server/src/platform/control-release-alerts.ts";
const time=Date.now(),secret="fixture-only-not-a-real-secret-".repeat(2);
let configured=secret,wakes=0,ready=true;
const app=express();
app.post("/wake",express.json({limit:"2kb"}),createReleaseWakeHandler(()=>{if(!ready)return false;wakes++;return true;},()=>configured,()=>time));
const server=app.listen(0,"127.0.0.1");
await new Promise(resolve=>server.once("listening",resolve));
const url="http://127.0.0.1:"+server.address().port+"/wake";
const event={runId:"12345",attempt:"1",sha:"a".repeat(40),sentAt:time};
async function send(body=event,signature=signReleaseWake(body,secret)){
 const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json","x-hgr-release-signature":signature},body:JSON.stringify(body)});
 return res.status;
}
try {
 assert.equal(await send(event,"0".repeat(64)),401);
 assert.equal(await send({...event,sentAt:time-300001}),401);
 assert.equal(await send({...event,sha:"bad"}),401);
 assert.equal(await send({...event,extra:"untrusted"}),401);
 assert.equal(await send({...event,attempt:"2"},signReleaseWake(event,secret)),401);
 assert.equal(wakes,0);
 configured=undefined;assert.equal(await send(),503);configured=secret;
 ready=false;assert.equal(await send(),503);ready=true;
 assert.equal(await send(),202);assert.equal(await send(),202);assert.equal(wakes,1);
 assert.equal(await send({...event,attempt:"2"}),202);assert.equal(wakes,2);
 let releasePoll,releaseWake;
 const calls=[],reports=[];
 const scheduler=createReleaseAlertScheduler(fresh=>{calls.push(fresh);return new Promise(resolve=>{if(fresh)releaseWake=resolve;else releasePoll=resolve;});},(elapsed,count)=>reports.push({elapsed,count}));
 scheduler.poll();scheduler.poll();assert.deepEqual(calls,[false]);
 assert.equal(scheduler.wake(),true);assert.equal(scheduler.wake(),true);assert.deepEqual(calls,[false]);
 releasePoll(0);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[false,true]);
 releaseWake(2);await new Promise(resolve=>setImmediate(resolve));assert.equal(reports.length,1);assert.equal(reports[0].count,2);assert.ok(reports[0].elapsed>=0);
 scheduler.stop();assert.equal(scheduler.wake(),false);scheduler.poll();assert.deepEqual(calls,[false,true]);
 console.log("PASS signed release wake: authentication, time bound, replay, readiness, coalesced fresh verification and gateway count");
}finally{await new Promise(resolve=>server.close(resolve));}
