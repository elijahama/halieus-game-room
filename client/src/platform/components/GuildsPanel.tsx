import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { HalieusAccountSummary, HalieusPlayerDirectoryEntry } from "../../../../shared/platform/accounts";
import type {
  HalieusGuildDetail,
  HalieusGuildInvitation,
  HalieusGuildRole,
  HalieusGuildRoom,
  HalieusGuildRoomPolicy,
  HalieusGuildSummary,
} from "../../../../shared/platform/guilds";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games";
import { accountApi } from "../accounts/api";
import { ACTIVE_GAME_CATALOG, GAME_BY_ID, type GameId } from "../games/catalog";
import { HgrIcon } from "./HgrIcon";
import { PlayerIdentityCard } from "./PlayerIdentityCard";

type GuildView = "rooms" | "chat" | "leaderboard" | "members";

interface GuildsPanelProps {
  account: HalieusAccountSummary;
  liveRooms: HalieusLiveRoomSummary[];
  onBackToPlayers: () => void;
  onCreateRoom: (game: GameId, roomCode: string) => void;
  onOpenLiveRoom: (room: HalieusLiveRoomSummary, intent: "join" | "watch") => void;
}

const ROLE_LABELS: Record<HalieusGuildRole, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  member: "Member",
};

const ROOM_POLICY_LABELS: Record<HalieusGuildRoomPolicy, string> = {
  members: "Any member",
  moderators: "Moderators +",
  admins: "Admins only",
};

const GUILD_TABS = [
  { id: "rooms", label: "Rooms", icon: "games" },
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { id: "members", label: "Members", icon: "players" },
] as const;

function GuildEmblem({ name, picture, large = false }: { name: string; picture: string | null; large?: boolean }) {
  return <span className={`halieus-guild-emblem${large ? " is-large" : ""}`}>{picture ? <img src={picture} alt="" /> : name.slice(0, 2).toUpperCase()}</span>;
}

/**
 * Guilds is deliberately REST-backed rather than tied to a game socket.
 *
 * A guild persists when no game is running. Guild-created rooms reserve a
 * normal HGR room code and then hand back to the existing game setup flow, so
 * guilds organise games without becoming a second multiplayer authority.
 */
export function GuildsPanel({
  account,
  liveRooms,
  onBackToPlayers,
  onCreateRoom,
  onOpenLiveRoom,
}: GuildsPanelProps) {
  const [guilds, setGuilds] = useState<HalieusGuildSummary[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HalieusGuildDetail | null>(null);
  const [view, setView] = useState<GuildView>("rooms");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newGuildName, setNewGuildName] = useState("");
  const [newGuildDescription, setNewGuildDescription] = useState("");
  const [newGuildPolicy, setNewGuildPolicy] = useState<HalieusGuildRoomPolicy>("members");
  const [joinCode, setJoinCode] = useState("");
  const [roomGame, setRoomGame] = useState<GameId>("mega-board");
  const [messageBody, setMessageBody] = useState("");
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsPolicy, setSettingsPolicy] = useState<HalieusGuildRoomPolicy>("members");
  const [settingsPicture, setSettingsPicture] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [guildAction, setGuildAction] = useState<"join" | "create" | null>(null);
  const [directory, setDirectory] = useState<HalieusPlayerDirectoryEntry[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<HalieusGuildInvitation[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [invitingAccountId, setInvitingAccountId] = useState<string | null>(null);


  const liveByGuildRoom = useMemo(() => {
    const map = new Map<string, HalieusLiveRoomSummary>();
    for (const room of liveRooms) map.set(`${room.game}:${room.code}`, room);
    return map;
  }, [liveRooms]);

  async function loadGuilds(preferredId?: string | null) {
    try {
      const [result, people, invitations] = await Promise.all([
        accountApi<{ ok: true; guilds: HalieusGuildSummary[] }>("/guilds"),
        accountApi<{ ok: true; players: HalieusPlayerDirectoryEntry[] }>("/accounts/directory"),
        accountApi<{ ok: true; invitations: HalieusGuildInvitation[] }>("/guilds/invitations"),
      ]);
      setGuilds(result.guilds);
      setDirectory(people.players);
      setIncomingInvitations(invitations.invitations);
      setSelectedGuildId((current) => {
        const preferred = preferredId ?? current;
        if (preferred && result.guilds.some((guild) => guild.id === preferred)) return preferred;
        return result.guilds[0]?.id ?? null;
      });
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load guilds.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(guildId: string, quiet = false) {
    if (!quiet) setDetailLoading(true);
    try {
      const result = await accountApi<{ ok: true; guild: HalieusGuildDetail }>(`/guilds/${encodeURIComponent(guildId)}`);
      setDetail(result.guild);
      // Background chat/room polling must not overwrite an admin who is
      // actively typing in the settings form.
      if (!quiet) {
        setSettingsName(result.guild.name);
        setSettingsDescription(result.guild.description);
        setSettingsPolicy(result.guild.roomCreationPolicy);
        setSettingsPicture(result.guild.picture);
      }
      setGuilds((current) => current.map((guild) => guild.id === result.guild.id ? {
        ...guild,
        name: result.guild.name,
        description: result.guild.description,
        picture: result.guild.picture,
        updatedAt: result.guild.updatedAt,
        memberCount: result.guild.memberCount,
        roomCount: result.guild.roomCount,
        roomCreationPolicy: result.guild.roomCreationPolicy,
        role: result.guild.role,
        canManage: result.guild.canManage,
        canCreateRooms: result.guild.canCreateRooms,
        inviteCode: result.guild.inviteCode,
      } : guild));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load that guild.");
    } finally {
      if (!quiet) setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadGuilds();
    const poll = window.setInterval(() => void loadGuilds(), 10_000);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!selectedGuildId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedGuildId);
    const poll = window.setInterval(() => void loadDetail(selectedGuildId, true), 5000);
    return () => window.clearInterval(poll);
  }, [selectedGuildId]);

  async function createGuild(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const result = await accountApi<{ ok: true; guild: HalieusGuildDetail }>("/guilds", {
        method: "POST",
        body: JSON.stringify({
          name: newGuildName,
          description: newGuildDescription,
          roomCreationPolicy: newGuildPolicy,
        }),
      });
      setNewGuildName("");
      setNewGuildDescription("");
      setGuildAction(null);
      setDetail(result.guild);
      setSelectedGuildId(result.guild.id);
      setNotice(`${result.guild.name} created.`);
      await loadGuilds(result.guild.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create that guild.");
    } finally {
      setBusy(false);
    }
  }

  async function joinGuild(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const result = await accountApi<{ ok: true; guild: HalieusGuildDetail }>("/guilds/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      setJoinCode("");
      setGuildAction(null);
      setDetail(result.guild);
      setSelectedGuildId(result.guild.id);
      setNotice(`Joined ${result.guild.name}.`);
      await loadGuilds(result.guild.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to join that guild.");
    } finally {
      setBusy(false);
    }
  }

  async function createGuildRoom() {
    if (!detail) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await accountApi<{ ok: true; room: HalieusGuildRoom; guild: HalieusGuildDetail }>(
        `/guilds/${encodeURIComponent(detail.id)}/rooms`,
        { method: "POST", body: JSON.stringify({ game: roomGame }) },
      );
      setDetail(result.guild);
      setNotice(`${result.room.gameTitle} room ${result.room.roomCode} reserved for ${detail.name}.`);
      onCreateRoom(result.room.game as GameId, result.room.roomCode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create a guild room.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!detail || !messageBody.trim()) return;
    setBusy(true);
    try {
      await accountApi<{ ok: true }>(`/guilds/${encodeURIComponent(detail.id)}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: messageBody }),
      });
      setMessageBody("");
      await loadDetail(detail.id, true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send that message.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMessage(messageId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await accountApi<{ ok: true }>(
        `/guilds/${encodeURIComponent(detail.id)}/messages/${encodeURIComponent(messageId)}`,
        { method: "DELETE" },
      );
      await loadDetail(detail.id, true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove that guild message.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setBusy(true);
    try {
      const result = await accountApi<{ ok: true; guild: HalieusGuildDetail }>(`/guilds/${encodeURIComponent(detail.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: settingsName,
          description: settingsDescription,
          picture: settingsPicture,
          roomCreationPolicy: settingsPolicy,
        }),
      });
      setDetail(result.guild);
      setSettingsPicture(result.guild.picture);
      setSettingsOpen(false);
      setNotice("Guild settings saved.");
      await loadGuilds(result.guild.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save guild settings.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateInvite() {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await accountApi<{ ok: true; guild: HalieusGuildDetail }>(
        `/guilds/${encodeURIComponent(detail.id)}/invite/regenerate`,
        { method: "POST" },
      );
      setDetail(result.guild);
      setNotice("Guild invite code regenerated.");
      await loadGuilds(result.guild.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to regenerate the invite code.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!detail?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(detail.inviteCode);
      setNotice("Guild invite code copied.");
    } catch {
      setNotice(`Invite code: ${detail.inviteCode}`);
    }
  }

  function openGuildSettings() {
    if (!detail) return;
    setSettingsName(detail.name);
    setSettingsDescription(detail.description);
    setSettingsPolicy(detail.roomCreationPolicy);
    setSettingsPicture(detail.picture);
    setSettingsOpen(true);
  }

  function chooseGuildPicture(file: File | null) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) {
      setError("Guild picture must be a PNG, JPEG or WebP under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSettingsPicture(reader.result);
        setError("");
      }
    };
    reader.onerror = () => setError("Unable to read that guild picture.");
    reader.readAsDataURL(file);
  }

  async function sendGuildInvitation(player: HalieusPlayerDirectoryEntry) {
    if (!detail) return;
    setInvitingAccountId(player.id);
    setNotice("");
    try {
      const result = await accountApi<{ ok: true; invitation: HalieusGuildInvitation; guild: HalieusGuildDetail }>(
        `/guilds/${encodeURIComponent(detail.id)}/invitations`,
        { method: "POST", body: JSON.stringify({ accountId: player.id }) },
      );
      setDetail(result.guild);
      setInviteSearch("");
      setNotice(`Invitation sent to ${player.displayName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to invite that player.");
    } finally {
      setInvitingAccountId(null);
    }
  }

  async function respondGuildInvitation(invitation: HalieusGuildInvitation, action: "accept" | "decline") {
    setBusy(true);
    try {
      const result = await accountApi<{ ok: true; invitation: HalieusGuildInvitation; guild: HalieusGuildDetail | null }>(
        `/guilds/invitations/${encodeURIComponent(invitation.id)}/respond`,
        { method: "POST", body: JSON.stringify({ action }) },
      );
      setIncomingInvitations((current) => current.filter((item) => item.id !== invitation.id));
      if (result.guild) {
        setDetail(result.guild);
        setSelectedGuildId(result.guild.id);
        setNotice(`Joined ${result.guild.name}.`);
        await loadGuilds(result.guild.id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to respond to that guild invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(accountId: string, role: Exclude<HalieusGuildRole, "owner">) {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await accountApi<{ ok: true; guild: HalieusGuildDetail }>(
        `/guilds/${encodeURIComponent(detail.id)}/members/${encodeURIComponent(accountId)}/role`,
        { method: "POST", body: JSON.stringify({ role }) },
      );
      setDetail(result.guild);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to change that guild role.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(accountId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await accountApi<{ ok: true }>(
        `/guilds/${encodeURIComponent(detail.id)}/members/${encodeURIComponent(accountId)}`,
        { method: "DELETE" },
      );
      if (accountId === account.id) {
        setDetail(null);
        setSelectedGuildId(null);
        await loadGuilds(null);
      } else {
        await loadDetail(detail.id);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove that guild member.");
    } finally {
      setBusy(false);
    }
  }

  function roomActions(room: HalieusGuildRoom) {
    const live = liveByGuildRoom.get(`${room.game}:${room.roomCode}`) ?? null;
    if (live) {
      return (
        <div className="halieus-guild-room-actions">
          {live.joinable && <button type="button" className="button-primary" onClick={() => onOpenLiveRoom(live, "join")}>Join</button>}
          {live.spectatable && <button type="button" className="button-outline" onClick={() => onOpenLiveRoom(live, "watch")}>Spectate</button>}
        </div>
      );
    }
    if (room.status === "setup" && room.createdByAccountId === account.id) {
      return <button type="button" className="button-primary" onClick={() => onCreateRoom(room.game as GameId, room.roomCode)}>Open setup</button>;
    }
    if (room.status === "setup") return <small className="halieus-guild-room-waiting">Waiting for {room.createdByDisplayName}</small>;
    return <small>{room.winner ? `Winner: ${room.winner}` : "Session ended"}</small>;
  }

  if (loading) {
    return <section className="halieus-guilds-panel"><div className="halieus-guild-empty">Loading guilds…</div></section>;
  }

  return (
    <section className="halieus-guilds-panel">
      <header className="halieus-guilds-heading">
        <div>
          <p>GROUPS & GUILDS</p>
          <h1>Guilds</h1>
          <span>Persistent groups for chat, game rooms, members and your own internal table record.</span>
        </div>
        <div className="halieus-guild-heading-actions">
          <button type="button" className="button-outline" onClick={() => setGuildAction("join")}>Join guild</button>
          <button type="button" className="button-primary" onClick={() => setGuildAction("create")}>Create guild</button>
          <button type="button" className="button-muted" onClick={onBackToPlayers}>← Players</button>
        </div>
      </header>

      {guilds.length > 0 && <label className="halieus-guild-switcher">
        <span>ACTIVE GUILD</span>
        <select aria-label="Switch guild" value={selectedGuildId ?? ""} onChange={(event) => { setSelectedGuildId(event.target.value || null); setView("rooms"); }}>
          {guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name} · {guild.memberCount} members · {guild.roomCount} rooms</option>)}
        </select>
      </label>}

      {incomingInvitations.length > 0 && <section className="halieus-guild-incoming" aria-label="Guild invitations">
        <header><div><span>GUILD INVITATIONS</span><strong>You’ve been invited</strong></div><b>{incomingInvitations.length}</b></header>
        {incomingInvitations.map((invitation) => <article key={invitation.id}><GuildEmblem name={invitation.guildName} picture={invitation.guildPicture} /><div><strong>{invitation.guildName}</strong><small>{invitation.senderDisplayName} invited you</small></div><button type="button" className="button-primary" disabled={busy} onClick={() => void respondGuildInvitation(invitation, "accept")}>Accept</button><button type="button" className="button-muted" disabled={busy} onClick={() => void respondGuildInvitation(invitation, "decline")}>Decline</button></article>)}
      </section>}
      {error && <p className="halieus-guild-error" role="alert">{error}</p>}
      {notice && <p className="halieus-guild-notice" role="status">{notice}</p>}

      <div className={`halieus-guild-workspace ${selectedGuildId ? "has-selection" : ""}`}>
        <aside className="halieus-guild-list" aria-label="Your guilds">
          <header><strong>Your guilds</strong><span>{guilds.length}</span></header>
          {guilds.map((guild) => (
            <button type="button" key={guild.id} className={guild.id === selectedGuildId ? "is-selected" : ""} onClick={() => { setSelectedGuildId(guild.id); setView("rooms"); }}>
              <GuildEmblem name={guild.name} picture={guild.picture} />
              <div><strong>{guild.name}</strong><small>{guild.memberCount} members · {guild.roomCount} rooms</small></div>
              <b>{ROLE_LABELS[guild.role]}</b>
            </button>
          ))}
          {guilds.length === 0 && <div className="halieus-guild-empty">You are not in a guild yet. Create one or join with a private code.</div>}
        </aside>

        {selectedGuildId && detailLoading && !detail && <div className="halieus-guild-empty">Opening guild…</div>}

        {detail && detail.id === selectedGuildId && (
          <article className="halieus-guild-detail panel-enter">
            <header className="halieus-guild-hero">
              <GuildEmblem name={detail.name} picture={detail.picture} large />
              <div><p>{ROLE_LABELS[detail.role].toUpperCase()}</p><h2>{detail.name}</h2><span>{detail.description || "A private Halieus group."}</span></div>
              <div className="halieus-guild-hero-actions">
                <div className="halieus-guild-hero-stats"><span><strong>{detail.memberCount}</strong>members</span><span><strong>{detail.roomCount}</strong>rooms</span></div>
                {detail.canManage && <button type="button" className="button-outline" onClick={openGuildSettings}>Guild settings</button>}
              </div>
            </header>

            <nav className="halieus-guild-tabs" aria-label="Guild sections">
              {GUILD_TABS.map((tab) => (
                <button type="button" key={tab.id} className={view === tab.id ? "is-active" : ""} onClick={() => setView(tab.id)}>
                  <HgrIcon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {view === "rooms" && (
              <div className="halieus-guild-section">
                <section className="halieus-guild-create-room">
                  <div><small>GUILD GAME</small><strong>Start something for {detail.name}</strong><span>{ROOM_POLICY_LABELS[detail.roomCreationPolicy]} can reserve a game room.</span></div>
                  <div>
                    <select value={roomGame} onChange={(event) => setRoomGame(event.target.value as GameId)} disabled={!detail.canCreateRooms}>
                      {ACTIVE_GAME_CATALOG.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                    </select>
                    <button type="button" className="button-primary" disabled={busy || !detail.canCreateRooms} onClick={() => void createGuildRoom()}>Create guild room</button>
                  </div>
                </section>

                <section className="halieus-guild-room-list">
                  <header><div><small>ROOM HISTORY</small><strong>Games organised here</strong></div><span>{detail.rooms.length}</span></header>
                  {detail.rooms.map((room) => {
                    const game = GAME_BY_ID[room.game as GameId];
                    const live = liveByGuildRoom.get(`${room.game}:${room.roomCode}`) ?? null;
                    return (
                      <article key={room.id}>
                        <img src={game?.icon} alt="" />
                        <div>
                          <strong>{room.gameTitle}</strong>
                          <small>Room {room.roomCode} · {room.createdByDisplayName}</small>
                          <span>{live ? live.started ? "Live now" : "Open lobby" : room.status === "setup" ? "Setup reserved" : room.status === "completed" ? "Completed" : "Ended"}</span>
                          {room.status === "completed" && room.allHumanParticipantsWereGuildMembers === true && (
                            <em className="halieus-guild-result-scope is-internal">Guild result · counts internally</em>
                          )}
                          {room.status === "completed" && room.allHumanParticipantsWereGuildMembers === false && (
                            <em className="halieus-guild-result-scope is-mixed">Mixed party · global only</em>
                          )}
                        </div>
                        {roomActions(room)}
                      </article>
                    );
                  })}
                  {detail.rooms.length === 0 && <div className="halieus-guild-empty">No guild games yet. Create the first room above.</div>}
                </section>

              </div>
            )}

            {view === "chat" && (
              <div className="halieus-guild-chat">
                <div className="halieus-guild-messages">
                  {detail.messages.map((message) => {
                    const canDeleteMessage = message.senderAccountId === account.id || detail.role !== "member";
                    return <article key={message.id} className={message.senderAccountId === account.id ? "is-own" : message.senderAccountId === "system" ? "is-system" : ""}><header><strong>{message.senderDisplayName}</strong><span><small>{new Date(message.createdAt).toLocaleString()}</small>{canDeleteMessage && <button type="button" className="halieus-guild-message-delete" disabled={busy} onClick={() => void deleteMessage(message.id)} aria-label={`Remove message from ${message.senderDisplayName}`}>×</button>}</span></header><p>{message.body}</p></article>;
                  })}
                  {detail.messages.length === 0 && <div className="halieus-guild-empty">No messages yet. This chat stays with the guild between game nights.</div>}
                </div>
                <form onSubmit={sendMessage}><input value={messageBody} onChange={(event) => setMessageBody(event.target.value)} maxLength={600} placeholder={`Message ${detail.name}…`} /><button type="submit" className="button-primary" disabled={busy || !messageBody.trim()}>Send</button></form>
              </div>
            )}

            {view === "leaderboard" && (
              <div className="halieus-guild-leaderboard">
                <header className="halieus-guild-leaderboard-intro">
                  <div>
                    <small>GUILD STANDINGS</small>
                    <strong>{detail.name} rankings</strong>
                    <span>Global rank comes from HGR's live Mega Board Ranked table. Guild record only counts completed rooms where every recorded human participant belonged to this guild's frozen pre-match membership snapshot.</span>
                  </div>
                  <span className="halieus-guild-global-source">Mega Board Ranked</span>
                </header>
                <div className="halieus-guild-leaderboard-head">
                  <span>Player</span><span>Global #</span><span>Rating</span><span>Guild games</span><span>Guild W/L</span><span>Hosted</span>
                </div>
                {detail.leaderboard.map((entry, index) => {
                  const global = entry.globalRanks.find((row) => row.game === "mega-board");
                  const losses = Math.max(0, entry.played - entry.wins);
                  return <article key={entry.accountId}>
                    <b>{index + 1}</b>
                    <strong>{entry.displayName}</strong>
                    <span className={global ? "has-global-rank" : "no-global-rank"}>{global ? `#${global.rank}` : "—"}</span>
                    <span className={global ? "has-global-rating" : "no-global-rank"}>{global ? global.rating.toLocaleString() : "—"}</span>
                    <span>{entry.played}</span>
                    <span>{entry.wins}–{losses}</span>
                    <span>{entry.hosted}</span>
                  </article>;
                })}
                {detail.leaderboard.length === 0 && <div className="halieus-guild-empty">Guild standings will appear when members have account or match history.</div>}
                <footer className="halieus-guild-leaderboard-note">Guild rank is informed by real global Mega Board rating where available, then falls back to eligible internal guild results. No separate guild Elo is created.</footer>
              </div>
            )}

            {view === "members" && (
              <div className="halieus-guild-members">
                {detail.canManage && <section className="halieus-guild-invite-players">
                  <header><div><small>INVITE PLAYERS</small><strong>Add people to {detail.name}</strong><span>Search existing Halieus accounts. They choose whether to join.</span></div></header>
                  <label><input value={inviteSearch} onChange={(event) => setInviteSearch(event.target.value)} placeholder="Search name or @username" /></label>
                  <div className="halieus-guild-invite-results">{directory
                    .filter((person) => person.id !== account.id && !detail.members.some((member) => member.accountId === person.id))
                    .filter((person) => !inviteSearch.trim() || `${person.displayName} ${person.username}`.toLowerCase().includes(inviteSearch.trim().toLowerCase()))
                    .sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName))
                    .map((person) => {
                      const pending = detail.pendingInvitations.some((invitation) => invitation.recipientAccountId === person.id);
                      return <PlayerIdentityCard
                        key={person.id}
                        player={person}
                        compact
                        detail={person.online ? "Online" : "Halieus player"}
                        trailing={<button type="button" className="button-primary" disabled={pending || invitingAccountId === person.id} onClick={() => void sendGuildInvitation(person)}>{pending ? "Invited" : invitingAccountId === person.id ? "Sending…" : "Add to guild"}</button>}
                      />;
                    })}
                    {directory.filter((person) => person.id !== account.id && !detail.members.some((member) => member.accountId === person.id)).length === 0 && <p className="halieus-guild-invite-empty">Everyone available is already in this guild.</p>}
                  </div>
                  {detail.pendingInvitations.length > 0 && <div className="halieus-guild-pending-invites"><small>PENDING</small>{detail.pendingInvitations.map((invitation) => <span key={invitation.id}><b>{invitation.recipientDisplayName}</b><em>Waiting for response</em></span>)}</div>}
                </section>}
                {detail.members.map((member) => {
                  const canEditRole = detail.canManage && member.role !== "owner" && member.accountId !== account.id;
                  const canRemove = member.accountId !== account.id && member.role !== "owner" && (
                    detail.canManage || (detail.role === "moderator" && member.role === "member")
                  );
                  return (
                    <PlayerIdentityCard
                      key={member.accountId}
                      className="halieus-guild-member-row"
                      compact
                      player={{
                        id: member.accountId,
                        username: member.username,
                        displayName: member.displayName,
                        avatar: member.avatar,
                        profilePicture: member.profilePicture,
                        playerColor: member.playerColor,
                      }}
                      detail={`joined ${new Date(member.joinedAt).toLocaleDateString()}`}
                      trailing={<>
                        {canEditRole ? (
                          <select value={member.role} disabled={busy} onChange={(event) => void changeRole(member.accountId, event.target.value as Exclude<HalieusGuildRole, "owner">)}>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="member">Member</option>
                          </select>
                        ) : <b>{ROLE_LABELS[member.role]}</b>}
                        {canRemove && <button type="button" className="halieus-guild-remove-member" disabled={busy} onClick={() => void removeMember(member.accountId)}>Remove</button>}
                        {member.accountId === account.id && member.role !== "owner" && <button type="button" className="halieus-guild-remove-member" disabled={busy} onClick={() => void removeMember(member.accountId)}>Leave</button>}
                      </>}
                    />
                  );
                })}
              </div>
            )}
          </article>
        )}
      </div>

      {guildAction && createPortal(
        <div className="halieus-guild-modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setGuildAction(null)}>
          <section className="halieus-guild-action-modal panel-enter" role="dialog" aria-modal="true" aria-label={guildAction === "join" ? "Join a guild" : "Create a guild"}>
            <header><div><p>{guildAction === "join" ? "JOIN A GUILD" : "CREATE A GUILD"}</p><h2>{guildAction === "join" ? "Enter a private guild" : "Start a new guild"}</h2><span>{guildAction === "join" ? "Use a private guild code you received." : "Create the group first, then invite Halieus players from Members."}</span></div><button type="button" onClick={() => setGuildAction(null)} aria-label="Close guild action">×</button></header>
            {guildAction === "join" ? <form onSubmit={joinGuild}>
              <label>Guild code<input autoFocus value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="GUILD-XXXX-XXXX" /></label>
              <footer><button type="button" className="button-muted" onClick={() => setGuildAction(null)}>Cancel</button><button type="submit" className="button-primary" disabled={busy || !joinCode.trim()}>Join guild</button></footer>
            </form> : <form onSubmit={createGuild}>
              <label>Guild name<input autoFocus value={newGuildName} onChange={(event) => setNewGuildName(event.target.value)} placeholder="Friday Game Night" maxLength={48} /></label>
              <label>Description<input value={newGuildDescription} onChange={(event) => setNewGuildDescription(event.target.value)} placeholder="What is this group for?" maxLength={240} /></label>
              <label>Who can create rooms?<select value={newGuildPolicy} onChange={(event) => setNewGuildPolicy(event.target.value as HalieusGuildRoomPolicy)}><option value="members">Any member</option><option value="moderators">Moderators +</option><option value="admins">Admins only</option></select></label>
              <footer><button type="button" className="button-muted" onClick={() => setGuildAction(null)}>Cancel</button><button type="submit" className="button-primary" disabled={busy || newGuildName.trim().length < 3}>Create guild</button></footer>
            </form>}
          </section>
        </div>,
        document.body,
      )}

      {settingsOpen && detail && createPortal(
        <div className="halieus-guild-modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setSettingsOpen(false)}>
          <form className="halieus-guild-settings-modal panel-enter" onSubmit={saveSettings} role="dialog" aria-modal="true" aria-label="Guild settings">
            <header><div><p>GUILD SETTINGS</p><h2>Organisation</h2><span>Identity, room permissions and private invitations.</span></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close guild settings">×</button></header>
            <section className="halieus-guild-picture-editor">
              <GuildEmblem name={settingsName || detail.name} picture={settingsPicture} large />
              <div><strong>Guild picture</strong><span>Optional · PNG, JPEG or WebP · up to 1 MB.</span><div><label className="button-outline">Upload picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseGuildPicture(event.target.files?.[0] ?? null)} /></label>{settingsPicture && <button type="button" className="button-muted" onClick={() => setSettingsPicture(null)}>Remove</button>}</div></div>
            </section>
            <label><span>Name</span><input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} maxLength={48} /></label>
            <label><span>Description</span><input value={settingsDescription} onChange={(event) => setSettingsDescription(event.target.value)} maxLength={240} /></label>
            <label><span>Who can create rooms?</span><select value={settingsPolicy} onChange={(event) => setSettingsPolicy(event.target.value as HalieusGuildRoomPolicy)}><option value="members">Any member</option><option value="moderators">Moderators +</option><option value="admins">Admins only</option></select></label>
            <section className="halieus-guild-settings-invite">
              <div><small>PRIVATE INVITE CODE</small><code>{detail.inviteCode ?? "Admin access required"}</code></div>
              <div><button type="button" className="button-outline" onClick={() => { setSettingsOpen(false); setInviteSearch(""); setView("members"); }}>Invite HGR players</button>{detail.inviteCode && <><button type="button" className="button-muted" onClick={() => void copyInvite()}>Copy code</button><button type="button" className="button-muted" onClick={() => void regenerateInvite()}>Regenerate</button></>}</div>
            </section>
            <footer><button type="button" className="button-muted" onClick={() => setSettingsOpen(false)}>Cancel</button><button type="submit" className="button-primary" disabled={busy || settingsName.trim().length < 3}>Save settings</button></footer>
          </form>
        </div>,
        document.body,
      )}
    </section>
  );
}
