import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
const root=await mkdtemp(path.join(tmpdir(),"hgr-feedback-notifications-"));
process.env.HALIEUS_DATA_DIR=root;
const {loadFeedbackStore,registerFeedbackRoutes}=await import("../server/src/platform/feedback.ts");
await loadFeedbackStore();
const app=express();app.use(express.json());
const resolve=req=>req.headers["x-role"]?{id:"test-"+req.headers["x-role"],role:req.headers["x-role"],displayName:"Tester",username:"tester"}:null;
registerFeedbackRoutes(app,resolve,req=>["owner","admin"].includes(req.headers["x-role"]));
const server=app.listen(0,"127.0.0.1");await new Promise(r=>server.once("listening",r));
const base="http://127.0.0.1:"+server.address().port;
async function api(url,role,body){
 const response=await fetch(base+url,{method:body?"POST":"GET",headers:{"Content-Type":"application/json",...(role?{"x-role":role}:{})},body:body?JSON.stringify(body):undefined});
 return {status:response.status,headers:response.headers,body:await response.json()};
}
try {
  assert.equal((await api("/admin/feedback/notifications")).status,403);
  assert.equal((await api("/admin/feedback/notifications","player")).status,403);
  assert.equal((await api("/admin/feedback/notifications","owner")).body.count,0);
  const first=await api("/feedback","player",{details:"Private feedback text",source:"profile"});
  const second=await api("/feedback","player",{details:"Private game feedback",source:"game",gameName:"Mega Board"});
  for(const role of ["admin","owner"]){
    const summary=await api("/admin/feedback/notifications",role);
    assert.equal(summary.body.count,2);
    assert.equal(summary.body.firstId,second.body.feedback.id);
    assert.equal(summary.headers.get("cache-control"),"no-store");
    assert(!JSON.stringify(summary.body).includes("Private"),"Notification contains no feedback contents");
  }
  const id=second.body.feedback.id;
  await api("/admin/feedback/"+id+"/status","owner",{status:"reviewing"});
  assert.equal((await api("/admin/feedback/notifications","owner")).body.count,2);
  await api("/admin/feedback/"+id+"/reply","owner",{message:"Thank you, fixed."});
  assert.equal((await api("/admin/feedback/notifications","owner")).body.count,1);
  await api("/admin/feedback/"+first.body.feedback.id+"/status","admin",{status:"closed"});
  assert.deepEqual((await api("/admin/feedback/notifications","owner")).body,{count:0,firstId:null});
  await api("/admin/feedback/"+id+"/status","owner",{status:"open"});
  await loadFeedbackStore();
  assert.equal((await api("/admin/feedback/notifications","owner")).body.count,1,"Reopened item persists across reload");
  assert.equal((await api("/admin/feedback","owner")).body.feedback[0].id,id,"Unanswered items appear before answered/closed");
  console.log("PASS admin feedback notification: role authorization, metadata-only count, both sources, reviewing, answer, close, reopen and persistence");
} finally {await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
