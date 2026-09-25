import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getAccountDataDirectory, getSessionDataDirectory } from "./dataPaths.js";
import type { PlayerProgression } from "../../../shared/platform/progression.js";
type Identity = { accountId: string; beta: boolean };
const identities = new Map<string, () => Identity | null>();
export function registerProgressionIdentity(socketId: string, identity: () => Identity | null): () => void { identities.set(socketId, identity); return () => { identities.delete(socketId); }; }
/** Mutate server-owned players only, before persistence/archiving. Never infer identity from a name. */
export function captureProgression(payload: any): void {
  const state = payload?.gameState ?? payload;
  const players = state?.players;
  if (!Array.isArray(players)) return;
  for (const player of players) {
    if (player.isAi) continue;
    const identity = identities.get(player.id)?.();
    if (!player.progressionIdentity && identity) player.progressionIdentity = { ...identity, activePlayMs: 0, lastActionAt: null, lastActionKey: null };
    const meta = player.progressionIdentity;
    if (!meta) continue;
    if (identity?.beta || /^\[BETA\]/i.test(String(player.name))) meta.beta = true;
    // A recovery key cannot transfer an account's progression to another account.
    if (identity && identity.accountId !== meta.accountId) meta.beta = true;
    const matchStart = state.startedAt ?? state.gameStartedAt;
    if (matchStart && meta.matchStart !== matchStart) { meta.matchStart = matchStart; meta.activePlayMs = 0; meta.lastActionAt = null; meta.lastActionKey = null; }
    const entries = state.actionLog ?? state.activityLog ?? [];
    const action = [...entries].reverse().find((entry: any) => entry.playerId === player.id && !/chat|connect|join|leave|timer/i.test(entry.action ?? entry.kind ?? ""));
    if (!action || !identity || player.isConnected === false || player.autopilotEnabled || !(state.startedAt || state.gameStartedAt || state.started)) continue;
    const key = action.id ?? action.sequence;
    const at = Number(action.at ?? action.timestamp);
    if (key == null || !Number.isFinite(at) || meta.lastActionKey === key) continue;
    // Count intervals between real actions, capped at 60s; idle/AFK time is never filled in.
    if (meta.lastActionAt != null) meta.activePlayMs += Math.min(60000, Math.max(0, at - meta.lastActionAt));
    meta.lastActionAt = at; meta.lastActionKey = key;
  }
}
let chain = Promise.resolve();
export function readPlayerProgression(accountId: string): Promise<PlayerProgression> {
  const task = chain.then(() => rebuild(accountId)); chain = task.then(() => {}, () => {}); return task;
}
async function rebuild(accountId: string): Promise<PlayerProgression> {
  const result: PlayerProgression = { gamerScore: 0, activePlayMs: 0, played: 0, wins: 0, awards: [], byGame: {} };
  const directory = resolve(getSessionDataDirectory(), "finalized");
  let files: string[] = []; try { files = await readdir(directory); } catch (error: any) { if (error.code !== "ENOENT") throw error; }
  const records: any[] = [];
  for (const file of files.filter(file => file.endsWith(".json"))) { try { records.push(JSON.parse(await readFile(resolve(directory, file), "utf8"))); } catch { /* An incomplete archive is not evidence for an award. */ } }
  records.sort((a,b) => a.finalisedAt - b.finalisedAt || String(a.sessionId).localeCompare(String(b.sessionId)));
  const sessions = new Set<string>(), awarded = new Set<string>();
  let kassTotal = 0, completedTrades = 0;
  const award = (id: string, title: string, points: number, record: any) => { if (awarded.has(id)) return; awarded.add(id); result.awards.push({ id, title, points, earnedAt: record.finalisedAt, sessionId: record.sessionId }); };
  for (const record of records) {
    if (!record.sessionId || sessions.has(record.sessionId) || !["completed", "forfeit-completed"].includes(record.status)) continue;
    sessions.add(record.sessionId);
    const state = record.state?.gameState ?? record.state;
    const players = state?.players ?? [];
    if (!Array.isArray(players) || players.some((p: any) => p.progressionIdentity?.beta || /^\[BETA\]/i.test(String(p.name))) || state.outcome?.countsAsCompletedPlay === false) continue;
    const player = players.find((p: any) => !p.isAi && p.progressionIdentity?.accountId === accountId);
    if (!player || !(state.startedAt || state.gameStartedAt || state.started || record.state?.room?.started)) continue;
    const game = String(record.game), line = result.byGame[game] ??= { played: 0, wins: 0 };
    const winnerId = state.winnerPlayerId ?? state.outcome?.winnerPlayerId ?? (game === "mega-board" ? players.filter((p: any) => !p.isBankrupt).length === 1 ? players.find((p: any) => !p.isBankrupt)?.id : null : ((game === "poker" && state.hand?.phase === "finished") || (game === "blackjack" && state.phase === "finished")) ? [...players].sort((a: any,b: any) => b.chips-a.chips)[0]?.id : null);
    const won = winnerId === player.id || ["Winner", "Winning team"].includes(player.result);
    result.played++; line.played++; if (won) { result.wins++; line.wins++; }
    result.activePlayMs += Math.max(0, Number(player.progressionIdentity.activePlayMs) || 0);
    award("first-match", "First completed match", 10, record);
    award(`${game}:first-match`, `${game}: first completed match`, 10, record);
    if (won) award(`${game}:first-win`, `${game}: first win`, 20, record);
    if (line.played >= 10) award(`${game}:ten-matches`, `${game}: ten completed matches`, 30, record);
    if (line.wins >= 5) award(`${game}:five-wins`, `${game}: five wins`, 50, record);
    if (Object.keys(result.byGame).length >= 5) award("five-games", "Five different games", 50, record);
    if (result.activePlayMs >= 3600000) award("active-hour", "One hour of active play", 50, record);
    if (game === "mega-board") { kassTotal += state.playerStats?.[player.id]?.kassManeuvers ?? 0; completedTrades += state.playerStats?.[player.id]?.completedTrades ?? 0; }
    if (kassTotal >= 5) award("mega:kass-five", "Five Kass Maneuvers", 75, record);
    if (completedTrades >= 5) award("mega:five-trades", "Complete five trades", 50, record);
    if (game === "mega-board" && (state.playerStats?.[player.id]?.initiatedThreeWayDeals ?? 0) > 0) award("mega:three-way", "Initiate a completed three-way deal", 40, record);
    if (game === "connect-four" && won && state.bestOf > 1 && players.filter((p: any) => p.id !== player.id).every((p: any) => p.seriesWins === 0)) award("connect-four:clean-sweep", "Connect Four clean sweep", 40, record);
    if (game === "ludo" && won && Array.isArray(player.pieces) && player.pieces.filter((piece: any) => piece.steps === 57).length === 4) award("ludo:home-four", "Bring all four Ludo pieces home", 40, record);
    if (game === "poker" && player.progressionFeats?.royalFlush) award("poker:royal-flush", "Win with a royal flush", 100, record);
    if (game === "poker" && player.progressionFeats?.straightFlush) award("poker:straight-flush", "Win with a straight flush", 75, record);
  }
  result.gamerScore = result.awards.reduce((sum, award) => sum + award.points, 0);
  // The archive is the durable outbox. Rebuilding makes crash/retry/restart idempotent.
  const target = resolve(getAccountDataDirectory(), "progression"); await mkdir(target, { recursive: true });
  const path = resolve(target, `${Buffer.from(accountId).toString("hex")}.json`);
  await writeFile(`${path}.tmp`, JSON.stringify(result, null, 2), "utf8"); await rename(`${path}.tmp`, path);
  return result;
}

/** Private attribution is persisted in archives, never sent to another player or spectator. */
export function publicProgressionPlayer<T extends object>(player: T): T {
  const { progressionIdentity: _identity, progressionFeats: _feats, ...publicPlayer } = player as T & { progressionIdentity?: unknown; progressionFeats?: unknown };
  return publicPlayer as T;
}
export function publicProgressionState<T extends { players: object[] }>(state: T): T;
export function publicProgressionState<T extends { players: object[] }>(state: T | null): T | null;
export function publicProgressionState<T extends { players: object[] }>(state: T | null): T | null {
  return state ? { ...state, players: state.players.map(publicProgressionPlayer) } : null;
}
