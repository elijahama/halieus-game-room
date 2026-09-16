export type CardDeckType =
  | "chance"
  | "community-chest";

export type NearestOwnableType =
  | "railroad"
  | "utility";

export type CardEffect =
  | {
      type: "collect";
      amount: number;
    }
  | {
      type: "pay-bank";
      amount: number;
    }
  | {
      type: "move-to";
      position: number;
      collectGo: boolean;
    }
  | {
      type: "move-nearest";
      target: NearestOwnableType;
      railroadRentMultiplier?: number;
      utilityDiceMultiplier?: number;
    }
  | {
      type: "move-back";
      spaces: number;
    }
  | {
      type: "go-to-jail";
    }
  | {
      type: "get-out-of-jail";
    }
  | {
      type: "pay-each-player";
      amount: number;
    }
  | {
      type: "collect-from-each-player";
      amount: number;
    }
  | {
      type: "repairs";
      repairType: "general" | "street";
      perHouse: number;
      perHotel: number;
      perSkyscraper: number;
      perDepot: number;
    };

export interface GameCard {
  id: string;
  deck: CardDeckType;
  title: string;
  description: string;
  effect: CardEffect;
}

export interface BusTicketCard {
  id: string;
  expiresOtherTickets: boolean;
}

export const CHANCE_CARDS: GameCard[] = [
  {
    id: "chance-advance-go",
    deck: "chance",
    title: "Advance to GO",
    description: "Advance to GO. Collect £400.",
    effect: { type: "move-to", position: 0, collectGo: true },
  },
  {
    id: "chance-knightsbridge",
    deck: "chance",
    title: "Advance to Knightsbridge",
    description: "Move directly to Knightsbridge.",
    effect: { type: "move-to", position: 51, collectGo: false },
  },
  {
    id: "chance-trafalgar",
    deck: "chance",
    title: "Advance to Trafalgar Square",
    description: "Advance to Trafalgar Square. If you pass GO, collect £200.",
    effect: { type: "move-to", position: 30, collectGo: true },
  },
  {
    id: "chance-pall-mall",
    deck: "chance",
    title: "Advance to Pall Mall",
    description: "Advance to Pall Mall. If you pass GO, collect £200.",
    effect: { type: "move-to", position: 15, collectGo: true },
  },
  {
    id: "chance-kings-cross",
    deck: "chance",
    title: "Take a Trip to King's Cross Station",
    description: "Take a trip to King's Cross Station. If you pass GO, collect £200.",
    effect: { type: "move-to", position: 6, collectGo: true },
  },
  {
    id: "chance-back-three",
    deck: "chance",
    title: "Go Back 3 Spaces",
    description: "Go back 3 spaces.",
    effect: { type: "move-back", spaces: 3 },
  },
  {
    id: "chance-jail",
    deck: "chance",
    title: "Go to Jail",
    description: "Go directly to Jail. Do not pass GO. Do not collect £200.",
    effect: { type: "go-to-jail" },
  },
  {
    id: "chance-bank-dividend",
    deck: "chance",
    title: "Bank Pays You Dividend of £50",
    description: "Collect £50.",
    effect: { type: "collect", amount: 50 },
  },
  {
    id: "chance-building-loan",
    deck: "chance",
    title: "Your Building Loan Matures",
    description: "Collect £150.",
    effect: { type: "collect", amount: 150 },
  },
  {
    id: "chance-crossword",
    deck: "chance",
    title: "You Have Won a Crossword Competition",
    description: "Collect £10.",
    effect: { type: "collect", amount: 10 },
  },
  {
    id: "chance-preference-shares",
    deck: "chance",
    title: "Receive Interest on Preference Shares",
    description: "Collect £25.",
    effect: { type: "collect", amount: 25 },
  },
  {
    id: "chance-inheritance",
    deck: "chance",
    title: "You Inherit £100",
    description: "Collect £100.",
    effect: { type: "collect", amount: 100 },
  },
  {
    id: "chance-repairs",
    deck: "chance",
    title: "Make General Repairs on All Your Property",
    description: "For each house pay £25. For each hotel pay £100.",
    effect: {
      type: "repairs",
      repairType: "general",
      perHouse: 25,
      perHotel: 100,
      // A skyscraper replaces a hotel, so it is charged at the hotel rate.
      perSkyscraper: 100,
      perDepot: 0,
    },
  },
  {
    id: "chance-speeding-fine",
    deck: "chance",
    title: "Speeding Fine £15",
    description: "Pay £15.",
    effect: { type: "pay-bank", amount: 15 },
  },
  {
    id: "chance-jail-card",
    deck: "chance",
    title: "Get Out of Jail Free",
    description: "Keep this card until needed or traded.",
    effect: { type: "get-out-of-jail" },
  },
];

export const COMMUNITY_CHEST_CARDS: GameCard[] = [
  {
    id: "chest-old-kent-road",
    deck: "community-chest",
    title: "Go Back to Old Kent Road",
    description: "Move back to Old Kent Road. Do not collect £200.",
    effect: { type: "move-to", position: 1, collectGo: false },
  },
  {
    id: "chest-advance-go",
    deck: "community-chest",
    title: "Advance to GO",
    description: "Advance to GO. Collect £400.",
    effect: { type: "move-to", position: 0, collectGo: true },
  },
  {
    id: "chest-jail",
    deck: "community-chest",
    title: "Go to Jail",
    description: "Go directly to Jail. Do not pass GO. Do not collect £200.",
    effect: { type: "go-to-jail" },
  },
  {
    id: "chest-bank-error",
    deck: "community-chest",
    title: "Bank Error in Your Favour",
    description: "Collect £200.",
    effect: { type: "collect", amount: 200 },
  },
  {
    id: "chest-sale-stock",
    deck: "community-chest",
    title: "From Sale of Stock You Get £50",
    description: "Collect £50.",
    effect: { type: "collect", amount: 50 },
  },
  {
    id: "chest-income-tax-refund",
    deck: "community-chest",
    title: "Income Tax Refund",
    description: "Collect £20.",
    effect: { type: "collect", amount: 20 },
  },
  {
    id: "chest-birthday",
    deck: "community-chest",
    title: "It Is Your Birthday",
    description: "Collect £10 from every player.",
    effect: { type: "collect-from-each-player", amount: 10 },
  },
  {
    id: "chest-life-insurance",
    deck: "community-chest",
    title: "Life Insurance Matures",
    description: "Collect £100.",
    effect: { type: "collect", amount: 100 },
  },
  {
    id: "chest-consultancy-fee",
    deck: "community-chest",
    title: "Receive Consultancy Fee",
    description: "Collect £25.",
    effect: { type: "collect", amount: 25 },
  },
  {
    id: "chest-beauty-contest",
    deck: "community-chest",
    title: "You Have Won Second Prize in a Beauty Contest",
    description: "Collect £10.",
    effect: { type: "collect", amount: 10 },
  },
  {
    id: "chest-inheritance",
    deck: "community-chest",
    title: "You Inherit £100",
    description: "Collect £100.",
    effect: { type: "collect", amount: 100 },
  },
  {
    id: "chest-doctor",
    deck: "community-chest",
    title: "Doctor's Fee",
    description: "Pay £50.",
    effect: { type: "pay-bank", amount: 50 },
  },
  {
    id: "chest-hospital",
    deck: "community-chest",
    title: "Pay Hospital Fees",
    description: "Pay £100.",
    effect: { type: "pay-bank", amount: 100 },
  },
  {
    id: "chest-street-repairs",
    deck: "community-chest",
    title: "You Are Assessed for Street Repairs",
    description: "Pay £40 per house and £115 per hotel on this street strip only.",
    effect: {
      type: "repairs",
      repairType: "street",
      perHouse: 40,
      perHotel: 115,
      // A skyscraper replaces a hotel, so it is charged at the hotel rate.
      perSkyscraper: 115,
      perDepot: 0,
    },
  },
  {
    id: "chest-jail-card",
    deck: "community-chest",
    title: "Get Out of Jail Free",
    description: "Keep this card until needed or traded.",
    effect: { type: "get-out-of-jail" },
  },
];

export const BUS_TICKET_CARDS: BusTicketCard[] = [
  {
    id: "bus-expire-1",
    expiresOtherTickets: true,
  },
  {
    id: "bus-expire-2",
    expiresOtherTickets: true,
  },
  {
    id: "bus-expire-3",
    expiresOtherTickets: true,
  },
  ...Array.from(
    { length: 13 },
    (_, index): BusTicketCard => ({
      id: `bus-standard-${index + 1}`,
      expiresOtherTickets: false,
    }),
  ),
];

export const ALL_GAME_CARDS: GameCard[] = [
  ...CHANCE_CARDS,
  ...COMMUNITY_CHEST_CARDS,
];

export function getGameCard(
  cardId: string,
): GameCard | undefined {
  return ALL_GAME_CARDS.find(
    (card) => card.id === cardId,
  );
}

export function getBusTicketCard(
  ticketId: string,
): BusTicketCard | undefined {
  return BUS_TICKET_CARDS.find(
    (ticket) => ticket.id === ticketId,
  );
}
