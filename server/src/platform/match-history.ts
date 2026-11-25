import { resolve } from "node:path";
import { getSessionDataDirectory } from "./dataPaths.js";
import { readFinalisedSessionSummaries } from "./finalisedSessionSummaries.js";
import type { HistoricalMatchEntry, HistoricalMatchPage, HistoryMatchStatus } from "../../../shared/platform/match-history.js";
const STATUSES = new Set<HistoryMatchStatus>(["completed","forfeit-completed","host-ended","incomplete"]);
type Query = {game?:string;offset?:number;limit?:number};
/** Internal projection of verified account-owned archive metadata. Never expose
 * raw archive state, account IDs, room credentials, hidden cards or activity.
 * Unknown legacy identity is NOT inferred from display name. */
export function projectHistoricalMatches(records: readonly any[], accountId: string, query: Query = {}): HistoricalMatchPage {
  if(typeof accountId!=="string"||!accountId.trim()) throw new Error("Authenticated account required");
  const offset=query.offset??0, limit=query.limit??30;
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>100) throw new Error("Invalid history pagination");
  const entries: HistoricalMatchEntry[]=[];
  const seen = new Set<string>();
  // Sorting an independent array keeps shared summary cache immutable.
  const sorted=[...records].sort((a,b)=>Number(b?.finalisedAt)-Number(a?.finalisedAt)||String(a?.sessionId).localeCompare(String(b?.sessionId)));
  for(const record of sorted){
    if(typeof record?.sessionId!=="string"||!record.sessionId||seen.has(record.sessionId)||typeof record.game!=="string"||!record.game||!STATUSES.has(record.status)||!Number.isSafeInteger(record.finalisedAt)||record.finalisedAt<=0)continue;
    if(query.game&&record.game!==query.game)continue;
    const state=record.state?.gameState??record.state;
    if(!Array.isArray(state?.players))continue;
    const self=state.players.find((p:any)=>!p.isAi&&p.progressionIdentity?.accountId===accountId);
    if(!self)continue;
    const isComplete=record.status==="completed"||record.status==="forfeit-completed";
    const winner=state.winnerPlayerId??state.outcome?.winnerPlayerId;
    const own=String(self.result??"").toLowerCase();
    const result:HistoricalMatchEntry["result"]=!isComplete?"unrecorded":
      winner!=null?(winner===self.id?"win":"loss"):
      ["winner","winning team","won","win"].includes(own)?"win":
      ["lost","loss","loser"].includes(own)?"loss":
      ["draw","tie"].includes(own)?"draw":"unrecorded";
    const mode=typeof state.matchMode==="string"?state.matchMode:
      typeof record.summary?.matchMode==="string"?record.summary.matchMode:
      state.ranked===true?"ranked":state.ranked===false?"casual":null;
    seen.add(record.sessionId);
    entries.push({matchId:record.sessionId,game:record.game,finishedAt:record.finalisedAt,status:record.status,mode,
      players:state.players.map((p:any)=>({name:String(p.name??"Player"),ai:Boolean(p.isAi),self:p===self})),
      result,replay:"not-assessed"});
  }
  return {entries:entries.slice(offset,offset+limit),total:entries.length,offset,nextOffset:offset+limit<entries.length?offset+limit:null};
}
/** Strict archive read: do not misrepresent a broken/partial catalogue as a
 * complete history. Cached compact summaries are shared with progression. */
export async function readHistoricalMatches(accountId:string,query:Query={}):Promise<HistoricalMatchPage>{
  const records=await readFinalisedSessionSummaries([resolve(getSessionDataDirectory(),"finalized")],{strict:true});
  return projectHistoricalMatches(records,accountId,query);
}
