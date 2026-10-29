import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGuildFixtureCoordinator, FixtureError } from "../server/src/platform/guildFixtures.ts";

const dir = await mkdtemp(join(tmpdir(), "hgr-guild-fixtures-"));
const file = join(dir, "fixtures.json");
const guilds = new Map([
  ["blue", { id: "blue", memberIds: ["blue-1", "blue-2", "blue-3", "shared"], managerIds: ["blue-1"] }],
  ["gold", { id: "gold", memberIds: ["gold-1", "gold-2", "gold-3", "shared"], managerIds: ["gold-1"] }],
]);
const lookup = (id) => guilds.get(id) ?? null;
const rejectCode = async (promise, code) => assert.rejects(promise, (error) => error instanceof FixtureError && error.statusCode === code);
try {
  const store = createGuildFixtureCoordinator(file);
  await store.load();
  assert.deepEqual(store.list("outsider", lookup), []);
  await rejectCode(store.propose("blue-2", "blue", "gold", [["blue-1"], ["blue-2"]], lookup), 403);
  await rejectCode(store.propose("blue-1", "blue", "blue", [["blue-1"], ["blue-2"]], lookup), 400);
  await rejectCode(store.propose("blue-1", "blue", "gold", [["blue-1"], ["blue-1"]], lookup), 400);
  await rejectCode(store.propose("blue-1", "blue", "gold", [["blue-1"], ["intruder"]], lookup), 400);
  const proposed = await store.propose("blue-1", "blue", "gold", [["shared"], ["blue-3"]], lookup);
  assert.equal(proposed.status, "proposed");
  assert.equal(proposed.awayLineups, null);
  assert.equal(store.list("gold-2", lookup).length, 1);
  assert.equal(store.list("outsider", lookup).length, 0);
  await rejectCode(store.accept("blue-1", proposed.id, [["gold-2"], ["gold-3"]], lookup), 403);
  await rejectCode(store.accept("gold-1", proposed.id, [["gold-2"], ["gold-2"]], lookup), 400);
  await rejectCode(store.accept("gold-1", proposed.id, [["shared"], ["gold-3"]], lookup), 400);
  const locked = await store.accept("gold-1", proposed.id, [["gold-2"], ["gold-3"]], lookup);
  assert.equal(locked.status, "lineups-locked");
  assert.ok(locked.lockedAt > 0);
  assert.deepEqual(locked.awayLineups, [["gold-2"], ["gold-3"]]);
  await rejectCode(store.accept("gold-1", proposed.id, [["gold-2"], ["gold-3"]], lookup), 409);
  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(saved.version, 1);
  assert.equal(saved.fixtures.length, 1);
  const reload = createGuildFixtureCoordinator(file);
  await reload.load();
  assert.equal(reload.list("gold-2", lookup)[0].status, "lineups-locked");
  const cancelled = await reload.cancel("blue-1", proposed.id, lookup);
  assert.equal(cancelled.status, "cancelled");
  await rejectCode(reload.cancel("gold-1", proposed.id, lookup), 409);
  await rejectCode(reload.cancel("outsider", proposed.id, lookup), 403);
  // Failure on corrupt durable data cannot be silently treated as empty.
  await writeFile(file, '{"version":1,"fixtures":[{"id":"bad","status":"unknown"}]}');
  await assert.rejects(createGuildFixtureCoordinator(file).load(), /Invalid persisted fixture/);
  console.log("PASS HGR 4.7 fixture proposals: member-verified two-board rosters, opponent approval, immutable lock, persisted cancellation, privacy and corrupt-file rejection");
} finally {
  await rm(dir, { recursive: true, force: true });
}
