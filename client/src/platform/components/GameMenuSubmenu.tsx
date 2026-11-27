import { useId, useState, type ReactNode } from "react";
import { ModalPortal } from "./ModalPortal";
import { HgrIcon } from "./HgrIcon";

/** A secondary menu destination; never changes the authoritative game state. */
export function GameMenuSubmenu({label,children}:{label:string;children:ReactNode}) {
 const [open,setOpen]=useState(false);
 const title=useId();
 const close=()=>setOpen(false);
 return <>
  <button type="button" className="menu-action hgr-menu-submenu-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>
   <span aria-hidden="true"><HgrIcon name="settings" size={18}/></span><span><strong>{label}</strong></span><span className="hgr-menu-submenu-arrow" aria-hidden="true">›</span>
  </button>
  {open&&<ModalPortal onClose={close}><div className="modal-backdrop game-menu-top-layer hgr-menu-subview-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
   <section className="game-menu-modal hgr-menu-subview" role="dialog" aria-modal="true" aria-labelledby={title}>
    <header className="modal-heading-row"><div><p className="modal-eyebrow">Game menu</p><h2 id={title}>{label}</h2></div><button type="button" className="icon-button" aria-label="Back to game menu" onClick={close}>←</button></header>
    {children}
    <button type="button" className="menu-action" onClick={close}>Back to game menu</button>
   </section>
  </div></ModalPortal>}
 </>;
}
export function GameMenuResume({onClose}:{onClose:()=>void}) {
 return <button type="button" className="menu-action menu-action-primary" onClick={onClose}><span aria-hidden="true">▶</span><span><strong>Resume game</strong></span></button>;
}
