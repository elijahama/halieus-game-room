import { useRef, useState } from "react";
import type { HalieusAccountSummary } from "../../../../shared/platform/accounts";
import type { HalieusGuildDetail } from "../../../../shared/platform/guilds";
import type { HgrGuildFixture } from "../../../../shared/platform/guildFixtures";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games";
import { accountApi } from "../accounts/api";
interface Props {
  account: HalieusAccountSummary; guild: HalieusGuildDetail; fixture: HgrGuildFixture;
  liveRooms: HalieusLiveRoomSummary[];
  onOpenLiveRoom: (room:HalieusLiveRoomSummary,intent:"join"|"watch")=>void;
  onUpdated:()=>void;
}
export function GuildTiebreakerPanel({account,guild,fixture,liveRooms,onOpenLiveRoom,onUpdated}:Props) {
  const home=fixture.homeGuildId===guild.id;
  const original=(home?fixture.homeLineups:fixture.awayLineups)?.flat()??[];
  const [nominee,setNominee]=useState("");
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const tie=fixture.tiebreaker;
  const mine=home?tie?.homeAccountId:tie?.awayAccountId;
  const theirs=home?tie?.awayAccountId:tie?.homeAccountId;
  const live=tie?.board ? liveRooms.find(room=>room.game==="mega-board" && room.code===tie.board!.roomCode &&
    room.createdAt===tie.board!.roomCreatedAt) : null;
  const eligible=original.filter(id=>guild.members.some(m=>m.accountId===id));
  const name=(id:string)=>guild.members.find(m=>m.accountId===id)?.displayName??"Original player";
  async function submit(action:string,body:object,message:string) {
    if(lock.current)return;lock.current=true;setBusy(true);setError("");setNotice("");
    const abort=new AbortController();const timer=window.setTimeout(()=>abort.abort(),10000);
    try {
      await accountApi("/guild-fixtures/"+encodeURIComponent(fixture.id)+"/tiebreaker/"+action,
        {method:"POST",body:JSON.stringify(body),signal:abort.signal});
      setNotice(message);onUpdated();
    }catch(e){setError(e instanceof Error?e.message:"Deciding game unavailable. Refresh and retry.");}
    finally{window.clearTimeout(timer);lock.current=false;setBusy(false);}
  }
  if(fixture.status!=="completed" || fixture.homeBoardWins!==1 || fixture.awayBoardWins!==1)return null;
  return <section className="halieus-guild-fixture-board hgr-guild-decider" aria-label="Guild deciding game">
    <div><h4>Deciding third game</h4><p>The first two boards finished 1–1. Each Guild nominates one of its original players for a fresh Mega Board game.</p></div>
    {tie?.result?<p role="status"><strong>{tie.result.winnerGuildId===guild.id?"Your Guild":"Opponent"} won the decider.</strong> The original two board results remain 1–1.</p>:<>
      <p>Your nominee: {mine?name(mine):"Awaiting nomination"} · Opponent: {theirs?"Nominated":"Awaiting nomination"}</p>
      {guild.canManage && !tie?.board && <form className="halieus-guild-fixture-form" onSubmit={e=>{e.preventDefault();void submit("nominate",
        {guildId:guild.id,accountId:nominee},"Nomination saved.");}}>
        <label>Original player for the deciding game<select value={nominee} required onChange={e=>setNominee(e.target.value)}>
          <option value="">Choose your player</option>{eligible.map(id=><option key={id} value={id}>{name(id)}</option>)}
        </select></label>
        <button type="submit" className="button-primary" disabled={busy || !nominee}>Nominate player</button>
      </form>}
      {guild.canManage && mine && theirs && !tie?.board && <form className="halieus-guild-fixture-form" onSubmit={e=>{e.preventDefault();void submit("bind-room",{roomCode:code},"Deciding room linked. Its two players can start.");}}>
        <p>Both nominees join a new, unstarted two-player room. Use ordinary unranked Mega Board settings.</p>
        <label>Deciding room code<input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} required minLength={4} maxLength={12}/></label>
        <button type="submit" className="button-primary" disabled={busy || code.length<4}>Link deciding room</button>
      </form>}
      {tie?.board && <p>Deciding room: <strong>{tie.board.roomCode}</strong> · Nominees locked</p>}
      {live && <div className="hgr-guild-decider-actions">
        {tie?.board?.seatAccountIds.includes(account.id) && <button type="button" className="button-primary" onClick={()=>onOpenLiveRoom(live,"join")}>Return to deciding game</button>}
        {live.spectatable && <button type="button" className="button-outline" onClick={()=>onOpenLiveRoom(live,"watch")}>Watch deciding game</button>}
      </div>}
      {tie?.board && !live && <p>The deciding room is unavailable. Its result remains unresolved; reconnect or request recovery rather than replacing it.</p>}
    </>}
    {busy && <p role="status">Saving…</p>}{notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
