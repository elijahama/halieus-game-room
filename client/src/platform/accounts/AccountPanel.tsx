import { ModalPortal } from "../components/ModalPortal";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import type {
  HalieusAccountSummary,
  HalieusAdminSnapshot,
  HalieusAccessRequestSummary,
  HalieusAuditEntry,
  HalieusInviteSummary,
  HalieusPersonalStats,
} from "../../../../shared/platform/accounts";
import type { HalieusFeedbackStatus, HalieusFeedbackSummary } from "../../../../shared/platform/feedback";
import { GAME_CATALOG } from "../games/catalog";
import { accountApi } from "./api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DisplaySettingsPanel } from "../components/DisplaySettingsPanel";
import { HgrIcon } from "../components/HgrIcon";
import { APP_RELEASE_LABEL, RELEASE_FINGERPRINT } from "../../version";

interface Props {
  account: HalieusAccountSummary;
  onClose: () => void;
  onAccountChange: (account: HalieusAccountSummary) => void;
  onLogout: () => void;
  betaMode: boolean;
  onEnterBetaMode: () => void;
  onExitBetaMode: () => void;
}

type AdminTab = "overview" | "players" | "invites" | "codes" | "requests" | "rooms" | "feedback" | "audit" | "test-lab" | "account";
type FreshCodeKind = "invite" | "reset";
type InviteFilter = "all" | "active" | "used" | "revoked" | "expired";

const PROFILE_FEEDBACK_CATEGORIES = ["Bug", "UI / layout", "Gameplay / rules", "Account / profile", "Suggestion", "Other"] as const;

function when(value: number | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function shortWhen(value: number | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function inviteStatus(invite: HalieusInviteSummary): "active" | "used" | "revoked" | "expired" {
  if (invite.usedAt) return "used";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && invite.expiresAt < Date.now()) return "expired";
  return "active";
}

function auditTitle(entry: HalieusAuditEntry): string {
  const labels: Record<string, string> = {
    "owner.created": "Owner account created",
    "session.login": "Player signed in",
    "session.logout": "Player signed out",
    "account.created.invite": "Player account created",
    "account.profile-updated": "Player profile updated",
    "account.username-changed": "Username changed",
    "account.password-changed": "Password changed",
    "account.password-reset": "Password reset completed",
    "account.reset-issued": "Password reset issued",
    "account.sessions-revoked": "Player signed out everywhere",
    "account.role-changed": "Account role changed",
    "account.active": "Account activated",
    "account.suspended": "Account suspended",
    "account.deleted": "Account deleted",
    "invite.created": "Account invite created",
    "invite.revoked": "Account invite revoked",
    "access-request.created": "Access requested",
    "access-request.approved": "Access request approved",
    "access-request.declined": "Access request declined",
    "rooms.close-all": "All live rooms closed",
  };
  return labels[entry.action] ?? entry.action.replace(/[.-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function AccountPanel({ account, onClose, onAccountChange, onLogout, betaMode, onEnterBetaMode, onExitBetaMode }: Props) {
  const isAdmin = account.role === "owner" || account.role === "admin";
  const isOwner = account.role === "owner";
  const [adminTab, setAdminTab] = useState<AdminTab>("account");
  const [snapshot, setSnapshot] = useState<HalieusAdminSnapshot | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState(account.username);
  const [displayName, setDisplayName] = useState(account.displayName);
  const [avatar, setAvatar] = useState(account.avatar);
  const [profilePicture, setProfilePicture] = useState<string | null>(account.profilePicture);
  const [playerColor, setPlayerColor] = useState(account.playerColor);
  const [inviteLabel, setInviteLabel] = useState("");
  const [inviteDays, setInviteDays] = useState(7);
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>("active");
  const [freshCode, setFreshCode] = useState<string | null>(null);
  const [freshCodeLabel, setFreshCodeLabel] = useState("");
  const [freshCodeKind, setFreshCodeKind] = useState<FreshCodeKind>("invite");
  const [revealedInviteCodes, setRevealedInviteCodes] = useState<Record<string, string>>({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [activeRoomCount, setActiveRoomCount] = useState(0);
  const [closingRooms, setClosingRooms] = useState(false);
  const [personalStats, setPersonalStats] = useState<HalieusPersonalStats | null>(null);
  const [myFeedback, setMyFeedback] = useState<HalieusFeedbackSummary[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<HalieusFeedbackSummary[]>([]);
  const [feedbackSubject, setFeedbackSubject] = useState("general");
  const [feedbackCategory, setFeedbackCategory] = useState<(typeof PROFILE_FEEDBACK_CATEGORIES)[number]>("Suggestion");
  const [feedbackDetails, setFeedbackDetails] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackReplyDrafts, setFeedbackReplyDrafts] = useState<Record<string, string>>({});
  const [confirmRequest, setConfirmRequest] = useState<{ title: string; message: string; label: string; action: () => void } | null>(null);
  const [buildInfoOpen, setBuildInfoOpen] = useState(false);

  async function refreshAdmin() {
    if (!isAdmin) return;
    setLoadingAdmin(true);
    try {
      const [result, roomResult, feedbackResult] = await Promise.all([
        accountApi<{ ok: true } & HalieusAdminSnapshot>("/admin/snapshot"),
        accountApi<{ ok: true; activeRooms: number }>("/admin/rooms/status").catch(() => ({ ok: true as const, activeRooms: 0 })),
        accountApi<{ ok: true; feedback: HalieusFeedbackSummary[] }>("/admin/feedback").catch(() => ({ ok: true as const, feedback: [] })),
      ]);
      setSnapshot({ accounts: result.accounts, onlineAccountIds: result.onlineAccountIds, invites: result.invites, accessRequests: result.accessRequests, audit: result.audit });
      setActiveRoomCount(roomResult.activeRooms);
      setAdminFeedback(feedbackResult.feedback);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load player management.");
    } finally { setLoadingAdmin(false); }
  }

  useEffect(() => { void refreshAdmin(); }, [isAdmin]);

  // Invite Codes is an owner/admin utility view: when opened, resolve every code
  // the private server store can still provide so the owner can scan/copy them directly.
  useEffect(() => {
    if (!isAdmin || adminTab !== "codes" || !snapshot) return;
    const available = snapshot.invites.filter((invite) => invite.codeRevealAvailable);
    if (available.length === 0) return;
    let cancelled = false;
    void Promise.all(available.map(async (invite) => {
      try {
        const result = await accountApi<{ ok: true; code: string }>(`/admin/invites/${invite.id}/code`);
        return [invite.id, result.code] as const;
      } catch {
        return null;
      }
    })).then((pairs) => {
      if (cancelled) return;
      setRevealedInviteCodes((current) => {
        const next = { ...current };
        for (const pair of pairs) if (pair) next[pair[0]] = pair[1];
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [adminTab, isAdmin, snapshot]);

  useEffect(() => {
    let cancelled = false;
    void accountApi<{ ok: true; stats: HalieusPersonalStats }>("/accounts/me/stats")
      .then((result) => { if (!cancelled) setPersonalStats(result.stats); })
      .catch(() => { if (!cancelled) setPersonalStats(null); });
    return () => { cancelled = true; };
  }, [account.id, account.displayName]);

  useEffect(() => {
    let cancelled = false;
    void accountApi<{ ok: true; feedback: HalieusFeedbackSummary[] }>("/feedback/mine")
      .then((result) => { if (!cancelled) setMyFeedback(result.feedback); })
      .catch(() => { if (!cancelled) setMyFeedback([]); });
    return () => { cancelled = true; };
  }, [account.id]);

  function chooseProfilePicture(file: File | null) {
    if (!file) return;
    if (!/^image\/(?:png|jpeg|webp)$/i.test(file.type)) { setMessage("Choose a PNG, JPEG or WebP image."); return; }
    if (file.size > 1_000_000) { setMessage("Profile pictures must be under 1 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") { setProfilePicture(reader.result); setMessage("Profile picture ready. Save your profile to apply it."); } };
    reader.onerror = () => setMessage("Unable to read that profile picture.");
    reader.readAsDataURL(file);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      const result = await accountApi<{ ok: true; account: HalieusAccountSummary }>("/auth/profile", { method: "POST", body: JSON.stringify({ username, displayName, avatar, profilePicture, playerColor }) });
      onAccountChange(result.account); setMessage("Player profile updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update profile."); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setMessage("");
    try {
      await accountApi("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword(""); setNewPassword(""); setMessage("Password changed. Other sessions were signed out.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to change password."); }
  }

  async function createInvite(event: FormEvent) {
    event.preventDefault(); setFreshCode(null); setMessage("");
    try {
      const label = inviteLabel.trim() || "Player invite";
      const result = await accountApi<{ ok: true; code: string }>("/admin/invites", { method: "POST", body: JSON.stringify({ label, expiryDays: inviteDays }) });
      setFreshCode(result.code); setFreshCodeLabel(label); setFreshCodeKind("invite"); setInviteLabel(""); await refreshAdmin();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create invite."); }
  }

  async function revealInviteCode(inviteId: string) {
    setMessage("");
    try {
      const result = await accountApi<{ ok: true; code: string }>(`/admin/invites/${inviteId}/code`);
      setRevealedInviteCodes((current) => ({ ...current, [inviteId]: result.code }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reveal that invite code.");
    }
  }

  async function adminAction(path: string, body?: unknown, codeLabel?: string, codeKind: FreshCodeKind = "reset") {
    setMessage("");
    try {
      const result = await accountApi<{ ok: true; code?: string }>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
      if (result.code) { setFreshCode(result.code); setFreshCodeLabel(codeLabel ?? "One-time code"); setFreshCodeKind(codeKind); }
      await refreshAdmin();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Administrative action failed."); }
  }


  function requestCloseAllRooms() {
    if (closingRooms || activeRoomCount === 0) return;
    setConfirmRequest({
      title: "Close every live room?",
      message: `Close all ${activeRoomCount} live Halieus room${activeRoomCount === 1 ? "" : "s"}? Everyone in an open game will be returned to the Game Room.`,
      label: "Close all rooms",
      action: () => { void closeAllRooms(); },
    });
  }

  function requestDeletePlayer(player: HalieusAccountSummary) {
    setConfirmRequest({
      title: `Delete ${player.displayName}?`,
      message: `This permanently disables @${player.username}'s Halieus account. Their historical match records remain archived.`,
      label: "Delete account",
      action: () => { void adminAction(`/admin/accounts/${player.id}/status`, { status: "deleted" }); },
    });
  }
  async function submitProfileFeedback(event: FormEvent) {
    event.preventDefault();
    const details = feedbackDetails.trim();
    if (details.length < 4 || feedbackSending) return;
    setFeedbackSending(true);
    setMessage("");
    try {
      const game = feedbackSubject === "general" ? null : GAME_CATALOG.find((candidate) => candidate.id === feedbackSubject) ?? null;
      const result = await accountApi<{ ok: true; feedback: HalieusFeedbackSummary }>("/feedback", {
        method: "POST",
        body: JSON.stringify({
          source: "profile",
          category: feedbackCategory,
          details,
          gameId: game?.id ?? null,
          gameName: game?.name ?? null,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
      setMyFeedback((current) => [result.feedback, ...current.filter((entry) => entry.id !== result.feedback.id)]);
      setFeedbackDetails("");
      setMessage("Feedback sent. Any reply will appear here.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send feedback.");
    } finally {
      setFeedbackSending(false);
    }
  }

  async function replyToFeedback(feedbackId: string) {
    const reply = feedbackReplyDrafts[feedbackId]?.trim() ?? "";
    if (reply.length < 2) return;
    setMessage("");
    try {
      const result = await accountApi<{ ok: true; feedback: HalieusFeedbackSummary }>(`/admin/feedback/${feedbackId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: reply }),
      });
      setAdminFeedback((current) => current.map((entry) => entry.id === feedbackId ? result.feedback : entry));
      setFeedbackReplyDrafts((current) => ({ ...current, [feedbackId]: "" }));
      setMessage("Feedback reply sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reply to feedback.");
    }
  }

  async function updateFeedbackStatus(feedbackId: string, status: HalieusFeedbackStatus) {
    setMessage("");
    try {
      const result = await accountApi<{ ok: true; feedback: HalieusFeedbackSummary }>(`/admin/feedback/${feedbackId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      setAdminFeedback((current) => current.map((entry) => entry.id === feedbackId ? result.feedback : entry));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update feedback.");
    }
  }

  async function closeAllRooms() {
    if (closingRooms) return;
    setClosingRooms(true); setMessage("");
    try {
      const result = await accountApi<{ ok: true; closed: number }>("/admin/rooms/close-all", { method: "POST" });
      setMessage(`${result.closed} live room${result.closed === 1 ? "" : "s"} closed site-wide.`);
      await refreshAdmin();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to close live rooms.");
    } finally { setClosingRooms(false); }
  }

  async function copy(value: string, label: string) {
    try {
      await copyText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Unable to copy ${label.toLowerCase()}. Select it manually instead.`);
    }
  }

  const pendingCount = useMemo(() => snapshot?.accessRequests.filter((request) => request.status === "pending").length ?? 0, [snapshot]);
  const activeInviteCount = useMemo(() => snapshot?.invites.filter((invite) => inviteStatus(invite) === "active").length ?? 0, [snapshot]);
  const openFeedbackCount = useMemo(() => adminFeedback.filter((entry) => entry.status !== "closed").length, [adminFeedback]);
  const freshInviteUrl = freshCode && freshCodeKind === "invite" ? `${window.location.origin}/?account-invite=${encodeURIComponent(freshCode)}` : null;
  const filteredInvites = useMemo(() => (snapshot?.invites ?? []).filter((invite) => inviteFilter === "all" || inviteStatus(invite) === inviteFilter), [snapshot, inviteFilter]);
  const personalFavourite = useMemo(() => personalStats?.byGame.slice().sort((a, b) => b.played - a.played || b.wins - a.wins)[0] ?? null, [personalStats]);
  const currentWinStreak = useMemo(() => {
    if (!personalStats) return 0;
    let streak = 0;
    for (const result of personalStats.recent) {
      if (!result.won) break;
      streak += 1;
    }
    return streak;
  }, [personalStats]);

  const profileSettings = (
    <section className="account-self-service">
      {isAdmin && <header className="account-self-service-heading"><div><p className="modal-eyebrow">Your account</p><h3>Profile & security</h3></div><button type="button" className="button-outline account-open-owner-tools" onClick={() => setAdminTab("overview")}>Owner tools →</button></header>}
      <div className="account-profile-grid">
        <form className="account-settings-card" onSubmit={saveProfile}>
          <div><p className="modal-eyebrow">Player profile</p><h3>Your Halieus identity</h3></div>
          <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} /><small className="account-field-help">Shown to other players in Halieus and in games.</small></label>
          <div className="account-username-setting"><span><strong>Sign-in username</strong><small>@{account.username}</small></span><button type="button" className="button-outline" onClick={() => { setEditingUsername(!editingUsername); setUsername(account.username); }}>{editingUsername ? "Cancel edit" : "Edit username"}</button></div>
          {editingUsername && (<label>Sign-in username<div className="account-username-input"><span>@</span><input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} minLength={3} maxLength={32} autoComplete="username" required /></div><small className="account-field-help">This is your account login — it does not need to be an email address. You can change it without losing your account or game history.</small></label>)}

          <div className="account-profile-picture-editor"><span className="account-profile-picture-preview" style={{ background: playerColor }}>{profilePicture ? <img src={profilePicture} alt="Profile preview" /> : avatar}</span><div><label className="button-outline account-picture-upload">Upload profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseProfilePicture(event.target.files?.[0] ?? null)} /></label>{profilePicture && <button type="button" className="button-muted" onClick={() => setProfilePicture(null)}>Remove picture</button>}<small>Optional · PNG, JPEG or WebP · up to 1 MB.</small></div></div>
          <div className="account-profile-row"><label>Initials fallback<input value={avatar} onChange={(event) => setAvatar(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={3} /></label><label>Player colour<input type="color" value={playerColor} onChange={(event) => setPlayerColor(event.target.value)} /></label></div>
          <button type="submit" className="button-primary">Save profile</button>
        </form>
        <form className="account-settings-card" onSubmit={changePassword}>
          <div><p className="modal-eyebrow">Security</p><h3>Change password</h3></div>
          <label>Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
          <label>New password<input type="password" minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required /></label>
          <button type="submit" className="button-outline">Change password</button>
        </form>
      </div>
      <section className="account-appearance-card">
        <header className="account-appearance-heading"><div><p className="modal-eyebrow">Player settings</p><h3>Appearance</h3></div><small>Theme, text size and density follow you across HGR.</small></header>
        <DisplaySettingsPanel darkMode={false} onToggleDarkMode={() => {}} showFullscreen={false} onToggleFullscreen={() => {}} />
      </section>
      {personalStats?.progression && <section className="account-settings-card"><p className="modal-eyebrow">Achievements</p><h3>{personalStats.progression.gamerScore} GamerScore</h3><small>Earned from verified completed games. Separate from rankings and cosmetic currency.</small><div className="achievement-list">{personalStats.progression.awards.length ? personalStats.progression.awards.map(award => <article key={award.id}><strong>{award.title}</strong><span>+{award.points}</span><small>{new Date(award.earnedAt).toLocaleDateString()}</small></article>) : <p>Complete a game to earn your first achievement.</p>}</div></section>}
      {personalStats && <section className="account-game-record">
        <header><div><p className="modal-eyebrow">Your games</p><h3>Personal game record</h3></div><span>{personalStats.played} played · {personalStats.wins} won</span></header>
        <div className="account-stat-overview">
          <article><small>Games played</small><strong>{personalStats.played}</strong></article>
          <article><small>Wins</small><strong>{personalStats.wins}</strong></article>
          <article><small>Overall win rate</small><strong>{Math.round(personalStats.winRate)}%</strong></article>
          <article><small>Most played</small><strong>{personalFavourite?.gameTitle ?? "—"}</strong></article>
          <article><small>Current streak</small><strong>{currentWinStreak}</strong></article>
        </div>
        {personalStats.breakdown && <section className="account-stat-breakdown" aria-label="Win rate breakdown">
          <header><strong>Results by match type</strong><small>Human competition is kept separate from AI-involved and solo games.</small></header>
          <div>
            <article><span>Human only</span><strong>{personalStats.breakdown.humanOnly.winRate}%</strong><small>{personalStats.breakdown.humanOnly.wins}/{personalStats.breakdown.humanOnly.played} wins</small></article>
            <article><span>Ranked</span><strong>{personalStats.breakdown.ranked.winRate}%</strong><small>{personalStats.breakdown.ranked.wins}/{personalStats.breakdown.ranked.played} wins</small></article>
            <article><span>Casual</span><strong>{personalStats.breakdown.casual.winRate}%</strong><small>{personalStats.breakdown.casual.wins}/{personalStats.breakdown.casual.played} wins</small></article>
            <article><span>AI involved</span><strong>{personalStats.breakdown.aiInvolved.winRate}%</strong><small>{personalStats.breakdown.aiInvolved.wins}/{personalStats.breakdown.aiInvolved.played} wins</small></article>
            <article><span>Solo</span><strong>{personalStats.breakdown.solo.winRate}%</strong><small>{personalStats.breakdown.solo.wins}/{personalStats.breakdown.solo.played} wins</small></article>
          </div>
        </section>}
        <div className="account-game-record-grid">{personalStats.byGame.map((row) => <article key={row.game}><strong>{row.gameTitle}</strong><small>{row.played} played · {row.wins} won · {row.played ? Math.round((row.wins / row.played) * 100) : 0}% overall</small></article>)}</div>
        {personalStats.recent.length > 0 && <div className="account-game-record-recent"><h4>Recent results</h4>{personalStats.recent.slice(0, 6).map((item, index) => <article key={`${item.roomCode}-${item.at}-${index}`}><span><strong>{item.gameTitle}</strong><small>{new Date(item.at).toLocaleDateString()} · Room {item.roomCode}{item.matchMode ? ` · ${item.matchMode[0].toUpperCase() + item.matchMode.slice(1)}` : ""}{item.opponentType ? ` · ${item.opponentType === "human-only" ? "Human" : item.opponentType === "ai-involved" ? "AI involved" : "Solo"}` : ""}</small></span><b className={item.won ? "is-win" : ""}>{item.result}</b></article>)}</div>}
      </section>}
      <section className="account-feedback-card">
        <header><div><p className="modal-eyebrow">Feedback</p><h3>Send feedback</h3><small>Send a game issue, UI note or suggestion directly to the HGR owner. Replies stay attached to your account here.</small></div></header>
        <form className="account-feedback-form" onSubmit={submitProfileFeedback}>
          <label>About<select value={feedbackSubject} onChange={(event) => setFeedbackSubject(event.target.value)}><option value="general">Halieus Game Room / general</option>{GAME_CATALOG.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
          <label>Category<select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value as typeof feedbackCategory)}>{PROFILE_FEEDBACK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className="account-feedback-details">What should I know?<textarea value={feedbackDetails} onChange={(event) => setFeedbackDetails(event.target.value)} rows={5} maxLength={4000} placeholder="Describe what happened, what you expected, or what you would like changed." /></label>
          <button type="submit" className="button-primary" disabled={feedbackSending || feedbackDetails.trim().length < 4}>{feedbackSending ? "Sending…" : "Send feedback"}</button>
        </form>
        <div className="account-feedback-history">
          <div className="account-feedback-history-heading"><strong>Your feedback</strong><span>{myFeedback.length}</span></div>
          {myFeedback.length === 0 && <div className="account-empty-state"><strong>No feedback sent yet</strong><small>Your game and profile feedback will appear here once submitted.</small></div>}
          {myFeedback.slice(0, 20).map((entry) => <article key={entry.id} className={`feedback-status-${entry.status}`}>
            <header><div><strong>{entry.gameName ?? "Halieus Game Room"}</strong><small>{entry.category} · {when(entry.submittedAt)}{entry.roomCode ? ` · Room ${entry.roomCode}` : ""}</small></div><span className={`account-status-badge status-${entry.status}`}>{entry.status}</span></header>
            <p>{entry.details}</p>
            {entry.ownerReply && <div className="account-feedback-reply"><small>Reply from {entry.ownerReply.responderDisplayName}</small><p>{entry.ownerReply.message}</p><time>{when(entry.ownerReply.at)}</time></div>}
          </article>)}
        </div>
      </section>
    </section>
  );

  return (
    <ModalPortal onClose={onClose}><div className="account-panel-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="account-panel" role="dialog" aria-modal="true" aria-label="Halieus account">
        <header className="account-panel-header">
          <div className="account-profile-identity">
            <span className="account-profile-picture-preview" style={{ background: account.playerColor }}>{account.profilePicture ? <img src={account.profilePicture} alt="" /> : account.avatar}</span>
            <div><p>{account.role === "owner" ? "Halieus owner" : account.role === "admin" ? "Administrator" : "Approved player"}</p><h2>{account.displayName}</h2><small>@{account.username}</small></div>
          </div>
          <div className="account-panel-header-actions">
            <button type="button" className="button-outline account-build-info-button" onClick={() => setBuildInfoOpen(true)}><HgrIcon name="info" size={17} /><span>Build {APP_RELEASE_LABEL}</span></button>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close account panel">×</button>
          </div>
        </header>

        <div className="account-panel-scroll">
          {isAdmin && adminTab !== "account" && (
            <section className="account-admin-zone account-admin-zone-primary">
              <header className="account-admin-heading">
                <div><p className="modal-eyebrow">Owner tools</p><h3>Administration</h3><small>Player access, live rooms, testing and audit tools stay separate from your personal profile.</small></div>
                <div className="account-admin-heading-actions">
                  <button type="button" className="button-outline account-owner-back-profile" onClick={() => setAdminTab("account")}>← My profile</button>
                  <button type="button" className="account-refresh-button" onClick={() => void refreshAdmin()} disabled={loadingAdmin} aria-label="Refresh administration">↻ <span>{loadingAdmin ? "Refreshing…" : "Refresh"}</span></button>
                </div>
              </header>

              <nav className="account-owner-nav" aria-label="Owner control panel sections">
                <button type="button" className={adminTab === "overview" ? "is-active" : ""} onClick={() => setAdminTab("overview")}><span>⌂</span><div><strong>Overview</strong><small>{activeRoomCount} live · {pendingCount} pending</small></div></button>
                <button type="button" className={adminTab === "players" ? "is-active" : ""} onClick={() => setAdminTab("players")}><span>♟</span><div><strong>Players</strong><small>{snapshot?.accounts.length ?? 0} permanent</small></div></button>
                <button type="button" className={["invites","codes","requests"].includes(adminTab) ? "is-active" : ""} onClick={() => setAdminTab("invites")}><span>＋</span><div><strong>Invites</strong><small>{activeInviteCount} active · {pendingCount} requests</small></div></button>
                <button type="button" className={adminTab === "rooms" ? "is-active" : ""} onClick={() => setAdminTab("rooms")}><span>▣</span><div><strong>Rooms</strong><small>{activeRoomCount} live</small></div></button>
                <button type="button" className={adminTab === "feedback" ? "is-active" : ""} onClick={() => setAdminTab("feedback")}><span>✎</span><div><strong>Feedback</strong><small>{openFeedbackCount} active</small></div></button>
                <button type="button" className={adminTab === "audit" ? "is-active" : ""} onClick={() => setAdminTab("audit")}><span>≡</span><div><strong>Audit</strong><small>Account activity</small></div></button>
                <button type="button" className={adminTab === "test-lab" ? "is-active" : ""} onClick={() => setAdminTab("test-lab")}><span>β</span><div><strong>Test Lab</strong><small>{betaMode ? "Active" : "Off"}</small></div></button>
              </nav>

              {(adminTab === "overview" || adminTab === "rooms") && <div className="account-room-oversight">
                <div><span className={`account-room-live-dot ${activeRoomCount ? "is-live" : ""}`} /><div><strong>{activeRoomCount} live room{activeRoomCount === 1 ? "" : "s"}</strong><small>Across all Halieus games, including beta rooms.</small></div></div>
                <button type="button" className="account-close-all-rooms" onClick={requestCloseAllRooms} disabled={closingRooms || activeRoomCount === 0}>{closingRooms ? "Closing…" : "Close all rooms"}</button>
              </div>}

              {adminTab === "overview" && <section className="account-owner-overview account-admin-content-card">
                <div className="account-owner-metrics">
                  <article><span>Permanent players</span><strong>{snapshot?.accounts.length ?? 0}</strong><small>{snapshot?.onlineAccountIds.length ?? 0} online now</small></article>
                  <article><span>Live rooms</span><strong>{activeRoomCount}</strong><small>Across every game</small></article>
                  <article><span>Active invites</span><strong>{activeInviteCount}</strong><small>{pendingCount} access request{pendingCount === 1 ? "" : "s"}</small></article>
                  <article><span>Test Lab</span><strong>{betaMode ? "On" : "Off"}</strong><small>Stats {betaMode ? "excluded" : "normal"}</small></article>
                </div>
                <div className="account-owner-actions"><button type="button" className="button-primary" onClick={() => setAdminTab("invites")}>Create invite</button><button type="button" className="button-outline" onClick={() => setAdminTab("players")}>Manage players</button><button type="button" className="button-outline" onClick={() => setAdminTab("audit")}>View audit log</button></div>
              </section>}

              {adminTab === "rooms" && <section className="account-admin-content-card account-rooms-panel"><header className="account-content-heading"><div><p className="modal-eyebrow">Live operations</p><h4>Rooms</h4><small>Room lifecycle stays server-owned. Use individual game rooms for normal controls, or close every live room here when recovery is required.</small></div></header><div className="account-room-summary-card"><span className={`account-room-live-dot ${activeRoomCount ? "is-live" : ""}`} /><div><strong>{activeRoomCount ? `${activeRoomCount} room${activeRoomCount === 1 ? "" : "s"} currently live` : "No rooms are live"}</strong><small>Refresh to re-check the server before using the emergency close action.</small></div></div></section>}

              {freshCode && <div className={`account-one-time-code kind-${freshCodeKind}`}>
                <div className="account-code-copy"><span className="account-code-kicker">Ready to send</span><strong>{freshCodeLabel}</strong><small>{freshCodeKind === "invite" ? "This account invite is saved in your private Invite Codes tab for later viewing and copying." : "This one-time password reset code is shown only now."}</small></div>
                <div className="account-code-value"><code>{freshCode}</code>{freshInviteUrl && <small>{freshInviteUrl}</small>}</div>
                <div className="account-code-actions">
                  {freshInviteUrl && <button type="button" className="button-primary compact-button" onClick={() => void copy(freshInviteUrl, "Invite link")}>Copy invite link</button>}
                  <button type="button" className="button-outline compact-button" onClick={() => void copy(freshCode, freshCodeKind === "invite" ? "Invite code" : "Reset code")}>Copy code</button>
                  <button type="button" className="button-muted compact-button" onClick={() => setFreshCode(null)}>Done</button>
                </div>
              </div>}

              {["invites","codes","requests"].includes(adminTab) && <div className="account-invite-subnav"><button type="button" className={adminTab === "invites" ? "is-active" : ""} onClick={() => setAdminTab("invites")}>Create & history</button><button type="button" className={adminTab === "codes" ? "is-active" : ""} onClick={() => setAdminTab("codes")}>Invite codes</button><button type="button" className={adminTab === "requests" ? "is-active" : ""} onClick={() => setAdminTab("requests")}>Access requests{pendingCount ? ` · ${pendingCount}` : ""}</button></div>}

              {adminTab === "invites" && <div className="account-invites-layout account-admin-content-card">
                <form className="account-invite-create" onSubmit={createInvite}>
                  <div className="account-section-intro"><span className="account-step-badge">1</span><div><strong>Invite a new player</strong><small>Create permanent Halieus access for one specific person.</small></div></div>
                  <label>Who is this for?<input value={inviteLabel} onChange={(event) => setInviteLabel(event.target.value)} maxLength={40} placeholder="e.g. Jordan" autoFocus /></label>
                  <label>How long should it work?<select value={inviteDays} onChange={(event) => setInviteDays(Number(event.target.value))}><option value={1}>24 hours</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>
                  <button type="submit" className="button-primary account-generate-invite">Generate single-use invite</button>
                  <small className="account-form-footnote">After generation you will get a copyable link and code. New invitation codes remain privately revealable from this history even after they are used, revoked or expire.</small>
                </form>
                <section className="account-invite-history">
                  <header><div><p className="modal-eyebrow">Invite history</p><h4>Account invitations</h4></div><span>{activeInviteCount} active</span></header>
                  <div className="account-invite-filters" role="group" aria-label="Filter invitation history">
                    {(["active", "all", "used", "revoked", "expired"] as InviteFilter[]).map((filter) => <button key={filter} type="button" className={inviteFilter === filter ? "is-active" : ""} onClick={() => setInviteFilter(filter)}>{filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}</button>)}
                  </div>
                  <div className="account-invite-list">
                    {(snapshot?.invites ?? []).length === 0 && <div className="account-empty-state"><strong>No account invites yet</strong><small>Your first generated invite will appear here.</small></div>}
                    {(snapshot?.invites ?? []).length > 0 && filteredInvites.length === 0 && <div className="account-empty-state"><strong>No {inviteFilter} invites</strong><small>Choose another filter to view invitation history.</small></div>}
                    {filteredInvites.map((invite) => {
                      const status = inviteStatus(invite);
                      const usedBy = invite.usedByAccountId ? snapshot?.accounts.find((candidate) => candidate.id === invite.usedByAccountId) : null;
                      return <article key={invite.id} className={`invite-status-${status}`}>
                        <div className="account-invite-main"><div><strong>{invite.label}</strong><span className={`account-status-badge status-${status}`}>{status}</span></div><small>Code ending •••• {invite.codeLast4} · Created {when(invite.createdAt)}</small><em>{status === "used" ? `Used${usedBy ? ` by ${usedBy.displayName}` : ""} · ${when(invite.usedAt)}` : status === "revoked" ? `Revoked ${when(invite.revokedAt)}` : status === "expired" ? `Expired ${when(invite.expiresAt)}` : `Expires ${when(invite.expiresAt)}`}</em><button type="button" className="account-open-code-tab" onClick={() => setAdminTab("codes")}>{invite.codeRevealAvailable ? "View full code →" : "Code details →"}</button></div>
                        <div className="account-invite-actions">{status === "active" && <button type="button" onClick={() => void adminAction(`/admin/invites/${invite.id}/revoke`)}>Revoke</button>}</div>
                      </article>;
                    })}
                  </div>
                </section>
              </div>}

              {adminTab === "codes" && <section className="account-admin-content-card account-invite-codes-panel">
                <header className="account-content-heading account-invite-codes-heading">
                  <div><p className="modal-eyebrow">Private owner utility</p><h4>Invite codes</h4><small>Every invitation code Halieus can still recover is shown here in full. Copy the code or its invite link directly.</small></div>
                  <span>{snapshot?.invites.filter((invite) => invite.codeRevealAvailable).length ?? 0} available</span>
                </header>
                <div className="account-invite-codes-list">
                  {(snapshot?.invites ?? []).length === 0 && <div className="account-empty-state"><strong>No invitation codes yet</strong><small>Create an invite and it will appear here automatically.</small></div>}
                  {(snapshot?.invites ?? []).map((invite) => {
                    const status = inviteStatus(invite);
                    const code = revealedInviteCodes[invite.id];
                    const usedBy = invite.usedByAccountId ? snapshot?.accounts.find((candidate) => candidate.id === invite.usedByAccountId) : null;
                    const inviteUrl = code ? `${window.location.origin}/?account-invite=${encodeURIComponent(code)}` : null;
                    return <article key={invite.id} className={`account-invite-code-card invite-status-${status}`}>
                      <div className="account-invite-code-card-copy">
                        <div className="account-invite-code-card-title"><strong>{invite.label}</strong><span className={`account-status-badge status-${status}`}>{status}</span></div>
                        {invite.codeRevealAvailable ? (code ? <code>{code}</code> : <span className="account-code-loading">Loading full code…</span>) : <div className="account-invite-code-unavailable"><span>Legacy code unavailable</span><small>Only •••• {invite.codeLast4} was retained for this older invitation.</small></div>}
                        <small>Created {when(invite.createdAt)} · {status === "used" ? `Used${usedBy ? ` by ${usedBy.displayName}` : ""} ${when(invite.usedAt)}` : status === "revoked" ? `Revoked ${when(invite.revokedAt)}` : status === "expired" ? `Expired ${when(invite.expiresAt)}` : `Expires ${when(invite.expiresAt)}`}</small>
                      </div>
                      <div className="account-invite-code-card-actions">
                        {code && <button type="button" className="button-primary compact-button" onClick={() => void copy(code, "Invite code")}>Copy code</button>}
                        {inviteUrl && <button type="button" className="button-outline compact-button" onClick={() => void copy(inviteUrl, "Invite link")}>Copy link</button>}
                        {status === "active" && <button type="button" className="button-muted compact-button" onClick={() => void adminAction(`/admin/invites/${invite.id}/revoke`)}>Revoke</button>}
                      </div>
                    </article>;
                  })}
                </div>
              </section>}

              {adminTab === "players" && <section className="account-admin-content-card account-player-section">
                <header className="account-content-heading"><div><p className="modal-eyebrow">Permanent access</p><h4>Players</h4><small>See who joined, how they got access and when they last signed in.</small></div></header>
                <div className="account-player-admin-list">
                  {(snapshot?.accounts ?? []).map((player) => <article key={player.id} className={`account-player-admin-row status-${player.status}`}>
                    <span className="account-admin-avatar" style={{ background: player.playerColor }}>{player.profilePicture ? <img src={player.profilePicture} alt="" /> : player.avatar}</span>
                    <div className="account-admin-player-copy">
                      <div className="account-player-title"><strong>{player.displayName}</strong><span className={`account-presence-badge ${snapshot?.onlineAccountIds.includes(player.id) ? "is-online" : "is-offline"}`}><i />{snapshot?.onlineAccountIds.includes(player.id) ? "Online" : "Offline"}</span><span className={`account-status-badge status-${player.status}`}>{player.status}</span>{player.role !== "player" && <span className="account-role-badge">{player.role}</span>}{player.visibility === "hidden" && <span className="account-role-badge">hidden</span>}</div>
                      <small>@{player.username}</small>
                      <div className="account-player-meta"><span><b>Joined</b>{shortWhen(player.createdAt)}</span><span><b>Access via</b>{player.createdViaInviteLabel || (player.role === "owner" ? "Owner setup" : "Admin approval")}</span><span><b>Last login</b>{when(player.lastLoginAt)}</span></div>
                    </div>
                    <div className="account-admin-actions">
                      {player.role !== "owner" && player.status !== "deleted" && <button type="button" onClick={() => void adminAction(`/admin/accounts/${player.id}/visibility`, { visibility: player.visibility === "hidden" ? "visible" : "hidden" })}>{player.visibility === "hidden" ? "Make visible" : "Hide player"}</button>}
                      {player.role !== "owner" && player.status !== "deleted" && <button type="button" onClick={() => void adminAction(`/admin/accounts/${player.id}/status`, { status: player.status === "active" ? "suspended" : "active" })}>{player.status === "active" ? "Suspend" : "Reactivate"}</button>}
                      {player.role !== "owner" && player.status !== "deleted" && <button type="button" onClick={() => void adminAction(`/admin/accounts/${player.id}/password-reset`, undefined, `Password reset · ${player.displayName}`, "reset")}>Reset password</button>}
                      {player.status !== "deleted" && <button type="button" onClick={() => void adminAction(`/admin/accounts/${player.id}/revoke-sessions`)}>Sign out all</button>}
                      {isOwner && player.role !== "owner" && player.status !== "deleted" && <button type="button" onClick={() => void adminAction(`/admin/accounts/${player.id}/role`, { role: player.role === "admin" ? "player" : "admin" })}>{player.role === "admin" ? "Remove admin" : "Make admin"}</button>}
                      {player.role !== "owner" && player.status !== "deleted" && <button type="button" className="is-danger" onClick={() => requestDeletePlayer(player)}>Delete</button>}
                    </div>
                  </article>)}
                </div>
              </section>}

              {adminTab === "requests" && <section className="account-admin-content-card">
                <header className="account-content-heading"><div><p className="modal-eyebrow">Approval queue</p><h4>Access requests</h4><small>Approve only people you recognise. Approval creates a private one-time account invite.</small></div></header>
                <div className="account-request-list">
                  {(snapshot?.accessRequests ?? []).length === 0 && <div className="account-empty-state"><strong>No access requests</strong><small>Nothing needs your approval right now.</small></div>}
                  {(snapshot?.accessRequests ?? []).map((request: HalieusAccessRequestSummary) => <article key={request.id} className={`request-${request.status}`}><div><div className="account-request-title"><strong>{request.displayName}</strong><span className={`account-status-badge status-${request.status}`}>{request.status}</span></div><small>{request.preferredUsername ? `Preferred @${request.preferredUsername}` : "No username requested"} · Requested {when(request.createdAt)}</small>{request.note && <p>{request.note}</p>}</div>{request.status === "pending" && <div><button type="button" className="button-primary compact-button" onClick={() => void adminAction(`/admin/access-requests/${request.id}/approve`, undefined, `Approved invite · ${request.displayName}`, "invite")}>Approve & create invite</button><button type="button" className="button-outline compact-button" onClick={() => void adminAction(`/admin/access-requests/${request.id}/decline`)}>Decline</button></div>}</article>)}
                </div>
              </section>}

              {adminTab === "feedback" && <section className="account-admin-content-card account-feedback-admin">
                <header className="account-content-heading"><div><p className="modal-eyebrow">Player feedback</p><h4>Feedback inbox</h4><small>Game feedback and profile feedback arrive here with player, room and build context. Reply from HGR and the player sees it in their profile.</small></div><span>{openFeedbackCount} active</span></header>
                <div className="account-feedback-admin-list">
                  {adminFeedback.length === 0 && <div className="account-empty-state"><strong>No feedback yet</strong><small>Submitted game and profile feedback will appear here.</small></div>}
                  {adminFeedback.map((entry) => <article key={entry.id} className={`feedback-status-${entry.status}`}>
                    <header><div><strong>{entry.gameName ?? "Halieus Game Room"}</strong><small>{entry.source === "game" ? "In-game feedback" : "Profile feedback"} · {entry.category}</small></div><select value={entry.status} onChange={(event) => void updateFeedbackStatus(entry.id, event.target.value as HalieusFeedbackStatus)}><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="answered">Answered</option><option value="closed">Closed</option></select></header>
                    <div className="account-feedback-admin-meta"><span><b>{entry.submitterDisplayName}</b>{entry.submitterUsername ? ` @${entry.submitterUsername}` : ""}</span><span>{when(entry.submittedAt)}</span>{entry.roomCode && <span>Room {entry.roomCode}</span>}<span>Build {entry.appVersion}</span></div>
                    <p>{entry.details}</p>
                    {entry.ownerReply && <div className="account-feedback-reply"><small>Current reply · {entry.ownerReply.responderDisplayName}</small><p>{entry.ownerReply.message}</p><time>{when(entry.ownerReply.at)}</time></div>}
                    <div className="account-feedback-admin-reply"><textarea rows={3} maxLength={4000} value={feedbackReplyDrafts[entry.id] ?? ""} onChange={(event) => setFeedbackReplyDrafts((current) => ({ ...current, [entry.id]: event.target.value }))} placeholder={entry.ownerReply ? "Send an updated reply…" : "Reply to this player…"} /><button type="button" className="button-primary compact-button" onClick={() => void replyToFeedback(entry.id)} disabled={(feedbackReplyDrafts[entry.id]?.trim().length ?? 0) < 2}>Send reply</button></div>
                  </article>)}
                </div>
              </section>}

              {adminTab === "test-lab" && <section className="account-admin-content-card account-test-lab">
                <header className="account-content-heading"><div><p className="modal-eyebrow">ADMIN BETA TESTING</p><h4>Test Lab</h4><small>Launch rooms with an isolated test identity so experiments do not count toward your normal account record.</small></div><span className={`account-status-badge ${betaMode ? "status-active" : "status-pending"}`}>{betaMode ? "active" : "off"}</span></header>
                <div className="account-test-lab-grid">
                  <article><strong>Isolated identity</strong><small>Games use a [BETA] name that does not match your permanent account aliases, keeping personal stats clean.</small></article>
                  <article><strong>Full game access</strong><small>Use the normal Games page, AI seats, spectators and room controls while test mode is active.</small></article>
                  <article><strong>Admin-only</strong><small>Only Owner/Admin accounts can enter this mode. Exit at any time to restore your normal account identity.</small></article>
                </div>
                <button type="button" className={betaMode ? "button-outline" : "button-primary"} onClick={() => { if (betaMode) onExitBetaMode(); else onEnterBetaMode(); onClose(); }}>{betaMode ? "Exit Test Lab" : "Enter Test Lab"}</button>
              </section>}

              {adminTab === "audit" && <section className="account-admin-content-card">
                <header className="account-content-heading"><div><p className="modal-eyebrow">Account history</p><h4>Audit log</h4><small>A readable record of account creation, sign-ins, invites and administrative actions.</small></div></header>
                <div className="account-audit-list">
                  {(snapshot?.audit ?? []).length === 0 && <div className="account-empty-state"><strong>No account activity yet</strong><small>Administrative and sign-in activity will appear here.</small></div>}
                  {(snapshot?.audit ?? []).map((entry) => <article key={entry.id}><time>{when(entry.at)}</time><div><strong>{auditTitle(entry)}</strong><span>{entry.summary}</span></div></article>)}
                </div>
              </section>}
            </section>
          )}

          {(!isAdmin || adminTab === "account") && profileSettings}

          {message && <p className="account-panel-message" role="status">{message}</p>}
          <footer className="account-panel-footer">
            <div><span>Account created</span><strong>{when(account.createdAt)}</strong></div>
            <div><span>Last login</span><strong>{when(account.lastLoginAt)}</strong></div>
            <button type="button" className="account-logout-button" onClick={onLogout}>↪ Sign out</button>
          </footer>
        </div>
      </section>
      <ConfirmDialog open={confirmRequest !== null} title={confirmRequest?.title ?? "Confirm action"} message={confirmRequest?.message ?? ""} confirmLabel={confirmRequest?.label ?? "Confirm"} destructive onCancel={() => setConfirmRequest(null)} onConfirm={() => { const request = confirmRequest; setConfirmRequest(null); request?.action(); }} />
      {buildInfoOpen && <ModalPortal onClose={() => setBuildInfoOpen(false)}><div className="modal-backdrop halieus-confirm-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setBuildInfoOpen(false)}><section className="halieus-build-info-popover account-build-info-modal" role="dialog" aria-modal="true" aria-label="Build information"><button type="button" aria-label="Close build information" onClick={() => setBuildInfoOpen(false)}><HgrIcon name="close" size={18} /></button><p>HALIEUS GAME ROOM</p><h3>Build {APP_RELEASE_LABEL}</h3><span>Exact release</span><code>{RELEASE_FINGERPRINT}</code></section></div></ModalPortal>}
    </div></ModalPortal>
  );
}
