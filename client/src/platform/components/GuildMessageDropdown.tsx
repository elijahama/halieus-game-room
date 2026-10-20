import type { HalieusGuildMessageNotification } from "../../../../shared/platform/guilds";

/** Lightweight in-app notice. Reading the message requires opening its guild. */
export function GuildMessageDropdown({
  message, onOpen, onLater, onOpenInbox,
}: {
  message: HalieusGuildMessageNotification;
  onOpen: () => void;
  onLater: () => void;
  onOpenInbox: () => void;
}) {
  return <aside className="hgr-game-invite-dropdown hgr-guild-message-dropdown"
    role="region" aria-label="New guild message" aria-live="polite">
    <div className="hgr-game-invite-dropdown-head">
      <span className="hgr-guild-message-symbol" aria-hidden="true">✉</span>
      <div>
        <small>GUILD MESSAGE · {message.guildName}</small>
        <strong>{message.senderDisplayName} sent a message</strong>
        <span>{message.preview}</span>
      </div>
      <button type="button" className="hgr-game-invite-later" onClick={onLater}
        aria-label="Later — keep message in Inbox">×</button>
    </div>
    <div className="hgr-game-invite-dropdown-actions">
      <button type="button" className="button-primary" onClick={onOpen}>Open chat</button>
      <button type="button" className="button-muted" onClick={onOpenInbox}>Inbox</button>
    </div>
  </aside>;
}
