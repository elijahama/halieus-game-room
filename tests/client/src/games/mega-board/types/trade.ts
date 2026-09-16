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
