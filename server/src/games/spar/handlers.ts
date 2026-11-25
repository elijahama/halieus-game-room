import { randomBytes } from "node:crypto";
import { advanceSparDecisionClock, sparDecisionExpired, type SparDecisionClock } from "../../../../shared/games/spar/decisionClock.js";
import type { Server, Socket } from "socket.io";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games.js";
import { sparSeatLimit, sparCustomCapacity, SPAR_DECK_SIZES, type SparCustomSettings, type SparTableFormat, type SparMatchMode } from "../../../../shared/games/spar/types.js";
import type {
  SparAiDifficulty, SparCard, SparEvent, SparHandAward, SparPhase,
  SparPlayer, SparPublicState, SparResolvedTrick, SparTrickPlay,
} from "../../../../shared/games/spar/types.js";
import {
  SPAR_STONE_POOL, chooseSparAiCard, parseSparCustomSettings, sparUnderTen, sparHandPoints,
  dealSparHands, legalSparCards, makeSparDeck, resolveSparTrick,
  shuffleSparDeck, sparSuit,
} from "../../../../shared/games/spar/rules.js";
import { getProgressionSocketIdentity, verifiedRoomAccountIds } from "../../platform/progression.js";
import { finalizeSession, recordWorkingSession } from "../../platform/sessionArchive.js";

interface Player extends Omit<SparPlayer, "handCount"> {
  reconnectToken: string;
  rankedAccountId?: string;
  hand: SparCard[];
}
interface Room {
  code: string;
  tableFormat: SparTableFormat;
  matchMode: SparMatchMode;
  customSettings: SparCustomSettings | null;
  undealt: SparCard[];
  pendingExchange: string[];
  bottomCard: SparCard | null;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number;
  phase: SparPhase;
  players: Player[];
  spectators: Map<string, string>;
  dealerSeat: number;
  handNumber: number;
  trickNumber: number;
  plays: SparTrickPlay[];
  lastTrick: SparResolvedTrick | null;
  lastAward: SparHandAward | null;
  currentTurnPlayerId: string | null;
  leadPlayerId: string | null;
  stonesRemaining: number;
  winnerPlayerId: string | null;
  status: string;
  events: SparEvent[];
  eventSequence: number;
  decisionClock: SparDecisionClock | null;
  dealAttempt: number;
}

const rooms = new Map<string, Room>();
const aiTimers = new Map<string, ReturnType<typeof setTimeout>>();
const decisionTimers = new Map<string, ReturnType<typeof setTimeout>>();
function token() { return randomBytes(10).toString("base64url").slice(0, 13).toUpperCase(); }
function cleanCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : "";
}
function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 24) : "";
}
function cleanDifficulty(value: unknown): SparAiDifficulty {
  return value === "easy" || value === "hard" ? value : "normal";
}
function log(room: Room, type: SparEvent["type"], description: string) {
  room.events.push({ id: ++room.eventSequence, at: Date.now(), type, description });
  if (room.events.length > 120) room.events.splice(0, room.events.length - 120);
}
function publicPlayer(p: Player): SparPlayer {
  return {
    id: p.id, name: p.name, seat: p.seat, isHost: p.isHost, isAi: p.isAi,
    aiDifficulty: p.aiDifficulty, isConnected: p.isConnected, stones: p.stones,
    handCount: p.hand.length, result: p.result,
  };
}
function capacity(room: Room): number { return Math.min(sparSeatLimit(room.tableFormat), room.customSettings ? sparCustomCapacity(room.customSettings) : 8); }
function handSize(room: Room): 5 | 7 { return room.customSettings?.handSize ?? 5; }
function amount(room: Room): number { return room.customSettings?.amount ?? SPAR_STONE_POOL; }
function scoring(room: Room) { return room.customSettings?.scoring ?? "stones"; }
function state(room: Room, viewerId: string | null, spectator: boolean): SparPublicState {
  return {
    game: "spar", gameTitle: "Spar (Cha-Cha)", code: room.code,
    decisionDeadline: room.decisionClock?.deadline ?? null, decisionPaused: !!room.decisionClock && room.decisionClock.deadline===null,
    serverNow: Date.now(),
    createdAt: room.createdAt, startedAt: room.startedAt, updatedAt: room.updatedAt,
    phase: room.phase, matchMode: room.matchMode,
    tableFormat: room.tableFormat, maximumPlayers: capacity(room),
    customSettings: room.customSettings ? {...room.customSettings} : null, handSize: handSize(room), scoring: scoring(room),
    deckSize: room.customSettings ? SPAR_DECK_SIZES[room.customSettings.deck] : room.players.length === 8 ? 40 : 35,
    canExchange: !spectator && viewerId !== null && room.phase === "bra" && room.pendingExchange.includes(viewerId),
    exchangePending: room.pendingExchange.length > 0, bottomCard: room.bottomCard,
    canShowBottom: !spectator && viewerId !== null && room.phase === "playing" && !!room.customSettings?.showBottom && room.trickNumber === handSize(room)-1 && room.undealt.length > 0 && !room.bottomCard,
    players: room.players.map(publicPlayer),
    viewerPlayerId: spectator ? null : viewerId,
    isSpectator: spectator, spectatorCount: room.spectators.size, spectatorNames: [...room.spectators.values()],
    // Casual/Custom observer projection is separate from the participant hand.
    // Ranked observers never receive private faces.
    hand: !spectator ? [...(room.players.find(p => p.id === viewerId)?.hand ?? [])] : [],
    ...(spectator && room.matchMode !== "ranked" ? { spectatorHands:Object.fromEntries(room.players.map(p=>[p.id,[...p.hand]])) } : {}),
    dealerPlayerId: room.players[room.dealerSeat]?.id ?? null,
    currentTurnPlayerId: room.currentTurnPlayerId, leadPlayerId: room.leadPlayerId,
    handNumber: room.handNumber, trickNumber: room.trickNumber,
    plays: room.plays.map(p => ({ ...p })),
    lastTrick: room.lastTrick ? { ...room.lastTrick, plays: room.lastTrick.plays.map(p => ({ ...p })) } : null,
    lastAward: room.lastAward ? { ...room.lastAward } : null,
    stonesRemaining: room.stonesRemaining, stonesTotal: amount(room),
    winnerPlayerId: room.winnerPlayerId, status: room.status,
    events: room.events.slice(-36).map(e => ({ ...e })),
  };
}
function archive(room: Room) {
  return { ...room, spectators: [...room.spectators.entries()] };
}
function emit(io: Server, room: Room) {
  room.updatedAt = Date.now();
  scheduleDecision(io,room);
  recordWorkingSession("spar", room.code, room.createdAt, archive(room));
  for (const p of room.players) if (playerFor(room, p.id)) {
    io.to(p.id).emit("spar:state", state(room, p.id, false));
  }
  for (const id of room.spectators.keys()) io.to(id).emit("spar:state", state(room, null, true));
  scheduleAi(io, room);
}
function nextPlayer(room: Room, playerId: string): Player | undefined {
  const index = room.players.findIndex(p => p.id === playerId);
  return index < 0 ? undefined : room.players[(index + 1) % room.players.length];
}
function startHand(io: Server, room: Room, restartReason?: string) {
  room.dealAttempt++;
  const deck = shuffleSparDeck(makeSparDeck(room.players.length, room.customSettings?.deck));
  const dealt = dealSparHands(room.players.map(p => p.id), room.dealerSeat, deck, handSize(room));
  room.undealt = dealt.remaining; room.bottomCard = null; room.pendingExchange = [];
  room.players.forEach(p => { p.hand = dealt.hands[p.id] ?? []; });
  if (room.customSettings?.underTen) {
    for (const p of room.players) if (sparUnderTen(p.hand) && room.undealt.length >= handSize(room) + (room.customSettings.showBottom ? 1 : 0)) {
      if (p.isAi) p.hand = room.undealt.splice(0, handSize(room));
      else room.pendingExchange.push(p.id);
    }
    trimExchange(room);
  }
  if(!restartReason)room.handNumber++;
  room.trickNumber = 1;
  room.plays = [];
  room.lastTrick = null;
  room.phase = "bra";
  const dealer = room.players[room.dealerSeat];
  const caller = room.players[(room.dealerSeat + 1) % room.players.length];
  room.leadPlayerId = caller.id;
  room.currentTurnPlayerId = caller.id;
  room.status = `${restartReason ? restartReason + " " : ""}${caller.name} to call Bra. ${dealer.name} dealt the cards.`;
  log(room, "table", `Hand ${room.handNumber}: ${handSize(room)} cards dealt. ${caller.name} calls Bra.`);
  emit(io, room);
}
function trimExchange(room: Room) {
  if (room.undealt.length < handSize(room) + (room.customSettings?.showBottom ? 1 : 0)) room.pendingExchange = [];
}
function finish(io: Server, room: Room, winner: Player | null, reason: string, status: "completed" | "forfeit-completed" | "host-ended" = "completed") {
  if (room.phase === "finished") return;
  room.phase = "finished";
  room.pendingExchange = [];
  room.currentTurnPlayerId = null;
  room.winnerPlayerId = winner?.id ?? null;
  room.status = reason;
  room.players.forEach(p => { p.result = winner ? p.id === winner.id ? "Winner" : "Runner-up" : "Finished"; });
  log(room, "finish", reason);
  void finalizeSession("spar", room.code, room.createdAt, status, archive(room), {
    winner: winner?.name ?? null, players: room.players.length, mode: room.matchMode, tableFormat: room.tableFormat,
    hands: room.handNumber, durationMs: Date.now() - room.createdAt,
  });
  emit(io, room);
  io.emit("platform:game-finished", {
    id: `spar-${room.code}-${room.eventSequence}`, game: "spar",
    gameTitle: "Spar (Cha-Cha)", code: room.code, status: "game-finished",
    winner: winner?.name ?? null, message: reason, at: room.updatedAt,
  });
}
function bra(io: Server, room: Room, p: Player): string | null {
  if (room.phase !== "bra") return "The hand is not waiting for Bra.";
  if (room.currentTurnPlayerId !== p.id) return "Only the player after the dealer can call Bra.";
  if (room.pendingExchange.length) return "Wait for opening hand exchange decisions.";
  room.phase = "playing";
  room.status = `${p.name} leads the first trick.`;
  log(room, "bra", `${p.name} calls Bra. Let the hand begin.`);
  emit(io, room);
  return null;
}
function play(io: Server, room: Room, player: Player, raw: unknown): string | null {
  if (room.phase !== "playing") return "This Spar hand is not in play.";
  if (room.currentTurnPlayerId !== player.id) return "It is not your turn.";
  if (typeof raw !== "string" || !player.hand.includes(raw as SparCard)) {
    return "You cannot play a card that is not in your hand.";
  }
  const card = raw as SparCard;
  const lead = room.plays.length ? sparSuit(room.plays[0].card) : null;
  if (!legalSparCards(player.hand, lead).includes(card)) {
    const reason = `${player.name} did not follow suit. Round restarted.`;
    log(room,"table",reason);
    startHand(io,room,reason);
    return reason;
  }
  player.hand.splice(player.hand.indexOf(card), 1);
  room.plays.push({ playerId: player.id, playerName: player.name, card });
  log(room, "play", `${player.name} played ${card} on trick ${room.trickNumber}.`);
  if (room.plays.length < room.players.length) {
    room.currentTurnPlayerId = nextPlayer(room, player.id)?.id ?? null;
    room.status = `${room.players.find(p => p.id === room.currentTurnPlayerId)?.name ?? "Next player"} to follow.`;
    emit(io, room);
    return null;
  }
  const resolved = resolveSparTrick(room.plays);
  const winner = room.players.find(p => p.id === resolved.winnerPlayerId)!;
  const prior = room.lastTrick?.number === handSize(room)-1 && room.lastTrick.winnerPlayerId === winner.id ? room.lastTrick.winningCard : null;
  const points = room.trickNumber === handSize(room)
    ? sparHandPoints(resolved.winningCard, prior, !!room.customSettings?.doubleFinish) : 0;
  room.lastTrick = {
    hand: room.handNumber, number: room.trickNumber, leadSuit: resolved.leadSuit,
    plays: room.plays.map(p => ({ ...p })), winnerPlayerId: winner.id,
    winningCard: resolved.winningCard, points,
  };
  log(room, "trick", `${winner.name} won trick ${room.trickNumber} with ${resolved.winningCard}.`);
  room.plays = [];
  if (room.trickNumber < handSize(room)) {
    room.trickNumber++;
    room.currentTurnPlayerId = winner.id;
    room.leadPlayerId = winner.id;
    room.status = `${winner.name} leads trick ${room.trickNumber}. Only the last trick scores.`;
    emit(io, room);
    return null;
  }
  // Score only the fifth trick. The finite pool never goes negative.
  const award = scoring(room) === "stones" ? Math.min(room.stonesRemaining, points) : points;
  winner.stones += award;
  if (scoring(room) === "stones") room.stonesRemaining -= award;
  room.lastAward = {
    hand: room.handNumber, playerId: winner.id, playerName: winner.name,
    winningCard: resolved.winningCard, offered: points, awarded: award,
  };
  log(room, "award", `${winner.name} earned ${award} of ${points} available points with ${resolved.winningCard}.`);
  if (scoring(room) === "target" && winner.stones >= amount(room)) {
    finish(io, room, winner, `${winner.name} reaches ${winner.stones} points and wins Spar.`); return null;
  }
  if (scoring(room) === "stones" && room.stonesRemaining === 0) {
    const highest = Math.max(...room.players.map(p => p.stones));
    const leaders = room.players.filter(p => p.stones === highest);
    if (leaders.length === 1) {
      finish(io, room, leaders[0], `${leaders[0].name} wins Spar with ${highest} stones.`);
      return null;
    }
    // Rare tied pool: continue in sudden death so there is no invented coin flip.
    room.stonesRemaining = 3;
    log(room, "table", "The stone pool ended tied. One three-stone tie-break hand will follow.");
  }
  room.dealerSeat = room.players.indexOf(winner);
  startHand(io, room);
  return null;
}
/** Refresh only when the actual decision changes. Spectators, reconnects and
 * optional bottom-card reveals cannot reset the clock. Pause only if no humans
 * are online; resume the remaining time, not a new twenty seconds. */
function decisionKey(room:Room):string|null{
 if(room.phase!=="bra"&&room.phase!=="playing")return null;
 const prefix=room.startedAt+":"+room.handNumber+":"+room.dealAttempt+":";
 return room.pendingExchange.length?prefix+"exchange":prefix+room.phase+":"+room.trickNumber+":"+room.plays.length;
}
function scheduleDecision(io:Server,room:Room){
 const prior=decisionTimers.get(room.code);if(prior)clearTimeout(prior);decisionTimers.delete(room.code);
 const now=Date.now();
 room.decisionClock=advanceSparDecisionClock(room.decisionClock,decisionKey(room),now,!room.players.some(p=>!p.isAi&&p.isConnected));
 const clock=room.decisionClock;
 if(!clock||clock.deadline===null)return;
 const deadline=clock.deadline,key=clock.key;
 const timeout=setTimeout(()=>{
  decisionTimers.delete(room.code);
  if(rooms.get(room.code)!==room||room.decisionClock?.key!==key||room.decisionClock.deadline!==deadline)return;
  if(!sparDecisionExpired(room.decisionClock,Date.now())){scheduleDecision(io,room);return;}
  if(room.pendingExchange.length){
   const count=room.pendingExchange.length;room.pendingExchange=[];
   log(room,"table",count+" opening exchange decision(s) expired; original hands kept.");emit(io,room);return;
  }
  const p=room.players.find(p=>p.id===room.currentTurnPlayerId);
  if(!p)return;
  if(room.phase==="bra"){log(room,"table",p.name+" timed out; Bra called automatically.");bra(io,room,p);return;}
  if(room.phase==="playing"){
   const lead=room.plays.length?sparSuit(room.plays[0].card):null;
   const legal=legalSparCards(p.hand,lead);
   if(!legal.length)return;
   log(room,"table",p.name+" timed out; a legal card played automatically.");
   play(io,room,p,legal[0]);
  }
 },Math.max(0,deadline-now));timeout.unref?.();decisionTimers.set(room.code,timeout);
}
function scheduleAi(io: Server, room: Room) {
  const prior = aiTimers.get(room.code);
  if (prior) clearTimeout(prior);
  aiTimers.delete(room.code);
  const player = room.players.find(p => p.id === room.currentTurnPlayerId);
  if (!player?.isAi || room.phase === "finished" || room.pendingExchange.length || !room.players.some(p=>!p.isAi&&p.isConnected)) return;
  aiTimers.set(room.code, setTimeout(() => {
    aiTimers.delete(room.code);
    if (player.id !== room.currentTurnPlayerId || room.phase === "finished") return;
    if (room.phase === "bra") { bra(io, room, player); return; }
    if (room.phase !== "playing") return;
    const lead = room.plays.length ? sparSuit(room.plays[0].card) : null;
    const card = chooseSparAiCard(player.hand, lead, room.trickNumber, player.aiDifficulty ?? "normal", handSize(room));
    play(io, room, player, card);
  }, 620));
}
function ackOk(ack: unknown, result: unknown) {
  if (typeof ack === "function") (ack as (r: unknown) => void)(result);
}
function roomFor(payload: any) { return rooms.get(cleanCode(payload?.code)); }
function rankedAccount(id: string): string | null {
  const identity = getProgressionSocketIdentity(id);
  return identity && !identity.beta ? identity.accountId : null;
}
function playerFor(room: Room | undefined, id: string) {
  const player = room?.players.find(p => p.id === id && !p.isAi && p.isConnected);
  if (room?.matchMode === "ranked" && (!player?.rankedAccountId || rankedAccount(id) !== player.rankedAccountId)) return undefined;
  return player;
}
export function registerSparHandlers(io: Server, socket: Socket) {
  socket.on("spar:create", (payload: any, ack: (r: unknown) => void) => {
    const code = cleanCode(payload?.code) || token().slice(0, 6);
    if (rooms.get(code)?.phase !== undefined && rooms.get(code)?.phase !== "finished")
      return ackOk(ack, { ok: false, reason: "That Spar room is already in use." });
    const name = cleanName(payload?.playerName);
    if (!name) return ackOk(ack, { ok: false, reason: "Enter a player name." });
    const p: Player = {
      id: socket.id, name, seat: 0, isHost: true, isAi: false, aiDifficulty: null,
      isConnected: true, stones: 0, hand: [], result: null, reconnectToken: token(),
    };
    const now = Date.now();
    // Omitted format preserves compatibility with older clients; explicit invalid formats are rejected.
    if (payload?.tableFormat !== undefined && payload.tableFormat !== "duel" && payload.tableFormat !== "multiplayer")
      return ackOk(ack, { ok: false, reason: "Unknown Spar table format." });
    const tableFormat: SparTableFormat = payload?.tableFormat === "duel" ? "duel" : "multiplayer";
    if (payload?.matchMode !== undefined && payload.matchMode !== "casual" && payload.matchMode !== "ranked" && payload.matchMode !== "custom")
      return ackOk(ack, { ok: false, reason: "Unknown Spar match mode." });
    const matchMode: SparMatchMode = payload?.matchMode === "ranked" ? "ranked" : payload?.matchMode === "custom" ? "custom" : "casual";
    const customSettings = matchMode === "custom" ? parseSparCustomSettings(payload?.customSettings) : null;
    if (matchMode === "custom" && (!customSettings || sparCustomCapacity(customSettings) < 2)) return ackOk(ack, {ok:false,reason:"Invalid or incompatible Spar custom settings."});
    if (matchMode !== "custom" && payload?.customSettings != null) return ackOk(ack, {ok:false,reason:"Custom rules are only available in Custom mode."});
    if (matchMode === "ranked") {
      const accountId = rankedAccount(socket.id);
      if (!accountId || tableFormat !== "duel" || /^\[BETA\]/i.test(name))
        return ackOk(ack, { ok: false, reason: "Ranked Spar requires a signed-in non-Beta account and 1v1 format." });
      p.rankedAccountId = accountId;
    }
    const room: Room = {
      tableFormat, matchMode, customSettings, undealt: [], pendingExchange: [], bottomCard: null,
      code, createdAt: now, updatedAt: now, startedAt: null, phase: "lobby",
      players: [p], spectators: new Map(), dealerSeat: 0, handNumber: 0,
      trickNumber: 0, plays: [], lastTrick: null, lastAward: null,
      currentTurnPlayerId: null, leadPlayerId: null,
      stonesRemaining: customSettings ? (customSettings.scoring === "stones" ? customSettings.amount : 0) : SPAR_STONE_POOL, winnerPlayerId: null,
      decisionClock:null, dealAttempt:0, status: tableFormat === "duel" ? "Waiting for a 1v1 opponent." : matchMode === "custom" ? "Waiting for players. Custom table." : "Waiting for players. Casual 2–8 seats.", events: [], eventSequence: 0,
    };
    rooms.set(code, room);
    log(room, "join", `${name} opened the Spar table.`);
    emit(io, room);
    ackOk(ack, { ok: true, code, playerId: p.id, reconnectToken: p.reconnectToken, state: state(room, p.id, false) });
  });
  socket.on("spar:join", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload);
    if (!room || room.phase !== "lobby" || room.players.length >= capacity(room))
      return ackOk(ack, { ok: false, reason: "That Spar table is full, started or unavailable." });
    if (room.players.some(p => p.id === socket.id))
      return ackOk(ack, { ok: false, reason: "You already have a seat. Recover that seat instead." });
    const name = cleanName(payload?.playerName);
    if (!name || room.players.some(p => p.name.toLowerCase() === name.toLowerCase()))
      return ackOk(ack, { ok: false, reason: "Enter a unique player name." });
    const p: Player = {
      id: socket.id, name, seat: room.players.length, isHost: false,
      isAi: false, aiDifficulty: null, isConnected: true,
      stones: 0, hand: [], result: null, reconnectToken: token(),
    };
    if (room.matchMode === "ranked") {
      const accountId = rankedAccount(socket.id);
      if (!accountId || /^\[BETA\]/i.test(name) || room.players.some(other => other.rankedAccountId === accountId))
        return ackOk(ack, { ok: false, reason: "Ranked Spar requires two distinct signed-in non-Beta accounts." });
      p.rankedAccountId = accountId;
    }
    room.spectators.delete(socket.id);
    room.players.push(p);
    log(room, "join", `${name} joined the Spar table.`);
    emit(io, room);
    ackOk(ack, { ok: true, code: room.code, playerId: p.id, reconnectToken: p.reconnectToken, state: state(room, p.id, false) });
  });
  socket.on("spar:reconnect", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload);
    const key = typeof payload?.reconnectToken === "string" ? payload.reconnectToken.trim().toUpperCase() : "";
    const p = room?.players.find(x => !x.isAi && x.reconnectToken && x.reconnectToken === key);
    if (!room || !p) return ackOk(ack, { ok: false, reason: "The saved Spar seat is unavailable." });
    if (room.matchMode === "ranked" && (!p.rankedAccountId || rankedAccount(socket.id) !== p.rankedAccountId))
      return ackOk(ack, { ok: false, reason: "Sign in to the original Ranked account to recover this seat." });
    if (room.players.some(other => other !== p && other.id === socket.id))
      return ackOk(ack, { ok: false, reason: "A connection cannot recover another seat in the same table." });
    room.spectators.delete(socket.id);
    const oldId = p.id;
    if (oldId !== socket.id) io.to(oldId).emit("platform:session-replaced", { reason: "Your Spar seat was recovered in another browser." });
    p.id = socket.id;
    p.isConnected = true;
    room.pendingExchange = room.pendingExchange.map(id => id === oldId ? p.id : id);
    if (room.currentTurnPlayerId === oldId) room.currentTurnPlayerId = p.id;
    if (room.leadPlayerId === oldId) room.leadPlayerId = p.id;
    if (room.winnerPlayerId === oldId) room.winnerPlayerId = p.id;
    room.plays.forEach(play => { if (play.playerId === oldId) play.playerId = p.id; });
    if (room.lastTrick) {
      if (room.lastTrick.winnerPlayerId === oldId) room.lastTrick.winnerPlayerId = p.id;
      room.lastTrick.plays.forEach(play => { if (play.playerId === oldId) play.playerId = p.id; });
    }
    if (room.lastAward?.playerId === oldId) room.lastAward.playerId = p.id;
    emit(io, room);
    ackOk(ack, { ok: true, code: room.code, playerId: p.id, reconnectToken: p.reconnectToken, state: state(room, p.id, false) });
  });
  socket.on("spar:spectate", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload);
    if (!room) return ackOk(ack, { ok: false, reason: "Spar table not found." });
    if (room.players.some(p => p.id === socket.id))
      return ackOk(ack, { ok: false, reason: "You have a player seat. Recover it instead of spectating." });
    if (room.matchMode === "ranked" && room.players.some(p => p.rankedAccountId && p.rankedAccountId === rankedAccount(socket.id)))
      return ackOk(ack, { ok: false, reason: "Recover your Ranked seat instead of spectating." });
    room.spectators.set(socket.id, cleanName(payload?.playerName) || "Spectator");
    emit(io, room);
    ackOk(ack, { ok: true, state: state(room, null, true) });
  });
  socket.on("spar:add-ai", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload);
    const host = playerFor(room, socket.id);
    if (!room || !host?.isHost || room.phase !== "lobby" || room.players.length >= capacity(room))
      return ackOk(ack, { ok: false, reason: "Only the host can add AI before play, and only while the selected format has a free seat." });
    if (room.matchMode === "ranked") return ackOk(ack, { ok: false, reason: "Ranked Spar is human versus human." });
    const n = room.players.length + 1;
    room.players.push({
      id: `spar-ai-${token()}`, name: `Spar CPU ${n}`, seat: room.players.length,
      isHost: false, isAi: true, aiDifficulty: cleanDifficulty(payload?.difficulty),
      isConnected: true, stones: 0, hand: [], result: null, reconnectToken: "",
    });
    emit(io, room);
    ackOk(ack, { ok: true });
  });
  socket.on("spar:remove-ai", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload);
    const host = playerFor(room, socket.id);
    if (!room || !host?.isHost || room.phase !== "lobby")
      return ackOk(ack, { ok: false, reason: "Only the host can remove AI before play." });
    room.players = room.players.filter(p => !p.isAi || p.id !== payload?.playerId);
    room.players.forEach((p, seat) => { p.seat = seat; });
    emit(io, room);
    ackOk(ack, { ok: true });
  });
  socket.on("spar:start", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload);
    const host = playerFor(room, socket.id);
    if (!room || !host?.isHost || !["lobby", "finished"].includes(room.phase))
      return ackOk(ack, { ok: false, reason: "Only the host can start a waiting Spar table." });
    if (room.players.length < 2 || room.players.length > capacity(room))
      return ackOk(ack, { ok: false, reason: room.tableFormat === "duel" ? "A 1v1 duel requires exactly two players." : "Spar needs two to eight players." });
    if (room.players.some(p => !p.isAi && !p.isConnected))
      return ackOk(ack, { ok: false, reason: "Wait for all human players to reconnect before dealing." });
    if (room.matchMode === "ranked" && (room.tableFormat !== "duel" || room.players.length !== 2 || new Set(room.players.map(p => p.rankedAccountId)).size !== 2 || room.players.some(p => p.isAi || !p.rankedAccountId || rankedAccount(p.id) !== p.rankedAccountId)))
      return ackOk(ack, { ok: false, reason: "Ranked requires two connected, distinct authenticated human accounts." });
    room.players.forEach(p => { p.stones = 0; p.hand = []; p.result = null; });
    room.stonesRemaining = scoring(room) === "stones" ? amount(room) : 0;
    room.lastAward = null;
    room.winnerPlayerId = null;
    room.handNumber = 0;
    room.dealerSeat = 0;
    room.startedAt = Math.max(Date.now(), (room.startedAt ?? 0) + 1);
    log(room, "start", `Spar started with ${room.players.length} players and ${scoring(room) === "free" ? "free play" : `${amount(room)} ${scoring(room) === "stones" ? "shared stones" : "target points"}`}.`);
    startHand(io, room);
    ackOk(ack, { ok: true });
  });
  socket.on("spar:exchange", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload), p = playerFor(room, socket.id);
    if (!room || !p || room.phase !== "bra" || !room.pendingExchange.includes(p.id) || typeof payload?.exchange !== "boolean")
      return ackOk(ack, {ok:false,reason:"No opening hand exchange is available."});
    if (sparDecisionExpired(room.decisionClock,Date.now())) return ackOk(ack,{ok:false,reason:"Decision time expired."});
    if (payload.exchange) {
      if (room.undealt.length < handSize(room) + (room.customSettings?.showBottom ? 1 : 0)) return ackOk(ack,{ok:false,reason:"Not enough undealt cards."});
      p.hand = room.undealt.splice(0, handSize(room));
      log(room,"table",`${p.name} exchanged an opening hand.`);
    }
    room.pendingExchange = room.pendingExchange.filter(id => id !== p.id); trimExchange(room);
    emit(io,room); ackOk(ack,{ok:true});
  });
  socket.on("spar:show-bottom", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload), p = playerFor(room, socket.id);
    if (!room || !p || room.phase !== "playing" || !room.customSettings?.showBottom || room.trickNumber !== handSize(room)-1 || !room.undealt.length || room.bottomCard)
      return ackOk(ack,{ok:false,reason:"Bottom card is not available."});
    room.bottomCard = room.undealt[room.undealt.length-1];
    log(room,"table",`Bottom card revealed: ${room.bottomCard}.`); emit(io,room); ackOk(ack,{ok:true});
  });
  socket.on("spar:bra", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload), p = playerFor(room, socket.id);
    if (!room || !p) return ackOk(ack, { ok: false, reason: "Your Spar seat was not found." });
    if (sparDecisionExpired(room.decisionClock,Date.now())) return ackOk(ack,{ok:false,reason:"Decision time expired."});
    const reason = bra(io, room, p);
    ackOk(ack, reason ? { ok: false, reason } : { ok: true });
  });
  socket.on("spar:play", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload), p = playerFor(room, socket.id);
    if (!room || !p) return ackOk(ack, { ok: false, reason: "Your Spar seat was not found." });
    if (sparDecisionExpired(room.decisionClock,Date.now())) return ackOk(ack,{ok:false,reason:"Decision time expired."});
    const reason = play(io, room, p, payload?.card);
    ackOk(ack, reason ? { ok: false, reason } : { ok: true });
  });
  socket.on("spar:forfeit", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload), p = playerFor(room, socket.id);
    if (!room || !p || room.phase === "lobby" || room.phase === "finished")
      return ackOk(ack, { ok: false, reason: "No active Spar seat to forfeit." });
    const others = room.players.filter(x => x.id !== p.id);
    finish(io, room, others.length === 1 ? others[0] : null,
      `${p.name} forfeited the Spar table.`, "forfeit-completed");
    ackOk(ack, { ok: true });
  });
  socket.on("spar:end-game", (payload: any, ack: (r: unknown) => void) => {
    const room = roomFor(payload), p = playerFor(room, socket.id);
    if (!room || !p?.isHost) return ackOk(ack, { ok: false, reason: "Only the host can end this Spar table." });
    if (room.matchMode === "ranked" && (room.phase === "bra" || room.phase === "playing"))
      return ackOk(ack, { ok: false, reason: "An active Ranked duel cannot be cancelled. Forfeit to concede the match." });
    finish(io, room, null, `${p.name} ended the Spar table.`, "host-ended");
    ackOk(ack, { ok: true });
  });
  socket.on("spar:leave", (payload: any, ack?: (r: unknown) => void) => {
    const room = roomFor(payload), p = room?.players.find(x => x.id === socket.id && !x.isAi && x.isConnected);
    if (p) p.isConnected = false;
    room?.spectators.delete(socket.id);
    if (room) emit(io, room);
    ackOk(ack, { ok: true });
  });
  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      let changed = false;
      const p = room.players.find(x => x.id === socket.id && !x.isAi && x.isConnected);
      if (p) { p.isConnected = false; changed = true; }
      if (room.spectators.delete(socket.id)) changed = true;
      if (changed) emit(io, room);
    }
  });
}
/** Active hands remain protected even when everyone backgrounds the app.
 * An empty, unstarted lobby may be ignored; a started hand is not idle.
 */
function isLiveSparRoom(room: Room): boolean {
  return room.phase === "bra" || room.phase === "playing" ||
    (room.phase === "lobby" && (room.players.some(p => !p.isAi && p.isConnected) || room.spectators.size > 0));
}
export function getSparRoomCount(): number {
  return [...rooms.values()].filter(isLiveSparRoom).length;
}
export function getSparChatIdentity(code: string, socketId: string) {
  const room = rooms.get(cleanCode(code));
  const p = playerFor(room, socketId);
  if (p) return { name: p.name, role: "player" as const };
  const spectator = room?.spectators.get(socketId);
  return spectator ? { name: spectator, role: "spectator" as const } : null;
}
export function getSparLiveRoomSummaries(): HalieusLiveRoomSummary[] {
  return [...rooms.values()].filter(isLiveSparRoom).map(room => ({
      game: "spar", gameTitle: "Spar (Cha-Cha)", code: room.code,
      phase: room.phase, matchMode: room.matchMode === "ranked" ? "ranked" : "casual", started: room.phase !== "lobby",
      createdAt: room.createdAt, startedAt: room.startedAt, updatedAt: room.updatedAt,
      playerCount: room.players.length, maximumPlayers: capacity(room),
      humanPlayers: room.players.filter(p => !p.isAi && p.isConnected).map(p => p.name),
      verifiedAccountIds: verifiedRoomAccountIds(room.players),
      aiCount: room.players.filter(p => p.isAi).length,
      spectatorCount: room.spectators.size,
      joinable: room.phase === "lobby" && room.players.length < capacity(room), spectatable: true,
    }));
}
export function closeAllSparRooms(): number {
  const count = getSparRoomCount();
  for (const timer of aiTimers.values()) clearTimeout(timer);
  aiTimers.clear();
  for(const timer of decisionTimers.values())clearTimeout(timer);
  decisionTimers.clear();
  rooms.clear();
  return count;
}
