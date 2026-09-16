import { BackToGameRoomButton } from "../../../platform/components/BackToGameRoomButton";

interface GamePreferencesProps {
  darkMode: boolean;
  soundEnabled: boolean;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onOpenMenu: () => void;
  onBackToGameRoom: () => void;
}

export function GamePreferences({
  darkMode,
  soundEnabled,
  onToggleDarkMode,
  onToggleSound,
  onToggleFullscreen,
  onOpenMenu,
  onBackToGameRoom,
}: GamePreferencesProps) {
  return (
    <nav
      className="game-preferences"
      aria-label="Game and display controls"
    >
      {/* Navigation is separate from destructive leave/forfeit actions and remains visible beside display controls. */}
      <BackToGameRoomButton onClick={onBackToGameRoom} className="game-preferences-back" label="Room" />
      <button
        type="button"
        onClick={onToggleDarkMode}
        aria-pressed={darkMode}
        title="Switch colour theme"
      >
        <span aria-hidden="true">
          {darkMode ? "☀" : "☾"}
        </span>
        <span>{darkMode ? "Light" : "Dark"}</span>
      </button>
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        title="Toggle game sounds"
      >
        <span aria-hidden="true">
          {soundEnabled ? "🔊" : "🔇"}
        </span>
        <span>{soundEnabled ? "Sound" : "Muted"}</span>
      </button>
      <button
        type="button"
        onClick={onToggleFullscreen}
        title="Toggle full screen"
      >
        <span aria-hidden="true">⛶</span>
        <span>Full screen</span>
      </button>
      <button
        type="button"
        className="game-menu-button"
        onClick={onOpenMenu}
      >
        <span aria-hidden="true">☰</span>
        <span>Menu</span>
      </button>
    </nav>
  );
}
