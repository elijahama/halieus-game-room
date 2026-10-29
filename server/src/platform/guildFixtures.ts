import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import type { HalieusAccountSummary } from "../../../shared/platform/accounts.js";
import type { HgrGuildBoardLineups, HgrGuildFixture } from "../../../shared/platform/guildFixtures.js";
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
function ensureValidDocument(raw: unknown): asserts raw is Document {
  if (!raw || typeof raw !== "object" || (raw as Document).version !== 1 ||
      !Array.isArray((raw as Document).fixtures)) throw new Error("Unsupported fixture store format");
  const seen = new Set<string>();
  for (const row of (raw as Document).fixtures) {
    if (!row || typeof row.id !== "string" || !row.id || seen.has(row.id) ||
        !["proposed", "lineups-locked", "cancelled"].includes(row.status) ||
        typeof row.homeGuildId !== "string" || typeof row.awayGuildId !== "string" ||
        !Array.isArray(row.homeLineups) || row.homeLineups.length !== 2) {
      throw new Error("Invalid persisted fixture record; refusing to overwrite");
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
      const now = Date.now();
      const fixture: HgrGuildFixture = { ...existing, status: "cancelled", cancelledAt: now, updatedAt: now };
      const next = new Map(current); next.set(fixtureId, fixture);
      return { next, value: fixture };
    });
  }
  function list(accountId: string, guild: GuildLookup) {
    if (!loaded) throw Error("Fixture coordinator not loaded.");
    return [...fixtures.values()].filter((f) =>
      guild(f.homeGuildId)?.memberIds.includes(accountId) || guild(f.awayGuildId)?.memberIds.includes(accountId))
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100).map((f) => structuredClone(f));
  }
  return { load, propose, accept, cancel, list };
}
const coordinator = createGuildFixtureCoordinator();
export const loadGuildFixtures = () => coordinator.load();

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
  app.post("/guild-fixtures/:fixtureId/cancel", run((r, a) => coordinator.cancel(a.id, String(r.params.fixtureId), guild)));
}
