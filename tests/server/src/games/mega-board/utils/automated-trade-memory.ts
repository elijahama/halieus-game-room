import type { GameState, TradeOffer } from "../../../../../shared/games/mega-board/game-state.js";

/**
 * Automated players should not hammer the same rejected deal every few turns.
 * The memory is intentionally server-local: it only affects AI/autopilot
 * proposal pacing and never becomes part of authoritative saved match state.
 *
 * Rejections use an escalating cooldown. A materially changed portfolio state
 * clears the old rejection memory, so an offer can become reasonable later if
 * either side acquires/loses assets.
 */
interface RejectedTradeMemory {
  rejectedTurn: number;
  rejectionCount: number;
  strategicFingerprint: string;
}

const rejectedAutomatedTrades = new Map<string, RejectedTradeMemory>();
const BASE_COOLDOWN_TURNS = 10;
const MAX_COOLDOWN_TURNS = 64;

function isAutomatedProposer(gameState: GameState, proposerId: string): boolean {
  const proposer = gameState.players.find((player) => player.id === proposerId);
  return Boolean(proposer && !proposer.isBankrupt && (proposer.isAi || proposer.autopilotEnabled));
}

function tradeKey(
  code: string,
  proposerId: string,
  recipientId: string,
  requestedPropertyIds: number[],
): string {
  const assets = [...requestedPropertyIds].sort((a, b) => a - b).join(",");
  return `${code}:${proposerId}:${recipientId}:${assets}`;
}

function portfolioFingerprint(gameState: GameState, proposerId: string, recipientId: string): string {
  const proposer = gameState.players.find((player) => player.id === proposerId);
  const recipient = gameState.players.find((player) => player.id === recipientId);
  const proposerAssets = [...(proposer?.properties ?? [])].sort((a, b) => a - b).join(",");
  const recipientAssets = [...(recipient?.properties ?? [])].sort((a, b) => a - b).join(",");
  return `${proposerAssets}|${recipientAssets}`;
}

function cooldownForRejections(rejectionCount: number): number {
  return Math.min(
    MAX_COOLDOWN_TURNS,
    BASE_COOLDOWN_TURNS * 2 ** Math.max(0, rejectionCount - 1),
  );
}

export function isAutomatedTradeCoolingDown(
  code: string,
  gameState: GameState,
  proposerId: string,
  recipientId: string,
  requestedPropertyIds: number[],
  turnNumber: number,
): boolean {
  const key = tradeKey(code, proposerId, recipientId, requestedPropertyIds);
  const memory = rejectedAutomatedTrades.get(key);
  if (!memory) return false;

  const currentFingerprint = portfolioFingerprint(gameState, proposerId, recipientId);
  if (currentFingerprint !== memory.strategicFingerprint) {
    rejectedAutomatedTrades.delete(key);
    return false;
  }

  const cooldownTurns = cooldownForRejections(memory.rejectionCount);
  if (turnNumber - memory.rejectedTurn >= cooldownTurns) {
    return false;
  }

  return true;
}

export function rememberRejectedAutomatedTrade(
  code: string,
  gameState: GameState,
  trade: Pick<TradeOffer, "proposerId" | "recipientId" | "recipientPropertyIds">,
): void {
  if (!isAutomatedProposer(gameState, trade.proposerId)) return;

  const key = tradeKey(code, trade.proposerId, trade.recipientId, trade.recipientPropertyIds);
  const strategicFingerprint = portfolioFingerprint(gameState, trade.proposerId, trade.recipientId);
  const previous = rejectedAutomatedTrades.get(key);
  const rejectionCount = previous?.strategicFingerprint === strategicFingerprint
    ? previous.rejectionCount + 1
    : 1;

  rejectedAutomatedTrades.set(key, {
    rejectedTurn: gameState.turnNumber,
    rejectionCount,
    strategicFingerprint,
  });
}

export function clearAutomatedTradeMemoryForRoom(code: string): void {
  const prefix = `${code}:`;
  for (const key of rejectedAutomatedTrades.keys()) {
    if (key.startsWith(prefix)) rejectedAutomatedTrades.delete(key);
  }
}
