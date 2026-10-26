import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile, link, unlink } from "node:fs/promises";
import path from "node:path";
import type { Express, Request } from "express";
import { createHgrReplayStore, HGR_REPLAY_DIRECTORY } from "./game-replay-store.js";
import { replayAsPlainText, serializeHgrReplay, type HgrGameReplayArchive } from "../../../shared/platform/game-replay.js";

// Private ownership receipts never leave the server or enter portable exports.
export function createGameHistory(root = HGR_REPLAY_DIRECTORY) {
  const store = createHgrReplayStore(root);
  const receipts = path.join(root, "_ownership");
  let chain: Promise<unknown> = Promise.resolve();
  const key = (game: string, match: string) => createHash("sha256").update(game + ":" + match).digest("hex");
  async function receipt(id: string): Promise<{ gameId: HgrGameReplayArchive["gameId"]; matchId: string; owners: string[] } | null> {
    if (!/^[a-f0-9]{64}$/.test(id)) return null;
    try { return JSON.parse(await readFile(path.join(receipts, id + ".json"), "utf8")); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
  async function record(archive: HgrGameReplayArchive, accountIds: string[]) {
    // Freeze input before asynchronous I/O; a later reconnect cannot change this finish.
    const safe = JSON.parse(serializeHgrReplay(archive)) as HgrGameReplayArchive;
    const owners = [...new Set(accountIds.filter(id => typeof id === "string" && id.length > 0))].sort();
    const id = key(safe.gameId, safe.matchId);
    const operation = chain.then(async () => {
      const existing = await receipt(id);
      if (existing) return id; // Never grant extra owners on duplicate finishes.
      // A retry after an interrupted receipt write reuses the immutable archive.
      if (!await store.get(safe.gameId, safe.matchId)) await store.put(safe);
      await mkdir(receipts, { recursive: true });
      const target = path.join(receipts, id + ".json");
      const temp = target + "." + randomUUID() + ".tmp";
      await writeFile(temp, JSON.stringify({ gameId: safe.gameId, matchId: safe.matchId, owners }), { flag: "wx" });
      try { await link(temp, target); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
      finally { await unlink(temp); }
      return id;
    });
    chain = operation.then(() => undefined, () => undefined);
    return operation;
  }
  async function get(accountId: string, id: string) {
    const entry = await receipt(id);
    if (!entry || !entry.owners.includes(accountId)) return null;
    const archive = await store.get(entry.gameId, entry.matchId);
    return archive ? JSON.parse(serializeHgrReplay(archive)) as HgrGameReplayArchive : null;
  }
  async function list(accountId: string, offset = 0) {
    let files: string[];
    try { files = await readdir(receipts); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { matches: [], nextOffset: null }; throw error; }
    const matches = [];
    for (const file of files) {
      if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
      const id = file.slice(0, -5);
      const archive = await get(accountId, id);
      if (archive) matches.push({ id, gameId: archive.gameId, finishedAt: archive.finishedAt,
        players: archive.players, truncated: archive.track.truncated });
    }
    matches.sort((a, b) => b.finishedAt - a.finishedAt || a.id.localeCompare(b.id));
    return { matches: matches.slice(offset, offset + 20), nextOffset: matches.length > offset + 20 ? offset + 20 : null };
  }
  return { record, get, list };
}
export const gameHistory = createGameHistory();

export function registerGameHistoryRoutes(app: Express,
  authenticate: (request: Request) => { id: string } | null, history = gameHistory) {
  app.use("/game-history", (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get("/game-history", async (request, response) => {
    const account = authenticate(request);
    if (!account) { response.status(401).json({ reason: "Sign in to view Game History." }); return; }
    const offset = Number(request.query.offset ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0) { response.status(400).json({ reason: "Invalid page." }); return; }
    try { response.json(await history.list(account.id, offset)); }
    catch { response.status(503).json({ reason: "Game History is temporarily unavailable." }); }
  });
  app.get("/game-history/:id", async (request, response) => {
    const account = authenticate(request);
    if (!account) { response.status(401).json({ reason: "Sign in to view Game History." }); return; }
    const format = request.query.format;
    if (format !== undefined && format !== "json" && format !== "text") {
      response.status(400).json({ reason: "Unsupported download format." }); return;
    }
    try {
      const archive = await history.get(account.id, String(request.params.id));
      if (!archive) { response.status(404).json({ reason: "Match not found." }); return; }
      if (format) {
        response.setHeader("Content-Disposition", `attachment; filename="hgr-${request.params.id}.${format === "text" ? "txt" : "json"}"`);
        response.type(format === "text" ? "text/plain" : "application/json")
          .send(format === "text" ? replayAsPlainText(archive) : serializeHgrReplay(archive));
      } else response.json({ archive });
    } catch { response.status(503).json({ reason: "Replay is temporarily unavailable." }); }
  });
}
