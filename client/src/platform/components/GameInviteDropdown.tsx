import { GAME_BY_ID } from "../games/catalog";
import type { HgrIncomingGameNotification } from "./gameInviteNotifications";

export function GameInviteDropdown({
  notification,
  busy,
  error,
  onAccept,
  onDecline,
  onLater,
  onOpenInbox,
}: {
  notification: HgrIncomingGameNotification;
  busy: boolean;
  error: string;
  onAccept: () => void;
  onDecline: () => void;
  onLater: () => void;
  onOpenInbox: () => void;
}) {
  const game = GAME_BY_ID[notification.game];
  return (
    <aside
      className="hgr-game-invite-dropdown"
      role="region"
      aria-label="Incoming game invitation"
      style={{ ["--game-notice-accent" as string]: game?.accent ?? "#83a9f0" }}
    >
      <div className="hgr-game-invite-dropdown-head">
        {game && <img src={game.icon} alt="" />}
        <div>
          <small>{notification.kind === "room" && notification.betaTournamentTest ? "BETA PRACTICE INVITATION" : notification.kind === "room" ? "ROOM INVITATION" : "GAME REQUEST"}</small>
          <strong>{notification.sender} invited you to {notification.gameTitle}</strong>
          <span>{notification.kind === "room" && notification.betaTournamentTest ? `Room ${notification.roomCode} · Test only, no ratings or rewards` : notification.kind === "room" ? `Room ${notification.roomCode}` : "Would you like to play?"}</span>
        </div>
        <button type="button" className="hgr-game-invite-later" disabled={busy} onClick={onLater}
          aria-label="Later — keep invitation in inbox">×</button>
      </div>
      {error && <p role="alert" className="hgr-game-invite-error">{error}</p>}
      <div className="hgr-game-invite-dropdown-actions">
        <button type="button" className="button-primary" disabled={busy} onClick={onAccept}>
          {busy ? "Working…" : notification.kind === "room" ? "Join room" : "Accept"}
        </button>
        <button type="button" className="button-outline" disabled={busy} onClick={onDecline}>Decline</button>
        <button type="button" className="button-muted" onClick={onOpenInbox}>Inbox</button>
      </div>
      <small className="hgr-game-invite-footnote">Later closes this alert. The invitation remains in your Inbox.</small>
    </aside>
  );
}
