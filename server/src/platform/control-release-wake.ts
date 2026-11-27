import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

const WINDOW_MS = 5 * 60_000;
const MAX_RECENT_EVENTS = 256;
type WakeEvent = { runId: string; attempt: string; sha: string; sentAt: number };

function parseEvent(body: unknown): WakeEvent | null {
 if (!body || typeof body !== "object" || Array.isArray(body)) return null;
 const event = body as Record<string,unknown>;
 if (Object.keys(event).sort().join(",") !== "attempt,runId,sentAt,sha" ||
     typeof event.runId !== "string" || !/^[1-9][0-9]{0,19}$/.test(event.runId) ||
     typeof event.attempt !== "string" || !/^[1-9][0-9]{0,5}$/.test(event.attempt) ||
     typeof event.sha !== "string" || !/^[a-f0-9]{40}$/.test(event.sha) ||
     typeof event.sentAt !== "number" || !Number.isSafeInteger(event.sentAt)) return null;
 return { runId:event.runId, attempt:event.attempt, sha:event.sha, sentAt:event.sentAt };
}
export function signReleaseWake(event: WakeEvent, secret: string): string {
 return createHmac("sha256",secret).update(JSON.stringify(event)).digest("hex");
}
/** Authenticated wake-up only: the supplied SHA never authorizes a release or deployment. */
export function createReleaseWakeHandler(wake:()=>boolean, readSecret=()=>process.env.HGR_RELEASE_WAKE_SECRET, now=Date.now) {
 const recent = new Map<string,number>();
 return (req:Request,res:Response):void=>{
  res.setHeader("Cache-Control","no-store");
  const secret=readSecret();
  if (!secret || secret.length<32) {res.status(503).json({ok:false});return;}
  const event=parseEvent(req.body);
  const signature=req.get("x-hgr-release-signature")??"";
  const time=now();
  if (!event || Math.abs(time-event.sentAt)>WINDOW_MS || !/^[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(Buffer.from(signature,"hex"),Buffer.from(signReleaseWake(event,secret),"hex"))) {
   res.status(401).json({ok:false});return;
  }
  for (const [key,expires] of recent) if (expires<time) recent.delete(key);
  const key=event.runId+":"+event.attempt;
  if (recent.has(key)) {res.status(202).json({ok:true});return;}
  if (recent.size>=MAX_RECENT_EVENTS || !wake()) {res.status(503).json({ok:false});return;}
  recent.set(key,Math.max(time,event.sentAt)+WINDOW_MS);
  res.status(202).json({ok:true});
 };
}
