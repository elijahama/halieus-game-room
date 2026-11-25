import { useState } from "react";
import { ELIMINATION_MATCH_LABELS } from "../../../../shared/platform/fourEntrantBracket";
import { buildWorkshop, type WorkshopKind, type WorkshopChoice, type WorkshopBoard } from "../../../../shared/platform/tournamentWorkshop";
/** Local rehearsal only, with the same bracket dependencies as real Solo/Guild play. */
export function TournamentWorkshop(){
 const [kind,setKind]=useState<WorkshopKind>("solo");
 const [double,setDouble]=useState(false);
 const [choices,setChoices]=useState<WorkshopChoice[]>([]);
 const entrants=Array.from({length:4},(_,i)=>(kind==="solo"?"Player ":"Guild ")+String.fromCharCode(65+i));
 const {plan,receipts,boards,champion}=buildWorkshop(kind,double,entrants,choices);
 const reset=()=>setChoices([]);
 return <section className="hgr-tournament-workshop" aria-label="Tournament workshop">
  <h2>Tournament Workshop</h2><p>Local rehearsal using the established tournament bracket rules. No real rooms, official results, rating changes or Gamer Score.</p>
  <div className="hgr-workshop-options">
   <label>Entrants<select value={kind} onChange={e=>{setKind(e.target.value==="guild"?"guild":"solo");reset()}}><option value="solo">Solo — four entrants</option><option value="guild">Guild — four teams</option></select></label>
   <label>Format<select value={double?"double":"single"} onChange={e=>{setDouble(e.target.value==="double");reset()}}><option value="single">Single elimination</option><option value="double">Double elimination</option></select></label>
  </div>
  <p>Registration order seeds 1 vs 4 and 2 vs 3. {double?"Two fixture losses eliminate an entrant. If the undefeated finalist loses the Grand Final, a fresh reset fixture is required.":"One fixture loss eliminates an entrant."}</p>
  {kind==="guild"&&<p>Two simultaneous ordinary Mega Board games per fixture. A 2–0 result advances the Guild; a 1–1 split requires a third deciding game between nominees from the original lineups. Teammates still pay rent and follow normal game rules. A board loss is not itself a bracket loss.</p>}
  <div className="hgr-workshop-bracket">
   {plan.map(m=>{
    const completed=receipts.find(r=>r.id===m.id);
    const prior=boards.get(m.id)??[];
    const ready=!completed&&!m.notRequired&&!!m.homeId&&!!m.awayId;
    const board=prior.length as WorkshopBoard;
    return <section key={m.id} className="hgr-workshop-fixture">
     <strong>{ELIMINATION_MATCH_LABELS[m.id]}</strong>
     {m.notRequired?<small>Not required — undefeated finalist won</small>:<>
      <small>{m.homeId??"Awaiting entrant"} vs {m.awayId??"Awaiting entrant"}</small>
      {kind==="guild"&&prior.map((v,i)=><small key={i}>{i===2?"Deciding game":"Board "+(i+1)}: {v}</small>)}
      {completed?<span>Advances: {completed.winnerId}</span>:ready?<>
       <small>{kind==="solo"?"Choose hypothetical game winner":board===2?"1–1 split · choose deciding game winner":"Choose Board "+(board+1)+" winner"}</small>
       {[m.homeId!,m.awayId!].map(v=><button key={v} type="button" className="button-outline" onClick={()=>setChoices(old=>{const next=[...old,{matchId:m.id,board,winnerId:v}];buildWorkshop(kind,double,entrants,next);return next;})}>{v}</button>)}
      </>:<small>Awaiting preceding fixtures</small>}
     </>}
    </section>
   })}
  </div>
  {champion&&<p role="status">Hypothetical champion: {champion}</p>}
  <div className="hgr-workshop-options"><button type="button" className="button-outline" disabled={!choices.length} onClick={()=>setChoices(old=>old.slice(0,-1))}>Undo last result</button><button type="button" className="button-outline" onClick={reset}>Reset workshop</button></div>
 </section>;
}
