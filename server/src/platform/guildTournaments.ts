import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import type { HgrGuildFixture } from "../../../shared/platform/guildFixtures.js";
import type { HgrGuildTournament, HgrGuildTournamentMatch } from "../../../shared/platform/guildTournaments.js";
import type { GuildFixtureAuthority } from "./guildFixtures.js";
import { getGuildFixtureForTournament } from "./guildFixtures.js";
import { getGuildDataDirectory } from "./dataPaths.js";

type GuildLookup = (guildId: string) => GuildFixtureAuthority | null;
type AccountLookup = (request: Request) => HalieusAccountSummary | null;
type FixtureLookup = (fixtureId: string) => HgrGuildFixture | null;
type Store = { version: 1; tournaments: HgrGuildTournament[] };

export class TournamentError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}
function requireManager(guild: GuildFixtureAuthority | null, id: string): asserts guild is GuildFixtureAuthority {
  if (!guild || !guild.managerIds.includes(id)) throw new TournamentError(403, "A participating Guild owner or admin is required.");
}
function validateStore(raw: unknown): asserts raw is Store {
  const doc = raw as Store;
  if (!doc || doc.version !== 1 || !Array.isArray(doc.tournaments)) throw new Error("Unsupported Guild tournament store.");
  const ids = new Set<string>();
  for (const t of doc.tournaments) {
    if (!t || !t.id || ids.has(t.id) || t.game !== "mega-board" ||
        t.format !== "four-guild-knockout" || !["registration", "active", "completed", "cancelled"].includes(t.status) ||
        !Array.isArray(t.entrants) || t.entrants.length < 1 || t.entrants.length > 4 ||
        t.hostGuildId !== t.entrants[0] || new Set(t.entrants).size !== t.entrants.length ||
        !Array.isArray(t.matches) || (t.status !== "registration" && t.status !== "cancelled" && t.matches.length !== 3)) {
      throw new Error("Invalid persisted Guild tournament; refusing to overwrite.");
    }
    ids.add(t.id);
  }
}
function newMatch(id: HgrGuildTournamentMatch["id"], home: string | null, away: string | null): HgrGuildTournamentMatch {
  return { id, round: id === "final" ? "final" : "semifinal", homeGuildId: home, awayGuildId: away,
    fixtureId: null, status: home && away ? "ready" : "awaiting-teams", winnerGuildId: null };
}
function verifiedWinner(fixture: HgrGuildFixture | null, home: string, away: string, startedAt: number | null): string | null {
  if (!fixture || !startedAt || fixture.createdAt < startedAt ||
      fixture.status !== "completed" || fixture.boardResults?.length !== 2 ||
      !fixture.boards || fixture.boards.length !== 2 ||
      new Set([fixture.homeGuildId, fixture.awayGuildId]).size !== 2 ||
      ![fixture.homeGuildId, fixture.awayGuildId].includes(home) ||
      ![fixture.homeGuildId, fixture.awayGuildId].includes(away)) return null;
  const expectedBoardIds = new Set(fixture.boards.map(board => board.boardMatchId));
  const receipts = fixture.boardResults;
  if (expectedBoardIds.size !== 2 || receipts.some(row =>
      !expectedBoardIds.has(row.boardMatchId) || ![home, away].includes(row.winnerGuildId) ||
      !Number.isSafeInteger(row.gameStartedAt) || row.gameStartedAt < startedAt ||
      !Number.isSafeInteger(row.completedAt) || row.completedAt < startedAt) ||
      new Set(receipts.map(row => row.boardMatchId)).size !== 2) return null;
  const homeWins = receipts.filter(row => row.winnerGuildId === home).length;
  const awayWins = receipts.filter(row => row.winnerGuildId === away).length;
  return homeWins === 2 ? home : awayWins === 2 ? away : null; // A 1-1 result awaits an approved tiebreaker.
}

export function createGuildTournamentCoordinator(
  filePath = resolve(getGuildDataDirectory(), "mega-guild-tournaments.json"),
) {
  let tournaments = new Map<string, HgrGuildTournament>();
  let loaded = false;
  let pending: Promise<unknown> = Promise.resolve();
  async function load() {
    if (loaded) return;
    let doc: Store;
    try { doc = JSON.parse(await readFile(filePath, "utf8")) as Store; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") { loaded = true; return; }
      throw error;
    }
    validateStore(doc);
    tournaments = new Map(doc.tournaments.map(row => [row.id, row]));
    loaded = true;
  }
  function change<T>(mutate: (current: Map<string, HgrGuildTournament>) => { next: Map<string, HgrGuildTournament>; value: T }): Promise<T> {
    const task = pending.then(async () => {
      if (!loaded) throw new Error("Guild tournament store not loaded.");
      const { next, value } = mutate(tournaments);
      if (next !== tournaments) {
        await mkdir(dirname(filePath), { recursive: true });
        const temp = filePath + "." + randomUUID() + ".tmp";
        await writeFile(temp, JSON.stringify({ version: 1, tournaments: [...next.values()] }, null, 2), { encoding: "utf8", mode: 0o600 });
        await rename(temp, filePath);
        tournaments = next;
      }
      return structuredClone(value);
    });
    pending = task.then(() => undefined, () => undefined);
    return task;
  }
  function visible(accountId: string, guild: GuildLookup): HgrGuildTournament[] {
    if (!loaded) throw new Error("Guild tournaments unavailable.");
    return [...tournaments.values()].filter(t => t.entrants.some(id => guild(id)?.memberIds.includes(accountId)))
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40).map(row => structuredClone(row));
  }
  function create(accountId: string, guildId: string, name: unknown, guild: GuildLookup) {
    return change(current => {
      requireManager(guild(guildId), accountId);
      const title = typeof name === "string" ? name.trim() : "";
      if (title.length < 3 || title.length > 70) throw new TournamentError(400, "Tournament name must contain 3–70 characters.");
      const now = Date.now();
      const tournament: HgrGuildTournament = { id: randomUUID(), name: title, game: "mega-board",
        format: "four-guild-knockout", hostGuildId: guildId, entrants: [guildId], status: "registration",
        matches: [], championGuildId: null, createdAt: now, updatedAt: now, startedAt: null, completedAt: null };
      const next = new Map(current); next.set(tournament.id, tournament);
      return { next, value: tournament };
    });
  }
  function register(accountId: string, id: string, guildId: string, guild: GuildLookup) {
    return change(current => {
      requireManager(guild(guildId), accountId);
      const t = current.get(id);
      if (!t) throw new TournamentError(404, "Tournament not found or invitation has expired.");
      if (t.status !== "registration") throw new TournamentError(409, "Registration is closed.");
      if (t.entrants.includes(guildId)) throw new TournamentError(409, "Your Guild is already registered.");
      if (t.entrants.length >= 4) throw new TournamentError(409, "This four-Guild bracket is full.");
      const updated: HgrGuildTournament = { ...t, entrants: [...t.entrants, guildId], updatedAt: Date.now() };
      const next = new Map(current); next.set(id, updated);
      return { next, value: updated };
    });
  }
  function start(accountId: string, id: string, guild: GuildLookup) {
    return change(current => {
      const t = current.get(id);
      if (!t) throw new TournamentError(404, "Tournament not found.");
      requireManager(guild(t.hostGuildId), accountId);
      if (t.status !== "registration" || t.entrants.length !== 4) {
        throw new TournamentError(409, "Exactly four Guilds must register before the bracket starts.");
      }
      if (t.entrants.some(guildId => !guild(guildId)?.managerIds.length)) {
        throw new TournamentError(409, "Each Guild must retain an eligible manager.");
      }
      // Registration order is the transparent seed order, not fabricated ratings.
      const [a, b, c, d] = t.entrants;
      const updated: HgrGuildTournament = { ...t, status: "active", startedAt: Date.now(), updatedAt: Date.now(),
        matches: [newMatch("semi-1", a!, d!), newMatch("semi-2", b!, c!), newMatch("final", null, null)] };
      const next = new Map(current); next.set(id, updated);
      return { next, value: updated };
    });
  }
  function link(accountId: string, id: string, matchId: string, fixtureId: string,
    guild: GuildLookup, fixture: FixtureLookup) {
    return change(current => {
      const t = current.get(id);
      if (!t || t.status !== "active") throw new TournamentError(409, "Tournament is not active.");
      const match = t.matches.find(row => row.id === matchId);
      if (!match || match.status !== "ready" || !match.homeGuildId || !match.awayGuildId) {
        throw new TournamentError(409, "This bracket match is not ready for a fixture.");
      }
      if (!guild(match.homeGuildId)?.managerIds.includes(accountId) && !guild(match.awayGuildId)?.managerIds.includes(accountId)) {
        throw new TournamentError(403, "Only a competing Guild manager may bind this match.");
      }
      const game = fixture(fixtureId);
      if (!game || !t.startedAt || !Number.isSafeInteger(game.createdAt) || game.createdAt < t.startedAt ||
          !["rooms-bound", "completed"].includes(game.status) || game.boards?.length !== 2 ||
          ![match.homeGuildId, match.awayGuildId].includes(game.homeGuildId) ||
          ![match.homeGuildId, match.awayGuildId].includes(game.awayGuildId) ||
          game.homeGuildId === game.awayGuildId) {
        throw new TournamentError(409, "Bind a real two-board fixture between these exact Guilds.");
      }
      if ([...current.values()].some(record => record.matches.some(row => row.fixtureId === fixtureId))) {
        throw new TournamentError(409, "This fixture is already assigned to a tournament match.");
      }
      const updated = { ...t, updatedAt: Date.now(), matches: t.matches.map(row => row.id === matchId
        ? { ...row, fixtureId, status: "playing" as const } : row) };
      const next = new Map(current); next.set(id, updated);
      return { next, value: updated };
    });
  }
  function reconcile(fixture: FixtureLookup) {
    return change(current => {
      let next: Map<string, HgrGuildTournament> | null = null;
      for (const t of current.values()) {
        if (t.status !== "active") continue;
        const matches = t.matches.map(row => ({ ...row }));
        let changed = false;
        for (const match of matches) {
          if (!match.fixtureId || match.status === "completed" || !match.homeGuildId || !match.awayGuildId) continue;
          const receipt = fixture(match.fixtureId);
          const winner = verifiedWinner(receipt, match.homeGuildId, match.awayGuildId, t.startedAt);
          const status = winner ? "completed" : receipt?.status === "completed" ? "tied" : "playing";
          if (match.status !== status || match.winnerGuildId !== winner) {
            match.status = status; match.winnerGuildId = winner; changed = true;
          }
        }
        const final = matches[2]!;
        if (final.status === "awaiting-teams" && matches[0]?.winnerGuildId && matches[1]?.winnerGuildId) {
          final.homeGuildId = matches[0].winnerGuildId;
          final.awayGuildId = matches[1].winnerGuildId;
          final.status = "ready";
          changed = true;
        }
        if (!changed) continue;
        const champion = final.status === "completed" ? final.winnerGuildId : null;
        const updated: HgrGuildTournament = { ...t, matches, championGuildId: champion,
          status: champion ? "completed" : "active", completedAt: champion ? Date.now() : null,
          updatedAt: Date.now() };
        if (!next) next = new Map(current);
        next.set(t.id, updated);
      }
      return { next: next ?? current, value: Boolean(next) };
    });
  }
  function cancel(accountId: string, id: string, guild: GuildLookup) {
    return change(current => {
      const t = current.get(id);
      if (!t) throw new TournamentError(404, "Tournament not found.");
      requireManager(guild(t.hostGuildId), accountId);
      if (t.status !== "registration") throw new TournamentError(409, "Only an unstarted bracket may be cancelled.");
      const updated: HgrGuildTournament = { ...t, status: "cancelled", updatedAt: Date.now() };
      const next = new Map(current); next.set(id, updated);
      return { next, value: updated };
    });
  }
  return { load, visible, create, register, start, link, reconcile, cancel };
}
const tournamentStore = createGuildTournamentCoordinator();
export const loadGuildTournaments = () => tournamentStore.load();

export function registerGuildTournamentRoutes(app: Express, resolveAccount: AccountLookup, guild: GuildLookup) {
  const run = (action: (request: Request, account: HalieusAccountSummary) => Promise<unknown>, list = false) =>
    async (request: Request, response: Response) => {
      response.setHeader("Cache-Control", "no-store");
      const account = resolveAccount(request);
      if (!account) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
      if (request.method !== "GET") {
        if (!request.is("application/json")) { response.status(415).json({ ok: false, reason: "JSON is required." }); return; }
        const origin = request.get("origin");
        if (origin) {
          let valid = false;
          try { valid = new URL(origin).host === request.get("host"); } catch { /* forbidden */ }
          if (!valid) { response.status(403).json({ ok: false, reason: "Cross-site bracket changes are forbidden." }); return; }
        }
      }
      try {
        const result = await action(request, account);
        response.json(list ? { ok: true, tournaments: result } : { ok: true, tournament: result });
      } catch (error) {
        response.status(error instanceof TournamentError ? error.statusCode : 503).json({
          ok: false, reason: error instanceof TournamentError ? error.message : "Tournament operation unavailable.",
        });
      }
    };
  app.get("/guild-tournaments", run(async (_r, a) => {
    await tournamentStore.reconcile(getGuildFixtureForTournament);
    return tournamentStore.visible(a.id, guild);
  }, true));
  app.post("/guild-tournaments", run((r, a) => tournamentStore.create(a.id, r.body?.guildId, r.body?.name, guild)));
  app.post("/guild-tournaments/:id/register", run((r, a) =>
    tournamentStore.register(a.id, String(r.params.id), r.body?.guildId, guild)));
  app.post("/guild-tournaments/:id/start", run((r, a) => tournamentStore.start(a.id, String(r.params.id), guild)));
  app.post("/guild-tournaments/:id/matches/:matchId/link", run((r, a) =>
    tournamentStore.link(a.id, String(r.params.id), String(r.params.matchId), r.body?.fixtureId, guild, getGuildFixtureForTournament)));
  app.post("/guild-tournaments/:id/cancel", run((r, a) => tournamentStore.cancel(a.id, String(r.params.id), guild)));
}
