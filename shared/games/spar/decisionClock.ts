/** Server-side decision clock, independent of socket IDs, network activity and UI. */
export const SPAR_DECISION_MS=20_000;
export interface SparDecisionClock {key:string;deadline:number|null;remainingMs:number}
export function advanceSparDecisionClock(previous:SparDecisionClock|null,key:string|null,now:number,paused:boolean):SparDecisionClock|null{
 if(key===null)return null;
 const old=previous?.key===key?previous:null;
 const remainingMs=old?Math.max(0,old.deadline===null?old.remainingMs:old.deadline-now):SPAR_DECISION_MS;
 return {key,remainingMs,deadline:paused?null:old?.deadline??now+remainingMs};
}
export function sparDecisionExpired(clock:SparDecisionClock|null,now:number):boolean{
 return clock!==null&&clock.deadline!==null&&now>=clock.deadline;
}
