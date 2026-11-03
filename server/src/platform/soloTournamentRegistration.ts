import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import { getMegaBoardDataDirectory } from "./dataPaths.js";
import type { GameRoom } from "../games/mega-board/types/game.js";
import { rooms as megaRooms } from "../games/mega-board/state/rooms.js";
import { getGuildFixtureBoundRoom } from "./guildFixtures.js";

/**
 * Source-only first Solo tournament slice. No fixture linking, winners, rating
 * payouts, or route activation in production is implied by registration.
 */
export type SoloTournamentStatus = "registration" | "seeded" | "cancelled";
export type SoloMatchStatus = "awaiting-room" | "awaiting-opponents" | "room-bound";
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
  winnerAccountId: null;
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
  matches: SoloTournamentMatch[];
}
type Store = { version: 1; tournaments: SoloTournament[] };
const MAX_TOURNAMENTS = 500;
const MAX_OPEN_PER_HOST = 5;

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
  const boundCodes = new Set<string>();
  const boundMatchIds = new Set<string>();
  for (const t of value.tournaments) {
    if (!t || typeof t.id !== "string" || !t.id || ids.has(t.id) ||
        t.game !== "mega-board" || t.format !== "four-player-single-elimination" ||
        typeof t.name !== "string" || t.name.length < 3 || t.name.length > 70 ||
        !validAccountId(t.hostAccountId) || !Array.isArray(t.entrantAccountIds) ||
        t.entrantAccountIds.length < 1 || t.entrantAccountIds.length > 4 ||
        t.entrantAccountIds[0] !== t.hostAccountId ||
        t.entrantAccountIds.some(id => !validAccountId(id)) ||
        new Set(t.entrantAccountIds).size !== t.entrantAccountIds.length ||
        !["registration", "seeded", "cancelled"].includes(t.status) ||
        !Number.isSafeInteger(t.createdAt) || !Number.isSafeInteger(t.updatedAt) ||
        !Array.isArray(t.matches)) {
      throw new Error("Malformed Solo tournament; refusing to overwrite.");
    }
    if (t.status === "seeded" || (t.status === "cancelled" && t.matches.length === 3)) {
      const expectedIds = ["semi-1", "semi-2", "final"];
      if (t.entrantAccountIds.length !== 4 ||
          !Number.isSafeInteger(t.startedAt) || t.startedAt! < t.createdAt ||
          t.matches.length !== 3 ||
          t.matches.some((m, i) => {
            if (!m || m.id !== expectedIds[i] ||
                m.round !== (i === 2 ? "final" : "semifinal") ||
                m.winnerAccountId !== null) return true;
            if (m.status === "room-bound") {
              if (i === 2 || t.status !== "seeded" ||
                  typeof m.roomCode !== "string" || !/^[A-Z0-9]{4,12}$/.test(m.roomCode) ||
                  !Number.isSafeInteger(m.roomCreatedAt) || m.roomCreatedAt! <= 0 ||
                  typeof m.boardMatchId !== "string" ||
                  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(m.boardMatchId) ||
                  boundCodes.has(m.roomCode) || boundMatchIds.has(m.boardMatchId)) return true;
              boundCodes.add(m.roomCode);
              boundMatchIds.add(m.boardMatchId);
              return false;
            }
            return m.roomCode != null || m.roomCreatedAt != null ||
              m.boardMatchId != null ||
              m.status !== (i === 2 ? "awaiting-opponents" : "awaiting-room");
          })) {
        throw new Error("Invalid seeded Solo bracket; refusing to overwrite.");
      }
      const [a,b,c,d] = t.entrantAccountIds;
      if (t.matches[0].homeAccountId !== a || t.matches[0].awayAccountId !== d ||
          t.matches[1].homeAccountId !== b || t.matches[1].awayAccountId !== c ||
          t.matches[2].homeAccountId !== null || t.matches[2].awayAccountId !== null) {
        throw new Error("Seed order mismatch; refusing to overwrite.");
      }
    } else if (t.matches.length || t.startedAt !== null) {
      throw new Error("Unstarted Solo tournament must have no matches or winners.");
    }
    ids.add(t.id);
  }
}
function match(id: SoloTournamentMatch["id"], a: string | null, b: string | null): SoloTournamentMatch {
  return {
    id, round: id === "final" ? "final" : "semifinal",
    homeAccountId: a, awayAccountId: b,
    roomCode: null, roomCreatedAt: null, boardMatchId: null, winnerAccountId: null,
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
    validateStore(doc);
    // Previous alpha stores have no room identity until a real match is bound.
    for (const tournament of doc.tournaments) {
      for (const match of tournament.matches) {
        if (match.status !== "room-bound") {
          match.roomCreatedAt ??= null;
          match.boardMatchId ??= null;
        }
      }
    }
    tournaments = new Map(doc.tournaments.map(t => [t.id, t]));
    loaded = true;
  }
  function ensureLoaded() {
    if (!loaded) throw new SoloTournamentError(503, "Solo tournament registration is unavailable.");
  }
  function change<T>(mutation: (current: Map<string, SoloTournament>) =>
    { next: Map<string, SoloTournament>; value: T }): Promise<T> {
    const task = pending.then(async () => {
      ensureLoaded();
      const { next, value } = mutation(tournaments);
      if (next !== tournaments) {
        const dir = dirname(path);
        await mkdir(dir, { recursive: true });
        const temp = path + "." + randomUUID() + ".tmp";
        await writeFile(temp,
          JSON.stringify({ version: 1, tournaments: [...next.values()] }, null, 2),
          { encoding: "utf8", mode: 0o600 });
        await rename(temp, path);
        tournaments = next;
      }
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
        createdAt:now, updatedAt:now, startedAt:null, matches:[],
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
      if (tournament.status !== "seeded" || !["semi-1", "semi-2"].includes(matchId)) {
        throw new SoloTournamentError(409, "Only seeded semifinals can bind live rooms.");
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
    const binding = boundRoom(room.code);
    if (!binding) return null;
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

  function cancel(accountId: string, id: string) {
    return change(current => {
      const tournament=current.get(id);
      if (!tournament) throw new SoloTournamentError(404, "Solo tournament not found.");
      if (tournament.hostAccountId !== accountId) throw new SoloTournamentError(403, "Only the host may cancel.");
      if (tournament.status === "cancelled") throw new SoloTournamentError(409, "Tournament already cancelled.");
      if (tournament.matches.some(row => row.status === "room-bound")) {
        throw new SoloTournamentError(409, "A bound Solo match cannot be cancelled while its original lobby is locked.");
      }
      const update: SoloTournament={...tournament,status:"cancelled",updatedAt:Date.now()};
      const next=new Map(current);next.set(id,update);
      return {next,value:update};
    });
  }
  return { load, visible, create, join, leave, seed, bindRoom, boundRoom, startBlock, cancel };
}
// One shared live coordinator; HTTP, game:start and join protection must agree.
let liveSoloCoordinator: ReturnType<typeof createSoloTournamentRegistrationCoordinator> | null = null;
export function getSoloTournamentBoundRoom(code: string) {
  return liveSoloCoordinator?.boundRoom(code) ?? null;
}
export function getSoloTournamentStartBlock(room: GameRoom) {
  return liveSoloCoordinator?.startBlock(room) ?? null;
}
export async function loadSoloTournamentRegistration() {
  await liveSoloCoordinator?.load();
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
  app.post("/tournaments/solo/:id/cancel",handler((r,a)=>coordinator.cancel(a,String(r.params.id))));
}
