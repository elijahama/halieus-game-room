import { currentReleaseAvailability, RELEASE_AVAILABILITY_TTL_MS, type ReleaseAvailability } from "./control-release-availability.js";
import { sendControlReleaseAvailable } from "./pushNotifications.js";
/** One process-local worker; verified releases only, no deployment actions. */
export function createControlReleaseAlertCheck(
 isAdmin:(id:string)=>boolean,
 read:(fresh?:boolean)=>Promise<ReleaseAvailability>=(fresh=false)=>currentReleaseAvailability(fetch,Date.now(),fresh),
 deliver:typeof sendControlReleaseAvailable=sendControlReleaseAvailable,
){
 let running=false;
 return async (fresh=false):Promise<number>=>{
  if(running)return 0;
  running=true;
  try{const release=await read(fresh);return release.status==="available"?await deliver(release,isAdmin):0;}
  finally{running=false;}
 };
}
/** Coalesce a completion event arriving during an earlier poll; always run a fresh follow-up. */
export function createReleaseAlertScheduler(check:(fresh:boolean)=>Promise<number>, report:(elapsed:number,count:number)=>void=()=>{}, warn=()=>console.warn("[HGR] Verified release alert check unavailable; will retry.")){
 let running=false, queuedAt:number|null=null, stopped=false;
 async function drain(fresh:boolean, eventAt:number|null){
  if(stopped)return;
  running=true;
  try{const count=await check(fresh);if(eventAt!==null)report(Date.now()-eventAt,count);}
  catch{warn();}
  finally{
   running=false;
   if(!stopped&&queuedAt!==null){const at=queuedAt;queuedAt=null;void drain(true,at);}
  }
 }
 return {
  poll:()=>{if(!running&&!stopped)void drain(false,null);},
  wake:()=>{if(stopped)return false;const at=Date.now();if(running){queuedAt??=at;}else void drain(true,at);return true;},
  stop:()=>{stopped=true;queuedAt=null;},
 };
}
export function startControlReleaseAlerts(isAdmin:(id:string)=>boolean){
 const scheduler=createReleaseAlertScheduler(createControlReleaseAlertCheck(isAdmin),
  (elapsed,count)=>console.info("[HGR] Release wake verified/check completed in "+elapsed+"ms; gateway accepted "+count+" new notification(s)."));
 const timer=setInterval(scheduler.poll,RELEASE_AVAILABILITY_TTL_MS);timer.unref();
 scheduler.poll();
 return {wake:scheduler.wake,stop:()=>{clearInterval(timer);scheduler.stop();}};
}
