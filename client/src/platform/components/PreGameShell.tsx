import type { ReactNode } from "react";

import type { GameId } from "../games/catalog";
import { GameBrandIcon } from "./GameBrandIcon";

interface PreGameShellProps {
  game: GameId;
  title: string;
  subtitle: string;
  eyebrow?: string;
  accent: string;
  borderColor: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Shared HGR create-room/table frame.
 *
 * Game modules own their rules and option controls; this component owns the
 * reusable hierarchy, framing, close action and responsive shell.
 */
export function PreGameShell({
  game,
  title,
  subtitle,
  eyebrow,
  accent,
  borderColor,
  onClose,
  children,
}: PreGameShellProps) {
  return (
    <section
      className="halieus-create-panel halieus-create-modal hgr-pre-game-shell panel-enter"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 42%, ${borderColor})`,
        ["--game-create-accent" as string]: accent,
      }}
      data-game={game}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="halieus-create-modal-head hgr-pre-game-header">
        <div className="halieus-create-brand">
          <GameBrandIcon game={game} />
          <div>
            <p>{eyebrow ?? title.toUpperCase()}</p>
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </div>
        </div>
        <button
          type="button"
          className="halieus-create-close"
          onClick={onClose}
          aria-label="Close room setup"
        >
          ×
        </button>
      </header>
      <div className="hgr-pre-game-body">{children}</div>
    </section>
  );
}
