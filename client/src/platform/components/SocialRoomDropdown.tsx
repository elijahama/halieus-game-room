import type { HgrSocialActivityNotice } from "../socialActivityTransitions";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games";
import { GAME_BY_ID, type GameId } from "../games/catalog";

/** A timely social-contact notice; does not claim that the contact owns the room. */
export function SocialRoomDropdown({notice,room,onJoin,onWatch,onLater,onOpenInbox}:{
 notice:HgrSocialActivityNotice;
 room:HalieusLiveRoomSummary;
 onJoin:()=>void;
 onWatch:()=>void;
 onLater:()=>void;
 onOpenInbox:()=>void;
}) {
 const game=GAME_BY_ID[room.game as GameId];
 return <aside className="hgr-game-invite-dropdown hgr-social-room-dropdown"
   role="region" aria-label="Friend or guild contact entered a room" aria-live="polite"
   style={{["--game-notice-accent" as string]:game?.accent??"#83a9f0"}}>
   <div className="hgr-game-invite-dropdown-head">
     {game && <img src={game.icon} alt="" />}
     <div><small>LIVE FRIEND / GUILD ROOM</small>
       <strong>{notice.displayName} is in {room.gameTitle}</strong>
       <span>Room {room.code} · {room.started?"Playing now":"Open lobby"} · Quick join available</span>
     </div>
     <button type="button" className="hgr-game-invite-later" onClick={onLater}
       aria-label="Dismiss popup and keep activity in Inbox">×</button>
   </div>
   <div className="hgr-game-invite-dropdown-actions">
     {room.joinable && <button className="button-primary" type="button" onClick={onJoin}>Join room</button>}
     {room.spectatable && <button className="button-outline" type="button" onClick={onWatch}>Watch</button>}
     <button className="button-muted" type="button" onClick={onOpenInbox}>Inbox</button>
   </div>
   <small className="hgr-game-invite-footnote">Quick alert closes automatically. The activity stays in your Inbox.</small>
 </aside>;
}
