import {
  BOARD_SPACE_COUNT,
  getBoardSpace,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  getBusTicketCard,
} from "../../../../../shared/games/mega-board/cards.js";

import type {
  GamePlayer,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import { pushGlobalNotice, recordActivity } from "./activity.js";
import { recordBusTicketCollected } from "./stats.js";

const CORNER_POSITIONS = [
  0,
  13,
  26,
  39,
  BOARD_SPACE_COUNT,
];

export interface BusTicketCollectionResult {
  collected: boolean;
  ticketId: string | null;
  expiresOtherTickets: boolean;
  expiredTicketCount: number;
}

export function syncBusTicketCounts(
  gameState: GameState,
): void {
  for (const player of gameState.players) {
    player.busTicketIds ??= [];
    player.busTickets =
      player.busTicketIds.length;
  }

  gameState.busTicketDeck ??= [];
  gameState.busTicketsDiscarded ??= [];
  gameState.busTicketsRemaining =
    gameState.busTicketDeck.length;
}

export function collectBusTicket(
  gameState: GameState,
  player: GamePlayer,
): BusTicketCollectionResult {
  gameState.busTicketDeck ??= [];
  gameState.busTicketsDiscarded ??= [];
  player.busTicketIds ??= [];

  const ticketId =
    gameState.busTicketDeck.shift();

  if (!ticketId) {
    syncBusTicketCounts(gameState);
    return {
      collected: false,
      ticketId: null,
      expiresOtherTickets: false,
      expiredTicketCount: 0,
    };
  }

  const ticket =
    getBusTicketCard(ticketId);

  if (!ticket) {
    gameState.busTicketsDiscarded.push(
      ticketId,
    );
    syncBusTicketCounts(gameState);
    return {
      collected: false,
      ticketId: null,
      expiresOtherTickets: false,
      expiredTicketCount: 0,
    };
  }

  let expiredTicketCount = 0;

  if (ticket.expiresOtherTickets) {
    // The ticket that triggered the expiry is protected from its own effect.
    // First expire every ticket that was already being held, then place the
    // newly-drawn expiry ticket into the drawer's hand. This matches the
    // Mega Edition behaviour the table expects: the new ticket survives while
    // every older held Bus Ticket is returned to the draw deck.
    for (const gamePlayer of gameState.players) {
      gamePlayer.busTicketIds ??= [];
      expiredTicketCount += gamePlayer.busTicketIds.length;

      gameState.busTicketDeck.push(...gamePlayer.busTicketIds);
      gamePlayer.busTicketIds = [];
      gamePlayer.busTickets = 0;
    }

    player.busTicketIds.push(ticket.id);
    recordBusTicketCollected(gameState, player);

    pushGlobalNotice(gameState, {
      kind: "bus-ticket-expiry",
      title: "🚌 All Other Bus Tickets Expired",
      message: `${player.name} keeps the Bus Ticket just drawn. ${expiredTicketCount} other held Bus Ticket${expiredTicketCount === 1 ? "" : "s"} expired.`,
      playerId: player.id,
      presentation: "standard",
      durationMs: 3200,
    });
    // The caller records the resolved action once. Keeping this low-level helper
    // notice-only prevents duplicate activity/report rows for the same ticket draw.
  } else {
    player.busTicketIds.push(ticket.id);
    recordBusTicketCollected(gameState, player);
    pushGlobalNotice(gameState, {
      kind: "bus-ticket-gained",
      title: "🚌 Bus Ticket gained",
      message: `${player.name} received 1 Bus Ticket.`,
      playerId: player.id,
      presentation: "standard",
      durationMs: 2600,
    });
    // Activity logging stays with the caller so one Bus Ticket draw produces one report event.
  }

  syncBusTicketCounts(gameState);

  return {
    collected: true,
    ticketId: ticket.id,
    expiresOtherTickets:
      ticket.expiresOtherTickets,
    expiredTicketCount,
  };
}

export function collectAutomaticBusResultTicket(
  gameState: GameState,
  player: GamePlayer,
): {
  awardedTicketId: string | null;
  expiryTriggered: boolean;
  expiredTicketCount: number;
} {
  gameState.busTicketDeck ??= [];
  gameState.busTicketsDiscarded ??= [];
  player.busTicketIds ??= [];

  let expiryTriggered = false;
  let expiredTicketCount = 0;

  // A BUS result draws exactly one Bus Ticket. If the drawn ticket is an
  // expiry ticket, it clears tickets that were already held and then remains
  // in the drawer's hand as the protected newly-drawn ticket.
  while (gameState.busTicketDeck.length > 0) {
    const ticketId = gameState.busTicketDeck.shift();
    if (!ticketId) break;
    const ticket = getBusTicketCard(ticketId);

    if (!ticket) {
      gameState.busTicketsDiscarded.push(ticketId);
      continue;
    }

    if (ticket.expiresOtherTickets) {
      expiryTriggered = true;
      let thisExpiryCount = 0;
      for (const gamePlayer of gameState.players) {
        gamePlayer.busTicketIds ??= [];
        thisExpiryCount += gamePlayer.busTicketIds.length;
        gameState.busTicketDeck.push(...gamePlayer.busTicketIds);
        gamePlayer.busTicketIds = [];
        gamePlayer.busTickets = 0;
      }
      expiredTicketCount += thisExpiryCount;

      // A BUS Speed Die result still draws exactly one ticket. If that draw is
      // the expiry ticket, that newly-drawn ticket is the one the player keeps;
      // we do not skip it and keep fishing for a second ordinary ticket.
      player.busTicketIds.push(ticket.id);
      recordBusTicketCollected(gameState, player);
      syncBusTicketCounts(gameState);

      pushGlobalNotice(gameState, {
        kind: "bus-ticket-expiry",
        title: "🚌 All Other Bus Tickets Expired",
        message: `${player.name} keeps the Bus Ticket just drawn. ${thisExpiryCount} other held Bus Ticket${thisExpiryCount === 1 ? "" : "s"} expired.`,
        playerId: player.id,
        presentation: "standard",
        durationMs: 3200,
      });
      recordActivity(
        gameState,
        `${player.name} drew All Bus Tickets Expire from the Speed Die BUS result, kept the new ticket, and ${thisExpiryCount} other held Bus Ticket${thisExpiryCount === 1 ? "" : "s"} expired.`,
        "mega",
        player.id,
        { announce: false },
      );

      return {
        awardedTicketId: ticket.id,
        expiryTriggered,
        expiredTicketCount,
      };
    }

    player.busTicketIds.push(ticket.id);
    recordBusTicketCollected(gameState, player);
    syncBusTicketCounts(gameState);
    pushGlobalNotice(gameState, {
      kind: "bus-ticket-gained",
      title: "🚌 Bus Ticket gained",
      message: `${player.name} received 1 Bus Ticket.`,
      playerId: player.id,
      presentation: "standard",
      durationMs: 2200,
    });
    recordActivity(
      gameState,
      `${player.name} received 1 Bus Ticket from the Speed Die BUS result.`,
      "mega",
      player.id,
      { announce: false },
    );

    return {
      awardedTicketId: ticket.id,
      expiryTriggered,
      expiredTicketCount,
    };
  }

  syncBusTicketCounts(gameState);
  return {
    awardedTicketId: null,
    expiryTriggered,
    expiredTicketCount,
  };
}

export function discardHeldBusTicket(
  gameState: GameState,
  player: GamePlayer,
): string | null {
  player.busTicketIds ??= [];
  gameState.busTicketsDiscarded ??= [];

  const ticketId =
    player.busTicketIds.shift();

  if (!ticketId) {
    syncBusTicketCounts(gameState);
    return null;
  }

  gameState.busTicketsDiscarded.push(
    ticketId,
  );
  syncBusTicketCounts(gameState);
  return ticketId;
}

export function describeBusTicketCollection(
  playerName: string,
  result: BusTicketCollectionResult,
): string {
  if (!result.collected) {
    return `${playerName} could not collect a Bus Ticket because none remain.`;
  }

  if (result.expiresOtherTickets) {
    const expired =
      result.expiredTicketCount;

    return expired > 0
      ? `${playerName} drew an All Tickets Expire ticket, kept it, and ${expired} other held Bus Ticket${expired === 1 ? "" : "s"} expired.`
      : `${playerName} drew an All Tickets Expire ticket and kept it. No other held tickets expired.`;
  }

  return `${playerName} collected a Bus Ticket.`;
}

export function getUnownedOwnableSpaceIds(
  gameState: GameState,
): number[] {
  return Array.from(
    { length: BOARD_SPACE_COUNT },
    (_, position) => getBoardSpace(position),
  )
    .filter(isOwnableBoardSpace)
    .filter(
      (space) =>
        !gameState.propertyOwners[space.id],
    )
    .map((space) => space.id);
}

export function getBusTicketDestinations(
  currentPosition: number,
): number[] {
  if (
    !Number.isInteger(currentPosition) ||
    currentPosition < 0 ||
    currentPosition >= BOARD_SPACE_COUNT
  ) {
    return [];
  }

  // A Bus Ticket travels along the street/side the player is on,
  // in either direction. A corner belongs to both adjoining sides.
  // Board sides are 0↔13, 13↔26, 26↔39 and 39↔0.
  const sides: number[][] = [
    Array.from({ length: 14 }, (_, index) => index),
    Array.from({ length: 14 }, (_, index) => 13 + index),
    Array.from({ length: 14 }, (_, index) => 26 + index),
    [
      ...Array.from({ length: 13 }, (_, index) => 39 + index),
      0,
    ],
  ];

  const connectedSides = sides.filter(
    (side) => side.includes(currentPosition),
  );

  const destinations = new Set<number>();

  for (const side of connectedSides) {
    for (const position of side) {
      if (position === currentPosition) {
        continue;
      }

      const space = getBoardSpace(position);

      // Held Bus Tickets cannot deliberately target card spaces.
      if (
        space?.type === "chance" ||
        space?.type === "community-chest"
      ) {
        continue;
      }

      destinations.add(position);
    }
  }

  return [...destinations].sort((a, b) => a - b);
}

