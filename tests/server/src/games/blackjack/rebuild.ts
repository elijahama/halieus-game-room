// Halieus Game Room 3.6.7 — isolated Blackjack rebuild engine.
// This module is the active implementation; pre-3.6.7 source is retained only under docs/archive.
import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games.js";
import type {
  BlackjackAction,
  BlackjackAiDifficulty,
  BlackjackCard,
  BlackjackPublicState,
  BlackjackMatchMode,
  BlackjackRank,
  BlackjackRules,
  BlackjackSuit,
} from "../../../../shared/games/blackjack/types.js";
import { finalizeSession, recordWorkingSession } from "../../platform/sessionArchive.js";

interface BlackjackPlayer {
  id: string;
  reconnectToken: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: BlackjackAiDifficulty | null;
  isConnected: boolean;
  seat: number;
  chips: number;
  bet: number;
  hand: BlackjackCard[];
  stood: boolean;
  busted: boolean;
  blackjack: boolean;
  doubled: boolean;
  result: string | null;
}

interface BlackjackRoom {
  code: string;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  started: boolean;
  phase: "lobby" | "playing" | "dealer" | "round-over" | "finished";
  matchMode: BlackjackMatchMode;
  players: BlackjackPlayer[];
  spectators: Map<string, string>;
  rules: BlackjackRules;
  startingChips: number;
  minimumBet: number;
  roundNumber: number;
  deck: BlackjackCard[];
  dealerHand: BlackjackCard[];
  currentTurnPlayerId: string | null;
  status: string;
}

const rooms = new Map<string, BlackjackRoom>();

export function getBlackjackChatIdentity(code: string, socketId: string): { name: string; role: "player" | "spectator" } | null {
  const room = rooms.get(normaliseCode(code));
  if (!room) return null;
  const player = room.players.find((candidate) => candidate.id === socketId && candidate.isConnected);
  if (player) return { name: player.name, role: "player" };
  const spectator = room.spectators.get(socketId);
  return spectator ? { name: spectator, role: "spectator" } : null;
}
const aiTimers = new Map<string, NodeJS.Timeout>();
const MAX_PLAYERS = 6;
const AI_NAMES = ["Atlas", "Nova", "Rook", "Echo", "Mira", "Juno", "Sol", "Vale"];
const SUITS: BlackjackSuit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: BlackjackRank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const DEFAULT_RULES: BlackjackRules = {
  deckCount: 6,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  doubleAnyTwo: true,
  dealerPeeksForBlackjack: true,
};

function token(): string { return randomBytes(8).toString("base64url").slice(0, 10).toUpperCase(); }
function normaliseCode(value: unknown): string { return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : ""; }
function normaliseName(value: unknown): string { return typeof value === "string" ? value.trim().slice(0, 24) : ""; }
function difficulty(value: unknown): BlackjackAiDifficulty { return value === "easy" || value === "hard" ? value : "normal"; }
function matchMode(value: unknown): BlackjackMatchMode { return value === "ranked" ? "ranked" : "casual"; }
function shuffle<T>(input: T[]): T[] { const values = input.slice(); for (let i = values.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; } return values; }

function createDeck(deckCount: number): BlackjackCard[] {
  const cards: BlackjackCard[] = [];
  for (let deck = 0; deck < deckCount; deck += 1) {
    for (const suit of SUITS) for (const rank of RANKS) cards.push({ id: `${deck}-${suit}-${rank}-${cards.length}`, suit, rank });
  }
  return shuffle(cards);
}

function valueOf(rank: BlackjackRank): number { if (rank === "A") return 11; if (["J","Q","K"].includes(rank)) return 10; return Number(rank); }
function handValue(hand: BlackjackCard[]): { total: number; soft: boolean } {
  let total = hand.reduce((sum, card) => sum + valueOf(card.rank), 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  const soft = aces > 0 && hand.some((card) => card.rank === "A");
  return { total, soft };
}
function isBlackjack(hand: BlackjackCard[]): boolean { return hand.length === 2 && handValue(hand).total === 21; }
function draw(room: BlackjackRoom): BlackjackCard { if (room.deck.length < 26) room.deck.push(...createDeck(room.rules.deckCount)); return room.deck.pop()!; }
function orderedPlayers(room: BlackjackRoom): BlackjackPlayer[] { return room.players.slice().sort((a,b) => a.seat-b.seat); }
function activeRoundPlayers(room: BlackjackRoom): BlackjackPlayer[] { return orderedPlayers(room).filter((p) => p.bet > 0 && p.chips >= 0); }

function nextPlayable(room: BlackjackRoom, currentId?: string): BlackjackPlayer | null {
  const ordered = activeRoundPlayers(room);
  const start = currentId ? ordered.findIndex((p) => p.id === currentId) + 1 : 0;
  for (let offset = 0; offset < ordered.length; offset += 1) {
    const player = ordered[(start + offset) % ordered.length];
    if (player && !player.stood && !player.busted && !player.blackjack) return player;
  }
  return null;
}

function legalActions(room: BlackjackRoom, player: BlackjackPlayer): BlackjackAction[] {
  if (room.phase !== "playing" || room.currentTurnPlayerId !== player.id || player.stood || player.busted || player.blackjack) return [];
  const actions: BlackjackAction[] = ["hit", "stand"];
  if (room.rules.doubleAnyTwo && player.hand.length === 2 && player.chips >= player.bet) actions.push("double");
  return actions;
}

function publicState(room: BlackjackRoom, viewerId: string | null, isSpectator: boolean): BlackjackPublicState {
  const revealDealer = room.phase === "dealer" || room.phase === "round-over" || room.phase === "finished";
  const viewer = viewerId ? room.players.find((player) => player.id === viewerId) : null;
  const dealerHand = revealDealer || room.dealerHand.length < 2 ? room.dealerHand : [room.dealerHand[0]];
  return {
    code: room.code,
    phase: room.phase,
    started: room.started,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    updatedAt: room.updatedAt,
    roundNumber: room.roundNumber,
    matchMode: room.matchMode,
    rules: room.rules,
    startingChips: room.startingChips,
    minimumBet: room.minimumBet,
    players: orderedPlayers(room).map((player) => ({
      id: player.id, name: player.name, isHost: player.isHost, isAi: player.isAi, aiDifficulty: player.aiDifficulty,
      isConnected: player.isConnected, seat: player.seat, chips: player.chips, bet: player.bet, hand: player.hand,
      stood: player.stood, busted: player.busted, blackjack: player.blackjack, doubled: player.doubled, result: player.result,
    })),
    dealerHand,
    dealerHoleHidden: !revealDealer && room.dealerHand.length >= 2,
    currentTurnPlayerId: room.currentTurnPlayerId,
    spectatorCount: room.spectators.size,
    viewerPlayerId: viewerId,
    isSpectator,
    status: room.status,
    legalActions: viewer ? legalActions(room, viewer) : [],
  };
}

function archivePayload(room: BlackjackRoom) { return { ...room, spectators: [...room.spectators.entries()] }; }

function emitRoom(io: Server, room: BlackjackRoom): void {
  room.updatedAt = Date.now();
  recordWorkingSession("blackjack", room.code, room.createdAt, archivePayload(room));
  for (const player of room.players) if (!player.isAi && player.isConnected) io.to(player.id).emit("blackjack:state", publicState(room, player.id, false));
  for (const spectatorId of room.spectators.keys()) io.to(spectatorId).emit("blackjack:state", publicState(room, null, true));
  scheduleAi(io, room);
}

function settleRound(room: BlackjackRoom): void {
  room.phase = "dealer";
  room.currentTurnPlayerId = null;
  const dealer = handValue(room.dealerHand);
  while (dealer.total < 17 || (dealer.total === 17 && dealer.soft && room.rules.dealerHitsSoft17)) {
    room.dealerHand.push(draw(room));
    const next = handValue(room.dealerHand); dealer.total = next.total; dealer.soft = next.soft;
  }
  const dealerBust = dealer.total > 21;
  const dealerBlackjack = isBlackjack(room.dealerHand);
  for (const player of room.players) {
    if (player.bet <= 0) continue;
    const total = handValue(player.hand).total;
    if (player.busted) {
      player.result = `Bust · -${player.bet}`;
    } else if (player.blackjack && !dealerBlackjack) {
      const payout = Math.floor(player.bet * room.rules.blackjackPayout);
      player.chips += player.bet + payout;
      player.result = `Blackjack · +${payout}`;
    } else if (dealerBlackjack && !player.blackjack) {
      player.result = `Dealer blackjack · -${player.bet}`;
    } else if (dealerBust || total > dealer.total) {
      player.chips += player.bet * 2;
      player.result = `Win · +${player.bet}`;
    } else if (total === dealer.total) {
      player.chips += player.bet;
      player.result = "Push";
    } else {
      player.result = `Loss · -${player.bet}`;
    }
  }
  room.phase = "round-over";
  room.status = dealerBust ? `Dealer busts with ${dealer.total}.` : `Dealer stands on ${dealer.total}.`;
  const solvent = room.players.filter((player) => player.chips >= room.minimumBet || player.bet > 0);
  if (solvent.length <= 1 && room.players.length > 1) {
    room.phase = "finished";
    const winner = room.players.slice().sort((a,b) => b.chips-a.chips)[0];
    room.status = `${winner?.name ?? "Table"} finishes with the largest stack.`;
    void finalizeSession("blackjack", room.code, room.createdAt, "completed", archivePayload(room), {
      winner: winner?.name ?? null,
      players: room.players.length,
      rounds: room.roundNumber,
      mode: room.matchMode,
      durationMs: Date.now() - room.createdAt,
    });
  }
}

function advanceTurn(room: BlackjackRoom, afterId?: string): void {
  const next = nextPlayable(room, afterId);
  if (next) { room.currentTurnPlayerId = next.id; room.status = `${next.name}'s turn.`; }
  else settleRound(room);
}

function startRound(room: BlackjackRoom): string | null {
  const eligible = room.players.filter((player) => player.chips >= room.minimumBet);
  if (eligible.length === 0) return "No player has enough virtual chips for the minimum bet.";
  if (room.players.length < 1) return "Add a player first.";
  room.started = true; room.startedAt ??= Date.now(); room.phase = "playing"; room.roundNumber += 1; room.dealerHand = []; room.deck = room.deck.length > 70 ? room.deck : createDeck(room.rules.deckCount);
  for (const player of room.players) {
    player.hand = []; player.stood = false; player.busted = false; player.blackjack = false; player.doubled = false; player.result = null;
    player.bet = player.chips >= room.minimumBet ? room.minimumBet : 0;
    if (player.bet > 0) player.chips -= player.bet;
  }
  for (let pass = 0; pass < 2; pass += 1) {
    for (const player of room.players) if (player.bet > 0) player.hand.push(draw(room));
    room.dealerHand.push(draw(room));
  }
  for (const player of room.players) player.blackjack = player.bet > 0 && isBlackjack(player.hand);
  if (room.rules.dealerPeeksForBlackjack && isBlackjack(room.dealerHand)) {
    settleRound(room); return null;
  }
  advanceTurn(room);
  return null;
}

function applyAction(room: BlackjackRoom, player: BlackjackPlayer, action: BlackjackAction): string | null {
  if (!legalActions(room, player).includes(action)) return "That Blackjack action is not available.";
  if (action === "hit") {
    player.hand.push(draw(room));
    const total = handValue(player.hand).total;
    if (total > 21) { player.busted = true; room.status = `${player.name} busts with ${total}.`; advanceTurn(room, player.id); }
    else if (total === 21) { player.stood = true; room.status = `${player.name} makes 21.`; advanceTurn(room, player.id); }
    else room.status = `${player.name} hits to ${total}.`;
  } else if (action === "stand") {
    player.stood = true; room.status = `${player.name} stands on ${handValue(player.hand).total}.`; advanceTurn(room, player.id);
  } else if (action === "double") {
    player.chips -= player.bet; player.bet *= 2; player.doubled = true; player.hand.push(draw(room));
    const total = handValue(player.hand).total; player.busted = total > 21; player.stood = true;
    room.status = player.busted ? `${player.name} doubles and busts with ${total}.` : `${player.name} doubles and stands on ${total}.`;
    advanceTurn(room, player.id);
  }
  return null;
}

function chooseAiAction(room: BlackjackRoom, player: BlackjackPlayer): BlackjackAction {
  const { total, soft } = handValue(player.hand);
  const dealerUp = room.dealerHand[0] ? valueOf(room.dealerHand[0].rank) : 10;
  if (player.aiDifficulty === "easy") return total < 15 && Math.random() > 0.18 ? "hit" : "stand";
  if (player.aiDifficulty === "hard") {
    if (player.hand.length === 2 && player.chips >= player.bet && (total === 10 || total === 11) && dealerUp <= 9) return "double";
    if (soft && total <= 17) return "hit";
    if (total <= 11) return "hit";
    if (total >= 17) return "stand";
    if (total >= 13 && dealerUp <= 6) return "stand";
    if (total === 12 && dealerUp >= 4 && dealerUp <= 6) return "stand";
    return "hit";
  }
  if (total <= 11) return "hit";
  if (total >= 17) return "stand";
  return dealerUp >= 7 ? "hit" : "stand";
}

function scheduleAi(io: Server, room: BlackjackRoom): void {
  const prior = aiTimers.get(room.code); if (prior) clearTimeout(prior); aiTimers.delete(room.code);
  if (room.phase !== "playing" || !room.currentTurnPlayerId) return;
  const player = room.players.find((candidate) => candidate.id === room.currentTurnPlayerId); if (!player?.isAi) return;
  aiTimers.set(room.code, setTimeout(() => {
    aiTimers.delete(room.code); const latest = rooms.get(room.code); if (!latest || latest.phase !== "playing") return;
    const ai = latest.players.find((candidate) => candidate.id === latest.currentTurnPlayerId); if (!ai?.isAi) return;
    applyAction(latest, ai, chooseAiAction(latest, ai)); emitRoom(io, latest);
  }, player.aiDifficulty === "hard" ? 420 : player.aiDifficulty === "easy" ? 850 : 600));
}

function addAi(room: BlackjackRoom, level: BlackjackAiDifficulty): string | null {
  if (room.started && room.phase === "playing") return "Wait until the round ends to change seats.";
  if (room.players.length >= MAX_PLAYERS) return "This Blackjack table is full.";
  const used = new Set(room.players.map((p) => p.name)); const name = AI_NAMES.find((candidate) => !used.has(candidate)) ?? `AI ${room.players.length + 1}`;
  room.players.push({ id: `bj-ai-${token()}`, reconnectToken: "", name, isHost: false, isAi: true, aiDifficulty: level, isConnected: true, seat: room.players.length, chips: room.startingChips, bet: 0, hand: [], stood: false, busted: false, blackjack: false, doubled: false, result: null });
  return null;
}

export function getBlackjackRoomCount(): number { return [...rooms.values()].filter((room) => room.phase !== "finished" && (room.players.some((player) => !player.isAi && player.isConnected) || room.spectators.size > 0)).length; }

export function registerBlackjackHandlers(io: Server, socket: Socket): void {
  socket.on("blackjack:create", (payload: any, ack: (response: any) => void) => {
    const code = normaliseCode(payload?.code); const name = normaliseName(payload?.playerName);
    if (!code || !name) return ack({ ok: false, reason: "Name and room code are required." });
    if (rooms.has(code)) return ack({ ok: false, reason: "That Blackjack room already exists." });
    const createdAt = Date.now(); const startingChips = Math.max(500, Math.min(10000, Math.floor(Number(payload?.startingChips) || 1000))); const minimumBet = Math.max(10, Math.min(500, Math.floor(Number(payload?.minimumBet) || 25)));
    const rules: BlackjackRules = { ...DEFAULT_RULES, ...(payload?.rules ?? {}) };
    const player: BlackjackPlayer = { id: socket.id, reconnectToken: token(), name, isHost: true, isAi: false, aiDifficulty: null, isConnected: true, seat: 0, chips: startingChips, bet: 0, hand: [], stood: false, busted: false, blackjack: false, doubled: false, result: null };
    const room: BlackjackRoom = { code, createdAt, startedAt: null, updatedAt: createdAt, started: false, phase: "lobby", matchMode: matchMode(payload?.matchMode), players: [player], spectators: new Map(), rules, startingChips, minimumBet, roundNumber: 0, deck: createDeck(rules.deckCount), dealerHand: [], currentTurnPlayerId: null, status: "Waiting for players." };
    const aiCount = Math.max(0, Math.min(MAX_PLAYERS - 1, Math.floor(Number(payload?.aiCount) || 0)));
    const aiDifficulty = difficulty(payload?.aiDifficulty);
    for (let index = 0; index < aiCount; index += 1) addAi(room, aiDifficulty);
    rooms.set(code, room); socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code, playerId: player.id, reconnectToken: player.reconnectToken, state: publicState(room, player.id, false) });
  });

  socket.on("blackjack:join", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const name = normaliseName(payload?.playerName);
    if (!room) return ack({ ok: false, reason: "Blackjack room not found." });
    if (room.phase === "playing" || room.phase === "dealer") return ack({ ok: false, reason: "Wait for the current round or use recovery/spectate." });
    if (!name) return ack({ ok: false, reason: "A valid name is required." });
    if (room.players.some((p) => !p.isAi && p.name.toLowerCase() === name.toLowerCase())) return ack({ ok: false, reason: "That name is already seated. Use its recovery key to rejoin." });
    if (room.players.length >= MAX_PLAYERS) { const aiIndex = room.players.map((p,i)=>({p,i})).reverse().find(({p})=>p.isAi)?.i ?? -1; if (aiIndex < 0) return ack({ ok:false, reason:"That Blackjack table is full." }); room.players.splice(aiIndex,1); room.players.forEach((p,i)=>{p.seat=i;}); }
    const player: BlackjackPlayer = { id: socket.id, reconnectToken: token(), name, isHost: false, isAi: false, aiDifficulty: null, isConnected: true, seat: room.players.length, chips: room.startingChips, bet: 0, hand: [], stood: false, busted: false, blackjack: false, doubled: false, result: null };
    room.players.push(player); socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code: room.code, playerId: player.id, reconnectToken: player.reconnectToken, state: publicState(room, player.id, false) });
  });

  socket.on("blackjack:reconnect", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const key = typeof payload?.reconnectToken === "string" ? payload.reconnectToken.trim().toUpperCase() : ""; const player = room?.players.find((p) => p.reconnectToken === key && !p.isAi);
    if (!room || !player) return ack({ ok: false, reason: "Blackjack recovery key not found." });
    const previousId = player.id; player.id = socket.id; player.isConnected = true; if (normaliseName(payload?.playerName)) player.name = normaliseName(payload.playerName);
    if (room.currentTurnPlayerId === previousId) room.currentTurnPlayerId = player.id;
    socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code: room.code, playerId: player.id, reconnectToken: player.reconnectToken, state: publicState(room, player.id, false) });
  });

  socket.on("blackjack:spectate", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); if (!room) return ack({ ok: false, reason: "Blackjack room not found." }); room.spectators.set(socket.id, normaliseName(payload?.playerName) || "Spectator"); socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code: room.code, state: publicState(room, null, true) });
  });

  socket.on("blackjack:add-ai", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((p) => p.id === socket.id && p.isHost); if (!room || !host) return ack({ ok: false, reason: "Only the host can add AI." }); const reason = addAi(room, difficulty(payload?.difficulty)); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });

  socket.on("blackjack:remove-ai", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((p) => p.id === socket.id && p.isHost); if (!room || !host || room.phase === "playing") return ack({ ok: false, reason: "Only the host can remove AI between rounds." }); room.players = room.players.filter((p) => !(p.isAi && p.id === payload?.playerId)); room.players.forEach((p,i) => { p.seat = i; }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });

  socket.on("blackjack:start", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((p) => p.id === socket.id && p.isHost); if (!room || !host) return ack({ ok: false, reason: "Only the host can deal." }); const reason = startRound(room); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });

  socket.on("blackjack:action", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.players.find((p) => p.id === socket.id); const action = payload?.action as BlackjackAction; if (!room || !player) return ack({ ok: false, reason: "Blackjack seat not found." }); const reason = applyAction(room, player, action); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });

  socket.on("blackjack:next-round", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((p) => p.id === socket.id && p.isHost); if (!room || !host || !["round-over","lobby"].includes(room.phase)) return ack({ ok: false, reason: "Only the host can deal the next round." }); const reason = startRound(room); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });

  socket.on("blackjack:end-table", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code));
    const host = room?.players.find((p) => p.id === socket.id && p.isHost);
    if (!room || !host) return ack({ ok: false, reason: "Only the host can end the Blackjack table." });
    room.phase = "finished";
    room.currentTurnPlayerId = null;
    room.status = `${host.name} ended the Blackjack table.`;
    const winner = room.players.slice().sort((a,b) => b.chips-a.chips)[0];
    void finalizeSession("blackjack", room.code, room.createdAt, "host-ended", archivePayload(room), {
      winner: winner?.name ?? null, players: room.players.length, rounds: room.roundNumber, mode: room.matchMode, durationMs: Date.now() - room.createdAt,
    });
    emitRoom(io, room);
    ack({ ok: true, state: publicState(room, host.id, false) });
  });

  socket.on("blackjack:forfeit", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code));
    const player = room?.players.find((candidate) => candidate.id === socket.id && !candidate.isAi);
    if (!room || !player) return ack({ ok: false, reason: "Blackjack seat not found." });
    const wasCurrent = room.currentTurnPlayerId === player.id;
    const wasHost = player.isHost;
    room.players = room.players.filter((candidate) => candidate.id !== player.id);
    room.players.forEach((candidate, index) => { candidate.seat = index; });
    if (wasHost && room.players.length) room.players[0].isHost = true;
    if (wasCurrent && room.phase === "playing") advanceTurn(room, player.id);
    if (!room.players.length) {
      room.phase = "finished"; room.currentTurnPlayerId = null; room.status = `${player.name} forfeited the last seat.`;
      void finalizeSession("blackjack", room.code, room.createdAt, "host-ended", archivePayload(room), { winner: null, players: 0, rounds: room.roundNumber, mode: room.matchMode, durationMs: Date.now() - room.createdAt });
    } else room.status = `${player.name} forfeited their Blackjack seat.`;
    emitRoom(io, room);
    ack({ ok: true });
  });

  socket.on("blackjack:leave", (payload: any, ack?: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); if (!room) { ack?.({ ok: true }); return; } const player = room.players.find((p) => p.id === socket.id); if (player) player.isConnected = false; room.spectators.delete(socket.id); emitRoom(io, room); ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.find((p) => p.id === socket.id); if (player) { player.isConnected = false; emitRoom(io, room); }
      if (room.spectators.delete(socket.id)) emitRoom(io, room);
    }
  });
}


export function getBlackjackLiveRoomSummaries(): HalieusLiveRoomSummary[] {
  return [...rooms.values()]
    .filter((room) => room.phase !== "finished" && (room.players.some((player) => !player.isAi && player.isConnected) || room.spectators.size > 0))
    .map((room) => ({
      game: "blackjack", gameTitle: "Blackjack", code: room.code, phase: room.phase, matchMode: room.matchMode, started: room.started,
      createdAt: room.createdAt, startedAt: room.startedAt, updatedAt: room.updatedAt, playerCount: room.players.length, maximumPlayers: 6,
      humanPlayers: room.players.filter((player) => !player.isAi && player.isConnected).map((player) => player.name), aiCount: room.players.filter((player) => player.isAi).length, spectatorCount: room.spectators.size,
      joinable: room.phase === "lobby" && (room.players.length < 6 || room.players.some((player) => player.isAi)), spectatable: true,
    }));
}
export function closeAllBlackjackRooms(): number {
  const count = rooms.size;
  for (const timer of aiTimers.values()) clearTimeout(timer);
  aiTimers.clear(); rooms.clear();
  return count;
}
