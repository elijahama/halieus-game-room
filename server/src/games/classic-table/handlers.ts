import { captureProgression } from "../../platform/progression.js";
import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games.js";
import type {
  CheatCard,
  CheatClaimPublic,
  CheatPublicState,
  CheatRank,
  CheatSuit,
  ClassicActionLogEntry,
  ClassicAiDifficulty,
  ClassicCreateOptions,
  ClassicCompletionReason,
  ClassicOutcome,
  ClassicGameId,
  ClassicMatchMode,
  ClassicPlayerPublic,
  ClassicPublicState,
  DominoPlacement,
  DominoTile,
  DominoesPublicState,
} from "../../../../shared/games/classic-table/types.js";
import { finalizeSession, recordWorkingSession } from "../../platform/sessionArchive.js";

interface BasePlayer {
  id: string;
  reconnectToken: string;
  name: string;
  isHost: boolean;
  isAi: boolean;
  aiDifficulty: ClassicAiDifficulty | null;
  isConnected: boolean;
  seat: number;
  result: string | null;
}

interface CheatPlayer extends BasePlayer { hand: CheatCard[]; }
interface DominoPlayer extends BasePlayer { hand: DominoTile[]; }

interface BaseRoom<P extends BasePlayer> {
  game: ClassicGameId;
  code: string;
  createdAt: number;
  startedAt: number | null;
  matchId: string | null;
  outcome: ClassicOutcome | null;
  forfeitedPlayers: BasePlayer[];
  updatedAt: number;
  phase: "lobby" | "playing" | "finished";
  matchMode: ClassicMatchMode;
  players: P[];
  spectators: Map<string, string>;
  currentTurnPlayerId: string | null;
  winnerPlayerId: string | null;
  status: string;
  actionSequence: number;
  actionLog: ClassicActionLogEntry[];
}

interface CheatPendingClaim {
  playerId: string;
  playerName: string;
  claimedRank: CheatRank;
  cards: CheatCard[];
  at: number;
}

interface CheatRoom extends BaseRoom<CheatPlayer> {
  game: "cheat";
  deck: CheatCard[];
  pile: CheatCard[];
  requiredRankIndex: number;
  pendingClaim: CheatPendingClaim | null;
  pendingWinnerId: string | null;
}

interface DominoRoom extends BaseRoom<DominoPlayer> {
  game: "dominoes";
  boneyard: DominoTile[];
  chain: DominoPlacement[];
  leftEnd: number | null;
  rightEnd: number | null;
  consecutivePasses: number;
}

type AnyRoom = CheatRoom | DominoRoom;
const rooms = new Map<string, AnyRoom>();
const aiTimers = new Map<string, NodeJS.Timeout>();
const AI_NAMES = ["Atlas", "Nova", "Rook", "Echo", "Mira", "Juno", "Sol", "Vale"];
const CHEAT_RANKS: CheatRank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const CHEAT_SUITS: CheatSuit[] = ["♠","♥","♦","♣"];
const MAX_PLAYERS: Record<ClassicGameId, number> = { cheat: 6, dominoes: 4 };

function token(): string { return randomBytes(8).toString("base64url").slice(0, 10).toUpperCase(); }
function normaliseCode(value: unknown): string { return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : ""; }
function normaliseName(value: unknown): string { return typeof value === "string" ? value.trim().slice(0, 24) : ""; }
function normaliseDifficulty(value: unknown): ClassicAiDifficulty { return value === "easy" || value === "hard" ? value : "normal"; }
function normaliseMode(value: unknown): ClassicMatchMode { return value === "ranked" ? "ranked" : "casual"; }
function shuffle<T>(values: T[]): T[] { const copy = values.slice(); for (let index = copy.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [copy[index], copy[swap]] = [copy[swap], copy[index]]; } return copy; }
function ordered<P extends BasePlayer>(room: BaseRoom<P>): P[] { return room.players.slice().sort((a,b) => a.seat - b.seat); }
function orderedAny(room: AnyRoom): BasePlayer[] { return (room.players as BasePlayer[]).slice().sort((a,b) => a.seat - b.seat); }
function nextPlayer<P extends BasePlayer>(room: BaseRoom<P>, playerId: string): P | null { const list = ordered(room); if (!list.length) return null; const index = list.findIndex((player) => player.id === playerId); return list[(index + 1 + list.length) % list.length] ?? null; }
function addLog(room: AnyRoom, detail: string): void { room.actionSequence += 1; room.actionLog.push({ sequence: room.actionSequence, at: Date.now(), detail }); if (room.actionLog.length > 80) room.actionLog.splice(0, room.actionLog.length - 80); room.status = detail; }
function archivePayload(room: AnyRoom): unknown {
  captureProgression(room);
  // Finalization awaits disk setup. Snapshot now so an immediate rematch or
  // reconnect cannot rewrite the previous match's result while it is saving.
  return structuredClone({ ...room, players: [...room.players, ...room.forfeitedPlayers], spectators: [...room.spectators.entries()] });
}
function archiveTime(room: AnyRoom): number { return room.startedAt ?? room.createdAt; }
function staleMatch(room: AnyRoom, payload: any): boolean { return (payload?.matchId ?? null) !== room.matchId; }

function createCheatDeck(): CheatCard[] {
  const cards: CheatCard[] = [];
  for (const suit of CHEAT_SUITS) for (const rank of CHEAT_RANKS) cards.push({ id: `cheat-${rank}-${suit}-${cards.length}`, rank, suit, label: `${rank}${suit}` });
  return shuffle(cards);
}
function createDominoSet(): DominoTile[] { const tiles: DominoTile[] = []; for (let a = 0; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) tiles.push({ id: `domino-${a}-${b}`, a, b }); return shuffle(tiles); }

function publicPlayer(room: AnyRoom, player: BasePlayer, viewerId: string | null): ClassicPlayerPublic {
  if (room.game === "cheat") {
    const actual = player as CheatPlayer;
    return { id: player.id, name: player.name, isHost: player.isHost, isAi: player.isAi, aiDifficulty: player.aiDifficulty, isConnected: player.isConnected, seat: player.seat, result: player.result, cardCount: actual.hand.length, hand: viewerId === player.id ? actual.hand.map((card) => card.label) : null };
  }
  const actual = player as DominoPlayer;
  return { id: player.id, name: player.name, isHost: player.isHost, isAi: player.isAi, aiDifficulty: player.aiDifficulty, isConnected: player.isConnected, seat: player.seat, result: player.result, tileCount: actual.hand.length, tiles: viewerId === player.id ? actual.hand : null };
}

function publicState(room: AnyRoom, viewerId: string | null, isSpectator: boolean): ClassicPublicState {
  const publicPlayers = orderedAny(room).map((player) => publicPlayer(room, player, viewerId));
  const base = {
    game: room.game,
    gameTitle: room.game === "cheat" ? "Cheat" as const : "Dominoes" as const,
    code: room.code,
    phase: room.phase,
    started: room.startedAt !== null,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    matchId: room.matchId,
    outcome: room.outcome,
    updatedAt: room.updatedAt,
    matchMode: room.matchMode,
    players: publicPlayers,
    currentTurnPlayerId: room.currentTurnPlayerId,
    viewerPlayerId: viewerId,
    viewerReconnectToken: viewerId && !isSpectator ? room.players.find((player) => player.id === viewerId)?.reconnectToken ?? null : null,
    isSpectator,
    spectatorCount: room.spectators.size,
    status: room.status,
    winnerPlayerId: room.winnerPlayerId,
    actionLog: room.actionLog,
  };
  if (room.game === "cheat") {
    const viewer = viewerId ? room.players.find((player) => player.id === viewerId) : null;
    const pending: CheatClaimPublic | null = room.pendingClaim ? { playerId: room.pendingClaim.playerId, playerName: room.pendingClaim.playerName, claimedRank: room.pendingClaim.claimedRank, count: room.pendingClaim.cards.length, at: room.pendingClaim.at } : null;
    return {
      ...base,
      game: "cheat",
      gameTitle: "Cheat",
      pileCount: room.pile.length,
      requiredRank: CHEAT_RANKS[room.requiredRankIndex],
      pendingClaim: pending,
      viewerHand: viewer?.hand ?? [],
      selectedLimit: 4,
      canCallCheat: Boolean(viewer && room.phase === "playing" && room.currentTurnPlayerId === viewer.id && room.pendingClaim && room.pendingClaim.playerId !== viewer.id),
      canAcceptClaim: Boolean(viewer && room.phase === "playing" && room.currentTurnPlayerId === viewer.id && room.pendingClaim && room.pendingClaim.playerId !== viewer.id),
      canPlay: Boolean(viewer && room.phase === "playing" && room.currentTurnPlayerId === viewer.id && !room.pendingClaim && viewer.hand.length > 0),
    } satisfies CheatPublicState;
  }
  const viewer = viewerId ? room.players.find((player) => player.id === viewerId) : null;
  const playable = viewer ? viewer.hand.filter((tile) => isDominoPlayable(room, tile)).map((tile) => tile.id) : [];
  return {
    ...base,
    game: "dominoes",
    gameTitle: "Dominoes",
    chain: room.chain,
    leftEnd: room.leftEnd,
    rightEnd: room.rightEnd,
    boneyardCount: room.boneyard.length,
    viewerTiles: viewer?.hand ?? [],
    playableTileIds: playable,
    canDraw: Boolean(viewer && room.phase === "playing" && room.currentTurnPlayerId === viewer.id && playable.length === 0 && room.boneyard.length > 0),
    canPass: Boolean(viewer && room.phase === "playing" && room.currentTurnPlayerId === viewer.id && playable.length === 0 && room.boneyard.length === 0),
    consecutivePasses: room.consecutivePasses,
  } satisfies DominoesPublicState;
}

function emitRoom(io: Server, room: AnyRoom): void {
  room.updatedAt = Date.now();
  recordWorkingSession(room.game, room.code, archiveTime(room), archivePayload(room));
  for (const player of room.players) if (!player.isAi && player.isConnected) io.to(player.id).emit(`${room.game}:state`, publicState(room, player.id, false));
  for (const spectatorId of room.spectators.keys()) io.to(spectatorId).emit(`${room.game}:state`, publicState(room, null, true));
  scheduleAi(io, room);
}

function addAi(room: AnyRoom, difficulty: ClassicAiDifficulty): string | null {
  if (room.phase !== "lobby") return "AI seats can only be changed before the game starts.";
  if (room.players.length >= MAX_PLAYERS[room.game]) return "This room is full.";
  const used = new Set(room.players.map((player) => player.name));
  const name = AI_NAMES.find((candidate) => !used.has(candidate)) ?? `AI ${room.players.length + 1}`;
  const base: BasePlayer = { id: `${room.game}-ai-${token()}`, reconnectToken: "", name, isHost: false, isAi: true, aiDifficulty: difficulty, isConnected: true, seat: room.players.length, result: null };
  if (room.game === "cheat") room.players.push({ ...base, hand: [] }); else room.players.push({ ...base, hand: [] });
  return null;
}

function archiveOutcome(room: AnyRoom): void {
  const outcome = room.outcome;
  if (!outcome) return;
  const winner = room.players.find((player) => player.id === outcome.winnerPlayerId);
  const status = outcome.kind === "cancelled" ? "host-ended" : outcome.kind === "forfeited" ? "forfeit-completed" : "completed";
  void finalizeSession(room.game, room.code, archiveTime(room), status, archivePayload(room), {
    matchId: room.matchId, outcome: outcome.kind, reason: outcome.reason,
    countsAsCompletedPlay: outcome.countsAsCompletedPlay,
    winner: winner?.name ?? null, players: room.players.length + room.forfeitedPlayers.length,
    mode: room.matchMode, durationMs: room.startedAt === null ? 0 : Math.max(0, outcome.endedAt - room.startedAt),
  }).catch((error) => console.error("Classic-table archive finalization failed:", error));
}

function finishRoom(room: AnyRoom, winner: BasePlayer | null, reason: string, terminal: ClassicCompletionReason): void {
  if (room.phase !== "playing" || !room.matchId || room.startedAt === null || room.outcome || !winner) return;
  // Only rule-backed transitions may enter the completed-result path.
  const valid = terminal === "last-player-remaining"
    ? room.players.length === 1 && room.players[0].id === winner.id && room.forfeitedPlayers.length > 0
    : room.game === "dominoes"
      ? terminal === "dominoes-empty-hand"
        ? room.chain.length > 0 && (winner as DominoPlayer).hand.length === 0
        : terminal === "dominoes-blocked" && room.chain.length > 0 && room.boneyard.length === 0
          && room.consecutivePasses >= room.players.length
          && room.players.every((player) => !player.hand.some((tile) => isDominoPlayable(room, tile)))
      : terminal === "cheat-final-claim-accepted" && (winner as CheatPlayer).hand.length === 0
        && room.pendingWinnerId === winner.id && room.pendingClaim?.playerId === winner.id;
  if (!valid) return;
  room.phase = "finished"; room.currentTurnPlayerId = null; room.winnerPlayerId = winner?.id ?? null;
  winner.result = "Winner";
  room.outcome = { kind: terminal === "last-player-remaining" ? "forfeited" : "completed", reason: terminal, endedAt: Date.now(), countsAsCompletedPlay: true, winnerPlayerId: winner.id };
  if (room.game === "cheat") { room.pendingClaim = null; room.pendingWinnerId = null; }
  addLog(room, reason);
  archiveOutcome(room);
}

function cancelRoom(room: AnyRoom, host: BasePlayer): void {
  if (room.outcome) return;
  room.phase = "finished"; room.currentTurnPlayerId = null; room.winnerPlayerId = null;
  if (room.game === "cheat") { room.pendingClaim = null; room.pendingWinnerId = null; }
  for (const player of room.players) player.result = null;
  room.outcome = { kind: "cancelled", reason: "host-closed", endedAt: Date.now(), countsAsCompletedPlay: false, winnerPlayerId: null };
  addLog(room, `${host.name} closed the room. No match result was awarded.`);
  archiveOutcome(room);
}

function startCheat(room: CheatRoom): string | null {
  if (room.players.length < 2) return "Cheat needs at least two players. Add an AI if you are testing solo.";
  room.deck = createCheatDeck(); room.pile = []; room.pendingClaim = null; room.pendingWinnerId = null; room.requiredRankIndex = 0; room.winnerPlayerId = null;
  for (const player of room.players) { player.hand = []; player.result = null; }
  let index = 0; while (room.deck.length) { room.players[index % room.players.length].hand.push(room.deck.pop()!); index += 1; }
  room.phase = "playing"; room.currentTurnPlayerId = ordered(room)[0]?.id ?? null;
  addLog(room, `${ordered(room)[0]?.name ?? "Player"} starts. Claim ${CHEAT_RANKS[room.requiredRankIndex]}s.`);
  return null;
}

function acceptCheatClaim(room: CheatRoom, player: CheatPlayer): string | null {
  if (room.phase !== "playing" || room.currentTurnPlayerId !== player.id || !room.pendingClaim) return "There is no claim for you to accept.";
  const previous = room.pendingClaim;
  if (room.pendingWinnerId === previous.playerId) {
    const winner = room.players.find((candidate) => candidate.id === previous.playerId) ?? null;
    finishRoom(room, winner, `${winner?.name ?? "Player"}'s final claim stands. ${winner?.name ?? "Player"} wins Cheat.`, "cheat-final-claim-accepted");
    room.pendingClaim = null;
    return null;
  }
  room.pendingClaim = null;
  room.pendingWinnerId = null;
  addLog(room, `${player.name} accepts ${previous.playerName}'s claim. ${player.name} must claim ${CHEAT_RANKS[room.requiredRankIndex]}s.`);
  return null;
}

function callCheat(room: CheatRoom, challenger: CheatPlayer): string | null {
  if (room.phase !== "playing" || room.currentTurnPlayerId !== challenger.id || !room.pendingClaim) return "There is no claim to challenge.";
  const claim = room.pendingClaim; const liar = claim.cards.some((card) => card.rank !== claim.claimedRank);
  const claimant = room.players.find((player) => player.id === claim.playerId);
  const pickup = liar ? claimant : challenger;
  if (!pickup) return "The challenged player is unavailable.";
  pickup.hand.push(...room.pile); room.pile = []; room.pendingClaim = null; room.pendingWinnerId = null;
  if (liar) addLog(room, `${challenger.name} calls Cheat — correct. ${claim.playerName} picks up the pile.`);
  else addLog(room, `${challenger.name} calls Cheat — wrong. ${challenger.name} picks up the pile.`);
  room.requiredRankIndex = (room.requiredRankIndex + 1) % CHEAT_RANKS.length;
  return null;
}

function playCheat(room: CheatRoom, player: CheatPlayer, cardIds: string[]): string | null {
  if (room.phase !== "playing" || room.currentTurnPlayerId !== player.id || room.pendingClaim) return "You cannot play cards right now.";
  const unique = [...new Set(cardIds)].slice(0, 4); if (!unique.length) return "Select at least one card.";
  const cards = unique.map((id) => player.hand.find((card) => card.id === id)).filter(Boolean) as CheatCard[];
  if (cards.length !== unique.length) return "One of those cards is no longer in your hand.";
  const claimedRank = CHEAT_RANKS[room.requiredRankIndex];
  player.hand = player.hand.filter((card) => !unique.includes(card.id)); room.pile.push(...cards);
  room.pendingClaim = { playerId: player.id, playerName: player.name, claimedRank, cards, at: Date.now() };
  room.pendingWinnerId = player.hand.length === 0 ? player.id : null;
  const next = nextPlayer(room, player.id); room.currentTurnPlayerId = next?.id ?? null; room.requiredRankIndex = (room.requiredRankIndex + 1) % CHEAT_RANKS.length;
  addLog(room, `${player.name} puts down ${cards.length} card${cards.length === 1 ? "" : "s"} and claims ${claimedRank}${cards.length === 1 ? "" : "s"}.`);
  return null;
}

function isDominoPlayable(room: DominoRoom, tile: DominoTile): boolean {
  if (room.leftEnd == null || room.rightEnd == null) return true;
  return tile.a === room.leftEnd || tile.b === room.leftEnd || tile.a === room.rightEnd || tile.b === room.rightEnd;
}

function dominoPips(player: { hand: DominoTile[] }): number { return player.hand.reduce((sum, tile) => sum + tile.a + tile.b, 0); }

export function selectBlockedDominoWinner<T extends { seat: number; hand: DominoTile[] }>(players: T[]): T | null {
  // Preserve HGR's existing lowest-pip, then seat-order tie break.
  return players.slice().sort((a,b) => dominoPips(a) - dominoPips(b) || a.seat - b.seat)[0] ?? null;
}

function finishBlockedDominoes(room: DominoRoom): void {
  const winner = selectBlockedDominoWinner(room.players);
  finishRoom(room, winner, `The table is blocked. ${winner?.name ?? "Nobody"} wins with ${winner ? dominoPips(winner) : 0} pips remaining.`, "dominoes-blocked");
}

function playDomino(room: DominoRoom, player: DominoPlayer, tileId: string, side: "left" | "right"): string | null {
  if (room.phase !== "playing" || room.currentTurnPlayerId !== player.id) return "It is not your turn.";
  const tile = player.hand.find((candidate) => candidate.id === tileId); if (!tile) return "Tile not found.";
  if (!isDominoPlayable(room, tile)) return "That tile does not match either open end.";
  let left = tile.a; let right = tile.b;
  if (room.leftEnd == null || room.rightEnd == null) {
    room.leftEnd = left; room.rightEnd = right;
  } else if (side === "left") {
    if (tile.b === room.leftEnd) { left = tile.a; right = tile.b; }
    else if (tile.a === room.leftEnd) { left = tile.b; right = tile.a; }
    else return "That tile does not match the left end.";
    room.leftEnd = left;
  } else {
    if (tile.a === room.rightEnd) { left = tile.a; right = tile.b; }
    else if (tile.b === room.rightEnd) { left = tile.b; right = tile.a; }
    else return "That tile does not match the right end.";
    room.rightEnd = right;
  }
  player.hand = player.hand.filter((candidate) => candidate.id !== tile.id);
  const placement: DominoPlacement = { id: tile.id, a: tile.a, b: tile.b, left, right, playedById: player.id, playedByName: player.name };
  if (side === "left") room.chain.unshift(placement); else room.chain.push(placement);
  room.consecutivePasses = 0;
  addLog(room, `${player.name} plays ${tile.a}|${tile.b}.`);
  if (player.hand.length === 0) { finishRoom(room, player, `${player.name} empties their hand and wins Dominoes.`, "dominoes-empty-hand"); return null; }
  room.currentTurnPlayerId = nextPlayer(room, player.id)?.id ?? null;
  return null;
}

function startDominoes(room: DominoRoom): string | null {
  if (room.players.length < 2) return "Dominoes needs at least two players. Add an AI if you are testing solo.";
  const set = createDominoSet(); room.chain = []; room.leftEnd = null; room.rightEnd = null; room.consecutivePasses = 0; room.winnerPlayerId = null;
  const handSize = room.players.length === 2 ? 7 : 5;
  for (const player of room.players) { player.hand = []; player.result = null; for (let draw = 0; draw < handSize; draw += 1) player.hand.push(set.pop()!); }
  room.boneyard = set; room.phase = "playing";
  const starter = room.players.slice().sort((a,b) => {
    const bestA = Math.max(...a.hand.map((tile) => tile.a === tile.b ? tile.a * 20 : tile.a + tile.b));
    const bestB = Math.max(...b.hand.map((tile) => tile.a === tile.b ? tile.a * 20 : tile.a + tile.b));
    return bestB - bestA || a.seat - b.seat;
  })[0];
  room.currentTurnPlayerId = starter?.id ?? null;
  addLog(room, `${starter?.name ?? "Player"} opens the Dominoes table.`);
  return null;
}

function startRoom(room: AnyRoom): string | null {
  if (room.phase !== "lobby" && !(room.phase === "finished" && room.outcome?.countsAsCompletedPlay)) return "Only a lobby or a completed match can start. Create a new room after cancellation.";
  if (room.players.length < 2) return "At least two players are required.";
  // The existing archive key accepts a timestamp. A strictly fresh timestamp
  // gives every match/rematch its own key without changing other games' archives.
  room.startedAt = Math.max(Date.now(), (room.startedAt ?? room.createdAt) + 1);
  room.matchId = `${room.game}-${room.code}-${room.startedAt}`;
  room.outcome = null; room.forfeitedPlayers = []; room.actionLog = [];
  return room.game === "cheat" ? startCheat(room) : startDominoes(room);
}

function createRoom(game: ClassicGameId, code: string, name: string, socketId: string, options: ClassicCreateOptions): AnyRoom {
  const createdAt = Date.now(); const base: BasePlayer = { id: socketId, reconnectToken: token(), name, isHost: true, isAi: false, aiDifficulty: null, isConnected: true, seat: 0, result: null };
  if (game === "cheat") return { game, code, createdAt, startedAt: null, matchId: null, outcome: null, forfeitedPlayers: [], updatedAt: createdAt, phase: "lobby", matchMode: normaliseMode(options.matchMode), players: [{ ...base, hand: [] }], spectators: new Map(), currentTurnPlayerId: null, winnerPlayerId: null, status: "Waiting for players.", actionSequence: 0, actionLog: [], deck: [], pile: [], requiredRankIndex: 0, pendingClaim: null, pendingWinnerId: null };
  return { game, code, createdAt, startedAt: null, matchId: null, outcome: null, forfeitedPlayers: [], updatedAt: createdAt, phase: "lobby", matchMode: normaliseMode(options.matchMode), players: [{ ...base, hand: [] }], spectators: new Map(), currentTurnPlayerId: null, winnerPlayerId: null, status: "Waiting for players.", actionSequence: 0, actionLog: [], boneyard: [], chain: [], leftEnd: null, rightEnd: null, consecutivePasses: 0 };
}

function aiCheat(io: Server, room: CheatRoom, ai: CheatPlayer): void {
  if (room.pendingClaim) {
    const lie = room.pendingClaim.cards.some((card) => card.rank !== room.pendingClaim!.claimedRank);
    const accuracy = ai.aiDifficulty === "hard" ? 0.82 : ai.aiDifficulty === "easy" ? 0.38 : 0.62;
    const challenge = Math.random() < (lie ? accuracy : 1 - accuracy) * 0.65;
    if (challenge) callCheat(room, ai); else acceptCheatClaim(room, ai);
  }
  if (room.phase !== "playing" || room.currentTurnPlayerId !== ai.id || room.pendingClaim || !ai.hand.length) { emitRoom(io, room); return; }
  const required = CHEAT_RANKS[room.requiredRankIndex]; const matching = ai.hand.filter((card) => card.rank === required);
  let chosen: CheatCard[];
  if (matching.length) chosen = matching.slice(0, Math.min(4, matching.length));
  else {
    const count = ai.aiDifficulty === "hard" ? 1 : Math.min(ai.hand.length, Math.random() < 0.25 ? 2 : 1);
    chosen = ai.hand.slice(0, count);
  }
  playCheat(room, ai, chosen.map((card) => card.id)); emitRoom(io, room);
}

function aiDominoes(io: Server, room: DominoRoom, ai: DominoPlayer): void {
  const playable = ai.hand.filter((tile) => isDominoPlayable(room, tile));
  if (!playable.length && room.boneyard.length) {
    ai.hand.push(room.boneyard.pop()!); addLog(room, `${ai.name} draws from the boneyard.`); emitRoom(io, room); return;
  }
  if (!playable.length) {
    room.consecutivePasses += 1; addLog(room, `${ai.name} passes.`);
    if (room.consecutivePasses >= room.players.length) finishBlockedDominoes(room); else room.currentTurnPlayerId = nextPlayer(room, ai.id)?.id ?? null;
    emitRoom(io, room); return;
  }
  const tile = playable.slice().sort((a,b) => (b.a+b.b)-(a.a+a.b))[0];
  const side: "left" | "right" = room.leftEnd == null || tile.a === room.leftEnd || tile.b === room.leftEnd ? "left" : "right";
  playDomino(room, ai, tile.id, side); emitRoom(io, room);
}

function scheduleAi(io: Server, room: AnyRoom): void {
  const key = `${room.game}:${room.code}`; const existing = aiTimers.get(key); if (existing) { clearTimeout(existing); aiTimers.delete(key); }
  if (room.phase !== "playing" || !room.currentTurnPlayerId) return;
  const player = room.players.find((candidate) => candidate.id === room.currentTurnPlayerId); if (!player?.isAi) return;
  const timer = setTimeout(() => {
    aiTimers.delete(key); const latest = rooms.get(room.code); if (!latest || latest.game !== room.game || latest.phase !== "playing") return;
    const active = latest.players.find((candidate) => candidate.id === latest.currentTurnPlayerId); if (!active?.isAi) return;
    if (latest.game === "cheat") aiCheat(io, latest, active as CheatPlayer); else aiDominoes(io, latest, active as DominoPlayer);
  }, 650);
  aiTimers.set(key, timer);
}

export function getClassicChatIdentity(game: ClassicGameId, code: string, socketId: string): { name: string; role: "player" | "spectator" } | null {
  const room = rooms.get(normaliseCode(code)); if (!room || room.game !== game) return null;
  const player = room.players.find((candidate) => candidate.id === socketId && candidate.isConnected); if (player) return { name: player.name, role: "player" };
  const spectator = room.spectators.get(socketId); return spectator ? { name: spectator, role: "spectator" } : null;
}

export function getClassicRoomCount(): number { return [...rooms.values()].filter((room) => room.phase !== "finished" && (room.players.some((player) => !player.isAi && player.isConnected) || room.spectators.size > 0)).length; }
export function getClassicLiveRoomSummaries(): HalieusLiveRoomSummary[] {
  return [...rooms.values()].filter((room) => room.phase !== "finished" && (room.players.some((player) => !player.isAi && player.isConnected) || room.spectators.size > 0)).map((room) => ({
    game: room.game, gameTitle: room.game === "cheat" ? "Cheat" : "Dominoes", code: room.code, phase: room.phase, matchMode: room.matchMode, started: room.phase !== "lobby", createdAt: room.createdAt, startedAt: room.startedAt, updatedAt: room.updatedAt,
    playerCount: room.players.length, maximumPlayers: MAX_PLAYERS[room.game], humanPlayers: room.players.filter((player) => !player.isAi && player.isConnected).map((player) => player.name), aiCount: room.players.filter((player) => player.isAi).length, spectatorCount: room.spectators.size,
    joinable: room.phase === "lobby" && (room.players.length < MAX_PLAYERS[room.game] || room.players.some((player) => player.isAi)), spectatable: true,
  }));
}
export function closeAllClassicRooms(): number { const count = rooms.size; for (const timer of aiTimers.values()) clearTimeout(timer); aiTimers.clear(); rooms.clear(); return count; }

export function registerClassicTableHandlers(io: Server, socket: Socket): void {
  socket.use(([event, payload, ack], next) => {
    if (/^(cheat|dominoes):(start|end-game|forfeit|play|draw|pass|accept|call)$/.test(event)) {
      const room = rooms.get(normaliseCode(payload?.code));
      if (room && event.startsWith(`${room.game}:`)) {
        const player = room.players.find((candidate) => candidate.id === socket.id);
        if (staleMatch(room, payload) || (player && !player.isConnected)) {
          if (typeof ack === "function") ack({ ok: false, reason: "This match or seat has changed. Recover the current room before acting." });
          return;
        }
      }
    }
    next();
  });
  for (const game of ["cheat", "dominoes"] as const) {
    socket.on(`${game}:create`, (payload: any, ack: (response: any) => void) => {
      const code = normaliseCode(payload?.code); const name = normaliseName(payload?.playerName); if (!code || !name) return ack({ ok: false, reason: "Name and room code are required." });
      if (rooms.has(code)) return ack({ ok: false, reason: "That room code is already in use." });
      const room = createRoom(game, code, name, socket.id, payload ?? {}); rooms.set(code, room);
      const aiCount = Math.max(0, Math.min(MAX_PLAYERS[game] - 1, Math.floor(Number(payload?.aiCount) || 0))); const level = normaliseDifficulty(payload?.aiDifficulty);
      for (let index = 0; index < aiCount; index += 1) addAi(room, level);
      socket.join(socket.id); emitRoom(io, room); const host = room.players[0]; ack({ ok: true, code, playerId: host.id, reconnectToken: host.reconnectToken, state: publicState(room, host.id, false) });
    });

    socket.on(`${game}:join`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); const name = normaliseName(payload?.playerName); if (!room || room.game !== game) return ack({ ok: false, reason: `${game === "cheat" ? "Cheat" : "Dominoes"} room not found.` });
      if (room.phase !== "lobby") return ack({ ok: false, reason: "This game has already started. Rejoin with your recovery key or spectate." });
      if (!name) return ack({ ok: false, reason: "A valid name is required." });
      if (room.players.some((player) => !player.isAi && player.name.toLowerCase() === name.toLowerCase())) return ack({ ok: false, reason: "That name is already seated. Use the recovery key for that seat." });
      if (room.players.length >= MAX_PLAYERS[game]) {
        const aiIndex = room.players.map((player, index) => ({ player, index })).reverse().find(({ player }) => player.isAi)?.index ?? -1;
        if (aiIndex < 0) return ack({ ok: false, reason: "That room is full." });
        room.players = room.players.filter((_, index) => index !== aiIndex) as any;
        room.players.forEach((player, index) => { player.seat = index; });
      }
      const usedSeats = new Set(room.players.map((player) => player.seat)); let seat = 0; while (usedSeats.has(seat)) seat += 1;
      const base: BasePlayer = { id: socket.id, reconnectToken: token(), name, isHost: false, isAi: false, aiDifficulty: null, isConnected: true, seat, result: null };
      if (room.game === "cheat") room.players.push({ ...base, hand: [] }); else room.players.push({ ...base, hand: [] });
      room.players.sort((a,b) => a.seat-b.seat);
      socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code: room.code, playerId: socket.id, reconnectToken: base.reconnectToken, state: publicState(room, socket.id, false) });
    });

    socket.on(`${game}:reconnect`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); const key = typeof payload?.reconnectToken === "string" ? payload.reconnectToken.trim().toUpperCase() : ""; const player = room?.players.find((candidate) => candidate.reconnectToken === key && !candidate.isAi);
      if (!room || room.game !== game || !player) return ack({ ok: false, reason: "Recovery key not found." });
      const previousId = player.id;
      player.id = socket.id; player.isConnected = true; if (normaliseName(payload?.playerName)) player.name = normaliseName(payload.playerName);
      if (room.currentTurnPlayerId === previousId) room.currentTurnPlayerId = player.id;
      if (room.winnerPlayerId === previousId) room.winnerPlayerId = player.id;
      if (room.outcome?.winnerPlayerId === previousId) room.outcome.winnerPlayerId = player.id;
      if (room.game === "cheat") {
        if (room.pendingClaim?.playerId === previousId) room.pendingClaim.playerId = player.id;
        if (room.pendingWinnerId === previousId) room.pendingWinnerId = player.id;
      }
      socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code: room.code, playerId: player.id, reconnectToken: player.reconnectToken, state: publicState(room, player.id, false) });
    });

    socket.on(`${game}:spectate`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); if (!room || room.game !== game) return ack({ ok: false, reason: "Room not found." });
      room.spectators.set(socket.id, normaliseName(payload?.playerName) || "Spectator"); socket.join(socket.id); emitRoom(io, room); ack({ ok: true, code: room.code, state: publicState(room, null, true) });
    });

    socket.on(`${game}:add-ai`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost); if (!room || room.game !== game || !host) return ack({ ok: false, reason: "Only the host can add AI." });
      const reason = addAi(room, normaliseDifficulty(payload?.difficulty)); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
    });

    socket.on(`${game}:remove-ai`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost); if (!room || room.game !== game || !host || room.phase !== "lobby") return ack({ ok: false, reason: "Only the host can remove AI before play." });
      room.players = room.players.filter((player) => !(player.isAi && player.id === payload?.playerId)) as any; room.players.forEach((player, index) => { player.seat = index; }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
    });

    socket.on(`${game}:start`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost); if (!room || room.game !== game || !host) return ack({ ok: false, reason: "Only the host can start this game." });
      const reason = startRoom(room); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
    });

    socket.on(`${game}:end-game`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); const host = room?.players.find((player) => player.id === socket.id && player.isHost);
      if (!room || room.game !== game || !host) return ack({ ok: false, reason: "Only the host can end this game." });
      if (room.outcome) return ack({ ok: true, state: publicState(room, host.id, false) });
      cancelRoom(room, host);
      emitRoom(io, room); ack({ ok: true, state: publicState(room, host.id, false) });
    });

    socket.on(`${game}:forfeit`, (payload: any, ack: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); const player = room?.players.find((candidate) => candidate.id === socket.id && !candidate.isAi); if (!room || room.game !== game || !player) return ack({ ok: false, reason: "Seat not found." });
      if (room.phase !== "playing") return ack({ ok: false, reason: "Only an active match can be forfeited." });
      room.forfeitedPlayers.push({ ...player, result: "Forfeited" });
      const wasCurrent = room.currentTurnPlayerId === player.id; const wasHost = player.isHost; room.players = room.players.filter((candidate) => candidate.id !== player.id) as any; room.players.forEach((candidate, index) => { candidate.seat = index; }); if (wasHost && room.players.length) room.players[0].isHost = true;
      if (room.players.length < 2 && room.phase === "playing") finishRoom(room, room.players[0] ?? null, `${player.name} forfeited. ${room.players[0]?.name ?? "Table"} wins.`, "last-player-remaining"); else if (wasCurrent) room.currentTurnPlayerId = room.players[0]?.id ?? null;
      emitRoom(io, room); ack({ ok: true });
    });

    socket.on(`${game}:leave`, (payload: any, ack?: (response: any) => void) => {
      const room = rooms.get(normaliseCode(payload?.code)); if (room && room.game === game) { const player = room.players.find((candidate) => candidate.id === socket.id); if (player) player.isConnected = false; room.spectators.delete(socket.id); emitRoom(io, room); } ack?.({ ok: true });
    });
  }

  socket.on("cheat:play", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.game === "cheat" ? room.players.find((candidate) => candidate.id === socket.id) : null; if (!room || room.game !== "cheat" || !player) return ack({ ok: false, reason: "Cheat seat not found." });
    const reason = playCheat(room, player, Array.isArray(payload?.cardIds) ? payload.cardIds : []); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });
  socket.on("cheat:accept", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.game === "cheat" ? room.players.find((candidate) => candidate.id === socket.id) : null; if (!room || room.game !== "cheat" || !player) return ack({ ok: false, reason: "Cheat seat not found." });
    const reason = acceptCheatClaim(room, player); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });
  socket.on("cheat:call", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.game === "cheat" ? room.players.find((candidate) => candidate.id === socket.id) : null; if (!room || room.game !== "cheat" || !player) return ack({ ok: false, reason: "Cheat seat not found." });
    const reason = callCheat(room, player); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });

  socket.on("dominoes:play", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.game === "dominoes" ? room.players.find((candidate) => candidate.id === socket.id) : null; if (!room || room.game !== "dominoes" || !player) return ack({ ok: false, reason: "Dominoes seat not found." });
    const side = payload?.side === "left" ? "left" : "right"; const reason = playDomino(room, player, String(payload?.tileId ?? ""), side); if (reason) return ack({ ok: false, reason }); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });
  socket.on("dominoes:draw", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.game === "dominoes" ? room.players.find((candidate) => candidate.id === socket.id) : null; if (!room || room.game !== "dominoes" || !player || room.currentTurnPlayerId !== player.id || room.phase !== "playing") return ack({ ok: false, reason: "You cannot draw now." });
    if (player.hand.some((tile) => isDominoPlayable(room, tile))) return ack({ ok: false, reason: "You already have a playable tile." }); if (!room.boneyard.length) return ack({ ok: false, reason: "The boneyard is empty." });
    player.hand.push(room.boneyard.pop()!); room.consecutivePasses = 0; addLog(room, `${player.name} draws from the boneyard.`); emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });
  socket.on("dominoes:pass", (payload: any, ack: (response: any) => void) => {
    const room = rooms.get(normaliseCode(payload?.code)); const player = room?.game === "dominoes" ? room.players.find((candidate) => candidate.id === socket.id) : null; if (!room || room.game !== "dominoes" || !player || room.currentTurnPlayerId !== player.id || room.phase !== "playing") return ack({ ok: false, reason: "You cannot pass now." });
    if (player.hand.some((tile) => isDominoPlayable(room, tile)) || room.boneyard.length) return ack({ ok: false, reason: "Draw or play a matching tile before passing." });
    room.consecutivePasses += 1; addLog(room, `${player.name} passes.`); if (room.consecutivePasses >= room.players.length) finishBlockedDominoes(room); else room.currentTurnPlayerId = nextPlayer(room, player.id)?.id ?? null; emitRoom(io, room); ack({ ok: true, state: publicState(room, player.id, false) });
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.find((candidate) => candidate.id === socket.id); if (player) player.isConnected = false;
      const wasSpectator = room.spectators.delete(socket.id); if (player || wasSpectator) emitRoom(io, room);
    }
  });
}
