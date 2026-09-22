import type { ReactNode } from "react";

import type { HalieusPlayerDirectoryEntry } from "../../../../shared/platform/accounts";

type PlayerIdentity = Pick<
  HalieusPlayerDirectoryEntry,
  "id" | "username" | "displayName" | "avatar" | "profilePicture" | "playerColor"
>;

interface PlayerIdentityCardProps {
  player: PlayerIdentity;
  status?: string;
  detail?: string;
  selected?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
  trailing?: ReactNode;
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
}: PlayerIdentityCardProps) {
  const classes = [
    "halieus-player-identity",
    compact ? "is-compact" : "",
    selected ? "is-selected" : "",
    onClick ? "is-interactive" : "",
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <>
      <span className="halieus-player-identity-avatar halieus-avatar-media" style={{ background: player.playerColor }}>
        {player.profilePicture ? <img src={player.profilePicture} alt="" /> : player.avatar}
      </span>
      <span className="halieus-player-identity-copy">
        <strong>{player.displayName}</strong>
        <small>@{player.username}{detail ? ` · ${detail}` : ""}</small>
      </span>
      {status && <b className="halieus-player-identity-status">{status}</b>}
      {trailing && <span className="halieus-player-identity-trailing">{trailing}</span>}
    </>
  );

  if (onClick) {
    return <button type="button" className={classes} onClick={onClick}>{content}</button>;
  }

  return <div className={classes}>{content}</div>;
}
