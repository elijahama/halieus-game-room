import { useEffect, useMemo, useState } from "react";
import type { HalieusAccountSummary } from "../../../../shared/platform/accounts";
import type { HalieusGuildDetail } from "../../../../shared/platform/guilds";
import type { HgrGuildFixture } from "../../../../shared/platform/guildFixtures";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games";
import { accountApi } from "../accounts/api";

interface Props {
  account: HalieusAccountSummary;
  guild: HalieusGuildDetail;
  liveRooms: HalieusLiveRoomSummary[];
  onOpenLiveRoom: (room: HalieusLiveRoomSummary, intent: "join" | "watch") => void;
}
type FixtureResponse = { ok: true; fixture: HgrGuildFixture };
function fixtureStatus(fixture: HgrGuildFixture): string {
  switch (fixture.status) {
    case "proposed": return "Awaiting opposing Guild";
    case "lineups-locked": return "Approved · Prepare two rooms";
    case "rooms-bound": return "Boards assigned · Play both games";
    case "completed": return "Both games complete";
    default: return "Cancelled";
  }
}
function accountName(guild: HalieusGuildDetail, id: string) {
  const member = guild.members.find((row) => row.accountId === id);
  return member ? member.displayName : "Opposing Guild member";
}
/** These controls orchestrate server-verified real HGR lobbies only.
 * No fake games, manual winners, test-only ratings or admin elevation. */
export function GuildFixturesPanel({ account, guild, liveRooms, onOpenLiveRoom }: Props) {
  const [fixtures, setFixtures] = useState<HgrGuildFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [board1, setBoard1] = useState("");
  const [board2, setBoard2] = useState("");
  const [away1, setAway1] = useState("");
  const [away2, setAway2] = useState("");
  const [code1, setCode1] = useState("");
  const [code2, setCode2] = useState("");
  const belonging = useMemo(() => fixtures.filter((fixture) =>
    fixture.homeGuildId === guild.id || fixture.awayGuildId === guild.id),
  [fixtures, guild.id]);
  async function refresh(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const data = await accountApi<{ok:true;fixtures:HgrGuildFixture[]}>("/guild-fixtures");
      setFixtures(data.fixtures);
      if (showLoading) setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not retrieve Guild fixtures.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), 6000);
    return () => window.clearInterval(timer);
  }, [account.id, guild.id]);

  async function mutate(url: string, body: object, success: string) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await accountApi<FixtureResponse>(url, { method: "POST", body: JSON.stringify(body) });
      setNotice(success);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fixture request could not be completed.");
    } finally { setBusy(false); }
  }
  function memberPicker(value: string, update: (value: string) => void, label: string) {
    return <label>{label}
      <select value={value} onChange={(event) => update(event.target.value)} disabled={busy}>
        <option value="">Select participant</option>
        {guild.members.map((member) => <option key={member.accountId} value={member.accountId}>{member.displayName}</option>)}
      </select>
    </label>;
  }
  async function copyId() {
    try { await navigator.clipboard.writeText(guild.id); setNotice("Guild ID copied. Share it with the opposing Guild manager."); }
    catch { setNotice("Copy this Guild ID: " + guild.id); }
  }
  return <section className="halieus-guild-fixture-panel" aria-label="Mega Board Guild tournaments">
    <header className="halieus-guild-fixture-heading">
      <div><small>MEGA BOARD TOURNAMENTS</small><h3>Two-board Guild fixtures</h3>
        <p>Challenge another Guild, agree on two human-player lineups, and play two independent Mega Board matches. Teammates pay rent normally.</p>
      </div>
      <button type="button" className="button-outline" onClick={() => void refresh(true)} disabled={busy || loading}>Refresh fixtures</button>
    </header>
    <div className="halieus-guild-fixture-id">
      <span>Your Guild ID: <code>{guild.id}</code></span>
      <button type="button" className="button-muted" onClick={() => void copyId()}>Copy Guild ID</button>
    </div>
    {error && <p role="alert" className="halieus-guild-fixture-error">{error}</p>}
    {notice && <p role="status" className="halieus-guild-fixture-notice">{notice}</p>}
    {guild.canManage && <form className="halieus-guild-fixture-form" onSubmit={(event) => {
      event.preventDefault();
      void mutate("/guild-fixtures", {
        homeGuildId: guild.id, awayGuildId: opponent.trim(),
        homeLineups: [[board1], [board2]],
      }, "Guild challenge proposed. The opposing Guild manager can approve it from their Tournaments tab.");
    }}>
      <h4>Propose a fixture</h4>
      <p>Ask the opposing Guild manager to share their Guild ID. Assign one of your human Guild members to each board for this initial tournament format.</p>
      <label>Opponent Guild ID
        <input value={opponent} onChange={(event) => setOpponent(event.target.value)} placeholder="Paste opposing Guild ID" autoComplete="off" required />
      </label>
      <div className="halieus-guild-fixture-fields">
        {memberPicker(board1, setBoard1, "Your Board 1 player")}
        {memberPicker(board2, setBoard2, "Your Board 2 player")}
      </div>
      <button className="button-primary" type="submit" disabled={busy || !opponent.trim() || !board1 || !board2 || board1 === board2 || opponent.trim() === guild.id}>Challenge Guild</button>
    </form>}
    <section className="halieus-guild-fixture-list" aria-label="Current and past fixtures">
      <h4>Fixtures {belonging.length > 0 ? `(${belonging.length})` : ""}</h4>
      {loading && <p>Loading fixtures…</p>}
      {!loading && !belonging.length && <p>No fixtures yet. A Guild manager can propose the first two-board Mega Board match.</p>}
      {belonging.map((fixture) => {
        const home = fixture.homeGuildId === guild.id;
        const managerCanApprove = !home && guild.canManage && fixture.status === "proposed";
        const managerCanBind = guild.canManage && fixture.status === "lineups-locked";
        const canCancel = guild.canManage && fixture.status !== "cancelled" && fixture.status !== "completed" &&
          (fixture.status !== "rooms-bound" || !fixture.boardResults?.length);
        return <article key={fixture.id} className="halieus-guild-fixture-card">
          <header>
            <strong>{home ? "Your Guild versus opponent" : "Opponent versus your Guild"}</strong>
            <span>{fixtureStatus(fixture)}</span>
          </header>
          <small>Fixture {fixture.id.slice(0, 8)} · {new Date(fixture.createdAt).toLocaleDateString()}</small>
          <p>Board 1: {home ? fixture.homeLineups[0].map((id) => accountName(guild, id)).join(", ") : fixture.awayLineups?.[0].map((id) => accountName(guild, id)).join(", ") ?? "Awaiting approval"}
            {" · "}Board 2: {home ? fixture.homeLineups[1].map((id) => accountName(guild, id)).join(", ") : fixture.awayLineups?.[1].map((id) => accountName(guild, id)).join(", ") ?? "Awaiting approval"}</p>
          {managerCanApprove && <form className="halieus-guild-fixture-form" onSubmit={(event) => {
            event.preventDefault();
            void mutate(`/guild-fixtures/${fixture.id}/accept`, {
              awayLineups: [[away1], [away2]],
            }, "Both Guild lineups are locked. Arrange two ordinary Mega Board lobbies.");
          }}>
            <h4>Approve opposing Guild challenge</h4>
            <div className="halieus-guild-fixture-fields">
              {memberPicker(away1, setAway1, "Your Board 1 player")}
              {memberPicker(away2, setAway2, "Your Board 2 player")}
            </div>
            <button className="button-primary" type="submit" disabled={busy || !away1 || !away2 || away1 === away2}>Approve lineups</button>
          </form>}
          {managerCanBind && <form className="halieus-guild-fixture-form" onSubmit={(event) => {
            event.preventDefault();
            void mutate(`/guild-fixtures/${fixture.id}/bind-rooms`, {
              roomCodes: [code1.trim().toUpperCase(), code2.trim().toUpperCase()],
            }, "Both actual Mega Board rooms are now bound. Start them normally.");
          }}>
            <h4>Bind two existing Mega Board rooms</h4>
            <p>Create two ordinary, unranked Mega Board lobbies in Games. All assigned players must join their correct board using their signed-in HGR accounts; no AI or extra seats.</p>
            <div className="halieus-guild-fixture-fields">
              <label>Board 1 room code<input value={code1} onChange={(event) => setCode1(event.target.value.toUpperCase())} maxLength={12} placeholder="Room code" required /></label>
              <label>Board 2 room code<input value={code2} onChange={(event) => setCode2(event.target.value.toUpperCase())} maxLength={12} placeholder="Room code" required /></label>
            </div>
            <button className="button-primary" type="submit" disabled={busy || code1.trim().length < 4 || code2.trim().length < 4 || code1.trim() === code2.trim()}>Bind boards</button>
          </form>}
          {fixture.boards?.map((link, index) => {
            const live = liveRooms.find((room) => room.game === "mega-board" && room.code === link.roomCode);
            const result = fixture.boardResults?.find((row) => row.boardMatchId === link.boardMatchId);
            return <div key={link.boardMatchId} className="halieus-guild-fixture-board">
              <strong>Board {index + 1}: {link.roomCode}</strong>
              <span>{result
                ? `Won by ${result.winnerGuildId === guild.id ? "your Guild" : "opposing Guild"}`
                : live?.started ? "Match ongoing" : "Awaiting match start"}</span>
              {live && !result && <button type="button" className="button-outline" onClick={() => onOpenLiveRoom(live, live.started ? "watch" : "join")}>{live.started ? "Watch board" : "Join board"}</button>}
            </div>;
          })}
          {fixture.boardResults?.length ? <p className="halieus-guild-fixture-score">
            Board wins: Your Guild {home ? fixture.homeBoardWins ?? 0 : fixture.awayBoardWins ?? 0} – {home ? fixture.awayBoardWins ?? 0 : fixture.homeBoardWins ?? 0} Opponent
            {fixture.status === "completed" && fixture.homeBoardWins === fixture.awayBoardWins ? " · Split result; tiebreaker unresolved" : ""}
          </p> : null}
          {canCancel && <button type="button" className="button-muted" disabled={busy} onClick={() =>
            void mutate(`/guild-fixtures/${fixture.id}/cancel`, {}, "Fixture cancelled before the games began.")}>Cancel fixture</button>}
        </article>;
      })}
    </section>
    <p className="halieus-guild-fixture-disclaimer">Verified board results are not F1 standings or tournament ratings. Beta practice matches remain non-scoring and separate from official Guild fixtures.</p>
  </section>;
}
