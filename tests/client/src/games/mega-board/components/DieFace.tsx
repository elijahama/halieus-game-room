import type {
  SpeedDieFace,
} from "../../../../../shared/games/mega-board/game-state";

interface DieFaceProps {
  value: number | SpeedDieFace;
  speed?: boolean;
  rolling?: boolean;
  className?: string;
  label?: string;
}

const PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

export function DieFace({
  value,
  speed = false,
  rolling = false,
  className = "",
  label,
}: DieFaceProps) {
  const numeric =
    typeof value === "number"
      ? Math.max(1, Math.min(6, value))
      : null;

  const accessible =
    label ??
    (numeric
      ? `Die showing ${numeric}`
      : value === "bus"
        ? "Speed Die showing Bus"
        : "Speed Die showing Mr Monopoly");

  return (
    <span
      className={`physical-die ${
        speed ? "is-speed-die" : "is-white-die"
      } ${rolling ? "is-rolling" : ""} ${className}`}
      role="img"
      aria-label={accessible}
    >
      {numeric ? (
        <span className="pip-grid" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => {
            const position = index + 1;
            return (
              <i
                key={position}
                className={PIPS[numeric]?.includes(position) ? "pip is-visible" : "pip"}
              />
            );
          })}
        </span>
      ) : (
        <span className="speed-symbol" aria-hidden="true">
          {value === "bus" ? "🚌" : "🎩"}
        </span>
      )}
    </span>
  );
}
