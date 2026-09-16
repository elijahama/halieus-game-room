interface InviteLobbyBarProps {
  accent: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  onOpen: () => void;
}

/**
 * Compact shared entry point for multiplayer invites.
 *
 * The full share/link/QR experience lives in InviteLobbyPanel; this bar is the
 * site-wide lobby affordance so invites do not dominate the waiting room.
 */
export function InviteLobbyBar({
  accent,
  title = "Bring friends straight to this room",
  description = "Link, QR code and room code are ready to share.",
  buttonLabel = "Invite players",
  onOpen,
}: InviteLobbyBarProps) {
  return (
    <section
      className="halieus-invite-bar"
      style={{ ["--invite-accent" as string]: accent }}
      aria-label="Room invites"
    >
      <div>
        <span>Room invites</span>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <button type="button" className="button-outline halieus-invite-bar-button" onClick={onOpen}>
        ↗ {buttonLabel}
      </button>
    </section>
  );
}
