import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";

import {
  applyPokerAction,
  createPokerRoom,
  evaluateBest,
  legalActions,
  startNextHand,
  type PokerAction,
} from "./engine.js";
import type {
  PokerAiDifficulty,
  PokerMatchMode,
  PokerPlayer,
  PokerPublicState,
  PokerRoom,
} from "./types.js";

// Poker rooms stay isolated inside the Poker module; timers only coordinate AI turns and temporary recovery retention.
const pokerRooms = new Map<string, PokerRoom>();
const aiTimers = new Map<string, NodeJS.Timeout>();
const recoveryExpiryTimers = new Map<string, NodeJS.Timeout>();
const MAX_PLAYERS = 8;
const RECOVERY_RETENTION_MS = 2 * 60 * 60 * 1000;

// Randomised names give AI seats personality without exposing difficulty through the name itself.
const AI_NAMES = [
  "Atlas", "Nova", "Rook", "Echo", "Pixel", "Sage", "Milo", "Vale",
  "Orion", "Juno", "Flint", "Mira", "Kestrel", "Sol", "Lyra", "Cedar",
];

function recoveryToken(): string {
  return randomBytes(8).toString("base64url").slice(0, 10).toUpperCase();
}

function normaliseCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : "";
}

function normaliseName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 24) : "";
}

function clampInt(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

function normaliseDifficulty(value: unknown): PokerAiDifficulty {
  return value === "easy" || value === "hard" ? value : "normal";
}

function normaliseMatchMode(value: unknown): PokerMatchMode {
  return value === "ranked" ? "ranked" : "casual";
}

function randomAiName(room: PokerRoom): string {
  const used = new Set(room.players.map((player) => player.name.toLowerCase()));
  const available = AI_NAMES.filter((name) => !used.has(name.toLowerCase()));
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  return `Guest ${room.players.length + 1}`;
}

function clearRecoveryExpiry(roomCode: string): void {
  const timer = recoveryExpiryTimers.get(roomCode);
  if (timer) clearTimeout(timer);
  recoveryExpiryTimers.delete(roomCode);
}

function scheduleRecoveryExpiry(room: PokerRoom): void {
  clearRecoveryExpiry(room.code);
  if (room.players.some((player) => !player.isAi && player.isConnected)) return;
  const timer = setTimeout(() => {
    recoveryExpiryTimers.delete(room.code);
    const latest = pokerRooms.get(room.code);
    if (!latest || latest.players.some((player) => !player.isAi && player.isConnected)) return;
    pokerRooms.delete(room.code);
    const aiTimer = aiTimers.get(room.code);
    if (aiTimer) clearTimeout(aiTimer);
    aiTimers.delete(room.code);
  }, RECOVERY_RETENTION_MS);
  recoveryExpiryTimers.set(room.code, timer);
}

function stateFor(room: PokerRoom, viewerPlayerId: string | null, isSpectator: boolean): PokerPublicState {
  const revealAll = room.hand.phase === "showdown" || room.hand.phase === "finished";
  return {
    code: room.code,
    started: room.started,
    startingChips: room.startingChips,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    aiDifficulty: room.aiDifficulty,
    matchMode: room.matchMode,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    players: room.players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        isAi: player.isAi,
        autopilotEnabled: player.autopilotEnabled,
        isConnected: player.isConnected,
        seat: player.seat,
        chips: player.chips,
        folded: player.folded,
        allIn: player.allIn,
        currentBet: player.currentBet,
        totalCommitted: player.totalCommitted,
        eliminated: player.eliminated,
        holeCards: revealAll || (!isSpectator && viewerPlayerId === player.id) ? player.holeCards : null,
      })),
    spectatorCount: room.spectators.size,
    viewerPlayerId,
    isSpectator,
    hand: {
      handNumber: room.hand.handNumber,
      phase: room.hand.phase,
      dealerPlayerId: room.hand.dealerPlayerId,
      smallBlindPlayerId: room.hand.smallBlindPlayerId,
      bigBlindPlayerId: room.hand.bigBlindPlayerId,
      currentTurnPlayerId: room.hand.currentTurnPlayerId,
      board: room.hand.board,
      currentBet: room.hand.currentBet,
      minimumRaise: room.hand.minimumRaise,
      pot: room.hand.pot,
      winners: room.hand.winners,
      status: room.hand.status,
    },
    // Manual actions disappear while Autopilot owns the human seat; Take Control stays available in the client chrome.
    legalActions: viewerPlayerId && !room.players.find((player) => player.id === viewerPlayerId)?.autopilotEnabled
      ? legalActions(room, viewerPlayerId)
      : null,
  };
}

function emitRoom(io: Server, room: PokerRoom): void {
  for (const player of room.players) {
    if (!player.isAi && player.isConnected) {
      io.to(player.id).emit("poker:state", stateFor(room, player.id, false));
    }
  }
  for (const spectatorId of room.spectators.keys()) {
    io.to(spectatorId).emit("poker:state", stateFor(room, null, true));
  }
}

function nextFreeSeat(room: PokerRoom): number {
  for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
    if (!room.players.some((player) => player.seat === seat)) return seat;
  }
  return room.players.length;
}

function currentHost(room: PokerRoom): PokerPlayer | undefined {
  return room.players.find((player) => player.isHost && !player.isAi);
}

// Poker AI evaluates only public board cards plus its own hole cards. Difficulty changes discipline/noise, never hidden-information access.
function visibleHandConfidence(room: PokerRoom, player: PokerPlayer): number {
  const [first, second] = player.holeCards;
  if (!first || !second) return 0.35;
  if (room.hand.board.length === 0) {
    const high = Math.max(first.rank, second.rank) / 14;
    const pairBonus = first.rank === second.rank ? 0.34 : 0;
    const suitedBonus = first.suit === second.suit ? 0.06 : 0;
    const connectedBonus = Math.abs(first.rank - second.rank) <= 2 ? 0.05 : 0;
    return Math.min(1, high * 0.52 + pairBonus + suitedBonus + connectedBonus);
  }
  const cards = [...player.holeCards, ...room.hand.board];
  if (cards.length < 5) return 0.4;
  const evaluated = evaluateBest(cards);
  const category = Math.max(0, evaluated.score[0] ?? 0);
  const kicker = Math.max(0, evaluated.score[1] ?? 0) / 14;
  return Math.min(1, category / 8 * 0.78 + kicker * 0.22);
}

function selectAiAction(room: PokerRoom, player: PokerPlayer): { action: PokerAction; amount?: number } {
  const legal = legalActions(room, player.id);
  if (!legal) return { action: "check" };

  const baseConfidence = visibleHandConfidence(room, player);
  const randomness = Math.random();
  const confidence = room.aiDifficulty === "easy"
    ? baseConfidence * 0.48 + randomness * 0.52
    : room.aiDifficulty === "hard"
      ? baseConfidence * 0.88 + randomness * 0.12
      : baseConfidence * 0.7 + randomness * 0.3;
  const pressure = legal.callAmount / Math.max(1, player.chips + legal.callAmount);
  const aggression = room.aiDifficulty === "hard" ? 0.62 : room.aiDifficulty === "easy" ? 0.78 : 0.7;

  if (legal.canCheck) {
    if (legal.canRaise && confidence > aggression) {
      const potTarget = room.hand.currentBet + Math.max(room.bigBlind, Math.floor(Math.max(room.hand.pot, room.bigBlind * 2) * (confidence > 0.82 ? 0.75 : 0.5)));
      return { action: "raise", amount: Math.min(legal.maximumRaiseTo, Math.max(legal.minimumRaiseTo, potTarget)) };
    }
    return { action: "check" };
  }

  if (legal.canAllIn && confidence > 0.9 && player.chips <= Math.max(room.bigBlind * 8, room.hand.pot)) return { action: "all-in" };
  const callThreshold = room.aiDifficulty === "hard" ? 0.34 : room.aiDifficulty === "easy" ? 0.5 : 0.41;
  if (legal.canCall && confidence - pressure * 0.9 >= callThreshold) return { action: "call" };
  if (legal.canRaise && confidence > aggression + 0.08) {
    const target = Math.min(legal.maximumRaiseTo, Math.max(legal.minimumRaiseTo, room.hand.currentBet + room.bigBlind * 2));
    return { action: "raise", amount: target };
  }
  return { action: legal.canFold ? "fold" : "call" };
}

function scheduleAi(io: Server, room: PokerRoom): void {
  const existing = aiTimers.get(room.code);
  if (existing) clearTimeout(existing);
  if (!["preflop", "flop", "turn", "river"].includes(room.hand.phase)) return;
  const player = room.players.find((candidate) => candidate.id === room.hand.currentTurnPlayerId);
  // Computer seats and opted-in human Autopilot seats use the same fair-information AI path.
  if (!player || (!player.isAi && !player.autopilotEnabled)) return;
  const timer = setTimeout(() => {
    aiTimers.delete(room.code);
    const latest = pokerRooms.get(room.code);
    if (!latest) return;
    const acting = latest.players.find((candidate) => candidate.id === latest.hand.currentTurnPlayerId);
    if (!acting || (!acting.isAi && !acting.autopilotEnabled)) return;
    const choice = selectAiAction(latest, acting);
    const error = applyPokerAction(latest, acting.id, choice.action, choice.amount);
    if (error) {
      applyPokerAction(latest, acting.id, legalActions(latest, acting.id)?.canCheck ? "check" : "fold");
    }
    emitRoom(io, latest);
    scheduleAi(io, latest);
  }, 650);
  aiTimers.set(room.code, timer);
}

function leavePokerRoom(io: Server, socket: Socket): void {
  for (const room of pokerRooms.values()) {
    room.spectators.delete(socket.id);
    const player = room.players.find((candidate) => candidate.id === socket.id);
    if (!player) continue;
    player.isConnected = false;
    if (!player.isAi && currentHost(room)?.id === player.id) {
      const nextHost = room.players.find((candidate) => !candidate.isAi && candidate.isConnected && candidate.id !== player.id);
      if (nextHost) {
        player.isHost = false;
        nextHost.isHost = true;
      }
    }
    room.updatedAt = Date.now();
    emitRoom(io, room);
    scheduleAi(io, room);
    scheduleRecoveryExpiry(room);
  }
}

export function registerPokerHandlers(io: Server, socket: Socket): void {
  socket.on("poker:create", (payload: any, acknowledge: (response: any) => void) => {
    const code = normaliseCode(payload?.code);
    const name = normaliseName(payload?.playerName);
    if (!code || !name) return acknowledge({ ok: false, reason: !name ? "Player name is required." : "Room code is required." });
    if (pokerRooms.has(code)) return acknowledge({ ok: false, reason: "That room code is already in use." });
    const startingChips = clampInt(payload?.startingChips, 5000, 500, 100000);
    const smallBlind = clampInt(payload?.smallBlind, 25, 1, Math.max(1, Math.floor(startingChips / 10)));
    const bigBlind = clampInt(payload?.bigBlind, 50, smallBlind + 1, Math.max(smallBlind + 1, Math.floor(startingChips / 5)));
    const aiDifficulty = normaliseDifficulty(payload?.aiDifficulty);
    const matchMode = normaliseMatchMode(payload?.matchMode);
    const token = recoveryToken();
    const host: PokerPlayer = {
      id: socket.id,
      name,
      isHost: true,
      isAi: false,
      autopilotEnabled: false,
      isConnected: true,
      reconnectToken: token,
      seat: 0,
      chips: startingChips,
      holeCards: [],
      folded: false,
      allIn: false,
      currentBet: 0,
      totalCommitted: 0,
      acted: false,
      eliminated: false,
    };
    const room = createPokerRoom(code, host, startingChips, smallBlind, bigBlind, aiDifficulty, matchMode);
    pokerRooms.set(code, room);
    clearRecoveryExpiry(code);
    socket.join(`poker:${code}`);
    acknowledge({ ok: true, code, playerId: socket.id, reconnectToken: token, state: stateFor(room, socket.id, false) });
    emitRoom(io, room);
  });

  socket.on("poker:join", (payload: any, acknowledge: (response: any) => void) => {
    const code = normaliseCode(payload?.code);
    const name = normaliseName(payload?.playerName);
    const room = pokerRooms.get(code);
    if (!room) return acknowledge({ ok: false, reason: "That poker room does not exist." });
    if (!name) return acknowledge({ ok: false, reason: "Player name is required." });
    if (room.started) return acknowledge({ ok: false, reason: "This table has already started. Use your saved poker recovery key to rejoin." });
    if (room.players.length >= MAX_PLAYERS) return acknowledge({ ok: false, reason: "That poker table is full." });
    if (room.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) return acknowledge({ ok: false, reason: "That name is already in use at this table." });
    const token = recoveryToken();
    const player: PokerPlayer = {
      id: socket.id,
      name,
      isHost: false,
      isAi: false,
      autopilotEnabled: false,
      isConnected: true,
      reconnectToken: token,
      seat: nextFreeSeat(room),
      chips: room.startingChips,
      holeCards: [],
      folded: false,
      allIn: false,
      currentBet: 0,
      totalCommitted: 0,
      acted: false,
      eliminated: false,
    };
    room.players.push(player);
    room.updatedAt = Date.now();
    clearRecoveryExpiry(code);
    socket.join(`poker:${code}`);
    acknowledge({ ok: true, code, playerId: socket.id, reconnectToken: token, state: stateFor(room, socket.id, false) });
    emitRoom(io, room);
  });

  socket.on("poker:reconnect", (payload: any, acknowledge: (response: any) => void) => {
    const code = normaliseCode(payload?.code);
    const token = typeof payload?.reconnectToken === "string" ? payload.reconnectToken.trim().toUpperCase() : "";
    const room = pokerRooms.get(code);
    const player = room?.players.find((candidate) => candidate.reconnectToken === token && !candidate.isAi);
    if (!room || !player) return acknowledge({ ok: false, reason: "Poker recovery session not found." });
    const oldId = player.id;
    player.id = socket.id;
    player.isConnected = true;
    if (room.hand.currentTurnPlayerId === oldId) room.hand.currentTurnPlayerId = socket.id;
    if (room.hand.dealerPlayerId === oldId) room.hand.dealerPlayerId = socket.id;
    if (room.hand.smallBlindPlayerId === oldId) room.hand.smallBlindPlayerId = socket.id;
    if (room.hand.bigBlindPlayerId === oldId) room.hand.bigBlindPlayerId = socket.id;
    for (const winner of room.hand.winners) if (winner.playerId === oldId) winner.playerId = socket.id;
    clearRecoveryExpiry(code);
    socket.join(`poker:${code}`);
    acknowledge({ ok: true, code, playerId: socket.id, reconnectToken: token, state: stateFor(room, socket.id, false) });
    emitRoom(io, room);
  });

  socket.on("poker:spectate", (payload: any, acknowledge: (response: any) => void) => {
    const code = normaliseCode(payload?.code);
    const room = pokerRooms.get(code);
    if (!room) return acknowledge({ ok: false, reason: "That poker table does not exist." });
    room.spectators.set(socket.id, normaliseName(payload?.playerName) || "Spectator");
    socket.join(`poker:${code}`);
    acknowledge({ ok: true, code, state: stateFor(room, null, true) });
    emitRoom(io, room);
  });

  socket.on("poker:set-ai-difficulty", (payload: any, acknowledge: (response: any) => void) => {
    const room = pokerRooms.get(normaliseCode(payload?.code));
    const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return acknowledge({ ok: false, reason: "Only the host can change AI difficulty." });
    if (room.started) return acknowledge({ ok: false, reason: "AI difficulty can only be changed before the first hand." });
    if (payload?.difficulty !== "easy" && payload?.difficulty !== "normal" && payload?.difficulty !== "hard") {
      return acknowledge({ ok: false, reason: "Choose Easy, Normal or Hard AI." });
    }
    room.aiDifficulty = payload.difficulty;
    room.updatedAt = Date.now();
    acknowledge({ ok: true });
    emitRoom(io, room);
  });

  socket.on("poker:add-ai", (payload: any, acknowledge: (response: any) => void) => {
    const room = pokerRooms.get(normaliseCode(payload?.code));
    const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return acknowledge({ ok: false, reason: "Only the host can add AI players." });
    if (room.started) return acknowledge({ ok: false, reason: "AI seats can only be added before the table starts." });
    if (room.players.length >= MAX_PLAYERS) return acknowledge({ ok: false, reason: "The table is full." });
    const seat = nextFreeSeat(room);
    const id = `poker-ai-${room.code}-${Date.now()}-${seat}`;
    room.players.push({
      id,
      name: randomAiName(room),
      isHost: false,
      isAi: true,
      autopilotEnabled: false,
      isConnected: true,
      reconnectToken: "",
      seat,
      chips: room.startingChips,
      holeCards: [],
      folded: false,
      allIn: false,
      currentBet: 0,
      totalCommitted: 0,
      acted: false,
      eliminated: false,
    });
    acknowledge({ ok: true });
    emitRoom(io, room);
  });

  socket.on("poker:remove-ai", (payload: any, acknowledge: (response: any) => void) => {
    const room = pokerRooms.get(normaliseCode(payload?.code));
    const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return acknowledge({ ok: false, reason: "Only the host can remove AI players." });
    if (room.started) return acknowledge({ ok: false, reason: "AI seats cannot be removed after the table starts." });
    const id = typeof payload?.playerId === "string" ? payload.playerId : "";
    const target = room.players.find((player) => player.id === id && player.isAi);
    if (!target) return acknowledge({ ok: false, reason: "AI player not found." });
    room.players = room.players.filter((player) => player.id !== id);
    acknowledge({ ok: true });
    emitRoom(io, room);
  });

  socket.on("poker:start", (payload: any, acknowledge: (response: any) => void) => {
    const room = pokerRooms.get(normaliseCode(payload?.code));
    const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return acknowledge({ ok: false, reason: "Only the host can start the table." });
    if (room.players.length < 2) return acknowledge({ ok: false, reason: "Add or invite at least one more player." });
    const error = startNextHand(room);
    if (error) return acknowledge({ ok: false, reason: error });
    acknowledge({ ok: true });
    emitRoom(io, room);
    scheduleAi(io, room);
  });

  socket.on("poker:action", (payload: any, acknowledge: (response: any) => void) => {
    const room = pokerRooms.get(normaliseCode(payload?.code));
    if (!room) return acknowledge({ ok: false, reason: "Poker table not found." });
    const player = room.players.find((candidate) => candidate.id === socket.id && !candidate.isAi);
    if (player?.autopilotEnabled) return acknowledge({ ok: false, reason: "Take control before making a manual Poker action." });
    const action = payload?.action as PokerAction;
    if (!["fold", "check", "call", "raise", "all-in"].includes(action)) return acknowledge({ ok: false, reason: "Unknown poker action." });
    const error = applyPokerAction(room, socket.id, action, payload?.amount);
    if (error) return acknowledge({ ok: false, reason: error });
    acknowledge({ ok: true });
    emitRoom(io, room);
    scheduleAi(io, room);
  });

  // Autopilot never changes seat ownership: it only lets the existing Poker AI act for a human until Take Control is pressed.
  socket.on("poker:set-autopilot", (payload: any, acknowledge: (response: any) => void) => {
    const room = pokerRooms.get(normaliseCode(payload?.code));
    const player = room?.players.find((candidate) => candidate.id === socket.id && !candidate.isAi);
    if (!room || !player) return acknowledge({ ok: false, reason: "Poker player seat not found." });
    if (player.eliminated) return acknowledge({ ok: false, reason: "An eliminated seat cannot use Autopilot." });

    player.autopilotEnabled = Boolean(payload?.enabled);
    room.updatedAt = Date.now();
    acknowledge({ ok: true });
    emitRoom(io, room);
    scheduleAi(io, room);
  });

  socket.on("poker:next-hand", (payload: any, acknowledge: (response: any) => void) => {
    const room = pokerRooms.get(normaliseCode(payload?.code));
    const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return acknowledge({ ok: false, reason: "Only the host can deal the next hand." });
    if (!["showdown", "finished"].includes(room.hand.phase)) return acknowledge({ ok: false, reason: "This hand is still in progress." });
    const error = startNextHand(room);
    if (error) return acknowledge({ ok: false, reason: error });
    acknowledge({ ok: true });
    emitRoom(io, room);
    scheduleAi(io, room);
  });

  // Returning to the Game Room preserves the player's seat and recovery token instead of treating navigation as a forfeit.
  socket.on("poker:leave", (payload: any, acknowledge: (response: any) => void) => {
    const code = normaliseCode(payload?.code);
    const room = pokerRooms.get(code);
    if (!room) return acknowledge({ ok: true });
    const preserveSeat = payload?.preserveSeat !== false;
    room.spectators.delete(socket.id);
    const player = room.players.find((candidate) => candidate.id === socket.id);
    if (player) {
      if (preserveSeat) player.isConnected = false;
      else room.players = room.players.filter((candidate) => candidate.id !== socket.id);
      if (player.isHost) {
        const nextHost = room.players.find((candidate) => !candidate.isAi && candidate.isConnected && candidate.id !== player.id);
        if (nextHost) {
          player.isHost = false;
          nextHost.isHost = true;
        }
      }
    }
    room.updatedAt = Date.now();
    const recoverableHumans = room.players.some((candidate) => !candidate.isAi);
    if (!recoverableHumans && room.spectators.size === 0) {
      clearRecoveryExpiry(code);
      pokerRooms.delete(code);
    } else {
      emitRoom(io, room);
      scheduleRecoveryExpiry(room);
    }
    socket.leave(`poker:${code}`);
    acknowledge({ ok: true });
  });

  socket.on("disconnect", () => leavePokerRoom(io, socket));
}

export function getPokerRoomCount(): number {
  return pokerRooms.size;
}
