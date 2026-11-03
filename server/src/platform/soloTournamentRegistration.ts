import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import { getMegaBoardDataDirectory } from "./dataPaths.js";

/**
 * Source-only first Solo tournament slice. No fixture linking, winners, rating
 * payouts, or route activation in production is implied by registration.
 */
export type SoloTournamentStatus = "registration" | "seeded" | "cancelled";
export type SoloMatchStatus = "awaiting-room" | "awaiting-opponents";
export interface SoloTournamentMatch {
  id: "semi-1" | "semi-2" | "final";
  round: "semifinal" | "final";
  homeAccountId: string | null;
  awayAccountId: string | null;
  roomCode: null;
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
          t.matches.some((m, i) => m.id !== expectedIds[i] ||
            m.round !== (i === 2 ? "final" : "semifinal") ||
            m.roomCode !== null || m.winnerAccountId !== null ||
            m.status !== (i === 2 ? "awaiting-opponents" : "awaiting-room"))) {
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
    roomCode: null, winnerAccountId: null,
    status: a && b ? "awaiting-room" : "awaiting-opponents",
  };
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
  function cancel(accountId: string, id: string) {
    return change(current => {
      const tournament=current.get(id);
      if (!tournament) throw new SoloTournamentError(404, "Solo tournament not found.");
      if (tournament.hostAccountId !== accountId) throw new SoloTournamentError(403, "Only the host may cancel.");
      // No real matches are bindable in this first slice.
      if (tournament.status === "cancelled") throw new SoloTournamentError(409, "Tournament already cancelled.");
      const update: SoloTournament={...tournament,status:"cancelled",updatedAt:Date.now()};
      const next=new Map(current);next.set(id,update);
      return {next,value:update};
    });
  }
  return { load, visible, create, join, leave, seed, cancel };
}
type AccountResolver = (request:Request)=>HalieusAccountSummary|null;

/** Feature flag is enforced at startup; never exposed on production by default. */
export function registerSoloTournamentRegistrationRoutes(app:Express, authenticate:AccountResolver) {
  const coordinator=createSoloTournamentRegistrationCoordinator();
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
  app.post("/tournaments/solo/:id/cancel",handler((r,a)=>coordinator.cancel(a,String(r.params.id))));
}
