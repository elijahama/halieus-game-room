import { useState } from "react";
/** Local planning aid only. No rooms, accounts, result submissions or ratings. */
export function TournamentWorkshop(){
 const [type,setType]=useState<"solo"|"guild">("solo");
 const [format,setFormat]=useState<"single"|"double">("single");
 const [first,setFirst]=useState("");
 const [second,setSecond]=useState("");
 const [final,setFinal]=useState("");
 const reset=()=>{setFirst("");setSecond("");setFinal("");};
 const labels=Array.from({length:4},(_,i)=>(type==="solo"?"Entrant ":"Guild ")+String.fromCharCode(65+i));
 const match=(title:string,options:string[],selected:string,onSelect:(s:string)=>void)=>
  <section className="hgr-workshop-fixture"><strong>{title}</strong>{options.map(v=><button key={v} type="button" className="button-outline" aria-pressed={selected===v} onClick={()=>onSelect(v)}>{v}</button>)}</section>;
 return <section className="hgr-tournament-workshop" aria-label="Tournament workshop">
  <h2>Tournament Workshop</h2><p>Local bracket rehearsal. No live rooms or official results are created; Ranked, tournament ratings and Gamer Score are untouched.</p>
  <div className="hgr-workshop-options"><label>Entrants<select value={type} onChange={e=>{setType(e.target.value==="guild"?"guild":"solo");reset()}}><option value="solo">Solo — four entrants</option><option value="guild">Guild — four teams</option></select></label>
  <label>Format<select value={format} onChange={e=>{setFormat(e.target.value==="double"?"double":"single");reset()}}><option value="single">Single elimination</option><option value="double">Double elimination</option></select></label></div>
  {type==="guild"&&<p>Each Guild fixture uses independent ordinary Mega Board games. Two-board split fixtures use the approved third deciding game; this workshop chooses a hypothetical fixture winner, not individual board scores.</p>}
  <div className="hgr-workshop-bracket">
   {match("Semi-final 1",labels.slice(0,2),first,v=>{setFirst(v);setFinal("")})}
   {match("Semi-final 2",labels.slice(2),second,v=>{setSecond(v);setFinal("")})}
   {first&&second&&match(format==="single"?"Final":"Winners' final",[first,second],final,setFinal)}
  </div>
  {format==="double"&&<div className="hgr-workshop-fixture"><strong>Losers' bracket and Grand Final</strong><small>Losers advance to the second-chance bracket; an undefeated finalist losing the first Grand Final requires a reset. This planning preview does not simulate the full double-elimination engine.</small></div>}
  {final&&<p role="status">{format==="single"?"Hypothetical champion: ":"Hypothetical winners' bracket finalist: "}{final}</p>}
  <button type="button" className="button-outline" onClick={reset}>Reset workshop</button>
 </section>;
}
