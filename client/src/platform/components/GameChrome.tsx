import { BackToGameRoomButton } from "./BackToGameRoomButton";
import { HgrIcon } from "./HgrIcon";

interface GameChromeProps {
  accent: string;
  onBackToGameRoom: () => void;
  onOpenMenu: () => void;
  className?: string;
}

/**
 * Shared, intentionally-small in-game chrome.
 *
 * Only the two navigation actions that must always remain reachable live here.
 * Theme, sound and fullscreen controls belong inside the game menu so every
 * board/table keeps the same uncluttered interaction pattern.
 */
export function GameChrome({
  accent,
  onBackToGameRoom,
  onOpenMenu,
  className = "",
}: GameChromeProps) {
  return (
    <nav
      className={`halieus-game-chrome ${className}`.trim()}
      style={{ ["--game-accent" as string]: accent }}
      aria-label="Game navigation"
    >
      <BackToGameRoomButton onClick={onBackToGameRoom} label="Game Room" />
      <button
        type="button"
        className="halieus-game-menu-trigger"
        onClick={onOpenMenu}
        title="Open game menu"
      >
        <span className="halieus-game-menu-icon" aria-hidden="true"><HgrIcon name="menu" size={18} /></span>
        <span>Menu</span>
      </button>
    </nav>
  );
}
