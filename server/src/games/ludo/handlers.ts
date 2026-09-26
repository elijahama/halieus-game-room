import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games.js";
import type {
  LudoActionLogEntry,
  LudoAiDifficulty,
  LudoColour,
  LudoPiece,
  LudoMatchMode,
  LudoPublicPlayer,
  LudoPublicState,
  LudoRules,
} from "../../../../shared/games/ludo/types.js";
import { finalizeSession, recordWorkingSession } from "../../platform/sessionArchive.js";

interface LudoPlayer extends LudoPublicPlayer {
  reconnectToken: string;
}

interface LudoRoom {
  code: string;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  started: boolean;
  phase: "lobby" | "ordering" | "playing" | "finished";
  matchMode: LudoMatchMode;
  rulesPreset: "halieus-classic";
  rules: LudoRules;
  players: LudoPlayer[];
  spectators: Map<string, string>;
  currentTurnPlayerId: string | null;
  orderRound: number;
  orderContenderPlayerIds: string[];
  lastRoll: number | null;
  canRoll: boolean;
  awaitingMove: boolean;
  winnerPlayerId: string | null;
  turnNumber: number;
  status: string;
  actionSequence: number;
  actionLog: LudoActionLogEntry[];
}

const rooms = new Map<string, LudoRoom>();

export function getLudoChatIdentity(code: string, socketId: string): { name: string; role: "player" | "spectator" } | null {
  const room = rooms.get(normaliseCode(code));
  if (!room) return null;
  const player = room.players.find((candidate) => candidate.id === socketId && candidate.isConnected);
  if (player) return { name: player.name, role: "player" };
  const spectator = room.spectators.get(socketId);
  return spectator ? { name: spectator, role: "spectator" } : null;
}
const aiTimers = new Map<string, NodeJS.Timeout>();
const globalFinishNoticeKeys = new Map<string, string>();
const COLOURS: LudoColour[] = ["red", "green", "yellow", "blue"];
const START_INDEX: Record<LudoColour, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_STARS = new Set([8, 21, 34, 47]);
const DEFAULT_RULES: LudoRules = {
  piecesPerPlayer: 4,
  rollToEnter: 6,
  extraTurnOnSix: true,
  extraTurnOnCapture: true,
  exactRollToFinish: true,
  safeStartSquares: true,
  safeStarSquares: true,
  blockadesEnabled: false,
};
const AI_NAMES = ["Atlas", "Nova", "Rook", "Echo", "Mira", "Juno", "Sol", "Vale", "Orion", "Sage", "Flint", "Lyra"];

function token(): string { return randomBytes(8).toString("base64url").slice(0, 10).toUpperCase(); }
function normaliseCode(value: unknown): string { return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : ""; }
function normaliseName(value: unknown): string { return typeof value === "string" ? value.trim().slice(0, 24) : ""; }
function difficulty(value: unknown): LudoAiDifficulty { return value === "easy" || value === "hard" ? value : "normal"; }
function dice(): number { return Math.floor(Math.random() * 6) + 1; }
function piecesFor(colour: LudoColour): LudoPiece[] { return Array.from({ length: 4 }, (_, index) => ({ id: `${colour}-${index + 1}`, steps: -1 })); }
function finishedCount(player: LudoPlayer): number { return player.pieces.filter((piece) => piece.steps === 57).length; }
function activePlayers(room: LudoRoom): LudoPlayer[] { return room.players.slice().sort((a, b) => a.seat - b.seat); }
function nextPlayer(room: LudoRoom, playerId: string): LudoPlayer | null {
  const ordered = activePlayers(room);
  if (!ordered.length) return null;
  const index = ordered.findIndex((player) => player.id === playerId);
  return ordered[(Math.max(0, index) + 1) % ordered.length] ?? ordered[0] ?? null;
}
function trackIndex(player: LudoPlayer, piece: LudoPiece): number | null {
  if (piece.steps < 0 || piece.steps > 51) return null;
  return (START_INDEX[player.colour] + piece.steps) % 52;
}
function isSafeTrack(room: LudoRoom, index: number): boolean {
  if (room.rules.safeStartSquares && Object.values(START_INDEX).includes(index)) return true;
  return room.rules.safeStarSquares && SAFE_STARS.has(index);
}
function legalPieces(room: LudoRoom, player: LudoPlayer, roll = room.lastRoll): LudoPiece[] {
  if (!roll) return [];
  return player.pieces.filter((piece) => {
    if (piece.steps === 57) return false;
    if (piece.steps === -1) return roll === room.rules.rollToEnter;
    const target = piece.steps + roll;
    return room.rules.exactRollToFinish ? target <= 57 : true;
  });
}
function publicPlayer(player: LudoPlayer): LudoPublicPlayer {
  return { id: player.id, name: player.name, isHost: player.isHost, isAi: player.isAi, aiDifficulty: player.aiDifficulty, isConnected: player.isConnected, seat: player.seat, colour: player.colour, pieces: player.pieces.map((piece) => ({ ...piece })), finishedCount: finishedCount(player), autopilotEnabled: player.autopilotEnabled, result: player.result, orderRoll: player.orderRoll };
}
function publicState(room: LudoRoom, viewerId: string | null, isSpectator: boolean): LudoPublicState {
  const viewer = viewerId ? room.players.find((player) => player.id === viewerId) : null;
  const canViewerAct = Boolean(viewer && !isSpectator && (room.phase === "ordering" || room.phase === "playing") && room.currentTurnPlayerId === viewer.id && !viewer.autopilotEnabled);
  return {
    code: room.code, createdAt: room.createdAt, startedAt: room.startedAt, updatedAt: room.updatedAt, started: room.started, phase: room.phase, matchMode: room.matchMode,
    rulesPreset: room.rulesPreset, rules: room.rules, players: activePlayers(room).map(publicPlayer), spectatorCount: room.spectators.size,
    viewerPlayerId: viewerId, isSpectator, currentTurnPlayerId: room.currentTurnPlayerId, orderRound: room.orderRound, orderContenderPlayerIds: room.orderContenderPlayerIds.slice(), lastRoll: room.lastRoll,
    canRoll: canViewerAct && room.canRoll, awaitingMove: room.awaitingMove,
    legalPieceIds: canViewerAct && room.phase === "playing" && room.awaitingMove ? legalPieces(room, viewer!).map((piece) => piece.id) : [],
    winnerPlayerId: room.winnerPlayerId, turnNumber: room.turnNumber, status: room.status, actionLog: room.actionLog.slice(-260),
  };
}
function recordAction(room: LudoRoom, entry: Omit<LudoActionLogEntry, "sequence" | "at">): void {
  room.actionSequence += 1;
  room.actionLog.push({ ...entry, sequence: room.actionSequence, at: Date.now() });
  if (room.actionLog.length > 260) room.actionLog.splice(0, room.actionLog.length - 260);
}
function archivePayload(room: LudoRoom) { return { ...room, spectators: [...room.spectators.entries()] }; }
function emitRoom(io: Server, room: LudoRoom): void {
  room.updatedAt = Date.now();
  recordWorkingSession("ludo", room.code, room.createdAt, archivePayload(room));
  if (room.phase === "finished") {
    const winner = room.players.find((player) => player.id === room.winnerPlayerId)?.name ?? null;
    const key = `${winner ?? "none"}|${room.status}`;
    if (globalFinishNoticeKeys.get(room.code) !== key) {
      globalFinishNoticeKeys.set(room.code, key);
      io.emit("platform:game-finished", { id: `ludo-${room.code}-${room.actionSequence}`, game: "ludo", gameTitle: "Ludo", code: room.code, status: "game-finished", winner, message: room.status, at: room.updatedAt });
    }
  } else {
    globalFinishNoticeKeys.delete(room.code);
  }
  for (const player of room.players) if (!player.isAi && player.isConnected) io.to(player.id).emit("ludo:state", publicState(room, player.id, false));
  for (const spectatorId of room.spectators.keys()) io.to(spectatorId).emit("ludo:state", publicState(room, null, true));
  scheduleAi(io, room);
}
function assignColours(room: LudoRoom): void {
  room.players.forEach((player, index) => { player.seat = index; player.colour = COLOURS[index] ?? "red"; });
}
function endTurn(room: LudoRoom, player: LudoPlayer, extraTurn: boolean): void {
  room.lastRoll = null;
  room.awaitingMove = false;
  room.canRoll = true;
  if (extraTurn) {
    room.currentTurnPlayerId = player.id;
    room.status = `${player.name} gets another roll.`;
  } else {
    room.currentTurnPlayerId = nextPlayer(room, player.id)?.id ?? null;
    room.turnNumber += 1;
    const next = room.players.find((candidate) => candidate.id === room.currentTurnPlayerId);
    room.status = next ? `${next.name}'s turn.` : "Waiting for the next turn.";
  }
}
function conclude(room: LudoRoom, player: LudoPlayer): void {
  room.phase = "finished"; room.currentTurnPlayerId = null; room.canRoll = false; room.awaitingMove = false; room.winnerPlayerId = player.id;
  player.result = "Winner";
  for (const other of room.players) if (other.id !== player.id) other.result = `${finishedCount(other)}/4 home`;
  room.status = `${player.name} wins Ludo.`;
  recordAction(room, { playerId: player.id, playerName: player.name, playerIsAi: player.isAi, action: "finish", roll: room.lastRoll, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: room.status, aiReason: null });
  void finalizeSession("ludo", room.code, room.createdAt, "completed", archivePayload(room), { winner: player.name, players: room.players.length, durationMs: Date.now() - room.createdAt, mode: room.matchMode });
}
function rollForOrder(room: LudoRoom, player: LudoPlayer, aiReason: string | null = null): string | null {
  if (room.phase !== "ordering" || room.currentTurnPlayerId !== player.id || !room.canRoll) return "You cannot roll for order now.";
  const roll = dice();
  player.orderRoll = roll;
  room.lastRoll = roll;
  room.canRoll = false;
  recordAction(room, { playerId: player.id, playerName: player.name, playerIsAi: player.isAi, action: "order-roll", roll, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: `${player.name} rolled ${roll} for starting order.`, aiReason });

  const contenders = room.orderContenderPlayerIds.map((id) => room.players.find((candidate) => candidate.id === id)).filter((candidate): candidate is LudoPlayer => Boolean(candidate));
  const nextPending = contenders.find((candidate) => candidate.orderRoll === null);
  if (nextPending) {
    room.currentTurnPlayerId = nextPending.id;
    room.canRoll = true;
    room.status = `${nextPending.name} rolls for starting order.`;
    return null;
  }

  const highest = Math.max(...contenders.map((candidate) => candidate.orderRoll ?? 0));
  const leaders = contenders.filter((candidate) => candidate.orderRoll === highest);
  if (leaders.length > 1) {
    room.orderRound += 1;
    room.orderContenderPlayerIds = leaders.map((candidate) => candidate.id);
    for (const contender of leaders) contender.orderRoll = null;
    room.currentTurnPlayerId = leaders[0]?.id ?? null;
    room.lastRoll = null;
    room.canRoll = true;
    room.status = `Tie on ${highest}. ${leaders.map((candidate) => candidate.name).join(" and ")} reroll for starting order.`;
    recordAction(room, { playerId: null, playerName: null, playerIsAi: false, action: "table", roll: highest, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: room.status, aiReason: null });
    return null;
  }

  const winner = leaders[0]!;
  room.phase = "playing";
  room.currentTurnPlayerId = winner.id;
  room.orderContenderPlayerIds = [];
  room.lastRoll = null;
  room.canRoll = true;
  room.awaitingMove = false;
  room.turnNumber = 1;
  room.status = `${winner.name} won the roll for order and starts.`;
  recordAction(room, { playerId: winner.id, playerName: winner.name, playerIsAi: winner.isAi, action: "table", roll: winner.orderRoll, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: room.status, aiReason: null });
  return null;
}

function rollFor(room: LudoRoom, player: LudoPlayer, aiReason: string | null = null): string | null {
  if (room.phase !== "playing" || room.currentTurnPlayerId !== player.id || !room.canRoll) return "You cannot roll now.";
  const roll = dice(); room.lastRoll = roll; room.canRoll = false;
  const legal = legalPieces(room, player, roll);
  room.awaitingMove = legal.length > 0;
  room.status = `${player.name} rolled ${roll}${legal.length ? ". Choose a piece." : ". No legal move."}`;
  recordAction(room, { playerId: player.id, playerName: player.name, playerIsAi: player.isAi, action: "roll", roll, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: room.status, aiReason });
  if (!legal.length) endTurn(room, player, room.rules.extraTurnOnSix && roll === 6);
  return null;
}
function movePiece(room: LudoRoom, player: LudoPlayer, pieceId: string, aiReason: string | null = null): string | null {
  if (room.phase !== "playing" || room.currentTurnPlayerId !== player.id || !room.awaitingMove || !room.lastRoll) return "You cannot move a piece now.";
  const piece = player.pieces.find((candidate) => candidate.id === pieceId);
  if (!piece || !legalPieces(room, player).some((candidate) => candidate.id === piece.id)) return "That piece is not a legal move.";
  const roll = room.lastRoll; const fromSteps = piece.steps;
  piece.steps = piece.steps === -1 ? 0 : Math.min(57, piece.steps + roll);
  const capturedPlayerIds: string[] = [];
  const landing = trackIndex(player, piece);
  if (landing !== null && !isSafeTrack(room, landing)) {
    for (const opponent of room.players) {
      if (opponent.id === player.id) continue;
      for (const opponentPiece of opponent.pieces) {
        if (trackIndex(opponent, opponentPiece) === landing) {
          opponentPiece.steps = -1;
          capturedPlayerIds.push(opponent.id);
        }
      }
    }
  }
  const action = fromSteps === -1 ? "enter" : capturedPlayerIds.length ? "capture" : piece.steps === 57 ? "finish" : "move";
  const detail = piece.steps === 57 ? `${player.name} brought a piece home.` : capturedPlayerIds.length ? `${player.name} captured ${capturedPlayerIds.length} piece${capturedPlayerIds.length === 1 ? "" : "s"}.` : fromSteps === -1 ? `${player.name} entered a piece onto the board.` : `${player.name} moved ${roll}.`;
  recordAction(room, { playerId: player.id, playerName: player.name, playerIsAi: player.isAi, action, roll, pieceId: piece.id, fromSteps, toSteps: piece.steps, capturedPlayerIds, detail, aiReason });
  if (finishedCount(player) === 4) { conclude(room, player); return null; }
  const extraTurn = (room.rules.extraTurnOnSix && roll === 6) || (room.rules.extraTurnOnCapture && capturedPlayerIds.length > 0);
  endTurn(room, player, extraTurn);
  return null;
}
function chooseAiPiece(room: LudoRoom, player: LudoPlayer): { piece: LudoPiece | null; reason: string } {
  const legal = legalPieces(room, player);
  if (!legal.length) return { piece: null, reason: "No legal piece was available." };
  const score = (piece: LudoPiece): number => {
    const targetSteps = piece.steps === -1 ? 0 : piece.steps + (room.lastRoll ?? 0);
    let value = targetSteps;
    if (targetSteps === 57) value += 1000;
    if (piece.steps === -1) value += 90;
    if (targetSteps <= 51) {
      const landing = (START_INDEX[player.colour] + targetSteps) % 52;
      for (const opponent of room.players) if (opponent.id !== player.id && opponent.pieces.some((candidate) => trackIndex(opponent, candidate) === landing) && !isSafeTrack(room, landing)) value += 500;
      if (isSafeTrack(room, landing)) value += 35;
    }
    return value;
  };
  if (player.aiDifficulty === "easy") return { piece: legal[Math.floor(Math.random() * legal.length)] ?? legal[0], reason: "Easy AI chose a random legal piece." };
  const sorted = legal.slice().sort((a, b) => score(b) - score(a));
  return { piece: sorted[0] ?? null, reason: player.aiDifficulty === "hard" ? "Hard AI prioritised finishing, captures, safe squares and forward progress." : "Normal AI prioritised captures, entry and forward progress." };
}
function aiControlled(player: LudoPlayer): boolean { return player.isAi || player.autopilotEnabled; }
function scheduleAi(io: Server, room: LudoRoom): void {
  const existing = aiTimers.get(room.code); if (existing) clearTimeout(existing); aiTimers.delete(room.code);
  if (room.phase !== "playing" && room.phase !== "ordering") return;
  const player = room.players.find((candidate) => candidate.id === room.currentTurnPlayerId);
  if (!player || !aiControlled(player)) return;
  aiTimers.set(room.code, setTimeout(() => {
    aiTimers.delete(room.code);
    if ((room.phase !== "playing" && room.phase !== "ordering") || room.currentTurnPlayerId !== player.id || !aiControlled(player)) return;
    if (room.phase === "ordering" && room.canRoll) rollForOrder(room, player, player.isAi ? "AI rolled for starting order." : "Autopilot rolled for starting order.");
    else if (room.canRoll) rollFor(room, player, player.isAi ? "AI rolled for its seat." : "Autopilot rolled for the delegated human seat.");
    else if (room.awaitingMove) {
      const choice = chooseAiPiece(room, player);
      if (choice.piece) movePiece(room, player, choice.piece.id, choice.reason);
    }
    emitRoom(io, room);
  }, 520));
}
function addAi(room: LudoRoom, level: LudoAiDifficulty): string | null {
  if (room.started) return "AI can only be added before Ludo starts.";
  if (room.matchMode === "ranked") return "Ranked Ludo is human-only.";
  if (room.players.length >= 4) return "Ludo supports up to four players.";
  const used = new Set(room.players.map((player) => player.name));
  const name = AI_NAMES.find((candidate) => !used.has(candidate)) ?? `AI ${room.players.length + 1}`;
  const colour = COLOURS[room.players.length] ?? "red";
  room.players.push({ id: `ludo-ai-${room.code}-${Date.now()}-${room.players.length}`, reconnectToken: token(), name, isHost: false, isAi: true, aiDifficulty: level, isConnected: true, seat: room.players.length, colour, pieces: piecesFor(colour), finishedCount: 0, autopilotEnabled: false, result: null, orderRoll: null });
  return null;
}
function startRoom(room: LudoRoom): string | null {
  if (room.phase !== "lobby" && room.phase !== "finished") return "The current match is already in progress.";
  if (room.players.length < 2) return "Ludo needs at least two players.";
  if (room.matchMode === "ranked" && room.players.some((player) => player.isAi)) return "Ranked Ludo requires human players only.";
  assignColours(room);
  for (const player of room.players) { player.pieces = piecesFor(player.colour); player.finishedCount = 0; player.result = null; player.autopilotEnabled = false; player.orderRoll = null; }
  room.started = true; room.startedAt = Math.max(Date.now(), (room.startedAt ?? 0) + 1); room.phase = "ordering"; room.orderRound = 1; room.orderContenderPlayerIds = room.players.map((player) => player.id); room.currentTurnPlayerId = room.players[0]?.id ?? null; room.lastRoll = null; room.canRoll = true; room.awaitingMove = false; room.winnerPlayerId = null; room.turnNumber = 0; room.status = `${room.players[0]?.name ?? "First player"} rolls for starting order.`;
  recordAction(room, { playerId: null, playerName: null, playerIsAi: false, action: "table", roll: null, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: `Ludo started with ${room.players.length} players using the Halieus Classic preset. Players will roll for starting order.`, aiReason: null });
  return null;
}

export function getLudoRoomCount(): number { return [...rooms.values()].filter((room) => room.phase !== "finished" && (room.players.some((player) => !player.isAi && player.isConnected) || room.spectators.size > 0)).length; }
export function registerLudoHandlers(io: Server, socket: Socket): void {
  socket.on("ludo:create", (payload: any, ack: (response: any) => void) => {
    const code = normaliseCode(payload?.code); const name = normaliseName(payload?.playerName);
    if (!code || !name) return ack({ ok: false, reason: "A room code and player name are required." });
    if (rooms.has(code)) return ack({ ok: false, reason: "That Ludo room code is already in use." });
    const createdAt = Date.now(); const colour: LudoColour = "red";
    const player: LudoPlayer = { id: socket.id, reconnectToken: token(), name, isHost: true, isAi: false, aiDifficulty: null, isConnected: true, seat: 0, colour, pieces: piecesFor(colour), finishedCount: 0, autopilotEnabled: false, result: null, orderRoll: null };
    const room: LudoRoom = { code, createdAt, startedAt: null, updatedAt: createdAt, started: false, phase: "lobby", matchMode: payload?.matchMode === "ranked" ? "ranked" : "casual", rulesPreset: "halieus-classic", rules: { ...DEFAULT_RULES, ...(payload?.rules ?? {}) }, players: [player], spectators: new Map(), currentTurnPlayerId: null, orderRound: 0, orderContenderPlayerIds: [], lastRoll: null, canRoll: false, awaitingMove: false, winnerPlayerId: null, turnNumber: 0, status: "Waiting for players.", actionSequence: 0, actionLog: [] };
    rooms.set(code, room); socket.join(socket.id); emitRoom(io, room);
    ack({ ok: true, code, playerId: player.id, reconnectToken: player.reconnectToken, state: publicState(room, player.id, false) });
  });
  socket.on("ludo:join", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const name = normaliseName(payload?.playerName);
    if (!room) return ack({ ok: false, reason: "Ludo room not found." });
    if (room.started) return ack({ ok: false, reason: "This Ludo game has started. Recover your seat or spectate." });
    if (!name) return ack({ ok: false, reason: "A valid name is required." });
    if (room.players.some((player) => !player.isAi && player.name.toLowerCase() === name.toLowerCase())) return ack({ ok: false, reason: "That name is already seated. Use its recovery key to rejoin." });
    if (room.players.length >= 4) { const aiIndex = room.players.map((player,index)=>({player,index})).reverse().find(({player})=>player.isAi)?.index ?? -1; if (aiIndex < 0) return ack({ ok:false, reason:"That Ludo room is full." }); room.players.splice(aiIndex,1); room.players.forEach((player,index)=>{player.seat=index; player.colour=COLOURS[index] ?? player.colour;}); }
    const colour = COLOURS[room.players.length] ?? "red";
    const player: LudoPlayer = { id: socket.id, reconnectToken: token(), name, isHost: false, isAi: false, aiDifficulty: null, isConnected: true, seat: room.players.length, colour, pieces: piecesFor(colour), finishedCount: 0, autopilotEnabled: false, result: null, orderRoll: null };
    room.players.push(player); socket.join(socket.id); emitRoom(io, room);
    ack({ ok: true, code: room.code, playerId: player.id, reconnectToken: player.reconnectToken, state: publicState(room, player.id, false) });
  });
  socket.on("ludo:reconnect", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const reconnectToken = typeof payload?.reconnectToken === "string" ? payload.reconnectToken.trim().toUpperCase() : "";
    const player = room?.players.find((candidate) => candidate.reconnectToken === reconnectToken && !candidate.isAi);
    if (!room || !player) return ack({ ok: false, reason: "Ludo recovery key not found." });
    const previousPlayerId = player.id;
    player.id = socket.id;
    player.isConnected = true;
    if (room.currentTurnPlayerId === previousPlayerId) room.currentTurnPlayerId = player.id;
    if (room.winnerPlayerId === previousPlayerId) room.winnerPlayerId = player.id;
    if (normaliseName(payload?.playerName)) player.name = normaliseName(payload.playerName);
    socket.join(socket.id); emitRoom(io, room);
    ack({ ok: true, code: room.code, playerId: player.id, reconnectToken: player.reconnectToken, state: publicState(room, player.id, false) });
  });
  socket.on("ludo:spectate", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); if (!room) return ack({ ok: false, reason: "Ludo room not found." });
    room.spectators.set(socket.id, normaliseName(payload?.playerName) || "Spectator"); socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code: room.code, state: publicState(room, null, true) });
  });
  socket.on("ludo:add-ai", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return ack({ ok: false, reason: "Only the host can add Ludo AI." });
    const reason = addAi(room, difficulty(payload?.difficulty)); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });
  socket.on("ludo:remove-ai", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host || room.started) return ack({ ok: false, reason: "Only the host can remove AI before play." });
    room.players = room.players.filter((player) => !(player.id === payload?.playerId && player.isAi)); assignColours(room); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });
  socket.on("ludo:start", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return ack({ ok: false, reason: "Only the host can start Ludo." });
    const reason = startRoom(room); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });
  socket.on("ludo:roll", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.players.find((candidate) => candidate.id === socket.id);
    if (!room || !player || player.autopilotEnabled) return ack({ ok: false, reason: player?.autopilotEnabled ? "Take Control before rolling manually." : "Ludo seat not found." });
    const reason = room.phase === "ordering" ? rollForOrder(room, player) : rollFor(room, player); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });
  socket.on("ludo:move", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.players.find((candidate) => candidate.id === socket.id);
    if (!room || !player || player.autopilotEnabled) return ack({ ok: false, reason: player?.autopilotEnabled ? "Take Control before moving manually." : "Ludo seat not found." });
    const reason = movePiece(room, player, typeof payload?.pieceId === "string" ? payload.pieceId : ""); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });
  socket.on("ludo:set-autopilot", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.players.find((candidate) => candidate.id === socket.id && !candidate.isAi);
    if (!room || !player) return ack({ ok: false, reason: "Ludo seat not found." });
    player.autopilotEnabled = Boolean(payload?.enabled); room.status = player.autopilotEnabled ? `${player.name} enabled Autopilot.` : `${player.name} took control.`;
    recordAction(room, { playerId: player.id, playerName: player.name, playerIsAi: false, action: "table", roll: null, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: room.status, aiReason: player.autopilotEnabled ? "AI may temporarily make legal Ludo decisions for this same seat." : null });
    emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });
  socket.on("ludo:end-game", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost);
    if (!room || !host) return ack({ ok: false, reason: "Only the host can end Ludo." });
    room.phase = "finished"; room.currentTurnPlayerId = null; room.canRoll = false; room.awaitingMove = false; room.status = `${host.name} ended the Ludo game.`;
    void finalizeSession("ludo", room.code, room.createdAt, "host-ended", archivePayload(room), { winner: room.players.find((player) => player.id === room.winnerPlayerId)?.name ?? null, players: room.players.length, durationMs: Date.now() - room.createdAt, mode: room.matchMode });
    emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
  });
  socket.on("ludo:forfeit", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.players.find((candidate) => candidate.id === socket.id && !candidate.isAi);
    if (!room || !player) return ack({ ok: false, reason: "Ludo seat not found." });
    const wasHost = player.isHost; const next = room.currentTurnPlayerId === player.id ? nextPlayer(room, player.id)?.id ?? null : room.currentTurnPlayerId;
    recordAction(room, { playerId: player.id, playerName: player.name, playerIsAi: false, action: "forfeit", roll: null, pieceId: null, fromSteps: null, toSteps: null, capturedPlayerIds: [], detail: `${player.name} forfeited Ludo.`, aiReason: null });
    room.players = room.players.filter((candidate) => candidate.id !== player.id);
    if (room.started) room.players.forEach((candidate, index) => { candidate.seat = index; });
    else assignColours(room);
    if (wasHost && room.players[0]) room.players[0].isHost = true;
    if (room.started && room.players.length === 1 && room.phase === "playing") conclude(room, room.players[0]); else {
      room.orderContenderPlayerIds = room.orderContenderPlayerIds.filter((id) => id !== player.id);
      room.currentTurnPlayerId = next && room.players.some((candidate) => candidate.id === next) ? next : room.players[0]?.id ?? null;
      if (room.phase === "ordering") {
        const pending = room.orderContenderPlayerIds.map((id) => room.players.find((candidate) => candidate.id === id)).find((candidate) => candidate?.orderRoll === null);
        room.currentTurnPlayerId = pending?.id ?? room.orderContenderPlayerIds[0] ?? room.players[0]?.id ?? null;
      }
      room.lastRoll = null; room.canRoll = room.phase === "playing" || room.phase === "ordering"; room.awaitingMove = false; room.status = `${player.name} forfeited Ludo.`;
    }
    emitRoom(io, room); ack({ ok: true });
  });
  socket.on("ludo:leave", (payload: any, ack?: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); if (!room) { ack?.({ ok: true }); return; }
    const player = room.players.find((candidate) => candidate.id === socket.id); if (player) player.isConnected = false; room.spectators.delete(socket.id); emitRoom(io, room); ack?.({ ok: true });
  });
  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.find((candidate) => candidate.id === socket.id); if (player) { player.isConnected = false; emitRoom(io, room); }
      if (room.spectators.delete(socket.id)) emitRoom(io, room);
    }
  });
}


export function getLudoLiveRoomSummaries(): HalieusLiveRoomSummary[] {
  return [...rooms.values()]
    .filter((room) => room.phase !== "finished" && (room.players.some((player) => !player.isAi && player.isConnected) || room.spectators.size > 0))
    .map((room) => ({
      game: "ludo", gameTitle: "Ludo", code: room.code, phase: room.phase, matchMode: room.matchMode, started: room.started,
      createdAt: room.createdAt, startedAt: room.startedAt, updatedAt: room.updatedAt, playerCount: room.players.length, maximumPlayers: 4,
      humanPlayers: room.players.filter((player) => !player.isAi && player.isConnected).map((player) => player.name), aiCount: room.players.filter((player) => player.isAi).length, spectatorCount: room.spectators.size,
      joinable: room.phase === "lobby" && (room.players.length < 4 || room.players.some((player) => player.isAi)), spectatable: true,
    }));
}
export function closeAllLudoRooms(): number {
  const count = rooms.size;
  for (const timer of aiTimers.values()) clearTimeout(timer);
  aiTimers.clear(); globalFinishNoticeKeys.clear(); rooms.clear();
  return count;
}
