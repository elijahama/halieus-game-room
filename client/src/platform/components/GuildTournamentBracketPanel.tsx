import { useEffect, useState } from "react";
import type { HalieusAccountSummary } from "../../../../shared/platform/accounts";
import type { HalieusGuildDetail } from "../../../../shared/platform/guilds";
import type { HgrGuildFixture } from "../../../../shared/platform/guildFixtures";
import type { HgrGuildTournament, HgrGuildTournamentMatch } from "../../../../shared/platform/guildTournaments";
import { accountApi } from "../accounts/api";

type TournamentList = { ok: true; tournaments: HgrGuildTournament[] };
type FixtureList = { ok: true; fixtures: HgrGuildFixture[] };
type TournamentResponse = { ok: true; tournament: HgrGuildTournament };
interface Props { account: HalieusAccountSummary; guild: HalieusGuildDetail }

function guildLabel(id: string | null, mine: string) {
  if (!id) return "Awaiting semifinal winner";
  return id === mine ? "Your Guild" : "Guild " + id.slice(0, 8);
}
function matchStatus(row: HgrGuildTournamentMatch) {
  switch (row.status) {
    case "awaiting-teams": return "Awaiting semifinal results";
    case "ready": return "Ready for two-board fixture";
    case "playing": return "Fixture in progress";
    case "tied": return "1–1 split: tiebreaker decision required";
    case "completed": return "Verified winner";
  }
}

/** Brackets advance only from two real completed Mega Board fixture receipts.
 * These buttons never submit a winner, rating, points or simulated game result. */
export function GuildTournamentBracketPanel({ account, guild }: Props) {
  const [tournaments, setTournaments] = useState<HgrGuildTournament[]>([]);
  const [fixtures, setFixtures] = useState<HgrGuildFixture[]>([]);
  const [title, setTitle] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [selectedFixtures, setSelectedFixtures] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      const [a, b] = await Promise.all([
        accountApi<TournamentList>("/guild-tournaments"),
        accountApi<FixtureList>("/guild-fixtures"),
      ]);
      setTournaments(a.tournaments);
      setFixtures(b.fixtures);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tournament list unavailable.");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    setLoading(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [account.id, guild.id]);
  async function submit(url: string, body: Record<string, unknown>, message: string) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await accountApi<TournamentResponse>(url, { method: "POST", body: JSON.stringify(body) });
      setNotice(message);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tournament operation rejected.");
    } finally { setBusy(false); }
  }
  const myTournaments = tournaments.filter(row => row.entrants.includes(guild.id));
  return <section className="halieus-guild-fixture-list" aria-label="Mega Board Guild knockout brackets">
    <header className="halieus-guild-fixture-heading">
      <div><small>TOURNAMENT MODE · 4.8 PREVIEW</small><h3>Guild knockout bracket</h3>
        <p>Four Guilds register. Two semifinals and a final advance from verified two-board Mega Board fixtures, not manual results.</p>
      </div>
      <button type="button" className="button-outline" onClick={() => void refresh()} disabled={busy}>Refresh brackets</button>
    </header>
    {error && <p role="alert" className="halieus-guild-fixture-error">{error}</p>}
    {notice && <p role="status" className="halieus-guild-fixture-notice">{notice}</p>}
    {guild.canManage && <div className="halieus-guild-fixture-fields">
      <form className="halieus-guild-fixture-form" onSubmit={event => {
        event.preventDefault();
        void submit("/guild-tournaments", { guildId: guild.id, name: title.trim() },
          "Tournament created. Copy the invitation ID and ask three Guild managers to register.");
      }}>
        <h4>Host a four-Guild tournament</h4>
        <label>Tournament name
          <input value={title} onChange={event => setTitle(event.target.value)}
            maxLength={70} minLength={3} placeholder="Mega Board Championship" required />
        </label>
        <button type="submit" className="button-primary" disabled={busy || title.trim().length < 3}>Create tournament</button>
      </form>
      <form className="halieus-guild-fixture-form" onSubmit={event => {
        event.preventDefault();
        void submit("/guild-tournaments/" + encodeURIComponent(inviteId.trim()) + "/register",
          { guildId: guild.id }, "Your Guild has registered.");
      }}>
        <h4>Join a Guild tournament</h4>
        <label>Invitation ID
          <input value={inviteId} onChange={event => setInviteId(event.target.value)}
            placeholder="Paste the host's tournament ID" autoComplete="off" required />
        </label>
        <button type="submit" className="button-primary" disabled={busy || !inviteId.trim()}>Register Guild</button>
      </form>
    </div>}
    {loading && <p>Loading Guild knockout brackets…</p>}
    {!loading && myTournaments.length === 0 && <p>No Guild tournaments yet. Your Guild manager can host one or register using an invitation ID.</p>}
    {myTournaments.map(tournament => {
      const host = tournament.hostGuildId === guild.id && guild.canManage;
      return <article className="halieus-guild-fixture-card" key={tournament.id}>
        <header><strong>{tournament.name}</strong><span>{tournament.status === "registration"
          ? "Registration" : tournament.status === "active" ? "Tournament live"
          : tournament.status === "completed" ? "Champion confirmed" : "Cancelled"}</span></header>
        <p>Teams: {tournament.entrants.length}/4 · Single-elimination Guild bracket · Two ordinary Mega Board games per fixture</p>
        <small>Invitation ID: <code>{tournament.id}</code></small>{" "}
        <button type="button" className="button-muted" onClick={() => {
          void navigator.clipboard.writeText(tournament.id).then(() => setNotice("Tournament invitation ID copied."))
            .catch(() => setNotice("Copy the invitation ID shown above."));
        }}>Copy invitation ID</button>
        {host && tournament.status === "registration" && <>
          <button type="button" className="button-primary" disabled={busy || tournament.entrants.length !== 4}
            onClick={() => void submit("/guild-tournaments/" + tournament.id + "/start", {},
              "Bracket started. Arrange ordinary two-board fixtures for the semifinals.")}>Start tournament</button>
          <button type="button" className="button-muted" disabled={busy}
            onClick={() => void submit("/guild-tournaments/" + tournament.id + "/cancel", {},
              "Unstarted tournament cancelled.")}>Cancel registration</button>
        </>}
        {tournament.matches.map(match => {
          const matchKey = tournament.id + ":" + match.id;
          const eligible = guild.canManage && tournament.status === "active" &&
            match.status === "ready" && (match.homeGuildId === guild.id || match.awayGuildId === guild.id);
          const candidates = fixtures.filter(fixture =>
            (fixture.status === "rooms-bound" || fixture.status === "completed") &&
            fixture.boards?.length === 2 && fixture.createdAt >= (tournament.startedAt ?? Infinity) &&
            ((fixture.homeGuildId === match.homeGuildId && fixture.awayGuildId === match.awayGuildId) ||
             (fixture.homeGuildId === match.awayGuildId && fixture.awayGuildId === match.homeGuildId)));
          return <section key={match.id} className="halieus-guild-fixture-board">
            <strong>{match.round === "semifinal" ? "Semifinal" : "Final"}: {guildLabel(match.homeGuildId, guild.id)} vs {guildLabel(match.awayGuildId, guild.id)}</strong>
            <span>{matchStatus(match)}{match.winnerGuildId ? " · " + guildLabel(match.winnerGuildId, guild.id) + " advances" : ""}</span>
            {match.fixtureId && <small>Verified fixture ID: <code>{match.fixtureId.slice(0, 12)}</code></small>}
            {eligible && <form className="halieus-guild-fixture-form" onSubmit={event => {
              event.preventDefault();
              const chosen = selectedFixtures[matchKey];
              if (chosen) void submit("/guild-tournaments/" + tournament.id + "/matches/" + match.id + "/link",
                { fixtureId: chosen }, "Two-board fixture linked. The bracket will advance only from its verified final result.");
            }}>
              <label>Connect an existing approved two-board Guild fixture
                <select value={selectedFixtures[matchKey] ?? ""} onChange={event =>
                  setSelectedFixtures(prev => ({ ...prev, [matchKey]: event.target.value }))}>
                  <option value="">Select completed or active fixture</option>
                  {candidates.map(f => <option key={f.id} value={f.id}>{f.id.slice(0, 8)} · {f.status}</option>)}
                </select>
              </label>
              <button type="submit" className="button-outline" disabled={busy || !selectedFixtures[matchKey]}>Attach real fixture</button>
              {candidates.length === 0 && <small>Create and approve a normal two-board Guild fixture below first. Both games must be played normally.</small>}
            </form>}
          </section>;
        })}
        {tournament.championGuildId && <p role="status" className="halieus-guild-fixture-score">
          Champion: <strong>{guildLabel(tournament.championGuildId, guild.id)}</strong> · Verified from real game receipts
        </p>}
      </article>;
    })}
    <p className="halieus-guild-fixture-disclaimer">This first knockout format does not yet include a losers bracket, 1–1 tiebreaker, Solo bracket or F1 ratings. A split result remains unresolved rather than awarding a fictional winner. Tournament and Ranked scores are kept separate.</p>
  </section>;
}
