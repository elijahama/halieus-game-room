export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const STARTING_CASH = 2500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const DEFAULT_FREE_PARKING_JACKPOT = false;
export const AUCTION_INITIAL_DURATION_MS = 8_000;
export const AUCTION_BID_RESET_DURATION_MS = 8_000;
export const OPTIONAL_ACTION_DURATION_MS = 150_000;
export const TURN_ROLL_AUTOPILOT_DURATION_MS = 45_000;
export const BLITZ_TURN_ROLL_AUTOPILOT_DURATION_MS = 150_000;
/** Host-selectable pre-game turn lengths. The chosen value is frozen when the match starts. */
export const TURN_TIMER_PRESET_SECONDS = [30, 45, 60, 90, 120, 150, 180, 300] as const;
export function isValidTurnTimerSeconds(value: number): boolean {
    return TURN_TIMER_PRESET_SECONDS.some((seconds) => seconds === value);
}
export type GameMode = "casual" | "ranked" | "blitz" | "custom";
export interface GameSettings {
    mode: GameMode;
    playerLimit: number;
    allowAiPlayers: boolean;
    allowSpectators: boolean;
    freeParkingJackpot: boolean;
    startingCash: number;
    goSalary: number;
    jailFine: number;
}
export const DEFAULT_CASUAL_SETTINGS: GameSettings = {
    mode: "casual",
    playerLimit: 6,
    allowAiPlayers: true,
    allowSpectators: true,
    freeParkingJackpot: false,
    startingCash: STARTING_CASH,
    goSalary: GO_SALARY,
    jailFine: JAIL_FINE,
};
export const DEFAULT_RANKED_SETTINGS: GameSettings = {
    mode: "ranked",
    playerLimit: 6,
    allowAiPlayers: false,
    allowSpectators: true,
    freeParkingJackpot: false,
    startingCash: STARTING_CASH,
    goSalary: GO_SALARY,
    jailFine: JAIL_FINE,
};
export const DEFAULT_BLITZ_SETTINGS: GameSettings = {
    mode: "blitz",
    playerLimit: 6,
    allowAiPlayers: true,
    allowSpectators: true,
    freeParkingJackpot: false,
    startingCash: STARTING_CASH,
    goSalary: GO_SALARY,
    jailFine: JAIL_FINE,
};
export const DEFAULT_CUSTOM_SETTINGS: GameSettings = {
    mode: "custom",
    playerLimit: 6,
    allowAiPlayers: true,
    allowSpectators: true,
    freeParkingJackpot: false,
    startingCash: STARTING_CASH,
    goSalary: GO_SALARY,
    jailFine: JAIL_FINE,
};
export function isValidPlayerLimit(playerLimit: number): boolean {
    return (Number.isInteger(playerLimit) &&
        playerLimit >= MIN_PLAYERS &&
        playerLimit <= MAX_PLAYERS);
}

