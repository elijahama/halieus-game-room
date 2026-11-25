import { eliminationMatchPlan, eliminationChampion, type EliminationMatch, type EliminationMatchId } from "./fourEntrantBracket.js";
export type WorkshopKind="solo"|"guild";
export type WorkshopBoard=0|1|2;
export type WorkshopChoice={matchId:EliminationMatchId;board:WorkshopBoard;winnerId:string};
export type WorkshopPlan=ReturnType<typeof eliminationMatchPlan>;
/** Pure local rehearsal using the official bracket dependency engine. No account IDs,
 * room bindings, API calls, real scores or production tournament receipts. */
export function buildWorkshop(kind:WorkshopKind,double:boolean,entrants:string[],choices:readonly WorkshopChoice[]){
 if(entrants.length!==4||new Set(entrants).size!==4||entrants.some(id=>!id))throw new Error("Four distinct workshop entrants required");
 const receipts:EliminationMatch[]=[];
 const boards=new Map<EliminationMatchId,string[]>();
 for(const choice of choices){
  const match=eliminationMatchPlan(double,entrants,receipts).find(m=>m.id===choice.matchId);
  if(!match||match.notRequired||!match.homeId||!match.awayId||receipts.some(m=>m.id===match.id)||![match.homeId,match.awayId].includes(choice.winnerId))throw new Error("Unavailable workshop fixture");
  const prior=boards.get(match.id)??[];
  if(choice.board!==prior.length||(kind==="solo"&&choice.board!==0)||choice.board>2)throw new Error("Invalid workshop board sequence");
  if(choice.board===2&&(prior.length!==2||prior[0]===prior[1]))throw new Error("Decider requires a split");
  const next=[...prior,choice.winnerId];boards.set(match.id,next);
  const winner=kind==="solo"?next[0]:next.length===2&&next[0]===next[1]?next[0]:next.length===3?next[2]:null;
  if(winner)receipts.push({...match,winnerId:winner,status:"completed"});
 }
 return {plan:eliminationMatchPlan(double,entrants,receipts),receipts,boards,champion:eliminationChampion(double,receipts)};
}
