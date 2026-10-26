import type { BuildingLevel, DiceRoll, PlayerColour, PlayerId, TurnPhase } from "./game-state.js";

/** Privacy-safe *presentation* frames; never use them to restore gameplay. */
export interface MegaReplayFrame {
  sequence: number;
  at: number;
  turn: number;
  phase: TurnPhase;
  activePlayerId: PlayerId | null;
  label: string;
  lastActivityId: string | null;
  players: Array<{
    id: PlayerId;
    name: string;
    tokenId: string;
    colour: PlayerColour;
    position: number;
    cash: number;
    bankrupt: boolean;
    owned: number[];
  }>;
  propertyOwners: Record<number, PlayerId | null>;
  developments: Record<number, BuildingLevel>;
  mortgages: Record<number, boolean>;
  pot: number;
  dice: DiceRoll | null;
  winnerId: PlayerId | null;
}
