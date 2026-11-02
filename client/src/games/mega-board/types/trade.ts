import type { TradeOffer } from "../../../../../shared/games/mega-board/game-state";

export interface TradeDraft {
  /** Other players invited into the deal. 1 = ordinary trade, 2 = 3-way, 3 = 4-way. */
  recipientIds: string[];
  /** Directed cash values keyed as `fromPlayerId->toPlayerId`. */
  cashTransfers: Record<string, number>;
  /** Destination player for each selected asset. Missing/empty means keep it. */
  propertyRecipients: Record<string, string>;
  busTicketRecipients: Record<string, string>;
  jailCardRecipients: Record<string, string>;
}

export function emptyTradeDraft(recipientIds: string[] = []): TradeDraft {
  return {
    recipientIds: [...recipientIds],
    cashTransfers: {},
    propertyRecipients: {},
    busTicketRecipients: {},
    jailCardRecipients: {},
  };
}

export function tradeTransferKey(fromPlayerId: string, toPlayerId: string): string {
  return `${fromPlayerId}->${toPlayerId}`;
}

/** The trade's directions are kept intact; only the proposed sender changes.
 * Countering does not exchange any assets until the revised offer is accepted. */
export function draftFromTradeOffer(offer: TradeOffer, counteringPlayerId: string): TradeDraft {
  const participants = offer.participantIds ?? [offer.proposerId, offer.recipientId];
  if (!participants.includes(counteringPlayerId) || counteringPlayerId === offer.proposerId) {
    throw new Error("Only an invited recipient may counter a trade.");
  }
  const recipientIds = [offer.proposerId, ...participants.filter(id =>
    id !== offer.proposerId && id !== counteringPlayerId)];
  const draft = emptyTradeDraft(recipientIds);
  const legs = offer.multiParty && offer.transfers
    ? offer.transfers
    : [
      { fromPlayerId:offer.proposerId, toPlayerId:offer.recipientId, cash:offer.proposerCash,
        propertyIds:offer.proposerPropertyIds, busTicketIds:offer.proposerBusTicketIds, jailCardIds:offer.proposerJailCardIds },
      { fromPlayerId:offer.recipientId, toPlayerId:offer.proposerId, cash:offer.recipientCash,
        propertyIds:offer.recipientPropertyIds, busTicketIds:offer.recipientBusTicketIds, jailCardIds:offer.recipientJailCardIds },
    ];
  for (const leg of legs) {
    const key = tradeTransferKey(leg.fromPlayerId, leg.toPlayerId);
    if (leg.cash > 0) draft.cashTransfers[key] = leg.cash;
    for (const id of leg.propertyIds) draft.propertyRecipients[String(id)] = leg.toPlayerId;
    for (const id of leg.busTicketIds) draft.busTicketRecipients[id] = leg.toPlayerId;
    for (const id of leg.jailCardIds) draft.jailCardRecipients[id] = leg.toPlayerId;
  }
  return draft;
}
