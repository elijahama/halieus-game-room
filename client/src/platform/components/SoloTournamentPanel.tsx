import { useEffect, useRef, useState } from "react";
import type { HalieusAccountSummary } from "../../../../shared/platform/accounts";
import { SOLO_MATCH_LABELS, type SoloTournament, type SoloTournamentFormat } from "../../../../shared/platform/soloTournaments";
import { accountApi } from "../accounts/api";
import "./SoloTournamentPanel.css";

interface Props {
  account: HalieusAccountSummary;
  onCreateRoom: () => void;
  onOpenRoom: (code: string, intent: "join" | "watch") => void;
  onOpenGuilds: () => void;
}
type List = { tournament: SoloTournament[]; names?: Record<string, string> };
const statuses = {
  "awaiting-room": "Ready to link a room", "awaiting-opponents": "Awaiting earlier results",
  "room-bound": "Room linked", "reset-pending": "Lobby recovery pending",
  "completed": "Result confirmed", "not-required": "Reset not needed",
};
export function SoloTournamentPanel({ account, onCreateRoom, onOpenRoom, onOpenGuilds }: Props) {
  const [tournaments, setTournaments] = useState<SoloTournament[]>([]);
  const [names, setNames] = useState<Record<string,string>>({});
  const [title, setTitle] = useState("");
  const [invite, setInvite] = useState("");
  const [format, setFormat] = useState<SoloTournamentFormat>("four-player-double-elimination");
  const [codes, setCodes] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef(false);
  const locked = useRef(false);
  const generation = useRef(0);
  async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 10000);
    try { return await accountApi<T>(url, { ...init, cache: "no-store", signal: abort.signal }); }
    finally { window.clearTimeout(timeout); }
  }
  async function refresh() {
    if (locked.current) return;
    const stamp = ++generation.current;
    try {
      const data = await request<List>("/tournaments/solo");
      if (!active.current || stamp !== generation.current) return;
      setTournaments(data.tournament); setNames(data.names ?? {}); setError("");
    } catch (e) {
      if (active.current && stamp === generation.current) setError(e instanceof Error ? e.message : "Could not load tournaments.");
    } finally {
      if (active.current && stamp === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    active.current = true;
    void refresh();
    const resume = () => { if (document.visibilityState !== "hidden") void refresh(); };
    const timer = window.setInterval(resume, 8000);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active.current = false; generation.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [account.id]);
  async function submit(url: string, body: object, message: string) {
    if (locked.current) return;
    locked.current = true; generation.current++; setBusy(true); setError(""); setNotice("");
    try {
      await request(url, { method: "POST", body: JSON.stringify(body) });
      if (active.current) setNotice(message);
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : "Tournament action failed. Refresh to check its status.");
    } finally {
      locked.current = false;
      if (active.current) { setBusy(false); void refreshAfterAction(); }
    }
  }
  async function refreshAfterAction() {
    // Keep an action error visible while reconciling its authoritative state.
    const stamp = ++generation.current;
    try {
      const data = await request<List>("/tournaments/solo");
      if (active.current && stamp === generation.current) { setTournaments(data.tournament); setNames(data.names ?? {}); }
    } catch { /* Existing state and action feedback remain visible. */ }
  }
  const label = (t: SoloTournament, id: string | null) => !id ? "To be decided" :
    id === account.id ? "You" : names[id] ?? "Entrant " + (t.entrantAccountIds.indexOf(id) + 1);
  return <section className="hgr-solo" aria-label="Mega Board tournaments">
    <header className="hgr-solo-heading"><div><p>Mega Board</p><h1>Tournaments</h1>
      <p>Enter a Solo bracket or organise a Guild fixture.</p></div>
      <button type="button" className="button-outline" onClick={onOpenGuilds}>Guild tournaments →</button>
    </header>
    <div className="hgr-solo-rules"><strong>Four players. Every round counts.</strong>
      <p>Single elimination ends after one loss. Double elimination gives each player two losses:
        the losers finalist must win the Grand Final and its reset to become champion.</p>
      <p>Matches use ordinary unranked Mega Board rules. Disconnecting does not count as a loss.
        Unfinished games wait for the original players; there are no automatic byes or timeout winners.</p>
    </div>
    <div className="hgr-solo-forms">
      <form onSubmit={e => { e.preventDefault(); void submit("/tournaments/solo", { name: title, format }, "Tournament created. Share its invitation ID."); }}>
        <h2>Host a tournament</h2>
        <label>Tournament name<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={3} maxLength={70} /></label>
        <label>Format<select value={format} onChange={e=>setFormat(e.target.value as SoloTournamentFormat)}>
          <option value="four-player-double-elimination">Double elimination</option>
          <option value="four-player-single-elimination">Single elimination</option>
        </select></label>
        <button type="submit" className="button-primary" disabled={busy || title.trim().length<3}>Create tournament</button>
      </form>
      <form onSubmit={e => { e.preventDefault(); void submit("/tournaments/solo/"+encodeURIComponent(invite.trim())+"/join", {}, "You have joined the tournament."); }}>
        <h2>Join with an invitation</h2>
        <label>Invitation ID<input value={invite} onChange={e=>setInvite(e.target.value)} required maxLength={200} /></label>
        <p>You can join with your normal player account.</p>
        <button type="submit" className="button-primary" disabled={busy || !invite.trim()}>Join tournament</button>
      </form>
    </div>
    <div className="hgr-solo-feedback" aria-live="polite">
      {busy && <p role="status">Saving…</p>}{notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
    <div className="hgr-solo-heading"><h2>Your tournaments</h2>
      <button type="button" className="button-outline" onClick={()=>void refresh()} disabled={busy}>Refresh tournaments</button></div>
    {loading && <p>Loading tournaments…</p>}
    {!loading && !tournaments.length && <p>No tournaments yet. Host one or join using an invitation.</p>}
    {tournaments.map(t => {
      const host=t.hostAccountId===account.id;
      const base="/tournaments/solo/"+encodeURIComponent(t.id);
      const canCancel=t.status==="registration" || (t.status==="seeded" && t.matches.every(m=>m.status==="awaiting-room" || m.status==="awaiting-opponents"));
      return <article className="hgr-solo-card" key={t.id}>
        <header><h2>{t.name}</h2><span>{t.status==="seeded"?"In progress":t.status==="completed"?"Champion confirmed":t.status==="cancelled"?"Cancelled":"Registration open"}</span></header>
        <p>{t.format==="four-player-double-elimination"?"Double":"Single"} elimination · {t.entrantAccountIds.length}/4 players</p>
        <p className="hgr-solo-entrants">{t.entrantAccountIds.map((id,i)=><span key={id}>{i+1}. {label(t,id)}</span>)}</p>
        <div className="hgr-solo-invite"><span>Invitation ID: <code>{t.id}</code></span>
          <button className="button-muted" type="button" onClick={()=>void navigator.clipboard.writeText(t.id)
            .then(()=>setNotice("Invitation ID copied.")).catch(()=>setNotice("Copy the invitation ID shown above."))}>Copy invitation</button></div>
        <div className="hgr-solo-actions">
          {host && t.status==="registration" && <button type="button" className="button-primary" disabled={busy || t.entrantAccountIds.length!==4}
            onClick={()=>void submit(base+"/seed",{},"Bracket started. Seed 1 faces 4; seed 2 faces 3.")}>Start bracket</button>}
          {!host && t.status==="registration" && <button type="button" className="button-outline" disabled={busy}
            onClick={()=>void submit(base+"/leave",{},"You have left registration.")}>Leave registration</button>}
          {host && canCancel && <button type="button" className="button-muted" disabled={busy}
            onClick={()=>{if(window.confirm("Cancel this unplayed tournament?"))void submit(base+"/cancel",{},"Tournament cancelled.");}}>Cancel tournament</button>}
        </div>
        {t.championAccountId && <p className="hgr-solo-champion" role="status">Champion: {label(t,t.championAccountId)}</p>}
        <div className="hgr-solo-bracket">{t.matches.map(m=>{
          const mine=[m.homeAccountId,m.awayAccountId].includes(account.id);
          const key=t.id+":"+m.id;
          return <section className="hgr-solo-match" data-status={m.status} key={m.id} aria-label={SOLO_MATCH_LABELS[m.id]}>
            <header><h3>{SOLO_MATCH_LABELS[m.id]}</h3><small>{statuses[m.status]}</small></header>
            <p>{label(t,m.homeAccountId)} <span>vs</span> {label(t,m.awayAccountId)}</p>
            {m.winnerAccountId && <strong>Winner: {label(t,m.winnerAccountId)}</strong>}
            {m.status==="awaiting-room" && t.status==="seeded" && <>
              {mine && <button className="button-outline" type="button" onClick={onCreateRoom}>Create match room</button>}
              <small>Both players join an unstarted two-player room. The tournament host then links its code before play begins.</small>
              {host && <form onSubmit={e=>{e.preventDefault();void submit(base+"/matches/"+m.id+"/bind-room",{roomCode:codes[key]},"Room linked. The two players can start their match.");}}>
                <label>Room code<input value={codes[key]??""} onChange={e=>setCodes(old=>({...old,[key]:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")}))} minLength={4} maxLength={12} required /></label>
                <button className="button-primary" type="submit" disabled={busy || (codes[key]?.length??0)<4}>Link room</button>
              </form>}
            </>}
            {m.roomCode && m.status==="room-bound" && <div className="hgr-solo-actions">
              {mine && <button className="button-primary" type="button" onClick={()=>onOpenRoom(m.roomCode!,"join")}>Return to match</button>}
              <button className="button-outline" type="button" onClick={()=>onOpenRoom(m.roomCode!,"watch")}>Watch match</button>
            </div>}
            {mine && (m.status==="room-bound" || m.status==="reset-pending") && <details>
              <summary>Lobby recovery</summary>
              <p>Only a lobby that has never started can be replaced. Both original players must approve within ten minutes.</p>
              <button type="button" className="button-muted" disabled={busy || (m.status!=="reset-pending" && m.resetApprovedAccountIds.includes(account.id) && (m.resetRequestedAt??0)>Date.now()-600000)}
                onClick={()=>{if(window.confirm("Approve replacing this never-started lobby? Both original players must agree."))
                  void submit(base+"/matches/"+m.id+"/approve-prestart-reset",{},"Recovery request recorded. Check the match status.");}}>
                {m.status==="reset-pending"?"Retry approved recovery":"Approve lobby replacement"}</button>
              <small>{m.resetApprovedAccountIds.length}/2 approvals</small>
            </details>}
          </section>;
        })}</div>
      </article>;
    })}
  </section>;
}
