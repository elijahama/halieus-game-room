import { useId, useState } from "react";
type ModeOption = { value: string; label: string; emoji?: string; locked?: string; onSelect: () => void };
// Shared presentation only: the game owns eligibility and its existing callback.
export function MatchModePicker({value,options,busy=false,label}:{value:string;options:ModeOption[];busy?:boolean;label:string}) {
 const id=useId();
 const [explained,setExplained]=useState<string|null>(null);
 const explanation=options.find(o=>o.value===explained&&o.locked);
 const reasons=[...new Set(options.map(o=>o.locked).filter(Boolean))];
 return <div className="mega-mode-picker">
  <div className="mega-mode-picker-options" style={{gridTemplateColumns:`repeat(${options.length},minmax(0,1fr))`}} role="group" aria-label={label} aria-describedby={reasons.length?id+"-help":undefined} aria-busy={busy}>
   {options.map(option=>{
    const blocked=Boolean(option.locked)||busy;
    const selected=value===option.value;
    return <button key={option.value} type="button" className={"mega-mode-option"+(selected?" is-selected":"")+(option.locked?" is-locked":"")} aria-pressed={selected} aria-disabled={blocked} aria-describedby={option.locked?id+"-help":undefined} onClick={()=>{if(blocked){setExplained(option.value);return;}setExplained(null);if(!selected)option.onSelect();}}>
     <span className="mega-mode-option-name">{option.emoji&&<span aria-hidden="true">{option.emoji} </span>}{option.label}</span>
     {option.locked&&<span className="mega-mode-option-status"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>Locked</span>}
    </button>;
   })}
  </div>
  {reasons.length>0&&<div id={id+"-help"} className="mega-mode-picker-help">{reasons.map(text=><small key={text}>{text}</small>)}</div>}
  <div role="status" aria-live="polite" className="mega-mode-picker-feedback">{busy?"Confirming match mode…":explanation?explanation.label+" is locked. "+explanation.locked:""}</div>
 </div>;
}
export type MegaMatchMode = "casual" | "ranked" | "blitz";
const MODES: {value:MegaMatchMode;label:string;emoji?:string}[] = [{value:"casual",label:"Casual"},{value:"ranked",label:"Ranked",emoji:"🏆"},{value:"blitz",label:"Blitz",emoji:"⚡"}];
export function MegaMatchModePicker({value,onChange,locked={},busy=false,label="Mega Board match type"}:{value:MegaMatchMode;onChange:(mode:MegaMatchMode)=>void;locked?:Partial<Record<MegaMatchMode,string>>;busy?:boolean;label?:string}) {
 return <MatchModePicker value={value} label={label} busy={busy} options={MODES.map(mode=>({...mode,locked:locked[mode.value],onSelect:()=>onChange(mode.value)}))}/>;
}
