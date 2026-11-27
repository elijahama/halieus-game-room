import { estimateControlUpdate, type UpdateTaskState } from "./control-update-progress.js";

export const ISOLATED_TASK_LABELS = [
 "Fetch canonical main", "Verify published fingerprint", "Install dependencies",
 "Security audit", "Client/server typecheck", "Production build", "Platform regressions",
 "Oracle package preflight", "Final fingerprint", "Oracle deployment and verification", "Final receipt",
] as const;
export interface IsolatedTaskTelemetry {
 schema: 1; operationId: string; sequence: number; observedAt: string;
 tasks: { id:number; label:string; state:UpdateTaskState; startedAt:string|null; finishedAt:string|null }[];
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const timestamp=(v:unknown)=>typeof v==="string"&&v.length<=40&&Number.isFinite(Date.parse(v));
export function validateIsolatedTaskTelemetry(value:unknown,operationId:string|null):IsolatedTaskTelemetry|null {
 if(!record(value)||value.schema!==1||!operationId||value.operationId!==operationId||
    !/^[A-Za-z0-9_-]{8,80}$/.test(operationId)||typeof value.sequence!=="number"||
    !Number.isSafeInteger(value.sequence)||value.sequence<0||value.sequence>24||
    !timestamp(value.observedAt)||!Array.isArray(value.tasks)||value.tasks.length!==11)return null;
 const observedAt=value.observedAt as string;
 const tasks:IsolatedTaskTelemetry["tasks"]=[];
 let unresolved=false, skipped=false, transitions=0;
 for(let i=0;i<11;i++){
  const item=value.tasks[i];
  if(!record(item)||item.id!==i+1||item.label!==ISOLATED_TASK_LABELS[i]||
     !["queued","running","passed","failed","skipped"].includes(String(item.state)))return null;
  const state=item.state as UpdateTaskState;
  if(unresolved&&state!=="queued")return null;
  if(state==="skipped"&&(i<2||i===10||i>2&&!skipped))return null;
  if(skipped&&i<10&&state!=="skipped"&&state!=="queued")return null;
  const startedAt=item.startedAt,finishedAt=item.finishedAt;
  if(state==="queued"?(startedAt!==null||finishedAt!==null):
     state==="skipped"?(startedAt!==null||!timestamp(finishedAt)):
     !timestamp(startedAt)||(state==="running"?finishedAt!==null:!timestamp(finishedAt)))return null;
  if(typeof startedAt==="string"&&Date.parse(startedAt)>Date.parse(observedAt)||
     typeof finishedAt==="string"&&(Date.parse(finishedAt)>Date.parse(observedAt)||
        typeof startedAt==="string"&&Date.parse(finishedAt)<Date.parse(startedAt)))return null;
  transitions+=state==="queued"?0:state==="passed"||state==="failed"?2:1;
  unresolved ||= state==="queued"||state==="running"||state==="failed";
  skipped ||= state==="skipped";
  tasks.push({id:i+1,label:ISOLATED_TASK_LABELS[i],state,startedAt:startedAt as string|null,finishedAt:finishedAt as string|null});
 }
 if(transitions!==value.sequence)return null;
 return {schema:1,operationId,sequence:value.sequence,observedAt,tasks};
}
export function isolatedTaskPercent(snapshot:IsolatedTaskTelemetry,state:"running"|"succeeded"|"failed"|"rejected") {
 const observedAtMs=Date.parse(snapshot.observedAt);
 return estimateControlUpdate({
  tasks:snapshot.tasks.map((task,i)=>({id:String(task.id),stage:i,historicalDurationsMs:[],allowSkip:i>=2&&i<10})),
  observations:snapshot.tasks.map(task=>({id:String(task.id),state:task.state,...(task.startedAt?{startedAtMs:Date.parse(task.startedAt)}:{})})),
  observedAtMs,nowMs:observedAtMs,staleAfterMs:30_000,operationState:state,finalReceiptVerified:state==="succeeded",
 }).percent;
}
/** Replayed identical snapshots can be acknowledged; stale or changed sequence cannot replace evidence. */
export function acceptIsolatedTaskTelemetry(previous:IsolatedTaskTelemetry|undefined,next:IsolatedTaskTelemetry):boolean {
 if(!previous)return true;
 if(previous.operationId!==next.operationId||next.sequence<previous.sequence||Date.parse(next.observedAt)<Date.parse(previous.observedAt))return false;
 if(next.sequence===previous.sequence)return JSON.stringify(previous)===JSON.stringify(next);
 return previous.tasks.every((task,i)=>{
  const n=next.tasks[i];
  if(task.state==="passed"||task.state==="failed"||task.state==="skipped")return JSON.stringify(task)===JSON.stringify(n);
  if(task.state==="running")return n.startedAt===task.startedAt&&["running","passed","failed"].includes(n.state);
  return true;
 });
}
