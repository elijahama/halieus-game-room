import { useId, useState } from "react";

export type MegaMatchMode = "casual" | "ranked" | "blitz";
const MODES: MegaMatchMode[] = ["casual", "ranked", "blitz"];
const LABEL: Record<MegaMatchMode,string> = { casual: "Casual", ranked: "Ranked", blitz: "Blitz" };
export function MegaMatchModePicker({value,onChange,locked={},busy=false,label="Mega Board match type"}:{
 value:MegaMatchMode; onChange:(mode:MegaMatchMode)=>void;
 locked?:Partial<Record<MegaMatchMode,string>>; busy?:boolean; label?:string;
}) {
 const id=useId();
 const [explained,setExplained]=useState<MegaMatchMode|null>(null);
 const reason=explained ? locked[explained] : undefined;
 const reasons=[...new Set(MODES.map(mode=>locked[mode]).filter(Boolean))];
 return <div className="mega-mode-picker">
  <div className="mega-mode-picker-options" role="group" aria-label={label} aria-describedby={id+"-help"} aria-busy={busy}>
   {MODES.map(mode=>{
    const blocked=Boolean(locked[mode])||busy;
    const selected=value===mode;
    return <button key={mode} type="button" className={"mega-mode-option"+(selected?" is-selected":"")+(blocked?" is-locked":"")} aria-pressed={selected} aria-disabled={blocked} aria-describedby={locked[mode]?id+"-help":undefined} onClick={()=>{
     if(blocked){setExplained(mode);return;}
     setExplained(null);
     if(!selected)onChange(mode);
    }}>
     <span className="mega-mode-option-name">{LABEL[mode]}</span>
     <span className="mega-mode-option-status">
      {blocked?<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>:selected?<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>:null}
      {busy?"Updating":blocked?(selected?"Selected · locked":"Locked"):selected?"Selected":"Available"}
     </span>
    </button>;
   })}
  </div>
  <div id={id+"-help"} className="mega-mode-picker-help">{reasons.length?reasons.map(text=><small key={text}>{text}</small>):<small>Choose a match mode.</small>}</div>
  <div role="status" aria-live="polite" className="mega-mode-picker-feedback">{busy?"Confirming match mode…":reason?LABEL[explained!] + " is locked. " + reason:""}</div>
 </div>;
}
