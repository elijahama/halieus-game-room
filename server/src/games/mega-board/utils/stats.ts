import {
  BIRTHDAY_GIFT_POSITION,
  GO_POSITION,
  getBoardSpace,
  isPropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";
import type {
  GamePlayer,
  GameState,
  PlayerMatchStats,
} from "../../../../../shared/games/mega-board/game-state.js";

function defaultStats(player: GamePlayer): PlayerMatchStats {
  return {
    actions: 0,
    rolls: 0,
    purchases: 0,
    auctionEvents: 0,
    tradeEvents: 0,
    buildingEvents: 0,
    mortgageEvents: 0,
    debtEvents: 0,
    cardEvents: 0,
    jailEvents: 0,
    rentPaid: 0,
    rentCollected: 0,
    revenue: 0,
    expenses: 0,
    busTicketsCollected: 0,
    busTicketsUsed: 0,
    kassManeuvers: 0,
    lastTrackedPosition: player.position,
    peakCash: player.cash,
    peakProperties: player.properties.length,
    peakNetWorth: player.cash,
    finishPosition: null,
    eliminatedTurn: null,
    finalCash: null,
    finalProperties: null,
    finalDevelopments: null,
    finalNetWorth: null,
    history: [],
  };
}

export function ensurePlayerStats(gameState: GameState, player: GamePlayer): PlayerMatchStats {
  gameState.playerStats ??= {};
  const stats = gameState.playerStats[player.id] ??= defaultStats(player);
  stats.revenue ??= 0;
  stats.expenses ??= 0;
  stats.kassManeuvers ??= 0;
  stats.lastTrackedPosition ??= player.position;
  stats.finishPosition ??= null;
  stats.history ??= [];
  return stats;
}



export function recordDiceRoll(gameState: GameState, player: GamePlayer): void {
  ensurePlayerStats(gameState, player).rolls += 1;
}

export function recordCardDraw(gameState: GameState, player: GamePlayer): void {
  ensurePlayerStats(gameState, player).cardEvents += 1;
}

export function recordCashFlow(
  gameState: GameState,
  player: GamePlayer,
  delta: number,
): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  const stats = ensurePlayerStats(gameState, player);
  if (delta > 0) stats.revenue += delta;
  else stats.expenses += Math.abs(delta);
}

export function developmentCount(gameState: GameState, player: GamePlayer): number {
  return player.properties.reduce(
    (sum, spaceId) => sum + (gameState.propertyDevelopments[spaceId] ?? 0),
    0,
  );
}

export function currentAssetValue(gameState: GameState, player: GamePlayer): number {
  return player.properties.reduce((sum, spaceId) => {
    const space = getBoardSpace(spaceId);
    if (!space || !("price" in space)) return sum;

    let value = space.price;
    if (isPropertyBoardSpace(space)) {
      value += (gameState.propertyDevelopments[spaceId] ?? 0) * space.houseCost;
    }
    if (gameState.railroadDepots[spaceId] && "depotCost" in space) {
      value += space.depotCost;
    }
    return sum + value;
  }, 0);
}

export function currentNetWorth(gameState: GameState, player: GamePlayer): number {
  return player.cash + currentAssetValue(gameState, player);
}

export function captureStats(gameState: GameState): void {
  const now = Date.now();
  for (const player of gameState.players) {
    const stats = ensurePlayerStats(gameState, player);

    const previousPosition = stats.lastTrackedPosition;
    const isKassTransition =
      (previousPosition === BIRTHDAY_GIFT_POSITION && player.position === GO_POSITION) ||
      (previousPosition === GO_POSITION && player.position === BIRTHDAY_GIFT_POSITION);

    if (isKassTransition) {
      stats.kassManeuvers += 1;
    }
    stats.lastTrackedPosition = player.position;

    const developments = developmentCount(gameState, player);
    const netWorth = currentNetWorth(gameState, player);

    stats.peakCash = Math.max(stats.peakCash, player.cash);
    stats.peakProperties = Math.max(stats.peakProperties, player.properties.length);
    stats.peakNetWorth = Math.max(stats.peakNetWorth, netWorth);

    const point = {
      turnNumber: gameState.turnNumber,
      at: now,
      cash: player.cash,
      properties: player.properties.length,
      developments,
      netWorth,
    };
    const previous = stats.history.at(-1);
    if (previous?.turnNumber === gameState.turnNumber) {
      stats.history[stats.history.length - 1] = point;
    } else {
      stats.history.push(point);
      if (stats.history.length > 1000) stats.history.shift();
    }
  }
}

export function markEliminated(gameState: GameState, player: GamePlayer): void {
  const stats = ensurePlayerStats(gameState, player);
  if (stats.eliminatedTurn !== null) return;
  // Assign placement while the player is still counted as active. With four
  // active players the first elimination is 4th, then 3rd, then 2nd.
  stats.finishPosition = gameState.players.filter(
    (candidate) => !candidate.isBankrupt,
  ).length;
  stats.eliminatedTurn = gameState.turnNumber;
  stats.finalCash = player.cash;
  stats.finalProperties = player.properties.length;
  stats.finalDevelopments = developmentCount(gameState, player);
  stats.finalNetWorth = currentNetWorth(gameState, player);
  captureStats(gameState);
}

export function recordRentStats(
  gameState: GameState,
  payer: GamePlayer,
  recipient: GamePlayer,
  amount: number,
): void {
  ensurePlayerStats(gameState, payer).rentPaid += amount;
  ensurePlayerStats(gameState, recipient).rentCollected += amount;
  recordCashFlow(gameState, payer, -amount);
  recordCashFlow(gameState, recipient, amount);
}

export function recordBusTicketCollected(gameState: GameState, player: GamePlayer): void {
  ensurePlayerStats(gameState, player).busTicketsCollected += 1;
}

export function recordBusTicketUsed(gameState: GameState, player: GamePlayer): void {
  ensurePlayerStats(gameState, player).busTicketsUsed += 1;
}
