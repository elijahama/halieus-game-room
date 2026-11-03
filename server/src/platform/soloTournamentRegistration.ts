import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import { getMegaBoardDataDirectory } from "./dataPaths.js";
import type { GameRoom } from "../games/mega-board/types/game.js";
import type { GameState } from "../../../shared/games/mega-board/game-state.js";
import { rooms as megaRooms } from "../games/mega-board/state/rooms.js";
import { getGuildFixtureBoundRoom } from "./guildFixtures.js";

/**
 * Source-only first Solo tournament slice. No fixture linking, winners, rating
 * payouts, or route activation in production is implied by registration.
 */
export type SoloTournamentStatus = "registration" | "seeded" | "completed" | "cancelled";
export type SoloMatchStatus = "awaiting-room" | "awaiting-opponents" | "room-bound" | "completed";
export interface SoloTournamentMatch {
  id: "semi-1" | "semi-2" | "final";
  round: "semifinal" | "final";
  homeAccountId: string | null;
  awayAccountId: string | null;
  roomCode: string | null;
  /** Exact lobby generation, not just a reusable room code. */
  roomCreatedAt: number | null;
  /** Server-minted immutable match identity for later verified receipts. */
  boardMatchId: string | null;
  /** Null unless verified from a real finished server-owned game. */
  winnerAccountId: string | null;
  gameStartedAt: number | null;
  completedAt: number | null;
  /** Two original authenticated seats must approve before a never-started room is replaced. */
  resetApprovedAccountIds: string[];
  resetRequestedAt: number | null;
  /** Durable two-phase reset intent: bound room stays locked until room-store flush. */
  resetPendingAt: number | null;
  status: SoloMatchStatus;
}
export interface SoloTournament {
  id: string;
  name: string;
  game: "mega-board";
  format: "four-player-single-elimination";
  hostAccountId: string;
  entrantAccountIds: string[];
  status: SoloTournamentStatus;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  championAccountId: string | null;
  matches: SoloTournamentMatch[];
}
type Store = { version: 1; tournaments: SoloTournament[] };
const MAX_TOURNAMENTS = 500;
const MAX_OPEN_PER_HOST = 5;
const SOLO_PRESTART_RESET_APPROVAL_MS = 10 * 60_000;
// Only the server with a real Socket.IO room lifecycle can retire a prior lobby.
let closeOriginalSoloRoom: ((code: string) => boolean | Promise<boolean>) | null = null;
export function configureSoloRoomResetCloser(closer: (code: string) => boolean | Promise<boolean>) {
  closeOriginalSoloRoom = closer;
}

export class SoloTournamentError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}
function validAccountId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 200;
}
function copy<T>(value: T): T {
  return structuredClone(value);
}
function validateStore(doc: unknown): asserts doc is Store {
  if (!doc || typeof doc !== "object") throw new Error("Invalid Solo tournament store.");
  const value = doc as Store;
  if (value.version !== 1 || !Array.isArray(value.tournaments) || value.tournaments.length > MAX_TOURNAMENTS) {
    throw new Error("Unsupported Solo tournament store format.");
  }
  const ids = new Set<string>();
  const roomGenerations = new Set<string>();
  const matchIds = new Set<string>();
  for (const t of value.tournaments) {
    if (!t || typeof t.id !== "string" || !t.id || ids.has(t.id) ||
        t.game !== "mega-board" || t.format !== "four-player-single-elimination" ||
        typeof t.name !== "string" || t.name.length < 3 || t.name.length > 70 ||
        !validAccountId(t.hostAccountId) || !Array.isArray(t.entrantAccountIds) ||
        t.entrantAccountIds.length < 1 || t.entrantAccountIds.length > 4 ||
        t.entrantAccountIds[0] !== t.hostAccountId ||
        t.entrantAccountIds.some(id => !validAccountId(id)) ||
        new Set(t.entrantAccountIds).size !== t.entrantAccountIds.length ||
        !["registration", "seeded", "completed", "cancelled"].includes(t.status) ||
        !Number.isSafeInteger(t.createdAt) || !Number.isSafeInteger(t.updatedAt) ||
        !Array.isArray(t.matches)) {
      throw new Error("Malformed Solo tournament; refusing to overwrite.");
    }
    ids.add(t.id);
    const bracketExists = t.status === "seeded" || t.status === "completed" ||
      (t.status === "cancelled" && t.matches.length === 3);
    if (!bracketExists) {
      if (t.matches.length || t.startedAt !== null || t.championAccountId != null) {
        throw new Error("Unstarted Solo tournament must have no matches or winners.");
      }
      continue;
    }
    if (t.entrantAccountIds.length !== 4 || !Number.isSafeInteger(t.startedAt) ||
        t.startedAt! < t.createdAt || t.matches.length !== 3) {
      throw new Error("Invalid seeded Solo bracket; refusing to overwrite.");
    }
    const [a,b,c,d] = t.entrantAccountIds;
    for(let i=0;i<t.matches.length;i++) {
      const m=t.matches[i]!;
      if (!m || m.id !== (i===0?"semi-1":i===1?"semi-2":"final") ||
          m.round !== (i===2?"final":"semifinal") ||
          m.homeAccountId === m.awayAccountId && m.homeAccountId !== null) {
        throw new Error("Invalid seeded Solo bracket identity.");
      }
      const approvals = m.resetApprovedAccountIds;
      const resetPending = m.resetPendingAt !== null;
      if (!Array.isArray(approvals) || approvals.length > 2 ||
          new Set(approvals).size !== approvals.length ||
          (approvals.length > 0 &&
            (m.status !== "room-bound" || !Number.isSafeInteger(m.resetRequestedAt) ||
             m.resetRequestedAt! < t.createdAt ||
             approvals.some(id => id !== m.homeAccountId && id !== m.awayAccountId))) ||
          (approvals.length === 0 && m.resetRequestedAt !== null) ||
          (resetPending &&
            (m.status !== "room-bound" || approvals.length !== 2 ||
             !approvals.includes(m.homeAccountId!) || !approvals.includes(m.awayAccountId!) ||
             !Number.isSafeInteger(m.resetPendingAt) ||
             m.resetPendingAt! < m.resetRequestedAt!)) ||
          (!resetPending && approvals.length > 1)) {
        throw new Error("Invalid Solo pre-start reset approval or durable intent.");
      }
      const recorded = m.status === "room-bound" || m.status === "completed";
      if (recorded) {
        if (typeof m.roomCode !== "string" || !/^[A-Z0-9]{4,12}$/.test(m.roomCode) ||
            !Number.isSafeInteger(m.roomCreatedAt) || m.roomCreatedAt! <= 0 ||
            typeof m.boardMatchId !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(m.boardMatchId) ||
            !validAccountId(m.homeAccountId) || !validAccountId(m.awayAccountId) ||
            roomGenerations.has(m.roomCode+":"+m.roomCreatedAt) || matchIds.has(m.boardMatchId)) {
          throw new Error("Invalid bound Solo room generation or match identity.");
        }
        roomGenerations.add(m.roomCode+":"+m.roomCreatedAt);
        matchIds.add(m.boardMatchId);
        if (m.status === "completed") {
          if (t.status === "cancelled" || !validAccountId(m.winnerAccountId) ||
              (m.winnerAccountId !== m.homeAccountId && m.winnerAccountId !== m.awayAccountId) ||
              !Number.isSafeInteger(m.gameStartedAt) || m.gameStartedAt! < m.roomCreatedAt! ||
              !Number.isSafeInteger(m.completedAt) || m.completedAt! < m.gameStartedAt!) {
            throw new Error("Invalid verified Solo match receipt.");
          }
        } else if (m.winnerAccountId !== null ||
                   m.gameStartedAt != null || m.completedAt != null || t.status === "cancelled") {
          throw new Error("Unfinished Solo room cannot claim a result.");
        }
      } else if (m.roomCode != null || m.roomCreatedAt != null || m.boardMatchId != null ||
                 m.winnerAccountId !== null || m.gameStartedAt != null || m.completedAt != null ||
                 !["awaiting-room", "awaiting-opponents"].includes(m.status)) {
        throw new Error("Invalid unbound Solo match receipt.");
      }
    }
    const [semi1,semi2,final] = t.matches;
    if (semi1!.homeAccountId !== a || semi1!.awayAccountId !== d ||
        semi2!.homeAccountId !== b || semi2!.awayAccountId !== c ||
        [semi1,semi2].some(m=>m!.status === "awaiting-opponents")) {
      throw new Error("Seed order mismatch; refusing to overwrite.");
    }
    const semisDone = semi1!.status === "completed" && semi2!.status === "completed";
    if (semisDone) {
      if (final!.homeAccountId !== semi1!.winnerAccountId ||
          final!.awayAccountId !== semi2!.winnerAccountId ||
          final!.status === "awaiting-opponents") {
        throw new Error("Final participants must derive only from verified semifinals.");
      }
    } else if (final!.homeAccountId !== null || final!.awayAccountId !== null ||
               final!.status !== "awaiting-opponents") {
      throw new Error("Unverified semifinal cannot advance a finalist.");
    }
    if (t.status === "completed") {
      if (final!.status !== "completed" || !semisDone ||
          t.championAccountId !== final!.winnerAccountId) {
        throw new Error("Completed Solo champion must be the verified final winner.");
      }
    } else if (final!.status === "completed" || t.championAccountId != null) {
      throw new Error("No Solo champion before the real final is verified.");
    }
    if (t.status === "cancelled" && t.matches.some(m=>m.status !== "awaiting-room" && m.status !== "awaiting-opponents")) {
      throw new Error("A cancelled Solo tournament cannot retain verified or bound results.");
    }
  }
}
function match(id: SoloTournamentMatch["id"], a: string | null, b: string | null): SoloTournamentMatch {
  return {
    id, round: id === "final" ? "final" : "semifinal",
    homeAccountId: a, awayAccountId: b,
    roomCode: null, roomCreatedAt: null, boardMatchId: null, winnerAccountId: null,
    gameStartedAt: null, completedAt: null,
    resetApprovedAccountIds: [], resetRequestedAt: null, resetPendingAt: null,
    status: a && b ? "awaiting-room" : "awaiting-opponents",
  };
}

/** Validate a real, unstarted two-human lobby with exactly the seeded account seats. */
function validateSoloRoom(room: GameRoom | undefined, home: string, away: string): void {
  if (!room || megaRooms.get(room.code) !== room || room.started || room.gameState ||
      !Number.isSafeInteger(room.createdAt) || room.createdAt <= 0 ||
      room.ranked || room.blitz || room.betaTournamentTest ||
      room.players.length !== 2 || room.hostDisconnectDeadline !== null ||
      !room.players.some(seat => seat.id === room.hostId && seat.isHost) ||
      room.players.some(seat => seat.isAi || seat.hasLeft || !seat.isConnected ||
        !seat.replayAccountId || !seat.reconnectToken || seat.disconnectedAt !== null)) {
    throw new SoloTournamentError(409, "Solo binding requires one real, unstarted, fully connected two-human Mega Board lobby.");
  }
  const seats = room.players.map(seat => seat.replayAccountId!);
  if (seats[0] === seats[1] || !seats.includes(home) || !seats.includes(away)) {
    throw new SoloTournamentError(409, "Solo lobby accounts do not match the two seeded entrants.");
  }
  if (getGuildFixtureBoundRoom(room.code)) {
    throw new SoloTournamentError(409, "A Guild fixture room cannot also be used in a Solo tournament.");
  }
}

/** Durable, queued, account-scoped registration with no fake game results. */
export function createSoloTournamentRegistrationCoordinator(
  path = resolve(getMegaBoardDataDirectory(), "tournaments", "solo-registration.json"),
) {
  let tournaments = new Map<string, SoloTournament>();
  let loaded = false;
  let pending: Promise<unknown> = Promise.resolve();
  const resetInFlight=new Set<string>();

  async function load() {
    if (loaded) return;
    let doc: Store;
    try {
      doc = JSON.parse(await readFile(path, "utf8")) as Store;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        loaded = true;
        return;
      }
      throw error;
    }
    // Earlier default-off alpha stores have no winner timestamp or champion fields.
    for (const tournament of doc.tournaments) {
      tournament.championAccountId ??= null;
      for (const match of tournament.matches) {
        match.roomCreatedAt ??= null;
        match.boardMatchId ??= null;
        match.gameStartedAt ??= null;
        match.completedAt ??= null;
        match.resetApprovedAccountIds ??= [];
        match.resetRequestedAt ??= null;
        match.resetPendingAt ??= null;
      }
    }
    validateStore(doc);
    tournaments = new Map(doc.tournaments.map(t => [t.id, t]));
    loaded = true;
  }
  function ensureLoaded() {
    if (!loaded) throw new SoloTournamentError(503, "Solo tournament registration is unavailable.");
  }
  function change<T>(mutation: (current: Map<string, SoloTournament>) =>
    { next: Map<string, SoloTournament>; value: T; afterCommit?: () => void; afterFailure?: () => void }): Promise<T> {
    const task = pending.then(async () => {
      ensureLoaded();
      const { next, value, afterCommit, afterFailure } = mutation(tournaments);
      try {
        if (next !== tournaments) {
          validateStore({ version: 1, tournaments: [...next.values()] });
          const dir = dirname(path);
          await mkdir(dir, { recursive: true });
          const temp = path + "." + randomUUID() + ".tmp";
          await writeFile(temp,
            JSON.stringify({ version: 1, tournaments: [...next.values()] }, null, 2),
            { encoding: "utf8", mode: 0o600 });
          await rename(temp, path);
          tournaments = next;
        }
        // Execute synchronously in this microtask after durable state is updated,
        // before another socket event can start or join the old room.
      } catch(error) {
        // A failed durable write must not release the original room lock as if
        // the reset had succeeded.
        afterFailure?.();
        throw error;
      }
      // If an unexpected post-commit room-close failure occurs, retain the
      // pending start guard for operator recovery instead of enabling the old lobby.
      afterCommit?.();
      return copy(value);
    });
    pending = task.then(() => undefined, () => undefined);
    return task;
  }
  function visible(accountId: string) {
    ensureLoaded();
    if (!validAccountId(accountId)) return [];
    return [...tournaments.values()]
      .filter(t => t.hostAccountId === accountId || t.entrantAccountIds.includes(accountId))
      .sort((a,b) => b.updatedAt-a.updatedAt)
      .slice(0,50).map(t => copy(t));
  }
  function create(accountId: string, title: unknown) {
    return change(current => {
      if (!validAccountId(accountId)) throw new SoloTournamentError(401, "Sign in first.");
      const name = typeof title === "string" ? title.trim() : "";
      if (name.length < 3 || name.length > 70) {
        throw new SoloTournamentError(400, "Tournament name must contain 3–70 characters.");
      }
      if (current.size >= MAX_TOURNAMENTS || [...current.values()].filter(t =>
        t.hostAccountId === accountId && t.status !== "cancelled").length >= MAX_OPEN_PER_HOST) {
        throw new SoloTournamentError(409, "Too many open Solo tournaments.");
      }
      const now = Date.now();
      const record: SoloTournament = {
        id: randomUUID(), name, game:"mega-board",
        format: "four-player-single-elimination", hostAccountId: accountId,
        entrantAccountIds:[accountId], status:"registration",
        createdAt:now, updatedAt:now, startedAt:null, championAccountId:null, matches:[],
      };
      const next = new Map(current); next.set(record.id,record);
      return { next, value: record };
    });
  }
  function join(accountId: string, id: string) {
    return change(current => {
      if (!validAccountId(accountId)) throw new SoloTournamentError(401, "Sign in first.");
      const tournament = current.get(id);
      if (!tournament) throw new SoloTournamentError(404, "Solo tournament invitation not found.");
      if (tournament.status !== "registration") throw new SoloTournamentError(409, "Registration has closed.");
      if (tournament.entrantAccountIds.includes(accountId)) throw new SoloTournamentError(409, "Already registered.");
      if (tournament.entrantAccountIds.length === 4) throw new SoloTournamentError(409, "This Solo bracket is full.");
      const update: SoloTournament = {
        ...tournament, entrantAccountIds:[...tournament.entrantAccountIds,accountId],
        updatedAt:Date.now(),
      };
      const next = new Map(current); next.set(id,update);
      return { next, value:update };
    });
  }
  function leave(accountId: string, id: string) {
    return change(current => {
      const tournament = current.get(id);
      if (!tournament || !tournament.entrantAccountIds.includes(accountId)) {
        throw new SoloTournamentError(404, "Solo tournament not found.");
      }
      if (tournament.status !== "registration") throw new SoloTournamentError(409, "Cannot abandon a seeded bracket.");
      if (tournament.hostAccountId === accountId) throw new SoloTournamentError(403, "The host must cancel the tournament.");
      const update: SoloTournament = {
        ...tournament, entrantAccountIds:tournament.entrantAccountIds.filter(a => a !== accountId),
        updatedAt:Date.now(),
      };
      const next = new Map(current); next.set(id,update);
      return { next, value:update };
    });
  }
  function seed(accountId: string, id: string) {
    return change(current => {
      const tournament = current.get(id);
      if (!tournament) throw new SoloTournamentError(404, "Solo tournament not found.");
      if (tournament.hostAccountId !== accountId) throw new SoloTournamentError(403, "Only the host can seed the bracket.");
      if (tournament.status !== "registration" || tournament.entrantAccountIds.length !== 4) {
        throw new SoloTournamentError(409, "Four unique verified accounts are needed to seed.");
      }
      const [a,b,c,d] = tournament.entrantAccountIds;
      const now=Date.now();
      const update: SoloTournament = {
        ...tournament, status:"seeded", startedAt:now, updatedAt:now,
        matches:[match("semi-1",a,d),match("semi-2",b,c),match("final",null,null)],
      };
      const next=new Map(current);next.set(id,update);
      return { next, value:update };
    });
  }
  /** Host links an already-existing ordinary two-human lobby; no game is created. */
  function bindRoom(accountId: string, id: string, matchId: string, suppliedCode: unknown) {
    return change(current => {
      const tournament = current.get(id);
      if (!tournament) throw new SoloTournamentError(404, "Solo tournament not found.");
      if (accountId !== tournament.hostAccountId) {
        throw new SoloTournamentError(403, "Only the tournament host may bind a match.");
      }
      if (tournament.status !== "seeded" || !["semi-1", "semi-2", "final"].includes(matchId)) {
        throw new SoloTournamentError(409, "Only seeded matches with verified opponents can bind live rooms.");
      }
      const match = tournament.matches.find(row => row.id === matchId);
      if (!match || match.status !== "awaiting-room" ||
          !match.homeAccountId || !match.awayAccountId) {
        throw new SoloTournamentError(409, "Match is not awaiting a room.");
      }
      const code = typeof suppliedCode === "string" ? suppliedCode.trim().toUpperCase() : "";
      if (!/^[A-Z0-9]{4,12}$/.test(code)) {
        throw new SoloTournamentError(400, "A real Mega Board room code is required.");
      }
      if ([...current.values()].some(other => other.status === "seeded" &&
          other.matches.some(row => row.status === "room-bound" && row.roomCode === code))) {
        throw new SoloTournamentError(409, "This room is already bound to a Solo match.");
      }
      const room = megaRooms.get(code);
      validateSoloRoom(room, match.homeAccountId, match.awayAccountId);
      const updatedMatch: SoloTournamentMatch = {
        ...match, status: "room-bound",
        roomCode: code, roomCreatedAt: room!.createdAt, boardMatchId: randomUUID(),
      };
      const updated: SoloTournament = {
        ...tournament, matches: tournament.matches.map(row => row.id === matchId ? updatedMatch : row),
        updatedAt: Date.now(),
      };
      const next = new Map(current); next.set(id, updated);
      return { next, value: updated };
    });
  }
  /**
   * An approved reset is a durable two-store handoff, never a one-step unbind.
   *
   * 1. Save a pending intent while retaining the exact original room generation.
   * 2. Close the verified never-started room and durably flush rooms.json.
   * 3. ONLY THEN save "awaiting-room" and clear the old identity.
   *
   * Restart can safely repeat step 2 or step 3. Absence, disconnection, or a
   * changed/started room cannot by itself create a match winner.
   */
  async function completePrestartReset(id: string, matchId: string): Promise<SoloTournament> {
    ensureLoaded();
    const pendingMatch = tournaments.get(id)?.matches.find(row => row.id === matchId);
    if (!pendingMatch || pendingMatch.status !== "room-bound" ||
        pendingMatch.resetPendingAt === null || !pendingMatch.roomCode ||
        !pendingMatch.homeAccountId || !pendingMatch.awayAccountId) {
      throw new SoloTournamentError(409, "No durable Solo room reset is pending.");
    }
    const code = pendingMatch.roomCode;
    resetInFlight.add(code);
    try {
      const original = megaRooms.get(code);
      if (original) {
        // On restart, the room must be the same ORIGINAL generation. Its
        // players may now be disconnected, but they cannot have been replaced.
        const accounts = original.players.map(seat => seat.replayAccountId);
        if (original.code !== code || original.createdAt !== pendingMatch.roomCreatedAt ||
            original.started || original.gameState !== null ||
            original.ranked || original.blitz || original.betaTournamentTest ||
            original.players.length !== 2 ||
            original.players.some(seat => seat.isAi || seat.hasLeft || !seat.replayAccountId) ||
            new Set(accounts).size !== 2 ||
            !accounts.includes(pendingMatch.homeAccountId) ||
            !accounts.includes(pendingMatch.awayAccountId)) {
          throw new SoloTournamentError(409,
            "A changed or started Solo room cannot be retired by reset recovery.");
        }
        if (!closeOriginalSoloRoom) {
          throw new SoloTournamentError(503, "Durable server-side Solo room closure is unavailable.");
        }
        // This callback MUST await a strict persisted room-store flush, not
        // merely the in-memory endRoom/queued-and-swallowed save.
        if (!await closeOriginalSoloRoom(code)) {
          throw new SoloTournamentError(503, "Original Solo room closure was not confirmed.");
        }
      }
      if (megaRooms.has(code)) {
        throw new SoloTournamentError(503, "Original Solo room is still active.");
      }
      return await change(current => {
        const tournament = current.get(id);
        const stored = tournament?.matches.find(row => row.id === matchId);
        if (!tournament || !stored || stored.status !== "room-bound" ||
            stored.resetPendingAt === null ||
            stored.roomCode !== code ||
            stored.roomCreatedAt !== pendingMatch.roomCreatedAt ||
            stored.boardMatchId !== pendingMatch.boardMatchId) {
          throw new SoloTournamentError(409, "Solo reset intent changed before finalising.");
        }
        const reset = match(stored.id, stored.homeAccountId, stored.awayAccountId);
        const updated:SoloTournament = {
          ...tournament, updatedAt:Date.now(),
          matches:tournament.matches.map(row => row.id === stored.id ? reset : row),
        };
        const next = new Map(current); next.set(id, updated);
        return {next, value:updated};
      });
    } finally {
      resetInFlight.delete(code);
    }
  }

  function approvePrestartReset(accountId: string, id: string, matchId: string) {
    let newlyPending = false;
    return change(current => {
      const tournament = current.get(id);
      if (!tournament || tournament.status !== "seeded") {
        throw new SoloTournamentError(404, "Active Solo tournament not found.");
      }
      const m = tournament.matches.find(row => row.id === matchId);
      if (!m || m.status !== "room-bound" ||
          !m.homeAccountId || !m.awayAccountId ||
          (accountId !== m.homeAccountId && accountId !== m.awayAccountId)) {
        throw new SoloTournamentError(403, "Only the original Solo match entrants may approve a reset.");
      }
      if (m.resetPendingAt !== null) {
        throw new SoloTournamentError(409, "A durable Solo room reset is already pending.");
      }
      const code = m.roomCode;
      const original = code && megaRooms.get(code);
      if (!original || original.code !== code || original.createdAt !== m.roomCreatedAt ||
          original.started || original.gameState !== null ||
          original.players.length !== 2 ||
          original.ranked || original.blitz || original.betaTournamentTest ||
          original.players.some(seat => seat.isAi || seat.hasLeft || !seat.replayAccountId) ||
          new Set(original.players.map(seat => seat.replayAccountId)).size !== 2 ||
          !original.players.some(seat => seat.replayAccountId === m.homeAccountId) ||
          !original.players.some(seat => seat.replayAccountId === m.awayAccountId)) {
        throw new SoloTournamentError(409, "The exact original never-started Solo room is required.");
      }
      if (resetInFlight.has(code)) {
        throw new SoloTournamentError(409, "This Solo room is already being reset.");
      }
      const now = Date.now();
      const withinWindow = m.resetRequestedAt !== null &&
        now >= m.resetRequestedAt && now-m.resetRequestedAt <= SOLO_PRESTART_RESET_APPROVAL_MS;
      const approvals = withinWindow ? [...m.resetApprovedAccountIds] : [];
      if (approvals.includes(accountId)) {
        throw new SoloTournamentError(409, "This entrant has already approved the reset.");
      }
      approvals.push(accountId);
      const secondApproval = approvals.length === 2;
      if (secondApproval && !closeOriginalSoloRoom) {
        throw new SoloTournamentError(503, "Safe server-side room closure is unavailable.");
      }
      const amended:SoloTournamentMatch = {
        ...m, resetApprovedAccountIds:approvals,
        resetRequestedAt:withinWindow ? m.resetRequestedAt : now,
        resetPendingAt:secondApproval ? now : null,
      };
      const updated:SoloTournament = {
        ...tournament, updatedAt:now,
        matches:tournament.matches.map(row => row.id === m.id ? amended : row),
      };
      const next = new Map(current); next.set(id, updated);
      if (secondApproval) {
        // Block Socket.IO game:start while the durable first commit runs.
        resetInFlight.add(code!);
        newlyPending = true;
      }
      return {
        next, value:updated,
        afterFailure:() => {
          if (secondApproval) resetInFlight.delete(code!);
        },
      };
    }).then(async updated => newlyPending ?
      completePrestartReset(id, matchId) : updated);
  }

  /** Reconcile the two stores after BOTH Solo brackets and Mega rooms load. */
  async function reconcilePendingPrestartResets(): Promise<number> {
    ensureLoaded();
    let recovered = 0;
    const pendingMatches = [...tournaments.values()].flatMap(t =>
      t.matches.filter(m => m.status === "room-bound" && m.resetPendingAt !== null)
        .map(m => ({id:t.id,matchId:m.id})));
    for (const item of pendingMatches) {
      // A mismatched/started room fails closed: do not erase the binding,
      // invent a win, or enable a replacement lobby.
      await completePrestartReset(item.id, item.matchId);
      recovered++;
    }
    return recovered;
  }

  function boundRoom(code: string) {
    if (!loaded) return null;
    for (const tournament of tournaments.values()) {
      if (tournament.status !== "seeded") continue;
      const match = tournament.matches.find(row => row.status === "room-bound" && row.roomCode === code);
      if (match) return { tournamentId: tournament.id, match: copy(match) };
    }
    return null;
  }
  function startBlock(room: GameRoom) {
    if (resetInFlight.has(room.code)) return "Solo room reset is in progress.";
    const binding = boundRoom(room.code);
    if (!binding) return null;
    if (binding.match.resetPendingAt !== null) {
      return "Solo room reset is pending durable recovery.";
    }
    try {
      if (room.createdAt !== binding.match.roomCreatedAt ||
          !binding.match.homeAccountId || !binding.match.awayAccountId) {
        throw new SoloTournamentError(409, "Bound Solo match room was replaced.");
      }
      validateSoloRoom(room, binding.match.homeAccountId, binding.match.awayAccountId);
      return null;
    } catch(error) {
      return error instanceof Error ? error.message : "Solo tournament room validation failed.";
    }
  }

  /**
   * Only a live server-owned Mega Board GameState can settle a linked Solo match.
   * This is intentionally NOT an HTTP route; duplicative finish emissions are
   * idempotent, while a mismatching later game/replay is rejected.
   */
  function recordFinishedGame(room: GameRoom, state: GameState): Promise<SoloTournament | null> {
    return change(current => {
      let tournament: SoloTournament | null = null;
      let matching: SoloTournamentMatch | null = null;
      for (const candidate of current.values()) {
        if (candidate.status !== "seeded" && candidate.status !== "completed") continue;
        const m=candidate.matches.find(row =>
          (row.status === "room-bound" || row.status === "completed") &&
          row.roomCode === room.code && row.roomCreatedAt === room.createdAt);
        if (m) {
          tournament=candidate;
          matching=m;
          break;
        }
      }
      if (!tournament || !matching) return { next: current, value: null };
      if (matching.resetPendingAt !== null) {
        throw new SoloTournamentError(409, "A pending Solo room reset cannot record a winner.");
      }
      if (megaRooms.get(room.code) !== room || room.gameState !== state || !room.started ||
          room.ranked || room.blitz || room.betaTournamentTest ||
          state.phase !== "finished" || !state.winnerId ||
          state.roomCode !== room.code ||
          !Number.isSafeInteger(state.gameStartedAt) ||
          state.gameStartedAt < room.createdAt ||
          room.players.length !== 2 || state.players.length !== 2 ||
          !matching.homeAccountId || !matching.awayAccountId ||
          room.players.some(seat => seat.isAi || !seat.replayAccountId ||
            (seat.replayAccountId !== matching!.homeAccountId &&
             seat.replayAccountId !== matching!.awayAccountId)) ||
          new Set(room.players.map(seat=>seat.replayAccountId)).size !== 2 ||
          state.players.some(player => player.isAi ||
            !room.players.some(seat => seat.id === player.id)) ||
          new Set(state.players.map(player=>player.id)).size !== 2) {
        throw new SoloTournamentError(409, "Completed Solo match does not match its original server-owned room and accounts.");
      }
      const seat=room.players.find(row=>row.id === state.winnerId);
      const winner=seat?.replayAccountId;
      if (!winner || (winner !== matching.homeAccountId && winner !== matching.awayAccountId)) {
        throw new SoloTournamentError(409, "Solo winner is not an original registered human seat.");
      }
      if (matching.status === "completed") {
        if (matching.winnerAccountId !== winner ||
            matching.gameStartedAt !== state.gameStartedAt ||
            !matching.boardMatchId) {
          throw new SoloTournamentError(409, "Previously recorded Solo result is immutable.");
        }
        return { next: current, value: tournament };
      }
      if (tournament.status !== "seeded") {
        throw new SoloTournamentError(409, "Completed tournament cannot accept another result.");
      }
      const completedAt=Date.now();
      const receipt: SoloTournamentMatch = {
        ...matching,status:"completed",winnerAccountId:winner,
        gameStartedAt:state.gameStartedAt,completedAt,
        resetApprovedAccountIds:[],resetRequestedAt:null,resetPendingAt:null,
      };
      let nextMatches=tournament.matches.map(row=>row.id === receipt.id ? receipt : row);
      const semi1=nextMatches.find(row=>row.id === "semi-1")!;
      const semi2=nextMatches.find(row=>row.id === "semi-2")!;
      if (semi1.status === "completed" && semi2.status === "completed" &&
          matching.id !== "final") {
        const verifiedFinal=match("final",semi1.winnerAccountId,semi2.winnerAccountId);
        nextMatches=nextMatches.map(row=>row.id === "final" ? verifiedFinal : row);
      }
      const finishedFinal=receipt.id === "final";
      const updated: SoloTournament = {
        ...tournament, matches:nextMatches,
        status: finishedFinal ? "completed" : "seeded",
        championAccountId: finishedFinal ? winner : null,
        updatedAt:completedAt,
      };
      const next=new Map(current);next.set(tournament.id,updated);
      return {next,value:updated};
    });
  }

  function cancel(accountId: string, id: string) {
    return change(current => {
      const tournament=current.get(id);
      if (!tournament) throw new SoloTournamentError(404, "Solo tournament not found.");
      if (tournament.hostAccountId !== accountId) throw new SoloTournamentError(403, "Only the host may cancel.");
      if (tournament.status === "cancelled") throw new SoloTournamentError(409, "Tournament already cancelled.");
      if (tournament.matches.some(row => row.status === "room-bound" || row.status === "completed")) {
        throw new SoloTournamentError(409, "A played or bound Solo match cannot be cancelled without verified recovery.");
      }
      const update: SoloTournament={...tournament,status:"cancelled",updatedAt:Date.now()};
      const next=new Map(current);next.set(id,update);
      return {next,value:update};
    });
  }
  function isResetClosing(code: string) {
    const binding = boundRoom(code);
    return resetInFlight.has(code) && binding?.match.resetPendingAt !== null;
  }
  return { load, visible, create, join, leave, seed, bindRoom, approvePrestartReset, reconcilePendingPrestartResets, boundRoom, startBlock, isResetClosing, recordFinishedGame, cancel };
}
// One shared live coordinator; HTTP, game:start and join protection must agree.
let liveSoloCoordinator: ReturnType<typeof createSoloTournamentRegistrationCoordinator> | null = null;
export function getSoloTournamentBoundRoom(code: string) {
  return liveSoloCoordinator?.boundRoom(code) ?? null;
}
export function getSoloTournamentStartBlock(room: GameRoom) {
  return liveSoloCoordinator?.startBlock(room) ?? null;
}
export function isSoloPrestartResetClosing(code: string) {
  return liveSoloCoordinator?.isResetClosing(code) === true;
}
export async function reconcileSoloTournamentPendingResets() {
  return liveSoloCoordinator?.reconcilePendingPrestartResets() ?? 0;
}
export async function loadSoloTournamentRegistration() {
  await liveSoloCoordinator?.load();
}
/** Verified real game state, never a user-submitted tournament winner. */
export function recordFinishedSoloTournamentBoard(room: GameRoom, state: GameState) {
  return liveSoloCoordinator?.recordFinishedGame(room,state) ?? Promise.resolve(null);
}
type AccountResolver = (request:Request)=>HalieusAccountSummary|null;

/** Feature flag is enforced at startup; never exposed on production by default. */
export function registerSoloTournamentRegistrationRoutes(app:Express, authenticate:AccountResolver) {
  // Same coordinator is read by live lobby/AI/start/reconnect guards.
  const coordinator=liveSoloCoordinator ?? createSoloTournamentRegistrationCoordinator();
  liveSoloCoordinator = coordinator;
  const handler=(action:(r:Request, id:string)=>Promise<unknown>|unknown)=>
    async (request:Request,response:Response)=>{
      const account=authenticate(request);
      if (!account) {response.status(401).json({ok:false,reason:"Sign in first."});return;}
      if (request.method!=="GET") {
        if(!request.is("application/json")) {
          response.status(415).json({ok:false,reason:"JSON required."});return;
        }
        const origin=request.get("origin");
        if(origin) {
          let match=false;
          try {const url=new URL(origin);match=url.protocol==="https:"||url.protocol==="http:";match=match && url.host===request.get("host");}
          catch{match=false;}
          if(!match){response.status(403).json({ok:false,reason:"Cross-site tournament changes are forbidden."});return;}
        }
      }
      try {
        await coordinator.load();
        const result=await action(request,account.id);
        response.json({ok:true,tournament:result});
      } catch(error) {
        response.status(error instanceof SoloTournamentError ? error.statusCode : 503)
          .json({ok:false,reason:error instanceof SoloTournamentError ? error.message:"Solo registration store unavailable."});
      }
    };
  app.get("/tournaments/solo",handler((_r,account)=>coordinator.visible(account)));
  app.post("/tournaments/solo",handler((r,a)=>coordinator.create(a,r.body?.name)));
  app.post("/tournaments/solo/:id/join",handler((r,a)=>coordinator.join(a,String(r.params.id))));
  app.post("/tournaments/solo/:id/leave",handler((r,a)=>coordinator.leave(a,String(r.params.id))));
  app.post("/tournaments/solo/:id/seed",handler((r,a)=>coordinator.seed(a,String(r.params.id))));
  app.post("/tournaments/solo/:id/matches/:matchId/bind-room",
    handler((r,a)=>coordinator.bindRoom(a,String(r.params.id),String(r.params.matchId),r.body?.roomCode)));
  app.post("/tournaments/solo/:id/matches/:matchId/approve-prestart-reset",
    handler((r,a)=>coordinator.approvePrestartReset(a,String(r.params.id),String(r.params.matchId))));
  app.post("/tournaments/solo/:id/cancel",handler((r,a)=>coordinator.cancel(a,String(r.params.id))));
}
