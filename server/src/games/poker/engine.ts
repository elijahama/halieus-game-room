import type {
  PokerAiDifficulty,
  PokerCard,
  PokerHandState,
  PokerMatchMode,
  PokerVariant,
  PokerPlayer,
  PokerRoom,
  PokerSuit,
  PokerWinner,
} from "./types.js";

const SUITS: PokerSuit[] = ["S", "H", "D", "C"];

export function createDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffleDeck(deck: PokerCard[]): PokerCard[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function emptyHand(): PokerHandState {
  return {
    handNumber: 0,
    phase: "lobby",
    dealerPlayerId: null,
    smallBlindPlayerId: null,
    bigBlindPlayerId: null,
    currentTurnPlayerId: null,
    board: [],
    deck: [],
    currentBet: 0,
    minimumRaise: 0,
    pot: 0,
    winners: [],
    status: "Waiting for players.",
  };
}

// Room creation keeps Poker-specific configuration in the Poker module while the outer Halieus shell owns navigation and session UX.
export function createPokerRoom(
  code: string,
  host: PokerPlayer,
  startingChips: number,
  smallBlind: number,
  bigBlind: number,
  aiDifficulty: PokerAiDifficulty,
  matchMode: PokerMatchMode,
  variant: PokerVariant,
): PokerRoom {
  return {
    code,
    players: [host],
    spectators: new Map<string, string>(),
    started: false,
    createdAt: Date.now(),
    startedAt: null,
    updatedAt: Date.now(),
    startingChips,
    smallBlind,
    bigBlind,
    aiDifficulty,
    matchMode,
    variant,
    dealerSeat: -1,
    hand: emptyHand(),
    actionSequence: 0,
    actionLog: [],
  };
}

function livePlayers(room: PokerRoom): PokerPlayer[] {
  return room.players
    .filter((player) => !player.eliminated && player.chips > 0)
    .sort((a, b) => a.seat - b.seat);
}

function nextPlayerAfterSeat(
  room: PokerRoom,
  fromSeat: number,
  predicate: (player: PokerPlayer) => boolean,
): PokerPlayer | null {
  const ordered = [...room.players].sort((a, b) => a.seat - b.seat);
  if (ordered.length === 0) return null;
  for (let offset = 1; offset <= ordered.length; offset += 1) {
    const index = (ordered.findIndex((player) => player.seat === fromSeat) + offset + ordered.length) % ordered.length;
    const candidate = ordered[index];
    if (candidate && predicate(candidate)) return candidate;
  }
  return null;
}

function nextActionPlayer(room: PokerRoom, fromSeat: number): PokerPlayer | null {
  return nextPlayerAfterSeat(
    room,
    fromSeat,
    (player) =>
      !player.eliminated &&
      !player.folded &&
      !player.allIn &&
      player.chips > 0,
  );
}

function commitChips(player: PokerPlayer, amount: number): number {
  const committed = Math.max(0, Math.min(player.chips, Math.floor(amount)));
  player.chips -= committed;
  player.currentBet += committed;
  player.totalCommitted += committed;
  if (player.chips === 0) player.allIn = true;
  return committed;
}

function refreshPot(room: PokerRoom): void {
  room.hand.pot = room.players.reduce((sum, player) => sum + player.totalCommitted, 0);
}

function nonFolded(room: PokerRoom): PokerPlayer[] {
  return room.players.filter((player) => !player.eliminated && !player.folded && player.totalCommitted >= 0);
}

function bettingPlayers(room: PokerRoom): PokerPlayer[] {
  return nonFolded(room).filter((player) => !player.allIn && player.chips > 0);
}

function bettingRoundComplete(room: PokerRoom): boolean {
  const eligible = bettingPlayers(room);
  if (eligible.length <= 1) {
    return eligible.every((player) => player.currentBet === room.hand.currentBet || player.allIn);
  }
  return eligible.every(
    (player) => player.acted && player.currentBet === room.hand.currentBet,
  );
}

function resetStreetBets(room: PokerRoom): void {
  room.hand.currentBet = 0;
  room.hand.minimumRaise = room.bigBlind;
  for (const player of room.players) {
    player.currentBet = 0;
    player.acted = false;
  }
}

function draw(room: PokerRoom): PokerCard {
  const card = room.hand.deck.pop();
  if (!card) throw new Error("Poker deck exhausted.");
  return card;
}

function runBoardToFive(room: PokerRoom): void {
  while (room.hand.board.length < 5) room.hand.board.push(draw(room));
}

function compareVectors(left: number[], right: number[]): number {
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

interface EvaluatedHand {
  score: number[];
  name: string;
  cards: PokerCard[];
}

function evaluateFive(cards: PokerCard[]): EvaluatedHand {
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.suit === cards[0]?.suit);
  const unique = [...new Set(ranks)];
  if (unique[0] === 14) unique.push(1);
  let straightHigh = 0;
  for (let i = 0; i <= unique.length - 5; i += 1) {
    const window = unique.slice(i, i + 5);
    if (window.every((rank, index) => index === 0 || window[index - 1] - rank === 1)) {
      straightHigh = window[0];
      break;
    }
  }

  if (flush && straightHigh) return { score: [8, straightHigh], name: "Straight flush", cards };
  if (groups[0]?.[1] === 4) {
    const four = groups[0][0];
    const kicker = groups.find((group) => group[0] !== four)?.[0] ?? 0;
    return { score: [7, four, kicker], name: "Four of a kind", cards };
  }
  if (groups[0]?.[1] === 3 && groups[1]?.[1] >= 2) {
    return { score: [6, groups[0][0], groups[1][0]], name: "Full house", cards };
  }
  if (flush) return { score: [5, ...ranks], name: "Flush", cards };
  if (straightHigh) return { score: [4, straightHigh], name: "Straight", cards };
  if (groups[0]?.[1] === 3) {
    const three = groups[0][0];
    const kickers = groups.filter((group) => group[0] !== three).map((group) => group[0]).sort((a, b) => b - a);
    return { score: [3, three, ...kickers], name: "Three of a kind", cards };
  }
  const pairs = groups.filter((group) => group[1] === 2).map((group) => group[0]).sort((a, b) => b - a);
  if (pairs.length >= 2) {
    const kicker = groups.filter((group) => group[0] !== pairs[0] && group[0] !== pairs[1]).map((group) => group[0]).sort((a, b) => b - a)[0] ?? 0;
    return { score: [2, pairs[0], pairs[1], kicker], name: "Two pair", cards };
  }
  if (pairs.length === 1) {
    const kickers = groups.filter((group) => group[0] !== pairs[0]).map((group) => group[0]).sort((a, b) => b - a);
    return { score: [1, pairs[0], ...kickers], name: "One pair", cards };
  }
  return { score: [0, ...ranks], name: "High card", cards };
}

export function evaluateBest(cards: PokerCard[]): EvaluatedHand {
  if (cards.length < 5) return { score: [-1], name: "Incomplete hand", cards };
  let best: EvaluatedHand | null = null;
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const evaluated = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareVectors(evaluated.score, best.score) > 0) best = evaluated;
          }
        }
      }
    }
  }
  return best ?? { score: [-1], name: "Incomplete hand", cards };
}

function settleShowdown(room: PokerRoom): void {
  runBoardToFive(room);
  const contributions = room.players
    .filter((player) => player.totalCommitted > 0)
    .map((player) => player.totalCommitted);
  const levels = [...new Set(contributions)].sort((a, b) => a - b);
  let previous = 0;
  const winnings = new Map<string, { amount: number; hand: EvaluatedHand }>();

  for (const level of levels) {
    const contributors = room.players.filter((player) => player.totalCommitted >= level);
    const amount = (level - previous) * contributors.length;
    previous = level;
    if (amount <= 0) continue;
    const eligible = contributors.filter((player) => !player.folded && !player.eliminated);
    if (eligible.length === 0) continue;
    const evaluated = eligible.map((player) => ({ player, hand: evaluateBest([...player.holeCards, ...room.hand.board]) }));
    let best = evaluated[0].hand;
    for (const candidate of evaluated.slice(1)) {
      if (compareVectors(candidate.hand.score, best.score) > 0) best = candidate.hand;
    }
    const winners = evaluated.filter((candidate) => compareVectors(candidate.hand.score, best.score) === 0);
    const share = Math.floor(amount / winners.length);
    let remainder = amount - share * winners.length;
    for (const winner of winners.sort((a, b) => a.player.seat - b.player.seat)) {
      const award = share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      winner.player.chips += award;
      const existing = winnings.get(winner.player.id);
      winnings.set(winner.player.id, {
        amount: (existing?.amount ?? 0) + award,
        hand: winner.hand,
      });
    }
  }

  room.hand.winners = [...winnings.entries()].map(([playerId, result]) => {
    const player = room.players.find((candidate) => candidate.id === playerId)!;
    return {
      playerId,
      name: player.name,
      amount: result.amount,
      handName: result.hand.name,
      cards: result.hand.cards,
    } satisfies PokerWinner;
  });
  room.hand.phase = room.players.filter((player) => player.chips > 0).length <= 1 ? "finished" : "showdown";
  room.hand.currentTurnPlayerId = null;
  room.hand.status = room.hand.winners.length === 1
    ? `${room.hand.winners[0].name} wins ${room.hand.winners[0].amount} chips with ${room.hand.winners[0].handName}.`
    : `${room.hand.winners.map((winner) => winner.name).join(" & ")} split the pot.`;
  room.hand.pot = 0;
  for (const player of room.players) {
    player.currentBet = 0;
    player.totalCommitted = 0;
    player.acted = false;
    player.allIn = false;
    player.eliminated = player.chips <= 0;
  }
}

function awardUncontested(room: PokerRoom, winner: PokerPlayer): void {
  refreshPot(room);
  const amount = room.hand.pot;
  winner.chips += amount;
  room.hand.winners = [{ playerId: winner.id, name: winner.name, amount, handName: "Uncontested", cards: winner.holeCards }];
  room.hand.phase = room.players.filter((player) => player.chips > 0).length <= 1 ? "finished" : "showdown";
  room.hand.currentTurnPlayerId = null;
  room.hand.status = `${winner.name} wins ${amount} chips uncontested.`;
  room.hand.pot = 0;
  for (const player of room.players) {
    player.currentBet = 0;
    player.totalCommitted = 0;
    player.acted = false;
    player.allIn = false;
    player.eliminated = player.chips <= 0;
  }
}

function firstPostflopActor(room: PokerRoom): PokerPlayer | null {
  const dealer = room.players.find((player) => player.id === room.hand.dealerPlayerId);
  return dealer ? nextActionPlayer(room, dealer.seat) : null;
}

function advanceStreet(room: PokerRoom): void {
  resetStreetBets(room);
  const activeBettors = bettingPlayers(room);
  if (room.hand.phase === "preflop") {
    room.hand.board.push(draw(room), draw(room), draw(room));
    room.hand.phase = "flop";
  } else if (room.hand.phase === "flop") {
    room.hand.board.push(draw(room));
    room.hand.phase = "turn";
  } else if (room.hand.phase === "turn") {
    room.hand.board.push(draw(room));
    room.hand.phase = "river";
  } else if (room.hand.phase === "river") {
    settleShowdown(room);
    return;
  }

  room.hand.status = `${room.hand.phase[0].toUpperCase()}${room.hand.phase.slice(1)} betting.`;
  if (activeBettors.length <= 1) {
    runBoardToFive(room);
    settleShowdown(room);
    return;
  }
  room.hand.currentTurnPlayerId = firstPostflopActor(room)?.id ?? null;
}

function afterAction(room: PokerRoom, actingSeat: number): void {
  refreshPot(room);
  const remaining = nonFolded(room);
  if (remaining.length === 1) {
    awardUncontested(room, remaining[0]);
    return;
  }
  if (bettingRoundComplete(room)) {
    advanceStreet(room);
    return;
  }
  room.hand.currentTurnPlayerId = nextActionPlayer(room, actingSeat)?.id ?? null;
  if (!room.hand.currentTurnPlayerId) advanceStreet(room);
}

export function startNextHand(room: PokerRoom): string | null {
  const active = livePlayers(room);
  if (active.length < 2) return "At least two players with chips are required.";

  for (const player of room.players) {
    player.eliminated = player.chips <= 0;
    player.holeCards = [];
    player.folded = player.eliminated;
    player.allIn = false;
    player.currentBet = 0;
    player.totalCommitted = 0;
    player.acted = false;
  }

  room.started = true;
  room.startedAt ??= Date.now();
  room.hand = emptyHand();
  room.hand.handNumber += Math.max(1, (room.hand.handNumber || 0));
  // emptyHand resets the number, so derive it from a private counter stored on room via dealer rotation.
  const previousHandNumber = (room as PokerRoom & { _handCounter?: number })._handCounter ?? 0;
  const handNumber = previousHandNumber + 1;
  (room as PokerRoom & { _handCounter?: number })._handCounter = handNumber;
  room.hand.handNumber = handNumber;
  room.hand.phase = "preflop";
  room.hand.deck = shuffleDeck(createDeck());
  room.hand.minimumRaise = room.bigBlind;

  const ordered = active.sort((a, b) => a.seat - b.seat);
  const priorDealerSeat = room.dealerSeat;
  const dealer = nextPlayerAfterSeat(room, priorDealerSeat, (player) => !player.eliminated && player.chips > 0) ?? ordered[0];
  room.dealerSeat = dealer.seat;
  room.hand.dealerPlayerId = dealer.id;

  const headsUp = active.length === 2;
  const smallBlindPlayer = headsUp ? dealer : nextPlayerAfterSeat(room, dealer.seat, (player) => !player.eliminated && player.chips > 0)!;
  const bigBlindPlayer = nextPlayerAfterSeat(room, smallBlindPlayer.seat, (player) => !player.eliminated && player.chips > 0)!;
  room.hand.smallBlindPlayerId = smallBlindPlayer.id;
  room.hand.bigBlindPlayerId = bigBlindPlayer.id;

  for (let round = 0; round < 2; round += 1) {
    for (const player of ordered) player.holeCards.push(draw(room));
  }

  commitChips(smallBlindPlayer, room.smallBlind);
  commitChips(bigBlindPlayer, room.bigBlind);
  room.hand.currentBet = Math.max(smallBlindPlayer.currentBet, bigBlindPlayer.currentBet);
  room.hand.minimumRaise = room.bigBlind;
  refreshPot(room);

  const firstActor = headsUp
    ? smallBlindPlayer
    : nextActionPlayer(room, bigBlindPlayer.seat);
  room.hand.currentTurnPlayerId = firstActor && !firstActor.allIn ? firstActor.id : nextActionPlayer(room, firstActor?.seat ?? bigBlindPlayer.seat)?.id ?? null;
  room.hand.status = `Hand ${handNumber}: blinds ${room.smallBlind}/${room.bigBlind}.`;
  room.updatedAt = Date.now();
  if (!room.hand.currentTurnPlayerId) advanceStreet(room);
  return null;
}

export type PokerAction = "fold" | "check" | "call" | "raise" | "all-in";

export function applyPokerAction(
  room: PokerRoom,
  playerId: string,
  action: PokerAction,
  amount?: number,
): string | null {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) return "Player not found.";
  if (room.hand.currentTurnPlayerId !== playerId) return "It is not your turn.";
  if (player.folded || player.allIn || player.eliminated) return "This player cannot act.";

  const toCall = Math.max(0, room.hand.currentBet - player.currentBet);
  const actingSeat = player.seat;

  if (action === "fold") {
    player.folded = true;
    player.acted = true;
    room.hand.status = `${player.name} folds.`;
  } else if (action === "check") {
    if (toCall > 0) return `You must call ${toCall} chips or fold.`;
    player.acted = true;
    room.hand.status = `${player.name} checks.`;
  } else if (action === "call") {
    if (toCall <= 0) return "There is nothing to call.";
    const paid = commitChips(player, toCall);
    player.acted = true;
    room.hand.status = `${player.name} calls ${paid}.`;
  } else if (action === "all-in") {
    const previousBet = room.hand.currentBet;
    const paid = commitChips(player, player.chips);
    player.acted = true;
    if (player.currentBet > previousBet) {
      room.hand.currentBet = player.currentBet;
      room.hand.minimumRaise = Math.max(room.hand.minimumRaise, player.currentBet - previousBet);
      for (const other of room.players) {
        if (other.id !== player.id && !other.folded && !other.allIn && !other.eliminated) other.acted = false;
      }
    }
    room.hand.status = `${player.name} is all-in for ${paid}.`;
  } else if (action === "raise") {
    const target = Math.floor(Number(amount));
    if (!Number.isFinite(target)) return "Enter a valid raise amount.";
    const minimumTarget = room.hand.currentBet === 0 ? room.bigBlind : room.hand.currentBet + room.hand.minimumRaise;
    const maximumTarget = player.currentBet + player.chips;
    if (target < minimumTarget && target < maximumTarget) return `Minimum raise is to ${minimumTarget}.`;
    if (target <= room.hand.currentBet) return "Raise must exceed the current bet.";
    if (target > maximumTarget) return `You only have enough chips to raise to ${maximumTarget}.`;
    const previousBet = room.hand.currentBet;
    const paid = commitChips(player, target - player.currentBet);
    room.hand.currentBet = player.currentBet;
    const raiseSize = room.hand.currentBet - previousBet;
    if (raiseSize >= room.hand.minimumRaise) room.hand.minimumRaise = raiseSize;
    player.acted = true;
    for (const other of room.players) {
      if (other.id !== player.id && !other.folded && !other.allIn && !other.eliminated) other.acted = false;
    }
    room.hand.status = `${player.name} raises to ${room.hand.currentBet}.`;
    if (paid <= 0) return "Unable to raise.";
  }

  room.updatedAt = Date.now();
  afterAction(room, actingSeat);
  return null;
}


export function forfeitPokerPlayer(room: PokerRoom, playerId: string): string | null {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player || player.isAi) return "Poker player seat not found.";
  if (player.eliminated) return "This Poker seat has already been eliminated.";
  const actingSeat = player.seat;
  player.folded = true;
  player.eliminated = true;
  player.autopilotEnabled = false;
  player.autopilotMode = "off";
  player.isConnected = false;
  player.chips = 0;
  player.acted = true;
  room.hand.status = `${player.name} forfeits the table.`;
  if (!["showdown", "finished"].includes(room.hand.phase)) {
    if (room.hand.currentTurnPlayerId === player.id || nonFolded(room).length <= 1) afterAction(room, actingSeat);
  }
  room.updatedAt = Date.now();
  return null;
}

export function legalActions(room: PokerRoom, playerId: string) {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player || room.hand.currentTurnPlayerId !== playerId || player.folded || player.allIn || player.eliminated) return null;
  const toCall = Math.max(0, room.hand.currentBet - player.currentBet);
  const maximumRaiseTo = player.currentBet + player.chips;
  const minimumRaiseTo = room.hand.currentBet === 0 ? Math.min(room.bigBlind, maximumRaiseTo) : Math.min(room.hand.currentBet + room.hand.minimumRaise, maximumRaiseTo);
  return {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0 && player.chips > 0,
    canRaise: maximumRaiseTo > room.hand.currentBet && player.chips > toCall,
    canAllIn: player.chips > 0,
    callAmount: Math.min(toCall, player.chips),
    minimumRaiseTo,
    maximumRaiseTo,
  };
}
