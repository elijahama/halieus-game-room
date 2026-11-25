import { currentReleaseAvailability, RELEASE_AVAILABILITY_TTL_MS, type ReleaseAvailability } from "./control-release-availability.js";
import { sendControlReleaseAvailable } from "./pushNotifications.js";
/** One process-local worker; verified releases only, no deployment actions. */
export function createControlReleaseAlertCheck(
 isAdmin:(id:string)=>boolean,
 read:()=>Promise<ReleaseAvailability>=currentReleaseAvailability,
 deliver:typeof sendControlReleaseAvailable=sendControlReleaseAvailable,
){
 let running=false;
 return async ():Promise<number>=>{
  if(running)return 0;
  running=true;
  try{const release=await read();return release.status==="available"?await deliver(release,isAdmin):0;}
  finally{running=false;}
 };
}
export function startControlReleaseAlerts(isAdmin:(id:string)=>boolean):()=>void{
 const check=createControlReleaseAlertCheck(isAdmin);
 const tick=()=>{void check().catch(()=>console.warn("[HGR] Verified release alert check unavailable; will retry."));};
 const timer=setInterval(tick,RELEASE_AVAILABILITY_TTL_MS);timer.unref();
 tick();
 return ()=>clearInterval(timer);
}
