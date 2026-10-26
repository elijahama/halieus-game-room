/**
 * HGR-wide portable game archive store (all games).
 * No HTTP or Socket.IO handlers here: authorization and per-game privacy
 * policy belong to each server adapter before calling put or get.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, link, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getHalieusDataRoot } from "./dataPaths.js";
import {
  REPLAY_GAME_IDS, serializeHgrReplay, type HgrGameReplayArchive,
} from "../../../shared/platform/game-replay.js";

export const HGR_REPLAY_DIRECTORY = path.resolve(getHalieusDataRoot() ??
  path.resolve(process.cwd(), "data"), "replays");

function archivePath(root: string, gameId: string, matchId: string): string {
  if (!(REPLAY_GAME_IDS as readonly string[]).includes(gameId)) throw new Error("Unknown replay game");
  if (typeof matchId !== "string" || !matchId.trim() || matchId.length > 200) throw new Error("Invalid match ID");
  const hash = createHash("sha256").update(gameId + ":" + matchId).digest("hex");
  return path.join(root, gameId, hash + ".json");
}

export function createHgrReplayStore(root: string = HGR_REPLAY_DIRECTORY) {
  let operations: Promise<unknown> = Promise.resolve();
  async function get(gameId: HgrGameReplayArchive["gameId"], matchId: string): Promise<HgrGameReplayArchive | null> {
    const file = archivePath(root, gameId, matchId);
    let json: string;
    try { json = await readFile(file, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    const value: HgrGameReplayArchive = JSON.parse(json);
    if (value.gameId !== gameId || value.matchId !== matchId) throw new Error("Replay archive identity mismatch");
    serializeHgrReplay(value);
    return value;
  }

  async function put(archive: HgrGameReplayArchive): Promise<HgrGameReplayArchive> {
    const operation = operations.then(async () => {
      const serialized = serializeHgrReplay(archive);
      const target = archivePath(root, archive.gameId, archive.matchId);
      const existing = await get(archive.gameId, archive.matchId);
      if (existing) {
        if (serializeHgrReplay(existing) !== serialized) {
          throw new Error("Replay archive already exists with different contents");
        }
        return existing;
      }
      await mkdir(path.dirname(target), { recursive: true });
      const temp = target + "." + randomUUID() + ".tmp";
      await writeFile(temp, serialized, { encoding: "utf8", flag: "wx" });
      try { await link(temp, target); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const winner = await get(archive.gameId, archive.matchId);
        if (!winner || serializeHgrReplay(winner) !== serialized) throw new Error("Replay archive already exists with different contents");
      } finally { await unlink(temp); }
      return JSON.parse(serialized) as HgrGameReplayArchive;
    });
    operations = operation.then(() => undefined, () => undefined);
    return operation;
  }
  return { put, get };
}
