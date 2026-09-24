import { useEffect, useRef, useState, type ReactNode } from "react";

import type { HalieusPlayerDirectoryEntry } from "../../../../shared/platform/accounts";

type PlayerIdentity = Pick<
  HalieusPlayerDirectoryEntry,
  "id" | "username" | "displayName" | "avatar" | "profilePicture" | "playerColor"
>;

export interface PlayerIdentityAction {
  id: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
  onSelect: () => void;
}

interface PlayerIdentityCardProps {
  player: PlayerIdentity;
  status?: string;
  detail?: string;
  selected?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  actions?: PlayerIdentityAction[];
}

export function PlayerIdentityCard({
  player,
  status,
  detail,
  selected = false,
  compact = false,
  className = "",
  onClick,
  trailing,
  actions = [],
}: PlayerIdentityCardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const classes = [
    "halieus-player-identity",
    compact ? "is-compact" : "",
    selected ? "is-selected" : "",
    onClick ? "is-interactive" : "",
    actions.length ? "has-actions" : "",
    className,
  ].filter(Boolean).join(" ");

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  const activateCard = () => {
    if (!onClick) return;
    setMenuOpen(false);
    onClick();
  };

  return (
    <div
      ref={rootRef}
      className={classes}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? activateCard : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateCard();
        }
      } : undefined}
    >
      <span className="halieus-player-identity-avatar halieus-avatar-media" style={{ background: player.playerColor }}>
        {player.profilePicture ? <img src={player.profilePicture} alt="" /> : player.avatar}
      </span>
      <span className="halieus-player-identity-copy">
        <strong>{player.displayName}</strong>
        <small>@{player.username}{detail ? ` · ${detail}` : ""}</small>
      </span>
      {status && <b className="halieus-player-identity-status">{status}</b>}
      {trailing && <span className="halieus-player-identity-trailing" onClick={(event) => event.stopPropagation()}>{trailing}</span>}
      {actions.length > 0 && (
        <span className="halieus-player-action-shell" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="halieus-player-action-trigger"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Options for ${player.displayName}`}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">•••</span>
          </button>
          {menuOpen && <span className="halieus-player-action-menu" role="menu" aria-label={`${player.displayName} options`}>
            <strong>{player.displayName}</strong>
            {actions.map((action) => (
              <button
                type="button"
                key={action.id}
                role="menuitem"
                className={action.tone === "danger" ? "is-danger" : ""}
                disabled={action.disabled}
                onClick={() => {
                  setMenuOpen(false);
                  action.onSelect();
                }}
              >
                <span>{action.label}</span>
                {action.detail && <small>{action.detail}</small>}
              </button>
            ))}
          </span>}
        </span>
      )}
    </div>
  );
}
