import { type FormEvent, useEffect, useMemo, useState } from "react";

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
      }
      setGuilds((current) => current.map((guild) => guild.id === result.guild.id ? {
        ...guild,
        name: result.guild.name,
        description: result.guild.description,
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
          roomCreationPolicy: settingsPolicy,
        }),
      });
      setDetail(result.guild);
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
        <button type="button" className="button-outline" onClick={onBackToPlayers}>← Players</button>
      </header>

      <div className="halieus-guild-actions">
        <div><strong>{guilds.length ? "Your guild space" : "Start with a guild"}</strong><span>{guilds.length ? "Create or join another group only when you need to." : "Join with a private code or create a new group."}</span></div>
        <div>
          <button type="button" className={guildAction === "join" ? "button-primary" : "button-outline"} onClick={() => setGuildAction((current) => current === "join" ? null : "join")}>Join guild</button>
          <button type="button" className={guildAction === "create" ? "button-primary" : "button-outline"} onClick={() => setGuildAction((current) => current === "create" ? null : "create")}>Create guild</button>
        </div>
      </div>

      {guildAction && <div className="halieus-guild-join-create is-open">
        {guildAction === "join" ? <form onSubmit={joinGuild}>
          <span>JOIN A GUILD</span>
          <div><input autoFocus value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="GUILD-XXXX-XXXX" /><button type="submit" disabled={busy || !joinCode.trim()}>Join</button></div>
        </form> : <form onSubmit={createGuild}>
          <span>CREATE A GUILD</span>
          <input autoFocus value={newGuildName} onChange={(event) => setNewGuildName(event.target.value)} placeholder="Friday Game Night" maxLength={48} />
          <input value={newGuildDescription} onChange={(event) => setNewGuildDescription(event.target.value)} placeholder="What is this group for?" maxLength={240} />
          <div>
            <select value={newGuildPolicy} onChange={(event) => setNewGuildPolicy(event.target.value as HalieusGuildRoomPolicy)}>
              <option value="members">Any member can create rooms</option>
              <option value="moderators">Moderators + can create rooms</option>
              <option value="admins">Admins only can create rooms</option>
            </select>
            <button type="submit" disabled={busy || newGuildName.trim().length < 3}>Create</button>
          </div>
        </form>}
      </div>}

      {incomingInvitations.length > 0 && <section className="halieus-guild-incoming" aria-label="Guild invitations">
        <header><div><span>GUILD INVITATIONS</span><strong>You’ve been invited</strong></div><b>{incomingInvitations.length}</b></header>
        {incomingInvitations.map((invitation) => <article key={invitation.id}><span className="halieus-guild-emblem">{invitation.guildName.slice(0, 2).toUpperCase()}</span><div><strong>{invitation.guildName}</strong><small>{invitation.senderDisplayName} invited you</small></div><button type="button" className="button-primary" disabled={busy} onClick={() => void respondGuildInvitation(invitation, "accept")}>Accept</button><button type="button" className="button-muted" disabled={busy} onClick={() => void respondGuildInvitation(invitation, "decline")}>Decline</button></article>)}
      </section>}
      {error && <p className="halieus-guild-error" role="alert">{error}</p>}
      {notice && <p className="halieus-guild-notice" role="status">{notice}</p>}

      <div className={`halieus-guild-workspace ${selectedGuildId ? "has-selection" : ""}`}>
        <aside className="halieus-guild-list" aria-label="Your guilds">
          <header><strong>Your guilds</strong><span>{guilds.length}</span></header>
          {guilds.map((guild) => (
            <button type="button" key={guild.id} className={guild.id === selectedGuildId ? "is-selected" : ""} onClick={() => { setSelectedGuildId(guild.id); setView("rooms"); }}>
              <span className="halieus-guild-emblem">{guild.name.slice(0, 2).toUpperCase()}</span>
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
              <span className="halieus-guild-emblem is-large">{detail.name.slice(0, 2).toUpperCase()}</span>
              <div><p>{ROLE_LABELS[detail.role].toUpperCase()}</p><h2>{detail.name}</h2><span>{detail.description || "A private Halieus group."}</span></div>
              <div className="halieus-guild-hero-stats"><span><strong>{detail.memberCount}</strong>members</span><span><strong>{detail.roomCount}</strong>rooms</span></div>
            </header>

            <nav className="halieus-guild-tabs" aria-label="Guild sections">
              {(["rooms", "chat", "leaderboard", "members"] as GuildView[]).map((tab) => (
                <button type="button" key={tab} className={view === tab ? "is-active" : ""} onClick={() => setView(tab)}>
                  {tab === "rooms" ? "🎲 Rooms" : tab === "chat" ? "💬 Chat" : tab === "leaderboard" ? "🏆 Leaderboard" : "👥 Members"}
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
                        <div><strong>{room.gameTitle}</strong><small>Room {room.roomCode} · {room.createdByDisplayName}</small><span>{live ? live.started ? "Live now" : "Open lobby" : room.status === "setup" ? "Setup reserved" : room.status === "completed" ? "Completed" : "Ended"}</span></div>
                        {roomActions(room)}
                      </article>
                    );
                  })}
                  {detail.rooms.length === 0 && <div className="halieus-guild-empty">No guild games yet. Create the first room above.</div>}
                </section>

                {detail.canManage && (
                  <form className="halieus-guild-settings" onSubmit={saveSettings}>
                    <header><small>GUILD SETTINGS</small><strong>Organisation</strong></header>
                    <label><span>Name</span><input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} /></label>
                    <label><span>Description</span><input value={settingsDescription} onChange={(event) => setSettingsDescription(event.target.value)} /></label>
                    <label><span>Who can create rooms?</span><select value={settingsPolicy} onChange={(event) => setSettingsPolicy(event.target.value as HalieusGuildRoomPolicy)}><option value="members">Any member</option><option value="moderators">Moderators +</option><option value="admins">Admins only</option></select></label>
                    <button type="submit" className="button-outline" disabled={busy}>Save settings</button>
                    <div className="halieus-guild-invite"><span><small>INVITE PEOPLE</small><code>{detail.inviteCode ?? "Admin access required"}</code></span><button type="button" className="halieus-guild-platform-invite" onClick={() => { setInviteSearch(""); setView("members"); }}>Invite HGR players</button>{detail.inviteCode && <><button type="button" onClick={() => void copyInvite()}>Copy code</button><button type="button" onClick={() => void regenerateInvite()}>Regenerate</button></>}</div>
                  </form>
                )}
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
                <header><div><small>INTERNAL LEADERBOARD</small><strong>{detail.name} table record</strong><span>Only completed rooms created through this guild count here.</span></div></header>
                <div className="halieus-guild-leaderboard-head"><span>Player</span><span>Played</span><span>Wins</span><span>Win rate</span><span>Hosted</span></div>
                {detail.leaderboard.map((entry, index) => <article key={entry.accountId}><b>{index + 1}</b><span className="halieus-guild-player-dot" style={{ background: entry.playerColor }} /><strong>{entry.displayName}</strong><span>{entry.played}</span><span>{entry.wins}</span><span>{entry.winRate}%</span><span>{entry.hosted}</span></article>)}
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
                  return <article key={member.accountId} className="halieus-guild-member-row"><span className="halieus-avatar-media" style={{ background: member.playerColor }}>{member.profilePicture ? <img src={member.profilePicture} alt="" /> : member.avatar}</span><div><strong>{member.displayName}</strong><small>@{member.username} · joined {new Date(member.joinedAt).toLocaleDateString()}</small></div>{canEditRole ? <select value={member.role} disabled={busy} onChange={(event) => void changeRole(member.accountId, event.target.value as Exclude<HalieusGuildRole, "owner">)}><option value="admin">Admin</option><option value="moderator">Moderator</option><option value="member">Member</option></select> : <b>{ROLE_LABELS[member.role]}</b>}{canRemove && <button type="button" className="halieus-guild-remove-member" disabled={busy} onClick={() => void removeMember(member.accountId)}>Remove</button>}{member.accountId === account.id && member.role !== "owner" && <button type="button" className="halieus-guild-remove-member" disabled={busy} onClick={() => void removeMember(member.accountId)}>Leave</button>}</article>;
                })}
              </div>
            )}
          </article>
        )}
      </div>
    </section>
  );
}
