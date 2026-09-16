import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { HalieusAccountSummary, HalieusAuthStatus } from "../../../../shared/platform/accounts";
import { accountApi } from "./api";
import { ThemeButton } from "../components/ThemeButton";

interface Props {
  authStatus: HalieusAuthStatus;
  darkMode: boolean;
  onAuthenticated: (account: HalieusAccountSummary) => void;
  onToggleDarkMode: () => void;
  returnPath?: string | null;
}

type Mode = "signin" | "signup" | "guest" | "reset" | "owner";

function accountInviteFromUrl(): string {
  try { return new URLSearchParams(window.location.search).get("account-invite")?.trim().toUpperCase() ?? ""; } catch { return ""; }
}

function clearAccountInviteFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("account-invite")) return;
    url.searchParams.delete("account-invite");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch { /* URL cleanup is non-critical. */ }
}

const guestPaths = [
  /^\/join\/[A-Z0-9]{4,12}\/?$/i,
  /^\/game\/[A-Z0-9]{4,12}\/?$/i,
  /^\/spectate\/mega\/[A-Z0-9]{4,12}\/?$/i,
  /^\/poker\/[A-Z0-9]{4,12}\/?$/i,
  /^\/blackjack\/[A-Z0-9]{4,12}\/?$/i,
  /^\/whot\/[A-Z0-9]{4,12}\/?$/i,
  /^\/ludo\/[A-Z0-9]{4,12}\/?$/i,
  /^\/connect-four\/[A-Z0-9]{4,12}\/?$/i,
  /^\/hidden-dictator\/[A-Z0-9]{4,12}\/?$/i,
  /^\/word-game\/[A-Z0-9]{4,12}\/?$/i,
  /^\/password\/[A-Z0-9]{4,12}\/?$/i,
  /^\/anagrams-race\/[A-Z0-9]{4,12}\/?$/i,
  /^\/cheat\/[A-Z0-9]{4,12}\/?$/i,
  /^\/dominoes\/[A-Z0-9]{4,12}\/?$/i,
];

function guestPathFromInvite(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const path = parsed.pathname.replace(/\/{2,}/g, "/");
    if (!guestPaths.some((pattern) => pattern.test(path))) return null;
    parsed.searchParams.set("guest", "1");
    return `${path}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function roomLabel(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = path.match(/^\/(join|game|poker|blackjack|whot|ludo|connect-four|hidden-dictator|word-game|password|anagrams-race|cheat|dominoes|spectate\/mega)\/([A-Z0-9]{4,12})/i);
  if (!match) return null;
  const game = match[1].toLowerCase();
  const title = game === "poker" ? "Poker" : game === "blackjack" ? "Blackjack" : game === "whot" ? "WHOT" : game === "ludo" ? "Ludo" : game === "connect-four" ? "Connect Four" : game === "hidden-dictator" ? "Hidden Dictator" : game === "word-game" ? "Word Game" : game === "password" ? "Password" : game === "anagrams-race" ? "Anagrams Race" : game === "cheat" ? "Cheat" : game === "dominoes" ? "Dominoes" : "Mega Board";
  return `${title} · ${match[2].toUpperCase()}`;
}

export function AccountPortal({ authStatus, darkMode, onAuthenticated, onToggleDarkMode, returnPath = null }: Props) {
  const urlInviteCode = authStatus.setupRequired ? "" : accountInviteFromUrl();
  const [mode, setMode] = useState<Mode>(authStatus.setupRequired ? "owner" : urlInviteCode ? "signup" : "signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(urlInviteCode);
  const [guestInvite, setGuestInvite] = useState(() => returnPath ? `${window.location.origin}${returnPath}` : "");
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  useEffect(() => { const sync = () => setIsFullscreen(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", sync); return () => document.removeEventListener("fullscreenchange", sync); }, []);
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* browser may block fullscreen */ } }
  const pendingRoomLabel = useMemo(() => roomLabel(returnPath), [returnPath]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signin") {
        const result = await accountApi<{ ok: true; account: HalieusAccountSummary }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
        onAuthenticated(result.account);
        return;
      }
      if (mode === "signup") {
        const result = await accountApi<{ ok: true; account: HalieusAccountSummary }>("/auth/redeem-invite", { method: "POST", body: JSON.stringify({ inviteCode: code, username, displayName, password }) });
        clearAccountInviteFromUrl();
        onAuthenticated(result.account);
        return;
      }
      if (mode === "owner") {
        const result = await accountApi<{ ok: true; account: HalieusAccountSummary }>("/auth/setup-owner", { method: "POST", body: JSON.stringify({ bootstrapCode: code, username, displayName, password }) });
        onAuthenticated(result.account);
        return;
      }
      if (mode === "reset") {
        const result = await accountApi<{ ok: true; account: HalieusAccountSummary }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ resetCode: code, password }) });
        onAuthenticated(result.account);
        return;
      }
      const guestPath = guestPathFromInvite(guestInvite);
      if (!guestPath) {
        setMessage("Paste the Halieus room invite link you were sent.");
        return;
      }
      window.location.assign(guestPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete that request.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setMessage("");
    setPassword("");
    if (next === "signup") setCode(accountInviteFromUrl());
    else if (next !== "owner" && next !== "reset") setCode("");
    if (next === "guest" && returnPath) setGuestInvite(`${window.location.origin}${returnPath}`);
  }

  const owner = mode === "owner";
  const title = owner ? "Set up the owner account" : mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your Halieus account" : mode === "guest" ? "One-time play" : "Reset your password";
  const description = owner
    ? "Use the one-time owner setup code from the host computer."
    : mode === "signin"
      ? pendingRoomLabel ? `Sign in first and Halieus will take you straight to ${pendingRoomLabel}.` : "Sign in with your Halieus username. Your account follows you across devices."
      : mode === "signup"
        ? "Permanent accounts are invite-only. Use the account invite sent by the owner."
        : mode === "guest"
          ? pendingRoomLabel ? `Continue to ${pendingRoomLabel} without creating an account.` : "Use a room link for this game only. No permanent account is created."
          : "Use the one-time reset code issued by the owner or an administrator.";

  return (
    <main className={`account-portal account-entry-342 ${darkMode ? "is-dark" : ""}`}>
      <header className="account342-topbar">
        <a className="account342-brand" href="/" aria-label="Halieus Game Room home"><img src="/app-icon-192.png?v=3.6.4" alt="" /><span><strong>Halieus Game Room</strong><small>Private multiplayer</small></span></a>
        <div className="account-entry-display-controls">
          <button type="button" className="account-fullscreen-toggle" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}><span aria-hidden="true">{isFullscreen ? "↙" : "⛶"}</span><b>{isFullscreen ? "Exit Full Screen" : "Full Screen"}</b></button>
          <ThemeButton darkMode={darkMode} background="transparent" colour="inherit" borderColour="currentColor" onToggle={onToggleDarkMode} />
        </div>
      </header>

      <section className="account342-stage">
        <div className="account342-intro">
          <img className="account342-hero-icon" src="/app-icon-192.png?v=3.6.4" alt="" />
          <p>HALIEUS GAME ROOM</p>
          <h1>{owner ? "Set up Halieus." : "Welcome to Halieus."}</h1>
          <span>{owner ? "Create the owner account, then control permanent player access from Player Management." : "Sign in to your account, or use an owner-issued invite to create one."}</span>
        </div>

        <section className="account342-card" aria-label="Halieus account access">
          {pendingRoomLabel && !owner && <div className="account342-return-banner"><span>↗</span><div><strong>Room link detected</strong><small>{pendingRoomLabel} · sign in to join as your account</small></div></div>}

          {!authStatus.setupRequired && mode !== "reset" && mode !== "guest" && <nav className="account342-tabs" aria-label="Account options"><button type="button" className={mode === "signin" ? "is-active" : ""} onClick={() => switchMode("signin")}>Sign in</button><button type="button" className={mode === "signup" ? "is-active" : ""} onClick={() => switchMode("signup")}>Sign up</button></nav>}
          {!authStatus.setupRequired && (mode === "guest" || mode === "reset") && <button type="button" className="account-auth-back" onClick={() => switchMode("signin")}>← Back to sign in</button>}

          <header className="account342-card-head"><p>{owner ? "OWNER SETUP" : mode === "guest" ? "GUEST PLAY" : mode === "reset" ? "ACCOUNT RECOVERY" : "HALIEUS ACCOUNT"}</p><h2>{title}</h2><span>{description}</span></header>

          <form onSubmit={submit} className="account-auth-form account342-form">
            {(mode === "signup" || owner) && <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} autoComplete="name" placeholder="Name other players will see" required /><small>Your display name is what appears inside games.</small></label>}
            {(mode === "signin" || mode === "signup" || owner) && <label>Username<input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} minLength={3} maxLength={32} autoComplete="username" placeholder={mode === "signin" ? "Your username" : "Choose a username — not an email"} required /><small>This is your sign-in name. You can change it later.</small></label>}
            {(mode === "signup" || owner || mode === "reset") && <label>{owner ? "Owner setup code" : mode === "reset" ? "Password reset code" : "Account invite code"}<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="off" placeholder={owner ? "OWNER-…" : mode === "reset" ? "RESET-…" : "HGR-…"} required /></label>}
            {(mode === "signin" || mode === "signup" || owner || mode === "reset") && <label>{mode === "reset" ? "New password" : "Password"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "signin" ? undefined : 10} maxLength={200} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder={mode === "signin" ? "Your password" : "At least 10 characters"} required /></label>}
            {mode === "guest" && !returnPath && <label>Room invite link<input value={guestInvite} onChange={(event) => setGuestInvite(event.target.value)} inputMode="url" autoComplete="off" placeholder="https://…/poker/ABC123" required /><small>Use the complete room link sent by the host.</small></label>}
            <button type="submit" className="account-auth-primary" disabled={busy}>{busy ? "Working…" : owner ? "Create owner account" : mode === "signin" ? pendingRoomLabel ? "Sign in & join room →" : "Sign in →" : mode === "signup" ? "Create account →" : mode === "guest" ? "Continue as guest →" : "Reset password & sign in →"}</button>
          </form>

          {message && <p className="account-auth-message" role="status">{message}</p>}

          {!authStatus.setupRequired && mode === "signin" && <div className="account342-secondary"><button type="button" onClick={() => switchMode("guest")}><strong>{pendingRoomLabel ? "Play this room once" : "One-time play"}</strong><small>{pendingRoomLabel ? "Continue without signing in" : "Use a room link without an account"}</small><span>→</span></button><button type="button" onClick={() => switchMode("reset")}><strong>Forgot password?</strong><small>Use an admin reset code</small><span>→</span></button></div>}

          {owner && <footer className="account342-note">Your setup code is stored in <strong>OWNER SETUP CODE.txt</strong> on the host computer.</footer>}
          {mode === "signup" && <footer className="account342-note"><strong>Invite-only:</strong> the owner controls who can create a permanent account.</footer>}
        </section>
      </section>

      <footer className="account342-footer"><span>HALIEUS GAME ROOM</span><span>Accounts follow you across devices · Guest links stay one-time</span></footer>
    </main>
  );
}
