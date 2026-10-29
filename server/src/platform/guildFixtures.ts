import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import type { HgrGuildBoardLineups, HgrGuildFixture, HgrGuildFixtureBoardLink } from "../../../shared/platform/guildFixtures.js";
import { rooms as megaRooms } from "../games/mega-board/state/rooms.js";
import type { GameRoom } from "../games/mega-board/types/game.js";
import { getGuildDataDirectory } from "./dataPaths.js";

export interface GuildFixtureAuthority { id: string; memberIds: string[]; managerIds: string[] }
type GuildLookup = (guildId: string) => GuildFixtureAuthority | null;
type AccountLookup = (request: Request) => HalieusAccountSummary | null;
type Document = { version: 1; fixtures: HgrGuildFixture[] };
export class FixtureError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}

function validateLineups(input: unknown, roster: GuildFixtureAuthority): HgrGuildBoardLineups {
  if (!Array.isArray(input) || input.length !== 2) throw new FixtureError(400, "Exactly two board lineups are required.");
  const seen = new Set<string>();
  const allowed = new Set(roster.memberIds);
  return input.map((side: unknown) => {
    if (!Array.isArray(side) || side.length < 1 || side.length > 7) {
      throw new FixtureError(400, "Each board must have one to seven teammates from this guild.");
    }
    return side.map((id: unknown) => {
      if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) {
        throw new FixtureError(400, "Lineup contains an ineligible or repeated guild member.");
      }
      seen.add(id);
      return id;
    });
  }) as HgrGuildBoardLineups;
}
function ensureManager(roster: GuildFixtureAuthority | null, accountId: string): asserts roster is GuildFixtureAuthority {
  if (!roster || !roster.managerIds.includes(accountId)) throw new FixtureError(403, "A guild owner or admin must approve this fixture.");
}
/** The server-owned actual seat roster must equal the locked two-Guild roster. */
function validateRealBoardRoom(room: GameRoom | undefined, link: HgrGuildFixtureBoardLink): void {
  if (!room || room.code !== link.roomCode || room.createdAt !== link.roomCreatedAt) {
    throw new FixtureError(409, "The bound Mega Board lobby is missing or was replaced.");
  }
  if (room.ranked || room.blitz) {
    throw new FixtureError(409, "Guild fixtures require ordinary, independent Mega Board economy rules.");
  }
  if (room.players.length < 2 || room.players.length > 8 ||
      room.players.length !== link.seatAccountIds.length ||
      room.players.some((seat) => seat.isAi || seat.hasLeft || !seat.isConnected || !seat.replayAccountId)) {
    throw new FixtureError(409, "A fixture board needs every verified human participant connected.");
  }
  const actual = room.players.map((seat) => seat.replayAccountId!);
  const expected = link.seatAccountIds;
  if (new Set(actual).size !== actual.length || new Set(expected).size !== expected.length ||
      actual.some((id) => !expected.includes(id))) {
    throw new FixtureError(409, "The actual room roster does not match its locked Guild fixture.");
  }
}
function roomCode(input: unknown): string {
  if (typeof input !== "string") throw new FixtureError(400, "Two valid Mega Board room codes are required.");
  const code = input.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) throw new FixtureError(400, "A valid Mega Board room code is required.");
  return code;
}
function ensureValidDocument(raw: unknown): asserts raw is Document {
  if (!raw || typeof raw !== "object" || (raw as Document).version !== 1 ||
      !Array.isArray((raw as Document).fixtures)) throw new Error("Unsupported fixture store format");
  const seen = new Set<string>();
  for (const row of (raw as Document).fixtures) {
    if (!row || typeof row.id !== "string" || !row.id || seen.has(row.id) ||
        !["proposed", "lineups-locked", "rooms-bound", "cancelled"].includes(row.status) ||
        typeof row.homeGuildId !== "string" || typeof row.awayGuildId !== "string" ||
        !Array.isArray(row.homeLineups) || row.homeLineups.length !== 2) {
      throw new Error("Invalid persisted fixture record; refusing to overwrite");
    }
    if (row.status === "rooms-bound" && (!Array.isArray(row.boards) ||
        row.boards.length !== 2 || row.boards.some((board: HgrGuildFixtureBoardLink) =>
          typeof board.roomCode !== "string" || !Number.isSafeInteger(board.roomCreatedAt) ||
          typeof board.boardMatchId !== "string" || !Array.isArray(board.seatAccountIds)))) {
      throw new Error("Malformed bound fixture; refusing to rewrite it.");
    }
    seen.add(row.id);
  }
}
/** Persisted fixture proposals; never creates games or credits tournament rating. */
export function createGuildFixtureCoordinator(
  filePath = resolve(getGuildDataDirectory(), "mega-guild-fixtures.json"),
) {
  let fixtures = new Map<string, HgrGuildFixture>();
  let loaded = false;
  let operations: Promise<unknown> = Promise.resolve();
  async function load() {
    if (loaded) return;
    let doc: Document;
    try { doc = JSON.parse(await readFile(filePath, "utf8")) as Document; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") { loaded = true; return; }
      throw error;
    }
    ensureValidDocument(doc);
    fixtures = new Map(doc.fixtures.map((row) => [row.id, row]));
    loaded = true;
  }
  function transact<T>(change: (current: Map<string, HgrGuildFixture>) => { next: Map<string, HgrGuildFixture>; value: T }): Promise<T> {
    const action = operations.then(async () => {
      if (!loaded) throw new Error("Fixture coordinator must load before mutation.");
      const { next, value } = change(fixtures);
      await mkdir(dirname(filePath), { recursive: true });
      const temporary = filePath + "." + randomUUID() + ".tmp";
      await writeFile(temporary, JSON.stringify({ version: 1, fixtures: [...next.values()] }, null, 2), { encoding: "utf8", mode: 0o600 });
      await rename(temporary, filePath);
      fixtures = next;
      return structuredClone(value);
    });
    operations = action.then(() => undefined, () => undefined);
    return action;
  }
  async function propose(accountId: string, homeGuildId: string, awayGuildId: string, raw: unknown, guild: GuildLookup) {
    return transact((current) => {
      if (!homeGuildId || !awayGuildId || homeGuildId === awayGuildId) throw new FixtureError(400, "Choose two different guilds.");
      const home = guild(homeGuildId), away = guild(awayGuildId);
      ensureManager(home, accountId);
      if (!away) throw new FixtureError(404, "Opposing guild was not found.");
      const homeLineups = validateLineups(raw, home);
      const now = Date.now();
      const fixture: HgrGuildFixture = {
        id: randomUUID(), game: "mega-board", homeGuildId, awayGuildId,
        proposedByAccountId: accountId, homeLineups, awayLineups: null,
        status: "proposed", createdAt: now, updatedAt: now, lockedAt: null, cancelledAt: null,
      };
      const next = new Map(current); next.set(fixture.id, fixture);
      return { next, value: fixture };
    });
  }
  async function accept(accountId: string, fixtureId: string, raw: unknown, guild: GuildLookup) {
    return transact((current) => {
      const existing = current.get(fixtureId);
      if (!existing) throw new FixtureError(404, "Fixture not found.");
      ensureManager(guild(existing.awayGuildId), accountId);
      if (existing.status !== "proposed") throw new FixtureError(409, "Fixture is not awaiting opponent approval.");
      const away = guild(existing.awayGuildId)!;
      const home = guild(existing.homeGuildId);
      if (!home) throw new FixtureError(409, "Home guild is no longer available.");
      validateLineups(existing.homeLineups, home); // Membership can change while approval is pending.
      const awayLineups = validateLineups(raw, away);
      for (let i = 0; i < 2; i++) {
        const homeSeats = existing.homeLineups[i]!;
        const awaySeats = awayLineups[i]!;
        if (homeSeats.length + awaySeats.length > 8 ||
            homeSeats.some((id) => awaySeats.includes(id)) ||
            existing.homeLineups.flat().some((id) => awayLineups.flat().includes(id))) {
          throw new FixtureError(400, "Boards must contain 2–8 distinct people and no person can represent both teams.");
        }
      }
      const now = Date.now();
      const fixture: HgrGuildFixture = {
        ...existing, awayLineups, status: "lineups-locked", lockedAt: now, updatedAt: now,
      };
      const next = new Map(current); next.set(fixtureId, fixture);
      return { next, value: fixture };
    });
  }
  async function cancel(accountId: string, fixtureId: string, guild: GuildLookup) {
    return transact((current) => {
      const existing = current.get(fixtureId);
      if (!existing) throw new FixtureError(404, "Fixture not found.");
      const home = guild(existing.homeGuildId), away = guild(existing.awayGuildId);
      if (!home?.managerIds.includes(accountId) && !away?.managerIds.includes(accountId)) {
        throw new FixtureError(403, "A participating guild manager must cancel this fixture.");
      }
      if (existing.status === "cancelled") throw new FixtureError(409, "Fixture already cancelled.");
      if (existing.status === "rooms-bound") throw new FixtureError(409, "Bound fixture cannot be cancelled while live games may exist.");
      const now = Date.now();
      const fixture: HgrGuildFixture = { ...existing, status: "cancelled", cancelledAt: now, updatedAt: now };
      const next = new Map(current); next.set(fixtureId, fixture);
      return { next, value: fixture };
    });
  }
  async function bindRooms(accountId: string, fixtureId: string, suppliedCodes: unknown, guild: GuildLookup) {
    return transact((current) => {
      const existing = current.get(fixtureId);
      if (!existing) throw new FixtureError(404, "Fixture not found.");
      const home = guild(existing.homeGuildId), away = guild(existing.awayGuildId);
      if (!home || !away || (!home.managerIds.includes(accountId) && !away.managerIds.includes(accountId))) {
        throw new FixtureError(403, "Only a participating Guild manager can bind the boards.");
      }
      if (existing.status !== "lineups-locked" || !existing.awayLineups) {
        throw new FixtureError(409, "Approve and lock both Guild lineups before binding live rooms.");
      }
      validateLineups(existing.homeLineups, home);
      validateLineups(existing.awayLineups, away);
      if (!Array.isArray(suppliedCodes) || suppliedCodes.length !== 2) {
        throw new FixtureError(400, "Two different live Mega Board room codes are required.");
      }
      const codes = suppliedCodes.map(roomCode);
      if (codes[0] === codes[1]) throw new FixtureError(400, "The two boards must be independent rooms.");
      if ([...current.values()].some((other) => other.id !== fixtureId && other.status === "rooms-bound" &&
        other.boards?.some((board) => codes.includes(board.roomCode)))) {
        throw new FixtureError(409, "One of the rooms already belongs to a different fixture.");
      }
      const boards = codes.map((code, i): HgrGuildFixtureBoardLink => {
        const expectedIds = [...existing.homeLineups[i]!, ...existing.awayLineups![i]!];
        const room = megaRooms.get(code);
        if (!room || room.started || room.gameState) {
          throw new FixtureError(409, "Both rooms must already exist as unstarted Mega Board lobbies.");
        }
        const link: HgrGuildFixtureBoardLink = {
          roomCode: code, roomCreatedAt: room.createdAt,
          boardMatchId: randomUUID(), seatAccountIds: expectedIds,
        };
        validateRealBoardRoom(room, link);
        return link;
      }) as [HgrGuildFixtureBoardLink, HgrGuildFixtureBoardLink];
      const fixture: HgrGuildFixture = {
        ...existing, status: "rooms-bound", boards, updatedAt: Date.now(),
      };
      const next = new Map(current); next.set(fixtureId, fixture);
      return { next, value: fixture };
    });
  }
  function boundRoom(code: string): { fixtureId: string; link: HgrGuildFixtureBoardLink } | null {
    if (!loaded) return null;
    for (const fixture of fixtures.values()) {
      if (fixture.status !== "rooms-bound") continue;
      const link = fixture.boards?.find((board) => board.roomCode === code);
      if (link) return { fixtureId: fixture.id, link: structuredClone(link) };
    }
    return null;
  }
  function list(accountId: string, guild: GuildLookup) {
    if (!loaded) throw Error("Fixture coordinator not loaded.");
    return [...fixtures.values()].filter((f) =>
      guild(f.homeGuildId)?.memberIds.includes(accountId) || guild(f.awayGuildId)?.memberIds.includes(accountId))
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100).map((f) => structuredClone(f));
  }
  return { load, propose, accept, bindRooms, boundRoom, cancel, list };
}
const coordinator = createGuildFixtureCoordinator();
export const loadGuildFixtures = () => coordinator.load();
/** Read-only lobby guards; regular non-fixture games remain unchanged. */
export function getGuildFixtureBoundRoom(code: string) { return coordinator.boundRoom(code); }
export function getGuildFixtureStartBlock(room: GameRoom): string | null {
  const binding = coordinator.boundRoom(room.code);
  if (!binding) return null;
  try { validateRealBoardRoom(room, binding.link); return null; }
  catch (error) { return error instanceof Error ? error.message : "Fixture room validation failed."; }
}

export function registerGuildFixtureRoutes(app: Express, resolveAccount: AccountLookup, guild: GuildLookup) {
  const run = (handler: (request: Request, account: HalieusAccountSummary) => Promise<unknown> | unknown) =>
    async (request: Request, response: Response) => {
      const account = resolveAccount(request);
      if (!account) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
      if (request.method !== "GET") {
        if (!request.is("application/json")) { response.status(415).json({ ok: false, reason: "JSON is required." }); return; }
        const origin = request.get("origin");
        if (origin) {
          let sameOrigin = false;
          try { sameOrigin = new URL(origin).host === request.get("host"); } catch { /* rejected */ }
          if (!sameOrigin) { response.status(403).json({ ok: false, reason: "Cross-site fixture changes are forbidden." }); return; }
        }
      }
      try {
        const result = await handler(request, account);
        response.json(request.method === "GET" ? { ok: true, fixtures: result } : { ok: true, fixture: result });
      }
      catch (error) {
        response.status(error instanceof FixtureError ? error.statusCode : 503).json({
          ok: false, reason: error instanceof FixtureError ? error.message : "Fixture operation unavailable.",
        });
      }
    };
  app.get("/guild-fixtures", run((_r, account) => coordinator.list(account.id, guild)));
  app.post("/guild-fixtures", run((r, a) => coordinator.propose(a.id, r.body?.homeGuildId, r.body?.awayGuildId, r.body?.homeLineups, guild)));
  app.post("/guild-fixtures/:fixtureId/accept", run((r, a) => coordinator.accept(a.id, String(r.params.fixtureId), r.body?.awayLineups, guild)));
  app.post("/guild-fixtures/:fixtureId/bind-rooms", run((r, a) =>
    coordinator.bindRooms(a.id, String(r.params.fixtureId), r.body?.roomCodes, guild)));
  app.post("/guild-fixtures/:fixtureId/cancel", run((r, a) => coordinator.cancel(a.id, String(r.params.fixtureId), guild)));
}
