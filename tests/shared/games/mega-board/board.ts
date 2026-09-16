export type BoardSpaceType =
  | "property"
  | "railroad"
  | "utility"
  | "chance"
  | "community-chest"
  | "tax"
  | "special";

export type PropertyGroup =
  | "brown"
  | "light-blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark-blue";

export interface BaseBoardSpace {
  id: number;
  position: number;
  name: string;
  type: BoardSpaceType;
}

export interface OwnableBoardSpaceBase
  extends BaseBoardSpace {
  type:
    | "property"
    | "railroad"
    | "utility";

  price: number;
  mortgage: number;
}

export interface PropertyBoardSpace
  extends OwnableBoardSpaceBase {
  type: "property";
  group: PropertyGroup;
  houseCost: number;

  /**
   * 0: Base rent
   * 1: Complete colour-group rent
   * 2-5: One to four houses
   * 6: Hotel
   * 7: Skyscraper
   */
  rents: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

export interface RailroadBoardSpace
  extends OwnableBoardSpaceBase {
  type: "railroad";
  depotCost: number;

  /**
   * Rent for owning one through four stations.
   * A depot multiplier is handled separately.
   */
  rents: [
    number,
    number,
    number,
    number,
  ];
}

export interface UtilityBoardSpace
  extends OwnableBoardSpaceBase {
  type: "utility";

  /**
   * Dice multipliers for owning one, two or three utilities.
   */
  rentMultipliers: [
    number,
    number,
    number,
  ];
}

export interface TaxBoardSpace
  extends BaseBoardSpace {
  type: "tax";
  amount: number;
}

export interface OtherBoardSpace
  extends BaseBoardSpace {
  type:
    | "chance"
    | "community-chest"
    | "special";

  amount?: number;
}

export type OwnableBoardSpace =
  | PropertyBoardSpace
  | RailroadBoardSpace
  | UtilityBoardSpace;

export type BoardSpace =
  | OwnableBoardSpace
  | TaxBoardSpace
  | OtherBoardSpace;

export const BOARD_SPACE_COUNT = 52;
export const BOARD_GRID_SIZE = 14;

export const GO_POSITION = 0;
export const JAIL_POSITION = 13;
export const AUCTION_POSITION = 14;
export const FREE_PARKING_POSITION = 26;
export const BUS_TICKET_POSITION = 32;
export const GO_TO_JAIL_POSITION = 39;
export const BIRTHDAY_GIFT_POSITION = 47;
export const TRAFALGAR_SQUARE_POSITION = 30;
export const BANK_DEPOSIT_POSITION = 50;

export const PROPERTY_GROUP_COLOURS: Record<
  PropertyGroup,
  string
> = {
  brown: "#8b5a2b",
  "light-blue": "#87ceeb",
  pink: "#d946ef",
  orange: "#f28c28",
  red: "#dc2626",
  yellow: "#facc15",
  green: "#15803d",
  "dark-blue": "#1d4ed8",
};

export function getPropertyGroupColour(
  group: PropertyGroup,
): string {
  return PROPERTY_GROUP_COLOURS[group];
}

export function getPropertyGroupSpaces(
  group: PropertyGroup,
): PropertyBoardSpace[] {
  return BOARD_SPACES.filter(
    (space): space is PropertyBoardSpace =>
      space.type === "property" &&
      space.group === group,
  );
}

function property(
  position: number,
  name: string,
  group: PropertyGroup,
  price: number,
  houseCost: number,
  rents: PropertyBoardSpace["rents"],
): PropertyBoardSpace {
  return {
    id: position,
    position,
    name,
    type: "property",
    group,
    price,
    mortgage: Math.floor(price / 2),
    houseCost,
    rents,
  };
}

function railroad(
  position: number,
  name: string,
): RailroadBoardSpace {
  return {
    id: position,
    position,
    name,
    type: "railroad",
    price: 200,
    mortgage: 100,
    depotCost: 100,
    rents: [
      25,
      50,
      100,
      200,
    ],
  };
}

function utility(
  position: number,
  name: string,
): UtilityBoardSpace {
  return {
    id: position,
    position,
    name,
    type: "utility",
    price: 150,
    mortgage: 75,
    rentMultipliers: [
      4,
      10,
      20,
    ],
  };
}

function chance(
  position: number,
): OtherBoardSpace {
  return {
    id: position,
    position,
    name: "Chance",
    type: "chance",
  };
}

function communityChest(
  position: number,
): OtherBoardSpace {
  return {
    id: position,
    position,
    name: "Community Chest",
    type: "community-chest",
  };
}

function special(
  position: number,
  name: string,
  amount?: number,
): OtherBoardSpace {
  return {
    id: position,
    position,
    name,
    type: "special",
    ...(amount === undefined
      ? {}
      : { amount }),
  };
}

function tax(
  position: number,
  name: string,
  amount: number,
): TaxBoardSpace {
  return {
    id: position,
    position,
    name,
    type: "tax",
    amount,
  };
}

export const BOARD_SPACES: BoardSpace[] = [
  special(GO_POSITION, "GO"),

  property(
    1,
    "Old Kent Road",
    "brown",
    60,
    50,
    [2, 6, 10, 30, 90, 160, 250, 750],
  ),

  communityChest(2),

  property(
    3,
    "Whitechapel Road",
    "brown",
    60,
    50,
    [4, 12, 20, 60, 180, 320, 450, 950],
  ),

  property(
    4,
    "Elephant & Castle",
    "brown",
    60,
    50,
    [4, 12, 20, 60, 180, 320, 450, 950],
  ),

  tax(5, "Income Tax", 200),
  railroad(6, "King's Cross Station"),

  property(
    7,
    "The Angel, Islington",
    "light-blue",
    100,
    50,
    [6, 18, 30, 90, 270, 400, 550, 1050],
  ),

  property(
    8,
    "Euston Road",
    "light-blue",
    100,
    50,
    [6, 18, 30, 90, 270, 400, 550, 1050],
  ),

  chance(9),
  utility(10, "Gas Company"),

  property(
    11,
    "Pentonville Road",
    "light-blue",
    120,
    50,
    [8, 24, 40, 100, 300, 450, 600, 1100],
  ),

  property(
    12,
    "Edgware Road",
    "light-blue",
    120,
    50,
    [8, 24, 40, 100, 300, 450, 600, 1100],
  ),

  special(
    JAIL_POSITION,
    "Jail / Just Visiting",
  ),

  special(AUCTION_POSITION, "Auction"),

  property(
    15,
    "Pall Mall",
    "pink",
    140,
    100,
    [10, 30, 50, 150, 450, 625, 750, 1250],
  ),

  property(
    16,
    "Whitehall",
    "pink",
    140,
    100,
    [10, 30, 50, 150, 450, 625, 750, 1250],
  ),

  utility(17, "Electric Company"),

  property(
    18,
    "Northumberland Avenue",
    "pink",
    160,
    100,
    [12, 36, 60, 180, 500, 700, 900, 1400],
  ),

  property(
    19,
    "Downing Street",
    "pink",
    160,
    100,
    [12, 36, 60, 180, 500, 700, 900, 1400],
  ),

  railroad(20, "Marylebone Station"),

  property(
    21,
    "Bow Street",
    "orange",
    180,
    100,
    [14, 42, 70, 200, 550, 750, 950, 1450],
  ),

  communityChest(22),

  property(
    23,
    "Marlborough Street",
    "orange",
    180,
    100,
    [14, 42, 70, 200, 550, 750, 950, 1450],
  ),

  property(
    24,
    "Vine Street",
    "orange",
    200,
    100,
    [16, 48, 80, 220, 600, 800, 1000, 1500],
  ),

  property(
    25,
    "High Holborn",
    "orange",
    200,
    100,
    [16, 48, 80, 220, 600, 800, 1000, 1500],
  ),

  special(
    FREE_PARKING_POSITION,
    "Free Parking",
  ),

  property(
    27,
    "Strand",
    "red",
    220,
    150,
    [18, 54, 90, 250, 700, 875, 1050, 2050],
  ),

  chance(28),

  property(
    29,
    "Fleet Street",
    "red",
    220,
    150,
    [18, 54, 90, 250, 700, 875, 1050, 2050],
  ),

  property(
    TRAFALGAR_SQUARE_POSITION,
    "Trafalgar Square",
    "red",
    240,
    150,
    [20, 60, 100, 300, 750, 925, 1100, 2100],
  ),

  property(
    31,
    "Aldwych",
    "red",
    240,
    150,
    [20, 60, 100, 300, 750, 925, 1100, 2100],
  ),

  special(BUS_TICKET_POSITION, "Bus Ticket"),
  railroad(33, "Fenchurch Street Station"),

  property(
    34,
    "Leicester Square",
    "yellow",
    260,
    150,
    [22, 66, 110, 330, 800, 975, 1150, 2150],
  ),

  property(
    35,
    "Coventry Street",
    "yellow",
    260,
    150,
    [22, 66, 110, 330, 800, 975, 1150, 2150],
  ),

  utility(36, "Water Works"),

  property(
    37,
    "Piccadilly",
    "yellow",
    280,
    150,
    [24, 72, 120, 360, 850, 1025, 1200, 2200],
  ),

  property(
    38,
    "Shaftesbury Avenue",
    "yellow",
    280,
    150,
    [24, 72, 120, 360, 850, 1025, 1200, 2200],
  ),

  special(
    GO_TO_JAIL_POSITION,
    "Go To Jail",
  ),

  property(
    40,
    "Regent Street",
    "green",
    300,
    200,
    [26, 78, 130, 390, 900, 1100, 1275, 2275],
  ),

  property(
    41,
    "Oxford Street",
    "green",
    300,
    200,
    [26, 78, 130, 390, 900, 1100, 1275, 2275],
  ),

  property(
    42,
    "Bond Street",
    "green",
    320,
    200,
    [28, 84, 150, 450, 1000, 1200, 1400, 2400],
  ),

  communityChest(43),

  property(
    44,
    "Savile Row",
    "green",
    320,
    200,
    [28, 84, 150, 450, 1000, 1200, 1400, 2400],
  ),

  railroad(45, "Liverpool Street Station"),
  chance(46),
  special(BIRTHDAY_GIFT_POSITION, "Birthday Gift"),

  property(
    48,
    "Park Lane",
    "dark-blue",
    350,
    200,
    [35, 105, 175, 500, 1100, 1300, 1500, 2500],
  ),

  property(
    49,
    "Mayfair",
    "dark-blue",
    350,
    200,
    [35, 105, 175, 500, 1100, 1300, 1500, 2500],
  ),

  special(
    BANK_DEPOSIT_POSITION,
    "Bank Deposit",
    100,
  ),

  property(
    51,
    "Knightsbridge",
    "dark-blue",
    400,
    200,
    [50, 150, 200, 600, 1400, 1700, 2000, 3000],
  ),
];

if (
  BOARD_SPACES.length !==
  BOARD_SPACE_COUNT
) {
  throw new Error(
    `Expected ${BOARD_SPACE_COUNT} spaces, received ${BOARD_SPACES.length}.`,
  );
}

BOARD_SPACES.forEach(
  (space, index) => {
    if (
      space.id !== index ||
      space.position !== index
    ) {
      throw new Error(
        `Board space ${space.name} is out of sequence at index ${index}.`,
      );
    }
  },
);

export function getBoardSpace(
  position: number,
): BoardSpace | undefined {
  return BOARD_SPACES[position];
}

export function isOwnableBoardSpace(
  space: BoardSpace | undefined,
): space is OwnableBoardSpace {
  return (
    space?.type === "property" ||
    space?.type === "railroad" ||
    space?.type === "utility"
  );
}

export function isPropertyBoardSpace(
  space: BoardSpace | undefined,
): space is PropertyBoardSpace {
  return space?.type === "property";
}

export function isRailroadBoardSpace(
  space: BoardSpace | undefined,
): space is RailroadBoardSpace {
  return space?.type === "railroad";
}

export function isUtilityBoardSpace(
  space: BoardSpace | undefined,
): space is UtilityBoardSpace {
  return space?.type === "utility";
}

export interface BoardGridPosition {
  row: number;
  column: number;
}

export function getBoardGridPosition(
  position: number,
): BoardGridPosition {
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position >= BOARD_SPACE_COUNT
  ) {
    throw new RangeError(
      `Board position must be between 0 and ${BOARD_SPACE_COUNT - 1}.`,
    );
  }

  if (position === GO_POSITION) {
    return { row: 14, column: 14 };
  }

  if (
    position >= 1 &&
    position <= 12
  ) {
    return {
      row: 14,
      column: 14 - position,
    };
  }

  if (position === JAIL_POSITION) {
    return { row: 14, column: 1 };
  }

  if (
    position >= 14 &&
    position <= 25
  ) {
    return {
      row: 27 - position,
      column: 1,
    };
  }

  if (
    position === FREE_PARKING_POSITION
  ) {
    return { row: 1, column: 1 };
  }

  if (
    position >= 27 &&
    position <= 38
  ) {
    return {
      row: 1,
      column: position - 25,
    };
  }

  if (
    position === GO_TO_JAIL_POSITION
  ) {
    return { row: 1, column: 14 };
  }

  return {
    row: position - 38,
    column: 14,
  };
}

export function isCornerSpace(
  position: number,
): boolean {
  return (
    position === GO_POSITION ||
    position === JAIL_POSITION ||
    position ===
      FREE_PARKING_POSITION ||
    position === GO_TO_JAIL_POSITION
  );
}
