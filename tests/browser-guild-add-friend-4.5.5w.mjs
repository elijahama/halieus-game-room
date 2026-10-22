import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const client = join(root, "client");
const port = 39589, base = "http://127.0.0.1:" + port;
const prefix = "__hgr_guild_friends_" + process.pid;
const htmlFile = join(client, prefix + ".html");
const appFile = join(client, prefix + ".tsx");
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/' + prefix + '.tsx"></script></body></html>';
const app = [
  'import React from "react";',
  'import {createRoot} from "react-dom/client";',
  'import {GuildsPanel} from "./src/platform/components/GuildsPanel";',
  'import "./src/styles/hgr-design-v1.css";',
  'const account={id:"owner-1",username:"owner",displayName:"Owner",role:"player",status:"active",avatar:"O",profilePicture:null,playerColor:"#123456",createdAt:1,lastLoginAt:1,createdViaInviteLabel:null,visibility:"visible"};',
  'createRoot(document.getElementById("app")).render(<GuildsPanel account={account} liveRooms={[]} onBackToPlayers={()=>{window.__backToFriends=true;}} onCreateRoom={()=>{}} onOpenLiveRoom={()=>{}} />);',
].join("\n");
const members = [
  ["owner-1", "owner", "Owner", "owner"],
  ["accepted-2", "accepted", "Already Friend", "member"],
  ["outgoing-3", "outgoing", "Pending Outgoing", "member"],
  ["incoming-4", "incoming", "Pending Incoming", "member"],
  ["eligible-5", "eligible", "New Guild Mate", "member"],
].map(([accountId,username,displayName,role]) => ({
  accountId, username, displayName, role,
  avatar:displayName[0],profilePicture:null,playerColor:"#123456",joinedAt:1728000000000,
}));
const guild = {
  id:"guild-one",name:"Example Guild",description:"Test guild",picture:null,
  createdAt:1,updatedAt:1,role:"owner",memberCount:members.length,roomCount:0,
  roomCreationPolicy:"members",canManage:false,canCreateRooms:true,inviteCode:null,
  members,rooms:[],messages:[],leaderboard:[],pendingInvitations:[],
};
const request = (id,senderAccountId,recipientAccountId) => ({
  id,senderAccountId,recipientAccountId,status:"pending",createdAt:1,respondedAt:null,
  senderDisplayName:"Test sender",senderUsername:"sender",
  recipientDisplayName:"Test receiver",recipientUsername:"recipient",
});
let browser, preview;
try {
  await writeFile(htmlFile, html);
  await writeFile(appFile, app);
  preview = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"),
    "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {cwd:client,stdio:"pipe"});
  let ready = false;
  for(let i=0;i<90;i++){
    try{if((await fetch(base+"/"+prefix+".html")).ok){ready=true;break;}}catch{}
    if(preview.exitCode!==null)break;
    await new Promise(done=>setTimeout(done,150));
  }
  assert.ok(ready, "Guild friend Vite harness failed to launch");
  browser=await chromium.launch({headless:true});
  for (const width of [320,390,820]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[]; page.on("pageerror", e=>errors.push(e.message));
    let sends=0;
    const requests=[
      request("outgoing-request","owner-1","outgoing-3"),
      request("incoming-request","incoming-4","owner-1"),
    ];
    await page.route("**/*", async route => {
      const url=new URL(route.request().url());
      const path=url.pathname, method=route.request().method();
      let value;
      if (method==="GET" && path==="/guilds") value={ok:true,guilds:[guild]};
      if (method==="GET" && path==="/guilds/invitations") value={ok:true,invitations:[]};
      if (method==="GET" && path==="/guilds/guild-one") value={ok:true,guild};
      if (method==="GET" && path==="/accounts/directory") value={ok:true,players:[]};
      if (method==="GET" && path==="/accounts/friends") value={ok:true,friendIds:["accepted-2"],requests};
      if (method==="POST" && path==="/accounts/friends/requests") {
        const body=route.request().postDataJSON();
        assert.deepEqual(body,{handle:"@eligible"},"Use existing exact handle friend-request endpoint");
        sends++;
        const added=request("new-request","owner-1","eligible-5");
        requests.push(added);
        value={ok:true,request:added};
      }
      if (value) return route.fulfill({status:method==="POST"?201:200,contentType:"application/json",body:JSON.stringify(value)});
      return route.continue();
    });
    await page.goto(base+"/"+prefix+".html",{waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:"Members",exact:true}).click();
    const row=name=>page.locator(".halieus-guild-member-row").filter({hasText:name});
    await row("New Guild Mate").getByRole("button",{name:"+ Add friend"}).waitFor();
    assert.equal(await row("Owner").getByRole("button",{name:"+ Add friend"}).count(),0,"No self-add action");
    assert.equal(await row("Already Friend").getByText("Friends",{exact:true}).isVisible(),true);
    assert.equal(await row("Already Friend").getByRole("button",{name:"+ Add friend"}).count(),0,"Accepted friend cannot be re-requested");
    assert.equal(await row("Pending Outgoing").getByText("Pending",{exact:true}).isVisible(),true);
    assert.equal(await row("Pending Incoming").getByRole("button",{name:"Review request"}).isVisible(),true);
    const action=row("New Guild Mate").getByRole("button",{name:"+ Add friend"});
    assert.equal(await action.isEnabled(),true);
    const geometry=await row("New Guild Mate").evaluate(el=>{
      const a=el.getBoundingClientRect();
      const b=el.querySelector(".halieus-guild-friend-action").getBoundingClientRect();
      return {left:a.left,right:a.right,buttonHeight:b.height,buttonRight:b.right,viewport:innerWidth};
    });
    assert.ok(geometry.buttonHeight>=44,"Tap action below 44px: "+JSON.stringify(geometry));
    assert.ok(geometry.buttonRight<=width+1,"Action clipped on phone: "+JSON.stringify(geometry));
    await action.click();
    await row("New Guild Mate").getByText("Pending",{exact:true}).waitFor();
    assert.equal(sends,1,"One authorized request; no duplicate");
    assert.equal(await row("New Guild Mate").getByRole("button",{name:"+ Add friend"}).count(),0,"Pending disables repeat");
    await row("Pending Incoming").getByRole("button",{name:"Review request"}).click();
    assert.equal(await page.evaluate(()=>window.__backToFriends),true,"Incoming request opens Friends");
    assert.deepEqual(errors,[],"No page errors "+width);
    console.log("PASS 4.5.5w guild friend action at "+width+"px: self, accepted, pending, incoming, send and repeat safety");
    await page.close();
  }
} finally {
  await browser?.close();
  preview?.kill("SIGTERM");
  await rm(htmlFile,{force:true});
  await rm(appFile,{force:true});
}
