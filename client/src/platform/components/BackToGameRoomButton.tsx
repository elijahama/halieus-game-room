interface BackToGameRoomButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

/**
 * Shared Halieus navigation control used by every game surface.
 *
 * The button deliberately means "return to the Game Room" rather than
 * "leave/forfeit". Individual game modules decide how the active seat is
 * preserved, while the player sees one consistent navigation affordance.
 */
export function BackToGameRoomButton({
  onClick,
  className = "",
  label = "Back to Game Room",
}: BackToGameRoomButtonProps) {
  return (
    <button
      type="button"
      className={`game-room-back-button ${className}`.trim()}
      onClick={onClick}
      title="Return to Halieus Game Room without forfeiting this active seat"
    >
      <span aria-hidden="true">←</span>
      <span className="game-room-back-label">{label}</span>
    </button>
  );
}
