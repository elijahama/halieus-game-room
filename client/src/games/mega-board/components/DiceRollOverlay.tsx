import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  DiceRoll,
  SpeedDieFace,
} from "../../../../../shared/games/mega-board/game-state";

import { DieFace } from "./DieFace";

interface DiceRollOverlayProps {
  roll: DiceRoll;
  onSettled?: () => void;
  settleMs?: number;
  doublesStage?: 0 | 1 | 2 | 3;
}

function randomWhite(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function randomSpeed(): SpeedDieFace {
  const faces: SpeedDieFace[] = [
    1,
    2,
    3,
    "bus",
    "mr-monopoly",
  ];
  return faces[Math.floor(Math.random() * faces.length)] ?? 1;
}

export function DiceRollOverlay({
  roll,
  onSettled,
  settleMs = 1350,
  doublesStage = 0,
}: DiceRollOverlayProps) {
  const [rolling, setRolling] = useState(true);
  const [white1, setWhite1] = useState(randomWhite());
  const [white2, setWhite2] = useState(randomWhite());
  const [speed, setSpeed] = useState<SpeedDieFace | null>(
    roll.speed === null ? null : randomSpeed(),
  );
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    setRolling(true);
    setWhite1(randomWhite());
    setWhite2(randomWhite());
    setSpeed(
      roll.speed === null
        ? null
        : randomSpeed(),
    );

    const cycle = window.setInterval(() => {
      setWhite1(randomWhite());
      setWhite2(randomWhite());
      if (roll.speed !== null) {
        setSpeed(randomSpeed());
      }
    }, 92);

    const settle = window.setTimeout(() => {
      window.clearInterval(cycle);
      setWhite1(roll.white1);
      setWhite2(roll.white2);
      setSpeed(roll.speed);
      setRolling(false);
      onSettledRef.current?.();
    }, settleMs);

    return () => {
      window.clearInterval(cycle);
      window.clearTimeout(settle);
    };
  }, [
    roll.white1,
    roll.white2,
    roll.speed,
    roll.movementTotal,
    settleMs,
  ]);

  const triples =
    !rolling &&
    typeof roll.speed === "number" &&
    roll.white1 === roll.white2 &&
    roll.white1 === roll.speed;

  const doubles =
    !rolling &&
    !triples &&
    roll.white1 === roll.white2;

  return (
    <div
      className={`dice-roll-overlay ${rolling ? "is-rolling" : "is-settled"} ${!rolling && doubles ? `is-doubles-stage-${Math.max(1, doublesStage)}` : ""}`}
      aria-live="assertive"
      aria-label={rolling ? "Dice rolling" : `Dice result ${roll.white1}, ${roll.white2}`}
    >
      <div className="dice-roll-stage">
        <p>{rolling ? "Rolling…" : "Dice result"}</p>

        <div className="dice-roll-cubes">
          <DieFace
            value={white1}
            rolling={rolling}
            className="animated-die-one"
          />
          <DieFace
            value={white2}
            rolling={rolling}
            className="animated-die-two"
          />
          {speed !== null && (
            <DieFace
              value={speed}
              speed
              rolling={rolling}
              className="animated-speed-die"
            />
          )}
        </div>

        <strong className="dice-roll-result-copy">
          {rolling
            ? ""
            : triples
              ? "Triples!"
              : doubles
                ? doublesStage >= 3
                  ? "Third double · Jail"
                  : doublesStage === 2
                    ? "Doubles! One more sends you to Jail"
                    : "Doubles! Roll again"
                : `Move ${roll.movementTotal}`}
        </strong>
      </div>
    </div>
  );
}
