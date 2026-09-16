import type { GamePlayer } from "../../../../../shared/games/mega-board/game-state";

interface AutopilotControlProps {
  player: GamePlayer;
  isUpdating: boolean;
  isPausedForTrade: boolean;
  onChange: (enabled: boolean) => void;
}

export function AutopilotControl({
  player,
  isUpdating,
  isPausedForTrade,
  onChange,
}: AutopilotControlProps) {
  return (
    <div
      className={`autopilot-control autopilot-control-compact ${
        player.autopilotEnabled ? "is-active" : ""
      }`}
      aria-label="Autopilot controls"
    >
      <div className="autopilot-compact-copy">
        <span aria-hidden="true">🤖</span>
        <div>
          <strong>Autopilot</strong>
          <small>
            {player.autopilotEnabled
              ? isPausedForTrade
                ? "Paused for trade"
                : "Playing for you"
              : "Off"}
          </small>
        </div>
      </div>

      <button
        type="button"
        className={
          player.autopilotEnabled
            ? "autopilot-stop"
            : "autopilot-start"
        }
        disabled={isUpdating}
        onClick={() => onChange(!player.autopilotEnabled)}
      >
        {isUpdating
          ? "…"
          : player.autopilotEnabled
            ? "Take Control"
            : "Start"}
      </button>
    </div>
  );
}
