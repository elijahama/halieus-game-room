import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import type { HgrGuildBoardLineups, HgrGuildFixture, HgrGuildFixtureBoardLink, HgrGuildFixtureBoardResult } from "../../../shared/platform/guildFixtures.js";
import type { GameState } from "../../../shared/games/mega-board/game-state.js";
import { rooms as megaRooms } from "../games/mega-board/state/rooms.js";
import type { GameRoom } from "../games/mega-board/types/game.js";
import { getSoloTournamentBoundRoom } from "./soloTournamentRegistration.js";
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
  if (room.ranked || room.blitz || room.betaTournamentTest) {
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
function isTiedFixture(f: HgrGuildFixture): boolean {
  return f.status === "completed" && f.boardResults?.length === 2 &&
    f.boardResults.filter(row=>row.winnerGuildId===f.homeGuildId).length===1 &&
    f.boardResults.filter(row=>row.winnerGuildId===f.awayGuildId).length===1;
}
function allFixtureBoards(f: HgrGuildFixture): HgrGuildFixtureBoardLink[] {
  return [...(f.boards ?? []), ...(f.tiebreaker?.board ? [f.tiebreaker.board] : [])];
}
function ensureValidDocument(raw: unknown): asserts raw is Document {
  if (!raw || typeof raw !== "object" || (raw as Document).version !== 1 ||
      !Array.isArray((raw as Document).fixtures)) throw new Error("Unsupported fixture store format");
  const seen = new Set<string>();
  for (const row of (raw as Document).fixtures) {
    if (!row || typeof row.id !== "string" || !row.id || seen.has(row.id) ||
        !["proposed", "lineups-locked", "rooms-bound", "completed", "cancelled"].includes(row.status) ||
        typeof row.homeGuildId !== "string" || typeof row.awayGuildId !== "string" ||
        !Array.isArray(row.homeLineups) || row.homeLineups.length !== 2) {
      throw new Error("Invalid persisted fixture record; refusing to overwrite");
    }
    if ((row.status === "rooms-bound" || row.status === "completed") && (!Array.isArray(row.boards) ||
        row.boards.length !== 2 || row.boards.some((board: HgrGuildFixtureBoardLink) =>
          typeof board.roomCode !== "string" || !Number.isSafeInteger(board.roomCreatedAt) ||
          typeof board.boardMatchId !== "string" || !Array.isArray(board.seatAccountIds)))) {
      throw new Error("Malformed bound fixture; refusing to rewrite it.");
    }
    if (row.status === "completed" && (!Array.isArray(row.boardResults) ||
        row.boardResults.length !== 2 || row.boardResults.some((result: HgrGuildFixtureBoardResult) =>
          typeof result.boardMatchId !== "string" || typeof result.winnerGuildId !== "string"))) {
      throw new Error("Completed fixture has invalid board receipts.");
    }
    if (row.tiebreaker) {
      const tie=row.tiebreaker;
      if (!isTiedFixture(row) || !row.awayLineups ||
          (tie.homeAccountId!==null && !row.homeLineups.flat().includes(tie.homeAccountId)) ||
          (tie.awayAccountId!==null && !row.awayLineups.flat().includes(tie.awayAccountId)) ||
          (tie.homeAccountId && tie.homeAccountId===tie.awayAccountId) ||
          (tie.board && (!tie.homeAccountId || !tie.awayAccountId ||
            !Array.isArray(tie.board.seatAccountIds) || tie.board.seatAccountIds.length!==2 ||
            typeof tie.board.boardMatchId!=="string" || !tie.board.boardMatchId ||
            typeof tie.board.roomCode!=="string" || !/^[A-Z0-9]{4,12}$/.test(tie.board.roomCode) ||
            !tie.board.seatAccountIds.includes(tie.homeAccountId) || !tie.board.seatAccountIds.includes(tie.awayAccountId) ||
            !Number.isSafeInteger(tie.board.roomCreatedAt) ||
            tie.board.roomCreatedAt < Math.max(...row.boardResults!.map(result=>result.completedAt)) ||
            row.boards!.some(board=>board.roomCode===tie.board!.roomCode || board.boardMatchId===tie.board!.boardMatchId))) ||
          (tie.result && (!tie.board || tie.result.boardMatchId!==tie.board.boardMatchId ||
            tie.result.roomCode!==tie.board.roomCode || tie.result.roomCreatedAt!==tie.board.roomCreatedAt ||
            !Number.isSafeInteger(tie.result.gameStartedAt) || tie.result.gameStartedAt<tie.board.roomCreatedAt ||
            !Number.isSafeInteger(tie.result.completedAt) || tie.result.completedAt<tie.result.gameStartedAt ||
            (tie.result.winnerAccountId!==tie.homeAccountId && tie.result.winnerAccountId!==tie.awayAccountId) ||
            tie.result.winnerGuildId!==(tie.result.winnerAccountId===tie.homeAccountId?row.homeGuildId:row.awayGuildId)))) {
        throw new Error("Malformed Guild deciding-game nomination or receipt.");
      }
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
      ensureValidDocument({version:1,fixtures:[...next.values()]});
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
      if (existing.status === "completed") throw new FixtureError(409, "Completed Guild fixture receipts are immutable.");
      if (existing.status === "rooms-bound") {
        const safelyUnstarted = existing.boards?.length === 2 && existing.boards.every((link) => {
          const room = megaRooms.get(link.roomCode);
          return room && room.createdAt === link.roomCreatedAt && !room.started && !room.gameState;
        });
        if (!safelyUnstarted) {
          throw new FixtureError(409, "A bound fixture may only be cancelled while both original lobbies still exist and neither has started.");
        }
      }
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
      if (codes.some(code => boundRoom(code) || getSoloTournamentBoundRoom(code))) {
        throw new FixtureError(409, "A room already belongs to a tournament match.");
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
  async function nominateTiebreaker(accountId: string, fixtureId: string, guildId: string,
    nominee: unknown, guild: GuildLookup) {
    return transact(current => {
      const f = current.get(fixtureId);
      if (!f || !isTiedFixture(f)) throw new FixtureError(409, "A verified 1–1 fixture is required.");
      if (guildId !== f.homeGuildId && guildId !== f.awayGuildId) throw new FixtureError(403, "Choose your participating Guild.");
      const roster = guild(guildId); ensureManager(roster, accountId);
      if (f.tiebreaker?.board || f.tiebreaker?.result) throw new FixtureError(409, "The deciding game's nominees are locked.");
      const original = guildId === f.homeGuildId ? f.homeLineups.flat() : f.awayLineups!.flat();
      if (typeof nominee !== "string" || !original.includes(nominee) || !roster.memberIds.includes(nominee)) {
        throw new FixtureError(400, "Nominate a current Guild member from this fixture's original lineup.");
      }
      const tiebreaker = { homeAccountId:null, awayAccountId:null, board:null, result:null, ...f.tiebreaker,
        [guildId === f.homeGuildId ? "homeAccountId" : "awayAccountId"]: nominee };
      const updated = { ...f, tiebreaker, updatedAt:Date.now() };
      const next = new Map(current); next.set(fixtureId,updated);
      return {next,value:updated};
    });
  }
  async function bindTiebreaker(accountId: string, fixtureId: string, suppliedCode: unknown, guild: GuildLookup) {
    return transact(current => {
      const f = current.get(fixtureId);
      if (!f || !isTiedFixture(f) || !f.tiebreaker?.homeAccountId || !f.tiebreaker.awayAccountId) {
        throw new FixtureError(409, "Both Guild managers must nominate an original player first.");
      }
      const home=guild(f.homeGuildId), away=guild(f.awayGuildId);
      if (!home || !away || (!home.managerIds.includes(accountId) && !away.managerIds.includes(accountId))) {
        throw new FixtureError(403, "Only a participating Guild manager may link the deciding game.");
      }
      const tie=f.tiebreaker;
      if (tie.board || tie.result) throw new FixtureError(409, "The deciding game is already linked.");
      if (!home.memberIds.includes(tie.homeAccountId!) || !away.memberIds.includes(tie.awayAccountId!)) {
        throw new FixtureError(409, "Both nominees must still belong to their original Guilds.");
      }
      const code=roomCode(suppliedCode), room=megaRooms.get(code);
      if (!room || room.started || room.gameState || !Number.isSafeInteger(room.createdAt) ||
          room.createdAt < Math.max(...f.boardResults!.map(result=>result.completedAt)) ||
          f.boards!.some(board=>board.roomCode===code) || boundRoom(code) || getSoloTournamentBoundRoom(code)) {
        throw new FixtureError(409, "Use a fresh, unstarted and unassigned Mega Board room for the decider.");
      }
      const board={roomCode:code,roomCreatedAt:room.createdAt,boardMatchId:randomUUID(),
        seatAccountIds:[tie.homeAccountId!,tie.awayAccountId!]};
      validateRealBoardRoom(room,board);
      const updated={...f,tiebreaker:{...tie,board},updatedAt:Date.now()};
      const next=new Map(current);next.set(fixtureId,updated);
      return {next,value:updated};
    });
  }
  /** Real completed-game receipt; zero manual API for posting results. */
  async function recordFinishedGame(room: GameRoom, state: GameState): Promise<HgrGuildFixture | null> {
    return transact((current) => {
      const fixture = [...current.values()].find((row) =>
        (row.status === "rooms-bound" || row.status === "completed") && allFixtureBoards(row).some((link) => link.roomCode === room.code && link.roomCreatedAt === room.createdAt));
      if (!fixture?.boards || !fixture.awayLineups) return { next: current, value: null };
      const isDecider=fixture.tiebreaker?.board?.roomCode===room.code &&
        fixture.tiebreaker.board.roomCreatedAt===room.createdAt;
      const existingResult=isDecider ? fixture.tiebreaker!.result :
        fixture.boardResults?.find(row=>row.roomCode===room.code && row.roomCreatedAt===room.createdAt);
      const boardIndex=fixture.boards.findIndex(link=>link.roomCode===room.code && link.roomCreatedAt===room.createdAt);
      const link=isDecider?fixture.tiebreaker!.board!:fixture.boards[boardIndex]!;
      if (fixture.status==="completed" && !isDecider && !existingResult) {
        throw new FixtureError(409,"Completed fixture cannot accept another game receipt.");
      }
      if (room !== megaRooms.get(room.code) || room.createdAt !== link.roomCreatedAt ||
          !room.started || room.gameState !== state || room.betaTournamentTest || room.ranked || room.blitz ||
          state.phase !== "finished" || !state.winnerId || state.roomCode !== room.code ||
          !Number.isSafeInteger(state.gameStartedAt) || state.gameStartedAt < room.createdAt ||
          state.players.length !== room.players.length || state.players.length !== link.seatAccountIds.length) {
        throw new FixtureError(409, "Completed board identity or lifecycle does not match its locked fixture.");
      }
      const actualIds = new Set<string>();
      const placements = state.players.map((player) => {
        const seat = room.players.find((entry) => entry.id === player.id);
        const accountId = seat?.replayAccountId;
        if (!accountId || actualIds.has(accountId) || !link.seatAccountIds.includes(accountId) ||
            player.isAi || seat?.isAi) {
          throw new FixtureError(409, "Completed board contains an unregistered, duplicate or AI seat.");
        }
        actualIds.add(accountId);
        const guildId = isDecider
          ? accountId===fixture.tiebreaker!.homeAccountId?fixture.homeGuildId:
            accountId===fixture.tiebreaker!.awayAccountId?fixture.awayGuildId:null
          : fixture.homeLineups[boardIndex]!.includes(accountId) ? fixture.homeGuildId :
            fixture.awayLineups![boardIndex]!.includes(accountId) ? fixture.awayGuildId : null;
        if (!guildId) throw new FixtureError(409, "Completed board contains an unregistered guild.");
        const position = player.id === state.winnerId ? 1
          : state.playerStats?.[player.id]?.finishPosition ?? state.players.length;
        if (!Number.isSafeInteger(position) || position < 1 || position > state.players.length) {
          throw new FixtureError(409, "Invalid finish position from actual game.");
        }
        return { accountId, guildId, finishPosition: position };
      });
      if (actualIds.size !== link.seatAccountIds.length ||
          !link.seatAccountIds.every((id) => actualIds.has(id))) {
        throw new FixtureError(409, "Finished game roster no longer matches locked lineup.");
      }
      const winningSeat = room.players.find((seat) => seat.id === state.winnerId);
      const winnerAccountId = winningSeat?.replayAccountId;
      const winner = placements.find((entry) => entry.accountId === winnerAccountId);
      if (!winner || !winnerAccountId) throw new FixtureError(409, "Winner is not a registered guild seat.");
      if (existingResult) {
        if (existingResult.winnerAccountId!==winnerAccountId || existingResult.winnerGuildId!==winner.guildId ||
            existingResult.gameStartedAt!==state.gameStartedAt || existingResult.boardMatchId!==link.boardMatchId) {
          throw new FixtureError(409,"Previously recorded Guild result is immutable.");
        }
        return {next:current,value:fixture};
      }
      const result: HgrGuildFixtureBoardResult = {
        boardMatchId: link.boardMatchId, roomCode: link.roomCode,
        roomCreatedAt: link.roomCreatedAt, gameStartedAt: state.gameStartedAt,
        winnerAccountId, winnerGuildId: winner.guildId,
        completedAt: Date.now(), placements,
      };
      if (isDecider) {
        const updated={...fixture,tiebreaker:{...fixture.tiebreaker!,result},updatedAt:Date.now()};
        const next=new Map(current);next.set(fixture.id,updated);
        return {next,value:updated};
      }
      const boardResults = [...(fixture.boardResults ?? []), result];
      const updated: HgrGuildFixture = {
        ...fixture, boardResults, updatedAt: Date.now(),
        status: boardResults.length === 2 ? "completed" : "rooms-bound",
        homeBoardWins: boardResults.filter((row) => row.winnerGuildId === fixture.homeGuildId).length,
        awayBoardWins: boardResults.filter((row) => row.winnerGuildId === fixture.awayGuildId).length,
      };
      const next = new Map(current);
      next.set(updated.id, updated);
      return { next, value: updated };
    });
  }
  function boundRoom(code: string): { fixtureId: string; link: HgrGuildFixtureBoardLink } | null {
    if (!loaded) return null;
    for (const fixture of fixtures.values()) {
      const pendingDecider=fixture.tiebreaker?.board && !fixture.tiebreaker.result;
      const link = pendingDecider && fixture.tiebreaker!.board!.roomCode===code ? fixture.tiebreaker!.board :
        fixture.status==="rooms-bound" ? fixture.boards?.find(board=>board.roomCode===code &&
          !fixture.boardResults?.some(result=>result.boardMatchId===board.boardMatchId)) : null;
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
  function getForTournament(id: string): HgrGuildFixture | null {
    if (!loaded) return null;
    const fixture = fixtures.get(id);
    return fixture ? structuredClone(fixture) : null;
  }
  return { load, propose, accept, bindRooms, nominateTiebreaker, bindTiebreaker, recordFinishedGame, boundRoom, cancel, list, getForTournament };
}
const coordinator = createGuildFixtureCoordinator();
let liveGuildLookup: GuildLookup | null = null;
export const loadGuildFixtures = () => coordinator.load();
/** Bracket settlement reads only existing authenticated, durable two-board receipts.
 * This internal lookup is never an unauthenticated HTTP result. */
export const getGuildFixtureForTournament = (id: string) => coordinator.getForTournament(id);
/** Read-only lobby guards; regular non-fixture games remain unchanged. */
export function getGuildFixtureBoundRoom(code: string) { return coordinator.boundRoom(code); }
export function recordFinishedGuildFixtureBoard(room: GameRoom, state: GameState) {
  return coordinator.recordFinishedGame(room, state);
}
export function getGuildFixtureStartBlock(room: GameRoom): string | null {
  const binding = coordinator.boundRoom(room.code);
  if (!binding) return null;
  try {
    validateRealBoardRoom(room, binding.link);
    const fixture=coordinator.getForTournament(binding.fixtureId);
    const home=fixture && liveGuildLookup?.(fixture.homeGuildId);
    const away=fixture && liveGuildLookup?.(fixture.awayGuildId);
    if(!fixture || !home || !away) throw new FixtureError(409,"Guild membership is unavailable. Retry before starting.");
    for(const accountId of binding.link.seatAccountIds) {
      const roster=fixture.homeLineups.flat().includes(accountId)?home:away;
      if(!roster.memberIds.includes(accountId)) throw new FixtureError(409,"A locked player no longer belongs to their original Guild.");
    }
    return null;
  }
  catch (error) { return error instanceof Error ? error.message : "Fixture room validation failed."; }
}

export function registerGuildFixtureRoutes(app: Express, resolveAccount: AccountLookup, guild: GuildLookup) {
  liveGuildLookup=guild;
  const run = (handler: (request: Request, account: HalieusAccountSummary) => Promise<unknown> | unknown) =>
    async (request: Request, response: Response) => {
      response.setHeader("Cache-Control","no-store");
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
  app.post("/guild-fixtures/:fixtureId/tiebreaker/nominate", run((r,a) =>
    coordinator.nominateTiebreaker(a.id,String(r.params.fixtureId),r.body?.guildId,r.body?.accountId,guild)));
  app.post("/guild-fixtures/:fixtureId/tiebreaker/bind-room", run((r,a) =>
    coordinator.bindTiebreaker(a.id,String(r.params.fixtureId),r.body?.roomCode,guild)));
  app.post("/guild-fixtures/:fixtureId/cancel", run((r, a) => coordinator.cancel(a.id, String(r.params.fixtureId), guild)));
}
