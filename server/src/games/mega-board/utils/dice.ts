import type {
  SpeedDieFace,
} from "../../../../../shared/games/mega-board/game-state.js";

export interface DiceResult {
  white1: number;
  white2: number;
  speed?: SpeedDieFace;
  total: number;
}

export interface GameDiceResult {
  white1: number;
  white2: number;
  speed: SpeedDieFace | null;
  whiteTotal: number;
  movementTotal: number;
  total: number;
}

export interface SpeedDiceResult {
  white1: number;
  white2: number;
  speed: SpeedDieFace;
  whiteTotal: number;
  movementTotal: number;
  total: number;
}

export function rollTwoDice(): DiceResult {
  const white1 =
    Math.floor(Math.random() * 6) + 1;
  const white2 =
    Math.floor(Math.random() * 6) + 1;

  return {
    white1,
    white2,
    total: white1 + white2,
  };
}

export function rollSpeedDie(): SpeedDieFace {
  const face =
    Math.floor(Math.random() * 6);

  if (face === 0) {
    return 1;
  }

  if (face === 1) {
    return 2;
  }

  if (face === 2) {
    return 3;
  }

  if (face === 3) {
    return "bus";
  }

  return "mr-monopoly";
}

export function rollThreeDice(): SpeedDiceResult {
  const whiteRoll = rollTwoDice();
  const speed = rollSpeedDie();
  const speedValue =
    typeof speed === "number"
      ? speed
      : 0;
  const movementTotal =
    whiteRoll.total + speedValue;

  return {
    white1: whiteRoll.white1,
    white2: whiteRoll.white2,
    speed,
    whiteTotal: whiteRoll.total,
    movementTotal,
    total: movementTotal,
  };
}


export function rollGameDice(speedDieActive: boolean): GameDiceResult {
  if (!speedDieActive) {
    const whiteRoll = rollTwoDice();
    return {
      white1: whiteRoll.white1,
      white2: whiteRoll.white2,
      speed: null,
      whiteTotal: whiteRoll.total,
      movementTotal: whiteRoll.total,
      total: whiteRoll.total,
    };
  }

  return rollThreeDice();
}
