import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
const directory = await mkdtemp(join(tmpdir(), "hgr-guild-http-"));
process.env.HALIEUS_DATA_DIR = directory;
const { loadGuildFixtures, registerGuildFixtureRoutes } = await import("../server/src/platform/guildFixtures.ts");
const guilds = new Map([
  ["blue", { id: "blue", memberIds: ["blue-lead", "blue-a", "blue-b"], managerIds: ["blue-lead"] }],
  ["gold", { id: "gold", memberIds: ["gold-lead", "gold-a", "gold-b"], managerIds: ["gold-lead"] }],
]);
const app = express();
app.use(express.json());
await loadGuildFixtures();
registerGuildFixtureRoutes(app, (request) => request.get("x-test-account") ? { id: request.get("x-test-account") } : null,
  (id) => guilds.get(id) ?? null);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const url = "http://127.0.0.1:" + server.address().port;
const send = async (path, account, body, extra = {}) => {
  const response = await fetch(url + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(account ? { "x-test-account": account } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
};
try {
  const proposal = { homeGuildId: "blue", awayGuildId: "gold", homeLineups: [["blue-a"], ["blue-b"]] };
  assert.equal((await send("/guild-fixtures", null, proposal)).status, 401);
  assert.equal((await send("/guild-fixtures", "blue-a", proposal)).status, 403);
  assert.equal((await send("/guild-fixtures", "blue-lead", proposal, { origin: "https://evil.example" })).status, 403);
  const created = await send("/guild-fixtures", "blue-lead", proposal);
  assert.equal(created.status, 200);
  const fixtureId = created.data.fixture.id;
  assert.equal((await send("/guild-fixtures", "outsider")).data.fixtures.length, 0);
  assert.equal((await send("/guild-fixtures", "gold-a")).data.fixtures.length, 1);
  assert.equal((await send("/guild-fixtures/" + fixtureId + "/accept", "gold-a", { awayLineups: [["gold-a"], ["gold-b"]] })).status, 403);
  const locked = await send("/guild-fixtures/" + fixtureId + "/accept", "gold-lead", { awayLineups: [["gold-a"], ["gold-b"]] });
  assert.equal(locked.status, 200);
  assert.equal(locked.data.fixture.status, "lineups-locked");
  assert.equal((await send("/guild-fixtures/" + fixtureId + "/accept", "gold-lead", { awayLineups: [["gold-a"], ["gold-b"]] })).status, 409);
  assert.equal((await send("/guild-fixtures/" + fixtureId + "/cancel", "outsider", {})).status, 403);
  assert.equal((await send("/guild-fixtures/" + fixtureId + "/cancel", "blue-lead", {})).status, 200);
  console.log("PASS HGR 4.7 Guild fixtures HTTP: signed-in manager boundaries, opponent approval, Origin rejection, member-scoped reads, immutable locking and cancellation");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
