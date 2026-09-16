/**
 * Human-play calibration for Mega Board AI.
 *
 * Primary reference: the 2026-08-28 four-human match supplied by the owner.
 * The numbers below are intentionally descriptive rather than a replay script:
 * - Jordan: 21 auctions / 8 trades / 6 builds / 7 mortgages / 2 Kass manoeuvres; eliminated turn 24.
 * - KM: 15 auctions / 8 trades / 25 builds / 13 mortgages; eliminated turn 37.
 * - Enock: 5 auctions / 2 trades / 44 builds / 5 mortgages; eliminated turn 51.
 * - Elijah: winner; 13 auctions / 2 trades / 42 builds / 26 mortgages / £12,407 final net worth.
 *
 * Older retained human-involved archived games are also used as negative evidence:
 * human seats that reached bankruptcy with high debt exposure and little/no Bus Ticket use
 * reinforce the need for liquidity and mobility safeguards. We do not treat synthetic fixtures
 * or AI-only matches as human behavioural evidence.
 */
export type HumanStyleId = "auction-negotiator" | "portfolio-engineer" | "builder-fortress" | "leveraged-tycoon";

export interface HumanStyleCalibration {
  id: HumanStyleId;
  auction: number;
  trade: number;
  build: number;
  leverage: number;
  mobility: number;
  reserve: number;
}

export const HUMAN_STYLE_CALIBRATIONS: readonly HumanStyleCalibration[] = [
  { id: "auction-negotiator", auction: 1.22, trade: 1.34, build: 0.84, leverage: 0.94, mobility: 1.18, reserve: 1.08 },
  { id: "portfolio-engineer", auction: 1.08, trade: 1.28, build: 1.12, leverage: 1.12, mobility: 1.10, reserve: 1.02 },
  { id: "builder-fortress", auction: 0.86, trade: 0.82, build: 1.34, leverage: 0.96, mobility: 1.24, reserve: 1.05 },
  { id: "leveraged-tycoon", auction: 1.04, trade: 0.88, build: 1.30, leverage: 1.38, mobility: 1.12, reserve: 0.88 },
] as const;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function humanStyleForSeat(playerId: string, playerName: string): HumanStyleCalibration {
  return HUMAN_STYLE_CALIBRATIONS[stableHash(`${playerId}:${playerName}`) % HUMAN_STYLE_CALIBRATIONS.length];
}
