interface AutopilotControlProps {
  active: boolean;
  updating?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Shared Halieus Autopilot control.
 *
 * Autopilot means the game's AI temporarily plays the human's existing seat;
 * it never creates a new player and Take Control returns the same seat/state.
 */
export function AutopilotControl({
  active,
  updating = false,
  disabled = false,
  compact = false,
  onChange,
}: AutopilotControlProps) {
  return (
    <button
      type="button"
      className={`halieus-autopilot-control ${active ? "is-active" : ""} ${compact ? "is-compact" : ""}`.trim()}
      disabled={disabled || updating}
      aria-pressed={active}
      title={active ? "Autopilot is active. Take back control." : "Let AI temporarily play this seat."}
      onClick={() => onChange(!active)}
    >
      <span aria-hidden="true">{active ? "🎮" : "🤖"}</span>
      <span>
        <strong>{updating ? "Updating…" : active ? "Take Control" : "Autopilot"}</strong>
        {!compact && !updating && <small>{active ? "AI is playing your seat" : "Let AI cover your turns"}</small>}
      </span>
    </button>
  );
}
