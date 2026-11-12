import { useEffect, useState } from "react";
import type { HalieusAccountSummary } from "../../../../shared/platform/accounts";
import type { HalieusGuildDetail, HalieusGuildSummary } from "../../../../shared/platform/guilds";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games";
import { accountApi } from "../accounts/api";
import { GuildFixturesPanel } from "./GuildFixturesPanel";
import { SoloTournamentPanel } from "./SoloTournamentPanel";
import "./TournamentHub.css";

type TournamentFormat = "solo" | "guild";

interface TournamentHubProps {
  account: HalieusAccountSummary;
  soloAvailable: boolean;
  liveRooms: HalieusLiveRoomSummary[];
  onCreateRoom: () => void;
  onOpenRoom: (code: string, intent: "join" | "watch") => void;
  onOpenLiveRoom: (room: HalieusLiveRoomSummary, intent: "join" | "watch") => void;
  onOpenGuilds: () => void;
}

/** Tournament Mode is a first-class platform destination, independent from
 * Guild management. Backend-authorised Solo and Guild workflows retain their
 * existing server-owned eligibility, room binding and verified result rules. */
export function TournamentHub({
  account, soloAvailable, liveRooms, onCreateRoom, onOpenRoom,
  onOpenLiveRoom, onOpenGuilds,
}: TournamentHubProps) {
  const [format, setFormat] = useState<TournamentFormat>("solo");
  const [guilds, setGuilds] = useState<HalieusGuildSummary[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [selectedGuild, setSelectedGuild] = useState<HalieusGuildDetail | null>(null);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [guildError, setGuildError] = useState("");
  const [revision, setRevision] = useState(0);

  // Load Guild data only when that format is opened. A Solo entrant does not
  // require Guild membership and must not be blocked by its API.
  useEffect(() => {
    if (format !== "guild") return;
    const controller = new AbortController();
    setLoadingGuilds(true);
    setGuildError("");
    void accountApi<{ ok: true; guilds: HalieusGuildSummary[] }>("/guilds", {
      cache: "no-store", signal: controller.signal,
    }).then((data) => {
      if (controller.signal.aborted) return;
      setGuilds(data.guilds);
      setSelectedGuildId((old) =>
        data.guilds.some((guild) => guild.id === old)
          ? old : data.guilds[0]?.id ?? "");
    }).catch((error) => {
      if (!controller.signal.aborted) setGuildError(
        error instanceof Error ? error.message : "Could not load Guilds.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingGuilds(false);
    });
    return () => controller.abort();
  }, [account.id, format, revision]);

  useEffect(() => {
    if (format !== "guild" || !selectedGuildId) {
      setSelectedGuild(null);
      return;
    }
    const controller = new AbortController();
    setSelectedGuild(null);
    setLoadingDetail(true);
    void accountApi<{ ok: true; guild: HalieusGuildDetail }>(
      `/guilds/${encodeURIComponent(selectedGuildId)}`,
      {cache: "no-store", signal: controller.signal},
    ).then((data) => {
      if (!controller.signal.aborted) {
        setSelectedGuild(data.guild);
        setGuildError("");
      }
    }).catch((error) => {
      if (!controller.signal.aborted) setGuildError(
        error instanceof Error ? error.message : "Could not load Guild details.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingDetail(false);
    });
    return () => controller.abort();
  }, [account.id, format, selectedGuildId, revision]);

  return (
    <section className="hgr-tournament-hub" aria-label="Tournament Mode">
      <header className="hgr-tournament-heading">
        <div>
          <p>MEGA BOARD · COMPETITIVE</p>
          <h1>Tournament Mode</h1>
          <span>Solo brackets and Guild fixtures have their own tournament space, separate from Guild management and ordinary Ranked play.</span>
        </div>
      </header>

      <div className="hgr-tournament-format-tabs" role="tablist" aria-label="Tournament format">
        <button type="button" role="tab" id="hgr-tournament-solo-tab"
          aria-selected={format === "solo"} aria-controls="hgr-tournament-format-panel"
          className={format === "solo" ? "is-active" : ""}
          onClick={() => setFormat("solo")}>
          <strong>Solo</strong>
          <small>Individual entrants and brackets</small>
        </button>
        <button type="button" role="tab" id="hgr-tournament-guild-tab"
          aria-selected={format === "guild"} aria-controls="hgr-tournament-format-panel"
          className={format === "guild" ? "is-active" : ""}
          onClick={() => setFormat("guild")}>
          <strong>Guild</strong>
          <small>Teams, fixtures and verified boards</small>
        </button>
      </div>

      <div id="hgr-tournament-format-panel" role="tabpanel"
        aria-labelledby={format === "solo" ? "hgr-tournament-solo-tab" : "hgr-tournament-guild-tab"}
        className="hgr-tournament-format-panel">
        {format === "solo" && (soloAvailable
          ? <SoloTournamentPanel account={account} onCreateRoom={onCreateRoom}
              onOpenRoom={onOpenRoom} onOpenGuilds={() => setFormat("guild")} />
          : <section className="hgr-tournament-unavailable">
              <h2>Solo tournaments</h2>
              <p>Solo tournament registration is not enabled on this server yet. This is a separate format; you don't need to join a Guild to compete when it opens.</p>
              <p>Guild fixtures remain available through the Guild format above.</p>
            </section>)}

        {format === "guild" && (
          <section className="hgr-tournament-guild" aria-label="Guild tournament fixtures">
            <header>
              <div>
                <h2>Guild tournaments</h2>
                <p>Choose a Guild you belong to, then manage its verified Mega Board fixtures here.</p>
              </div>
              <button type="button" className="button-outline"
                onClick={() => setRevision((value) => value + 1)}
                disabled={loadingGuilds || loadingDetail}>Refresh Guilds</button>
            </header>
            {guildError && <p role="alert" className="hgr-tournament-error">{guildError}</p>}
            {loadingGuilds && <p role="status">Loading your Guilds…</p>}
            {!loadingGuilds && guilds.length === 0 && !guildError && (
              <div className="hgr-tournament-unavailable">
                <h3>No Guild membership yet</h3>
                <p>You can access Tournament Mode without a Guild. To enter a Guild fixture, first join or create one.</p>
                <button type="button" className="button-outline" onClick={onOpenGuilds}>Open Guilds</button>
              </div>
            )}
            {guilds.length > 0 && (
              <label className="hgr-tournament-guild-select">
                <span>Your Guild</span>
                <select value={selectedGuildId} onChange={(event) => setSelectedGuildId(event.target.value)}>
                  {guilds.map((guild) =>
                    <option key={guild.id} value={guild.id}>{guild.name}</option>)}
                </select>
              </label>
            )}
            {loadingDetail && <p role="status">Loading this Guild's fixtures…</p>}
            {selectedGuild && !loadingDetail && selectedGuild.id === selectedGuildId && (
              <GuildFixturesPanel key={selectedGuild.id} account={account}
                guild={selectedGuild} liveRooms={liveRooms} onOpenLiveRoom={onOpenLiveRoom} />
            )}
          </section>
        )}
      </div>
    </section>
  );
}
