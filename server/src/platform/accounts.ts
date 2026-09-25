import { getRankedLeaderboard } from "../games/mega-board/utils/rankings.js";
import { normaliseRankedPlayerKey } from "../../../shared/games/mega-board/ranked.js";
import { SKIN_CATALOG, DEFAULT_SKIN_PREFERENCES, isSkinUnlocked, type HalieusSkinPreferences, type HalieusSkinSlot } from "../../../shared/platform/skins.js";
import { readPlayerProgression } from "./progression.js";
import type { Express, Request, Response } from "express";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getAccountDataDirectory, getSessionDataDirectory } from "./dataPaths.js";
import { promisify } from "node:util";

import type {
  HalieusAccessRequestSummary,
  HalieusAccountRole,
  HalieusAccountStatus,
  HalieusAccountSummary,
  HalieusAdminSnapshot,
  HalieusAuditEntry,
  HalieusAuthStatus,
  HalieusInviteSummary,
  HalieusGameInviteSummary,
  HalieusGameRequestSummary,
  HalieusPlayerVisibility,
  HalieusPersonalStats,
  HalieusPlayerDirectoryEntry,
  HalieusQuickPlayProfile,
  HalieusQuickPlayPreference,
  WordGameLeaderboardSnapshot,
  WordGameDailyLeaderboardEntry,
  WordGameAllTimeLeaderboardEntry,
} from "../../../shared/platform/accounts.js";
import type { HalieusLiveRoomSummary } from "../../../shared/platform/live-games.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "halieus_session";
const PRESENCE_TIMEOUT_MS = 70_000;
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const INVITE_DEFAULT_MS = 1000 * 60 * 60 * 24 * 7;
const RESET_DEFAULT_MS = 1000 * 60 * 60 * 24;
const MAX_AUDIT = 1000;

interface StoredAccount {
  id: string;
  username: string;
  displayName: string;
  role: HalieusAccountRole;
  status: HalieusAccountStatus;
  avatar: string;
  profilePicture?: string | null;
  playerColor: string;
  createdAt: number;
  lastLoginAt: number | null;
  passwordSalt: string;
  passwordHash: string;
  createdViaInviteId: string | null;
  skins?: HalieusSkinPreferences;
  displayNameAliases?: string[];
  visibility?: HalieusPlayerVisibility;
}

interface StoredInvite extends HalieusInviteSummary {
  codeHash: string;
  // Invite codes created after 3.5.7 retain a private server-side reveal copy so an authenticated
  // administrator can revisit account-invite history. The public/admin snapshot exposes only
  // whether a reveal copy exists; the full code is returned only by the dedicated reveal endpoint.
  revealCode?: string | null;
}

interface StoredSession {
  id: string;
  accountId: string;
  tokenHash: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}

interface StoredPasswordReset {
  id: string;
  accountId: string;
  codeHash: string;
  codeLast4: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  createdByAccountId: string;
}

interface StoredGameInvite extends HalieusGameInviteSummary {
  dismissedAt: number | null;
}

interface StoredGameRequest extends HalieusGameRequestSummary {}

interface AccountStore {
  version: 1;
  ownerBootstrapHash: string | null;
  ownerBootstrapCreatedAt: number | null;
  accounts: StoredAccount[];
  invites: StoredInvite[];
  sessions: StoredSession[];
  passwordResets: StoredPasswordReset[];
  gameInvites: StoredGameInvite[];
  gameRequests: StoredGameRequest[];
  accessRequests: HalieusAccessRequestSummary[];
  audit: HalieusAuditEntry[];
}

const dataDirectory = getAccountDataDirectory();
const storePath = resolve(dataDirectory, "accounts.json");
const projectRoot = resolve(process.cwd(), "..");
const bootstrapCodePath = process.env.HALIEUS_OWNER_BOOTSTRAP_FILE
  ? resolve(process.env.HALIEUS_OWNER_BOOTSTRAP_FILE)
  : resolve(projectRoot, "OWNER SETUP CODE.txt");
let store: AccountStore = emptyStore();
let saveQueue: Promise<void> = Promise.resolve();
const authAttempts = new Map<string, { count: number; resetAt: number }>();

interface AccountAdminRuntimeControls {
  getRoomCount: () => number;
  getLiveRooms: () => HalieusLiveRoomSummary[];
  closeAllRooms: (actor: HalieusAccountSummary) => Promise<{ closed: number }>;
}

let adminRuntimeControls: AccountAdminRuntimeControls | null = null;

export function configureAccountAdminRuntimeControls(controls: AccountAdminRuntimeControls): void {
  adminRuntimeControls = controls;
}

function allowAuthAttempt(request: Request, response: Response, bucket: string, limit = 12, windowMs = 15 * 60 * 1000): boolean {
  const ip = request.ip || request.socket.remoteAddress || "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const current = authAttempts.get(key);
  if (!current || current.resetAt <= now) { authAttempts.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (current.count >= limit) {
    response.setHeader("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
    response.status(429).json({ ok: false, reason: "Too many account attempts. Try again later." });
    return false;
  }
  current.count += 1;
  return true;
}

function emptyStore(): AccountStore {
  return {
    version: 1,
    ownerBootstrapHash: null,
    ownerBootstrapCreatedAt: null,
    accounts: [],
    invites: [],
    sessions: [],
    passwordResets: [],
    gameInvites: [],
    gameRequests: [],
    accessRequests: [],
    audit: [],
  };
}

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
}

function codeHash(value: string): string {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

function sessionHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeCode(prefix: string): string {
  const body = randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

function normaliseUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32) : "";
}

function normaliseDisplayName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 40) : "";
}

function normaliseNote(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

function validUsername(username: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}

function validPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 10 && password.length <= 200;
}

async function hashPassword(password: string, salt = randomBytes(16).toString("hex")): Promise<{ salt: string; hash: string }> {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return { salt, hash: derived.toString("hex") };
}

async function verifyPassword(password: string, account: StoredAccount): Promise<boolean> {
  const derived = (await scrypt(password, account.passwordSalt, 64)) as Buffer;
  const expected = Buffer.from(account.passwordHash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function inviteLabel(inviteId: string | null): string | null {
  if (!inviteId) return null;
  return store.invites.find((invite) => invite.id === inviteId)?.label ?? "Private invite";
}

function publicAccount(account: StoredAccount): HalieusAccountSummary {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    status: account.status,
    avatar: account.avatar,
    profilePicture: account.profilePicture ?? null,
    playerColor: account.playerColor,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt,
    createdViaInviteLabel: inviteLabel(account.createdViaInviteId),
    visibility: account.visibility === "hidden" ? "hidden" : "visible",
  };
}

export function getAccountSummaryById(accountId: string): HalieusAccountSummary | null {
  const account = store.accounts.find((candidate) => candidate.id === accountId && candidate.status === "active");
  return account ? publicAccount(account) : null;
}

function addAudit(actorAccountId: string | null, action: string, targetType: HalieusAuditEntry["targetType"], targetId: string | null, summary: string): void {
  store.audit.unshift({ id: id("audit"), at: Date.now(), actorAccountId, action, targetType, targetId, summary });
  if (store.audit.length > MAX_AUDIT) store.audit.length = MAX_AUDIT;
}

function saveStore(): Promise<void> {
  const snapshot = JSON.stringify(store, null, 2);
  saveQueue = saveQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const temporary = `${storePath}.tmp`;
    await writeFile(temporary, snapshot, "utf8");
    await rename(temporary, storePath);
  });
  return saveQueue;
}

async function ensureBootstrap(): Promise<void> {
  const hasOwner = store.accounts.some((account) => account.role === "owner" && account.status !== "deleted");
  if (hasOwner) {
    store.ownerBootstrapHash = null;
    store.ownerBootstrapCreatedAt = null;
    if (existsSync(bootstrapCodePath)) await rm(bootstrapCodePath, { force: true });
    return;
  }
  if (store.ownerBootstrapHash) return;
  const bootstrapCode = safeCode("OWNER");
  store.ownerBootstrapHash = codeHash(bootstrapCode);
  store.ownerBootstrapCreatedAt = Date.now();
  await saveStore();
  await writeFile(
    bootstrapCodePath,
    [
      "HALIEUS GAME ROOM — OWNER SETUP CODE",
      "======================================",
      "",
      bootstrapCode,
      "",
      "Use this code once on the Halieus owner-setup screen.",
      "It is deleted automatically after the owner account is created.",
      "Do not send this code to players.",
      "",
    ].join("\r\n"),
    "utf8",
  );
  console.log(`Owner setup is required. Local setup code written to: ${bootstrapCodePath}`);
}

export async function loadAccountStore(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  if (existsSync(storePath)) {
    try {
      const parsed = JSON.parse(await readFile(storePath, "utf8")) as Partial<AccountStore>;
      store = { ...emptyStore(), ...parsed, version: 1 } as AccountStore;
      store.gameInvites = Array.isArray(store.gameInvites) ? store.gameInvites : [];
      store.gameRequests = Array.isArray(store.gameRequests) ? store.gameRequests : [];
      for (const account of store.accounts) {
        account.visibility = account.visibility === "hidden" ? "hidden" : "visible";
        account.displayNameAliases = Array.isArray(account.displayNameAliases)
          ? [...new Set([account.displayName, ...account.displayNameAliases].map((value) => String(value).trim()).filter(Boolean))].slice(0, 12)
          : [account.displayName];
      }
    } catch (error) {
      console.error("Unable to read Halieus account store; keeping accounts closed until it is repaired:", error);
      throw error;
    }
  }
  const now = Date.now();
  store.sessions = store.sessions.filter((session) => session.expiresAt > now);
  store.passwordResets = store.passwordResets.filter((reset) => reset.usedAt || reset.expiresAt > now);
  store.gameInvites = (store.gameInvites ?? []).filter((invite) => invite.expiresAt > now - 86400000);
  await ensureBootstrap();
  await saveStore();
}

function parseCookies(request: Request): Record<string, string> {
  const raw = request.headers.cookie ?? "";
  return Object.fromEntries(raw.split(";").map((piece) => piece.trim()).filter(Boolean).map((piece) => {
    const index = piece.indexOf("=");
    if (index < 0) return [piece, ""];
    try { return [piece.slice(0, index), decodeURIComponent(piece.slice(index + 1))]; }
    catch { return [piece.slice(0, index), ""]; }
  }));
}

function currentSession(request: Request): { session: StoredSession; account: StoredAccount } | null {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const hash = sessionHash(token);
  const now = Date.now();
  const session = store.sessions.find((candidate) => candidate.tokenHash === hash && candidate.expiresAt > now);
  if (!session) return null;
  const account = store.accounts.find((candidate) => candidate.id === session.accountId && candidate.status === "active");
  if (!account) return null;
  session.lastSeenAt = now;
  return { session, account };
}


/**
 * Platform subsystems (Guilds, future social features) authenticate through
 * the canonical account/session store instead of re-parsing the private
 * session cookie. Only the public account summary crosses this boundary.
 */
export function getAuthenticatedAccount(request: Request): HalieusAccountSummary | null {
  const auth = currentSession(request);
  return auth ? publicAccount(auth.account) : null;
}

// Operational endpoints can use the same authenticated account store without
// exposing account internals or duplicating cookie/session parsing.
export function hasAdminSession(request: Request): boolean {
  const auth = currentSession(request);
  return Boolean(auth && (auth.account.role === "owner" || auth.account.role === "admin"));
}

function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers["x-forwarded-proto"];
  return request.secure || forwarded === "https" || (Array.isArray(forwarded) && forwarded.includes("https"));
}

function setSessionCookie(request: Request, response: Response, token: string): void {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}${secure}`);
}

function clearSessionCookie(request: Request, response: Response): void {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

async function createSession(request: Request, response: Response, account: StoredAccount): Promise<void> {
  const raw = randomBytes(32).toString("base64url");
  const now = Date.now();
  store.sessions.push({ id: id("session"), accountId: account.id, tokenHash: sessionHash(raw), createdAt: now, lastSeenAt: now, expiresAt: now + SESSION_DURATION_MS });
  account.lastLoginAt = now;
  setSessionCookie(request, response, raw);
  await saveStore();
}

function authStatus(request: Request): HalieusAuthStatus {
  const auth = currentSession(request);
  return {
    ok: true,
    setupRequired: !store.accounts.some((account) => account.role === "owner" && account.status !== "deleted"),
    authenticated: Boolean(auth),
    account: auth ? publicAccount(auth.account) : null,
    registration: "invite-only",
    accessRequestsEnabled: true,
  };
}

function requireAdmin(request: Request, response: Response): StoredAccount | null {
  const auth = currentSession(request);
  if (!auth || (auth.account.role !== "owner" && auth.account.role !== "admin")) {
    response.status(403).json({ ok: false, reason: "Administrator access is required." });
    return null;
  }
  return auth.account;
}

function requireOwner(request: Request, response: Response): StoredAccount | null {
  const auth = currentSession(request);
  if (!auth || auth.account.role !== "owner") {
    response.status(403).json({ ok: false, reason: "Owner access is required." });
    return null;
  }
  return auth.account;
}

function adminSnapshot(): HalieusAdminSnapshot {
  const now = Date.now();
  const onlineAccountIds = store.accounts
    .filter((account) => {
      const lastSeenAt = lastSeenForAccount(account.id);
      return Boolean(lastSeenAt && now - lastSeenAt < PRESENCE_TIMEOUT_MS);
    })
    .map((account) => account.id);
  return {
    accounts: store.accounts.map(publicAccount).sort((a, b) => b.createdAt - a.createdAt),
    onlineAccountIds,
    invites: store.invites.map(({ codeHash: _codeHash, revealCode, ...invite }) => ({ ...invite, codeRevealAvailable: Boolean(revealCode) })).sort((a, b) => b.createdAt - a.createdAt),
    accessRequests: store.accessRequests.slice().sort((a, b) => b.createdAt - a.createdAt),
    audit: store.audit.slice(0, 250),
  };
}

function accountConflict(username: string, excludeAccountId: string | null = null): boolean {
  return store.accounts.some((account) => account.id !== excludeAccountId && account.username === username);
}

function cleanExpiredSessions(): void {
  const now = Date.now();
  store.sessions = store.sessions.filter((session) => session.expiresAt > now);
}


function lastSeenForAccount(accountId: string): number | null {
  const active = store.sessions
    .filter((session) => session.accountId === accountId && session.expiresAt > Date.now())
    .map((session) => session.lastSeenAt)
    .sort((a, b) => b - a)[0];
  return active ?? null;
}

function playerDirectory(viewer: StoredAccount): HalieusPlayerDirectoryEntry[] {
  const now = Date.now();
  return store.accounts
    .filter((account) => account.status === "active" && (viewer.role === "owner" || viewer.role === "admin" || account.visibility !== "hidden" || account.id === viewer.id))
    .map((account) => {
      const lastSeenAt = lastSeenForAccount(account.id);
      return {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        avatar: account.avatar,
        profilePicture: account.profilePicture ?? null,
        playerColor: account.playerColor,
        role: account.role,
        online: Boolean(lastSeenAt && now - lastSeenAt < PRESENCE_TIMEOUT_MS),
        lastSeenAt,
      };
    })
    .sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName));
}

const GAME_TITLES: Record<string, string> = {
  "mega-board": "Mega Board",
  poker: "Poker",
  blackjack: "Blackjack",
  whot: "WHOT",
  ludo: "Ludo",
  "hidden-dictator": "Hidden Dictator",
  "connect-four": "Connect Four",
  "word-game": "Word Game",
  password: "Password",
  "anagrams-race": "Anagrams Race",
  cheat: "Cheat",
  dominoes: "Dominoes",
  ayo: "Ayo",
  "word-board": "Word Board",
};

async function readFinalisedSessionFiles(): Promise<any[]> {
  const roots = [...new Set([
    resolve(getSessionDataDirectory(), "finalized"),
    // Legacy fallbacks remain readable during the one-time Oracle migration.
    resolve(process.cwd(), "data", "sessions", "finalized"),
    resolve(process.cwd(), "server", "data", "sessions", "finalized"),
  ])];
  const results: any[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    try {
      for (const file of await readdir(root)) {
        if (!file.endsWith(".json")) continue;
        const path = resolve(root, file);
        if (seen.has(path)) continue;
        seen.add(path);
        try {
          const record = JSON.parse(await readFile(path, "utf8"));
          // A classic-table closure is an operational archive, not played/won
          // history. Keep this narrow: other games retain their existing policy.
          if ((record.game === "dominoes" || record.game === "cheat") && (
            record.state?.startedAt == null
            || !["completed", "forfeit-completed"].includes(record.status)
            || record.state?.outcome?.countsAsCompletedPlay === false
          )) continue;
          results.push(record);
        } catch { /* malformed archive is ignored */ }
      }
    } catch { /* archive root may not exist on a fresh install */ }
  }
  return results;
}

function quickPlayKey(game: string, state: any): { key: string; preference: HalieusQuickPlayPreference } {
  const mode: "casual" | "ranked" | "blitz" = game === "mega-board"
    ? state?.blitz ? "blitz" : state?.ranked ? "ranked" : "casual"
    : state?.matchMode === "ranked" ? "ranked" : "casual";
  const preference: HalieusQuickPlayPreference = { game: game as HalieusQuickPlayPreference["game"], plays: 0, matchMode: mode };
  if (game === "poker") {
    preference.pokerVariant = state?.variant ?? "texas-holdem";
    preference.pokerStartingChips = Number(state?.startingChips ?? 5000);
    preference.pokerSmallBlind = Number(state?.smallBlind ?? 25);
    preference.pokerBigBlind = Number(state?.bigBlind ?? 50);
  }
  if (game === "connect-four") preference.connectFourBestOf = ([1,3,5].includes(Number(state?.bestOf)) ? Number(state.bestOf) : 1) as 1 | 3 | 5;
  return { key: JSON.stringify(preference), preference };
}

async function quickPlayProfile(account: StoredAccount): Promise<HalieusQuickPlayProfile> {
  const aliases = new Set([account.displayName, ...(account.displayNameAliases ?? [])].map((value) => value.trim().toLowerCase()).filter(Boolean));
  const buckets = new Map<string, Map<string, { preference: HalieusQuickPlayPreference; plays: number; lastAt: number }>>();
  for (const archive of await readFinalisedSessionFiles()) {
    const game = typeof archive?.game === "string" && GAME_TITLES[archive.game] ? archive.game : null;
    if (!game) continue;
    const state = archive?.state ?? {};
    const gameState = state?.gameState ?? state;
    const players = Array.isArray(gameState?.players) ? gameState.players : Array.isArray(state?.players) ? state.players : [];
    const matched = players.find((player: any) => !player?.isAi && aliases.has(String(player?.name ?? "").trim().toLowerCase()));
    if (!matched) continue;
    const { key, preference } = quickPlayKey(game, gameState);
    const gameBucket = buckets.get(game) ?? new Map();
    const prior = gameBucket.get(key) ?? { preference, plays: 0, lastAt: 0 };
    prior.plays += 1;
    prior.lastAt = Math.max(prior.lastAt, Number(archive?.finalisedAt ?? archive?.updatedAt ?? archive?.createdAt ?? 0));
    gameBucket.set(key, prior);
    buckets.set(game, gameBucket);
  }
  const preferences: HalieusQuickPlayPreference[] = [];
  for (const game of Object.keys(GAME_TITLES)) {
    const options = [...(buckets.get(game)?.values() ?? [])].sort((a,b) => b.plays - a.plays || b.lastAt - a.lastAt);
    if (options[0]) preferences.push({ ...options[0].preference, plays: options[0].plays });
  }
  return { preferences };
}

async function personalStats(account: StoredAccount): Promise<HalieusPersonalStats> {
  const aliases = new Set([account.displayName, ...(account.displayNameAliases ?? [])].map((value) => value.trim().toLowerCase()).filter(Boolean));
  const rows = new Map<string, { game: any; gameTitle: string; played: number; wins: number }>();
  for (const game of Object.keys(GAME_TITLES)) rows.set(game, { game, gameTitle: GAME_TITLES[game], played: 0, wins: 0 });
  const recent: HalieusPersonalStats["recent"] = [];
  const archives = await readFinalisedSessionFiles();
  for (const archive of archives) {
    const game = typeof archive?.game === "string" && GAME_TITLES[archive.game] ? archive.game : null;
    if (!game) continue;
    const state = archive?.state ?? {};
    const gameState = state?.gameState ?? state;
    const players = Array.isArray(gameState?.players) ? gameState.players : Array.isArray(state?.players) ? state.players : [];
    const matched = players.find((player: any) => !player?.isAi && aliases.has(String(player?.name ?? "").trim().toLowerCase()));
    if (!matched) continue;
    const row = rows.get(game)!;
    row.played += 1;
    const winnerName = String(archive?.summary?.winner ?? gameState?.players?.find?.((player: any) => player?.id === gameState?.winnerPlayerId)?.name ?? "").trim();
    const won = aliases.has(winnerName.toLowerCase());
    if (won) row.wins += 1;
    recent.push({
      game: game as HalieusPersonalStats["recent"][number]["game"],
      gameTitle: GAME_TITLES[game],
      roomCode: String(archive?.roomCode ?? "—"),
      at: Number(archive?.finalisedAt ?? archive?.updatedAt ?? archive?.createdAt ?? 0),
      won,
      result: won ? "Win" : winnerName ? `Winner: ${winnerName}` : "Completed",
    });
  }
  const byGame = [...rows.values()].map((row) => ({ ...row, winRate: row.played ? Math.round((row.wins / row.played) * 100) : 0 }));
  const played = byGame.reduce((sum, row) => sum + row.played, 0);
  const wins = byGame.reduce((sum, row) => sum + row.wins, 0);
  return { progression: await readPlayerProgression(account.id), played, wins, winRate: played ? Math.round((wins / played) * 100) : 0, byGame, recent: recent.sort((a, b) => b.at - a.at).slice(0, 16) };
}


interface WordGameDailyRecord {
  accountId: string;
  puzzleKey: string;
  playedAt: number;
  solved: boolean;
  guesses: number;
  solveTimeMs: number | null;
}

function utcDayIndex(key: string): number {
  const parsed = Date.parse(`${key}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 86_400_000) : -1;
}

function wordGameAliasMap(): Map<string, StoredAccount> {
  const map = new Map<string, StoredAccount>();
  for (const account of store.accounts.filter((candidate) => candidate.status === "active")) {
    for (const alias of accountAliases(account)) map.set(alias, account);
  }
  return map;
}

async function wordGameDailyRecords(): Promise<{ records: WordGameDailyRecord[]; archives: any[] }> {
  const archives = await readFinalisedSessionFiles();
  const aliases = wordGameAliasMap();
  const records: WordGameDailyRecord[] = [];
  const seen = new Set<string>();
  const ordered = archives.slice().sort((a, b) => Number(a?.finalisedAt ?? 0) - Number(b?.finalisedAt ?? 0));
  for (const archive of ordered) {
    if (archive?.game !== "word-game") continue;
    const state = archive?.state?.gameState ?? archive?.state ?? {};
    if (state?.wordGameMode !== "daily") continue;
    const puzzleKey = typeof state?.wordPuzzleKey === "string" ? state.wordPuzzleKey : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(puzzleKey)) continue;
    const players = Array.isArray(state?.players) ? state.players : [];
    const human = players.find((player: any) => !player?.isAi);
    if (!human) continue;
    const account = aliases.get(String(human?.name ?? "").trim().toLowerCase());
    if (!account) continue;
    const unique = `${account.id}:${puzzleKey}`;
    if (seen.has(unique)) continue; // Only the first daily attempt counts.
    seen.add(unique);
    const winnerName = String(archive?.summary?.winner ?? players.find((player: any) => player?.id === state?.winnerPlayerId)?.name ?? "").trim().toLowerCase();
    const solved = accountAliases(account).has(winnerName) || Number(human?.score ?? 0) > 0 || (Array.isArray(state?.solvedPlayerIds) && state.solvedPlayerIds.includes(human?.id));
    const guesses = Math.max(0, Math.min(6, Array.isArray(human?.attempts) ? human.attempts.length : 0));
    const startedAt = Number(state?.startedAt ?? archive?.createdAt ?? 0);
    const finalisedAt = Number(archive?.finalisedAt ?? archive?.updatedAt ?? 0);
    records.push({
      accountId: account.id,
      puzzleKey,
      playedAt: finalisedAt,
      solved,
      guesses,
      solveTimeMs: solved && startedAt > 0 && finalisedAt >= startedAt ? finalisedAt - startedAt : null,
    });
  }
  return { records, archives };
}

function wordGameStreak(records: WordGameDailyRecord[]): { current: number; best: number } {
  const byDay = new Map<number, boolean>();
  for (const record of records) {
    const day = utcDayIndex(record.puzzleKey);
    if (day >= 0) byDay.set(day, record.solved);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous = -999999;
  for (const day of days) {
    if (!byDay.get(day)) { run = 0; previous = day; continue; }
    run = day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  const today = utcDayIndex(new Date().toISOString().slice(0, 10));
  let cursor = byDay.has(today) ? today : today - 1;
  let current = 0;
  while (byDay.get(cursor) === true) { current += 1; cursor -= 1; }
  return { current, best };
}

function wordGameFriendIds(account: StoredAccount, archives: any[]): Set<string> {
  const ownAliases = accountAliases(account);
  const aliasMap = wordGameAliasMap();
  const ids = new Set<string>();
  for (const archive of archives) {
    const state = archive?.state?.gameState ?? archive?.state ?? {};
    const players = Array.isArray(state?.players) ? state.players : [];
    if (!players.some((player: any) => !player?.isAi && ownAliases.has(String(player?.name ?? "").trim().toLowerCase()))) continue;
    for (const player of players) {
      if (player?.isAi) continue;
      const other = aliasMap.get(String(player?.name ?? "").trim().toLowerCase());
      if (other && other.id !== account.id) ids.add(other.id);
    }
  }
  return ids;
}

async function wordGameLeaderboard(account: StoredAccount): Promise<WordGameLeaderboardSnapshot> {
  const { records, archives } = await wordGameDailyRecords();
  const puzzleKey = new Date().toISOString().slice(0, 10);
  const activeAccounts = store.accounts.filter((candidate) => candidate.status === "active");
  const accountById = new Map(activeAccounts.map((item) => [item.id, item]));
  const todayRows = records.filter((record) => record.puzzleKey === puzzleKey && record.solved && record.solveTimeMs !== null)
    .sort((a, b) => a.guesses - b.guesses || (a.solveTimeMs ?? Infinity) - (b.solveTimeMs ?? Infinity) || a.playedAt - b.playedAt);
  const today: WordGameDailyLeaderboardEntry[] = todayRows.flatMap((record, index) => {
    const item = accountById.get(record.accountId); if (!item) return [];
    return [{ rank: index + 1, accountId: item.id, displayName: item.displayName, avatar: item.avatar, playerColor: item.playerColor, guesses: record.guesses, solveTimeMs: record.solveTimeMs!, solvedAt: record.playedAt }];
  });
  const friendIds = wordGameFriendIds(account, archives);
  const friendRows = today.filter((entry) => entry.accountId === account.id || friendIds.has(entry.accountId));
  const friends = friendRows.map((entry, index) => ({ ...entry, rank: index + 1 }));

  const grouped = new Map<string, WordGameDailyRecord[]>();
  for (const record of records) { const list = grouped.get(record.accountId) ?? []; list.push(record); grouped.set(record.accountId, list); }
  const allTimeUnranked: Omit<WordGameAllTimeLeaderboardEntry, "rank">[] = [];
  for (const item of activeAccounts) {
    const own = grouped.get(item.id) ?? [];
    if (!own.length) continue;
    const solved = own.filter((row) => row.solved);
    const streak = wordGameStreak(own);
    allTimeUnranked.push({
      accountId: item.id, displayName: item.displayName, avatar: item.avatar, playerColor: item.playerColor,
      dailyPlayed: own.length, dailySolved: solved.length,
      averageGuesses: solved.length ? Math.round((solved.reduce((sum, row) => sum + row.guesses, 0) / solved.length) * 10) / 10 : null,
      bestStreak: streak.best,
      fastestSolveMs: solved.map((row) => row.solveTimeMs).filter((value): value is number => value !== null).sort((a, b) => a - b)[0] ?? null,
    });
  }
  allTimeUnranked.sort((a, b) => b.dailySolved - a.dailySolved || b.bestStreak - a.bestStreak || (a.averageGuesses ?? Infinity) - (b.averageGuesses ?? Infinity) || (a.fastestSolveMs ?? Infinity) - (b.fastestSolveMs ?? Infinity));
  const allTime: WordGameAllTimeLeaderboardEntry[] = allTimeUnranked.map((entry, index) => ({ ...entry, rank: index + 1 }));
  const mine = grouped.get(account.id) ?? [];
  const solvedMine = mine.filter((row) => row.solved);
  const streak = wordGameStreak(mine);
  const todayMine = mine.find((row) => row.puzzleKey === puzzleKey) ?? null;
  const todayRank = today.find((entry) => entry.accountId === account.id)?.rank ?? null;
  return {
    puzzleKey, today, friends, allTime,
    stats: {
      dailyPlayed: mine.length,
      dailySolved: solvedMine.length,
      solveRate: mine.length ? Math.round((solvedMine.length / mine.length) * 100) : 0,
      averageGuesses: solvedMine.length ? Math.round((solvedMine.reduce((sum, row) => sum + row.guesses, 0) / solvedMine.length) * 10) / 10 : null,
      fastestSolveMs: solvedMine.map((row) => row.solveTimeMs).filter((value): value is number => value !== null).sort((a, b) => a - b)[0] ?? null,
      currentStreak: streak.current,
      bestStreak: streak.best,
      today: todayMine ? { solved: todayMine.solved, guesses: todayMine.guesses || null, solveTimeMs: todayMine.solveTimeMs, rank: todayRank } : null,
    },
  };
}

function accountAliases(account: StoredAccount): Set<string> {
  return new Set([account.displayName, ...(account.displayNameAliases ?? [])].map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function activeRoomForInvite(game: HalieusGameInviteSummary["game"], roomCode: string): HalieusLiveRoomSummary | null {
  const code = roomCode.trim().toUpperCase();
  return (adminRuntimeControls?.getLiveRooms() ?? []).find((room) => room.game === game && room.code === code) ?? null;
}

function visibleNameForViewer(name: string, viewer: StoredAccount): string {
  if (viewer.role === "owner" || viewer.role === "admin") return name;
  const normalized = name.trim().toLowerCase();
  const account = store.accounts.find((candidate) => accountAliases(candidate).has(normalized));
  return account?.visibility === "hidden" && account.id !== viewer.id ? "Hidden Player" : name;
}

function liveRoomsForViewer(viewer: StoredAccount): HalieusLiveRoomSummary[] {
  return (adminRuntimeControls?.getLiveRooms() ?? []).map((room) => ({
    ...room,
    humanPlayers: room.humanPlayers.map((name) => visibleNameForViewer(name, viewer)),
  }));
}

function expireGameRequests(): void {
  const now = Date.now();
  for (const request of store.gameRequests) {
    if (request.status === "pending" && request.expiresAt <= now) { request.status = "expired"; request.respondedAt = now; }
  }
}

function publicGameInvites(accountId: string): HalieusGameInviteSummary[] {
  const now = Date.now();
  const activeRooms = adminRuntimeControls?.getLiveRooms() ?? [];
  const roomKeys = new Set(activeRooms.map((room) => `${room.game}:${room.code}`));
  return store.gameInvites
    .filter((invite) => invite.recipientAccountId === accountId && !invite.dismissedAt && invite.expiresAt > now && roomKeys.has(`${invite.game}:${invite.roomCode}`))
    .map(({ dismissedAt: _dismissedAt, ...invite }) => invite)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function registerAccountRoutes(app: Express): void {
  app.get("/auth/status", (request, response) => response.json(authStatus(request)));

  app.post("/auth/heartbeat", (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false }); return; }
    response.json({ ok: true });
  });

  app.get("/accounts/directory", (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    response.json({ ok: true, players: playerDirectory(auth.account) });
  });

  app.get("/accounts/live-games", (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const rooms = liveRoomsForViewer(auth.account)
      .sort((a, b) => Number(b.started) - Number(a.started) || b.updatedAt - a.updatedAt);
    response.json({ ok: true, rooms });
  });


  app.get("/accounts/game-invites", (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    response.json({ ok: true, invites: publicGameInvites(auth.account.id) });
  });

  app.post("/accounts/game-invites", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const recipientAccountId = typeof request.body?.recipientAccountId === "string" ? request.body.recipientAccountId.trim() : "";
    const game = typeof request.body?.game === "string" ? request.body.game.trim() as HalieusGameInviteSummary["game"] : "mega-board";
    const roomCode = typeof request.body?.roomCode === "string" ? request.body.roomCode.trim().toUpperCase() : "";
    const recipient = store.accounts.find((candidate) => candidate.id === recipientAccountId && candidate.status === "active");
    if (!recipient || recipient.id === auth.account.id) { response.status(400).json({ ok: false, reason: "Choose another active Halieus player." }); return; }
    if (recipient.visibility === "hidden" && auth.account.role === "player") { response.status(404).json({ ok: false, reason: "Player not found." }); return; }
    const room = activeRoomForInvite(game, roomCode);
    if (!room) { response.status(404).json({ ok: false, reason: "That game room is no longer active." }); return; }
    const aliases = accountAliases(auth.account);
    if (!room.humanPlayers.some((name) => aliases.has(name.trim().toLowerCase()))) {
      response.status(403).json({ ok: false, reason: "You can only invite friends to a room you are currently playing in." }); return;
    }
    const now = Date.now();
    const existing = store.gameInvites.find((invite) => invite.senderAccountId === auth.account.id && invite.recipientAccountId === recipient.id && invite.game === room.game && invite.roomCode === room.code && !invite.dismissedAt && invite.expiresAt > now);
    if (existing) { response.json({ ok: true, invite: existing }); return; }
    const invite: StoredGameInvite = {
      id: id("game-invite"), senderAccountId: auth.account.id, senderDisplayName: auth.account.displayName, recipientAccountId: recipient.id,
      game: room.game, gameTitle: room.gameTitle, roomCode: room.code, createdAt: now, expiresAt: now + 2 * 60 * 60 * 1000, dismissedAt: null,
    };
    store.gameInvites.push(invite);
    await saveStore();
    response.status(201).json({ ok: true, invite: (({ dismissedAt: _dismissedAt, ...item }) => item)(invite) });
  });

  app.post("/accounts/game-invites/:inviteId/dismiss", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const invite = store.gameInvites.find((candidate) => candidate.id === request.params.inviteId && candidate.recipientAccountId === auth.account.id);
    if (!invite) { response.status(404).json({ ok: false, reason: "Game invite not found." }); return; }
    invite.dismissedAt = Date.now();
    await saveStore();
    response.json({ ok: true });
  });

  app.get("/accounts/game-requests", (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    expireGameRequests();
    const requests = store.gameRequests
      .filter((item) => item.senderAccountId === auth.account.id || item.recipientAccountId === auth.account.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);
    response.json({ ok: true, requests });
  });

  app.post("/accounts/game-requests", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const recipientAccountId = typeof request.body?.recipientAccountId === "string" ? request.body.recipientAccountId.trim() : "";
    const game = typeof request.body?.game === "string" ? request.body.game.trim() as HalieusGameRequestSummary["game"] : "mega-board";
    const recipient = store.accounts.find((candidate) => candidate.id === recipientAccountId && candidate.status === "active");
    if (!recipient || recipient.id === auth.account.id) { response.status(400).json({ ok: false, reason: "Choose another active Halieus player." }); return; }
    if (recipient.visibility === "hidden" && auth.account.role === "player") { response.status(404).json({ ok: false, reason: "Player not found." }); return; }
    if (!GAME_TITLES[game]) { response.status(400).json({ ok: false, reason: "Choose a supported game." }); return; }
    const now = Date.now();
    const existing = store.gameRequests.find((item) => item.senderAccountId === auth.account.id && item.recipientAccountId === recipient.id && item.game === game && item.status === "pending" && item.expiresAt > now);
    if (existing) { response.json({ ok: true, request: existing }); return; }
    const item: StoredGameRequest = {
      id: id("game-request"), senderAccountId: auth.account.id, senderDisplayName: auth.account.displayName, recipientAccountId: recipient.id, recipientDisplayName: recipient.displayName,
      game, gameTitle: GAME_TITLES[game], status: "pending", createdAt: now, expiresAt: now + 24 * 60 * 60 * 1000, respondedAt: null, roomCode: null,
    };
    store.gameRequests.push(item);
    addAudit(auth.account.id, "game-request.created", "account", recipient.id, `${auth.account.displayName} requested ${recipient.displayName} for ${item.gameTitle}.`);
    await saveStore();
    response.status(201).json({ ok: true, request: item });
  });

  app.post("/accounts/game-requests/:requestId/respond", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    expireGameRequests();
    const item = store.gameRequests.find((candidate) => candidate.id === request.params.requestId && candidate.recipientAccountId === auth.account.id);
    const action = request.body?.action === "accept" ? "accepted" : request.body?.action === "decline" ? "declined" : null;
    if (!item || item.status !== "pending" || !action) { response.status(400).json({ ok: false, reason: "That game request is no longer pending." }); return; }
    item.status = action; item.respondedAt = Date.now();
    if (action === "accepted" && !item.roomCode) item.roomCode = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
    addAudit(auth.account.id, `game-request.${action}`, "account", item.senderAccountId, `${auth.account.displayName} ${action} ${item.senderDisplayName}'s ${item.gameTitle} request.`);
    await saveStore(); response.json({ ok: true, request: item });
  });

  app.post("/accounts/game-requests/:requestId/cancel", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const item = store.gameRequests.find((candidate) => candidate.id === request.params.requestId && candidate.senderAccountId === auth.account.id);
    if (!item || item.status !== "pending") { response.status(400).json({ ok: false, reason: "That game request cannot be cancelled." }); return; }
    item.status = "cancelled"; item.respondedAt = Date.now();
    await saveStore(); response.json({ ok: true, request: item });
  });

  // Accepted requests are launch intents, not permanent cards. Once either participant opens
  // the agreed room, mark the request closed so leaving that room cannot resurrect the card.
  app.post("/accounts/game-requests/:requestId/close", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const item = store.gameRequests.find((candidate) => candidate.id === request.params.requestId && (candidate.senderAccountId === auth.account.id || candidate.recipientAccountId === auth.account.id));
    if (!item || item.status !== "accepted") { response.status(400).json({ ok: false, reason: "That accepted game request is no longer open." }); return; }
    item.status = "closed"; item.respondedAt = Date.now();
    addAudit(auth.account.id, "game-request.closed", "account", item.senderAccountId === auth.account.id ? item.recipientAccountId : item.senderAccountId, `${auth.account.displayName} opened the accepted ${item.gameTitle} request.`);
    await saveStore(); response.json({ ok: true, request: item });
  });

  async function cosmeticState(account: StoredAccount) {
    const progression = await readPlayerProgression(account.id);
    const stats = { played: progression.played, wins: progression.wins, winRate: 0, recent: [], byGame: Object.entries(progression.byGame).map(([game, line]) => ({ game, gameTitle: game, ...line, winRate: 0 })) } as HalieusPersonalStats;
    const rating = getRankedLeaderboard().find(entry => [account.displayName, ...(account.displayNameAliases ?? [])].some(name => normaliseRankedPlayerKey(name) === entry.playerKey))?.rating ?? 0;
    const entitlements = SKIN_CATALOG.filter(skin => isSkinUnlocked(skin, { stats, ratings: { "mega-board": rating }, achievements: progression.awards.map(award => award.id) }, false)).map(skin => skin.id);
    const preferences = { ...DEFAULT_SKIN_PREFERENCES, ...account.skins };
    for (const slot of Object.keys(preferences) as HalieusSkinSlot[]) if (!entitlements.includes(preferences[slot])) preferences[slot] = DEFAULT_SKIN_PREFERENCES[slot];
    return { preferences, entitlements };
  }
  app.get("/accounts/me/cosmetics", async (request, response) => {
    const auth = currentSession(request); if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    response.json({ ok: true, ...await cosmeticState(auth.account) });
  });
  app.post("/accounts/me/cosmetics", async (request, response) => {
    const auth = currentSession(request); if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const state = await cosmeticState(auth.account);
    const skin = SKIN_CATALOG.find(skin => skin.slot === request.body?.slot && skin.id === request.body?.id);
    if (!skin || !state.entitlements.includes(skin.id)) { response.status(403).json({ ok: false, reason: "That cosmetic has not been earned." }); return; }
    auth.account.skins = { ...state.preferences, [skin.slot]: skin.id }; await saveStore();
    response.json({ ok: true, preferences: auth.account.skins, entitlements: state.entitlements });
  });

  app.get("/accounts/me/stats", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    response.json({ ok: true, stats: await personalStats(auth.account) });
  });

  app.get("/accounts/word-game/leaderboard", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    response.json({ ok: true, leaderboard: await wordGameLeaderboard(auth.account) });
  });

  app.get("/accounts/me/quick-play", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    response.json({ ok: true, profile: await quickPlayProfile(auth.account) });
  });

  app.get("/accounts/players/:accountId/stats", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const account = store.accounts.find((candidate) => candidate.id === request.params.accountId && candidate.status === "active");
    if (account && account.visibility === "hidden" && account.id !== auth.account.id && auth.account.role === "player") { response.status(404).json({ ok: false, reason: "Player not found." }); return; }
    if (!account) { response.status(404).json({ ok: false, reason: "Player not found." }); return; }
    response.json({ ok: true, stats: await personalStats(account) });
  });

  app.post("/auth/setup-owner", async (request, response) => {
    if (!allowAuthAttempt(request, response, "owner-setup", 8)) return;
    if (store.accounts.some((account) => account.role === "owner" && account.status !== "deleted")) {
      response.status(409).json({ ok: false, reason: "The Halieus owner account has already been created." }); return;
    }
    const bootstrapCode = typeof request.body?.bootstrapCode === "string" ? request.body.bootstrapCode.trim().toUpperCase() : "";
    if (!store.ownerBootstrapHash || codeHash(bootstrapCode) !== store.ownerBootstrapHash) {
      response.status(403).json({ ok: false, reason: "That owner setup code is not valid." }); return;
    }
    const username = normaliseUsername(request.body?.username);
    const displayName = normaliseDisplayName(request.body?.displayName);
    if (!validUsername(username) || displayName.length < 2 || !validPassword(request.body?.password)) {
      response.status(400).json({ ok: false, reason: "Use a 3+ character username, display name, and a password of at least 10 characters." }); return;
    }
    const password = await hashPassword(request.body.password);
    const account: StoredAccount = {
      id: id("account"), username, displayName, role: "owner", status: "active", avatar: displayName.slice(0, 2).toUpperCase(), profilePicture: null, playerColor: "#2563eb",
      createdAt: Date.now(), lastLoginAt: null, passwordSalt: password.salt, passwordHash: password.hash, createdViaInviteId: null, displayNameAliases: [displayName],
    };
    store.accounts.push(account);
    store.ownerBootstrapHash = null; store.ownerBootstrapCreatedAt = null;
    addAudit(account.id, "owner.created", "account", account.id, `${displayName} created the Halieus owner account.`);
    if (existsSync(bootstrapCodePath)) await rm(bootstrapCodePath, { force: true });
    await createSession(request, response, account);
    response.status(201).json({ ok: true, account: publicAccount(account) });
  });

  app.post("/auth/login", async (request, response) => {
    if (!allowAuthAttempt(request, response, "login", 12)) return;
    cleanExpiredSessions();
    const username = normaliseUsername(request.body?.username);
    const password = typeof request.body?.password === "string" ? request.body.password : "";
    const account = store.accounts.find((candidate) => candidate.username === username && candidate.status !== "deleted");
    if (!account || !password || !(await verifyPassword(password, account))) {
      response.status(401).json({ ok: false, reason: "Username or password is incorrect." }); return;
    }
    if (account.status === "suspended") {
      response.status(403).json({ ok: false, reason: "This Halieus account is suspended." }); return;
    }
    addAudit(account.id, "session.login", "session", null, `${account.displayName} signed in.`);
    await createSession(request, response, account);
    response.json({ ok: true, account: publicAccount(account) });
  });

  app.post("/auth/profile", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const username = normaliseUsername(request.body?.username ?? auth.account.username);
    const displayName = normaliseDisplayName(request.body?.displayName);
    const avatarRaw = typeof request.body?.avatar === "string" ? request.body.avatar.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) : "";
    const playerColorRaw = typeof request.body?.playerColor === "string" ? request.body.playerColor.trim() : "";
    const profilePictureRaw = request.body?.profilePicture === null ? null : typeof request.body?.profilePicture === "string" ? request.body.profilePicture.trim() : undefined;
    if (!validUsername(username)) { response.status(400).json({ ok: false, reason: "Username must be 3–32 characters and can use letters, numbers, dots, underscores and hyphens." }); return; }
    if (accountConflict(username, auth.account.id)) { response.status(409).json({ ok: false, reason: "That username is already reserved." }); return; }
    if (displayName.length < 2) { response.status(400).json({ ok: false, reason: "Display name must be at least 2 characters." }); return; }
    if (playerColorRaw && !/^#[0-9a-f]{6}$/i.test(playerColorRaw)) { response.status(400).json({ ok: false, reason: "Player colour is invalid." }); return; }
    if (typeof profilePictureRaw === "string" && (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(profilePictureRaw) || profilePictureRaw.length > 1_400_000)) { response.status(400).json({ ok: false, reason: "Profile picture must be a PNG, JPEG or WebP under 1 MB." }); return; }
    const previousUsername = auth.account.username;
    const previousDisplayName = auth.account.displayName;
    auth.account.displayNameAliases = [...new Set([...(auth.account.displayNameAliases ?? []), previousDisplayName, displayName])].slice(-12);
    auth.account.username = username;
    auth.account.displayName = displayName;
    auth.account.avatar = avatarRaw || displayName.slice(0, 2).toUpperCase();
    if (profilePictureRaw !== undefined) auth.account.profilePicture = profilePictureRaw;
    if (playerColorRaw) auth.account.playerColor = playerColorRaw;
    if (previousUsername !== username) {
      addAudit(auth.account.id, "account.username-changed", "account", auth.account.id, `${displayName} changed their username from @${previousUsername} to @${username}.`);
    }
    addAudit(auth.account.id, "account.profile-updated", "account", auth.account.id, `${displayName} updated their player profile.`);
    await saveStore();
    response.json({ ok: true, account: publicAccount(auth.account) });
  });

  app.post("/auth/change-password", async (request, response) => {
    const auth = currentSession(request);
    if (!auth) { response.status(401).json({ ok: false, reason: "Sign in first." }); return; }
    const currentPassword = typeof request.body?.currentPassword === "string" ? request.body.currentPassword : "";
    const newPassword = request.body?.newPassword;
    if (!(await verifyPassword(currentPassword, auth.account)) || !validPassword(newPassword)) {
      response.status(400).json({ ok: false, reason: "Current password is incorrect or the new password is shorter than 10 characters." }); return;
    }
    const password = await hashPassword(newPassword);
    auth.account.passwordSalt = password.salt; auth.account.passwordHash = password.hash;
    store.sessions = store.sessions.filter((session) => session.id === auth.session.id || session.accountId !== auth.account.id);
    addAudit(auth.account.id, "account.password-changed", "account", auth.account.id, `${auth.account.displayName} changed their password.`);
    await saveStore(); response.json({ ok: true });
  });

  app.post("/auth/logout", async (request, response) => {
    const auth = currentSession(request);
    if (auth) {
      store.sessions = store.sessions.filter((session) => session.id !== auth.session.id);
      addAudit(auth.account.id, "session.logout", "session", auth.session.id, `${auth.account.displayName} signed out.`);
      await saveStore();
    }
    clearSessionCookie(request, response);
    response.json({ ok: true });
  });

  app.post("/auth/redeem-invite", async (request, response) => {
    if (!allowAuthAttempt(request, response, "redeem-invite", 10)) return;
    const inviteCode = typeof request.body?.inviteCode === "string" ? request.body.inviteCode.trim().toUpperCase() : "";
    const invite = store.invites.find((candidate) => candidate.codeHash === codeHash(inviteCode));
    const now = Date.now();
    if (!invite || invite.revokedAt || invite.usedAt || (invite.expiresAt && invite.expiresAt <= now)) {
      response.status(403).json({ ok: false, reason: "That account invite is invalid, expired, revoked, or already used." }); return;
    }
    const username = normaliseUsername(request.body?.username);
    const displayName = normaliseDisplayName(request.body?.displayName);
    if (!validUsername(username) || displayName.length < 2 || !validPassword(request.body?.password)) {
      response.status(400).json({ ok: false, reason: "Use a 3+ character username, display name, and a password of at least 10 characters." }); return;
    }
    if (accountConflict(username)) { response.status(409).json({ ok: false, reason: "That username is already reserved." }); return; }
    const password = await hashPassword(request.body.password);
    const account: StoredAccount = {
      id: id("account"), username, displayName, role: "player", status: "active", avatar: displayName.slice(0, 2).toUpperCase(), profilePicture: null, playerColor: "#16a34a",
      createdAt: now, lastLoginAt: null, passwordSalt: password.salt, passwordHash: password.hash, createdViaInviteId: invite.id, displayNameAliases: [displayName],
    };
    store.accounts.push(account); invite.usedAt = now; invite.usedByAccountId = account.id;
    addAudit(account.id, "account.created.invite", "account", account.id, `${displayName} created an account using invite “${invite.label}”.`);
    await createSession(request, response, account);
    response.status(201).json({ ok: true, account: publicAccount(account) });
  });

  app.post("/auth/request-access", async (request, response) => {
    if (!allowAuthAttempt(request, response, "access-request", 6)) return;
    const displayName = normaliseDisplayName(request.body?.displayName);
    const preferredUsername = normaliseUsername(request.body?.preferredUsername);
    const note = normaliseNote(request.body?.note);
    if (displayName.length < 2 || (preferredUsername && !validUsername(preferredUsername))) {
      response.status(400).json({ ok: false, reason: "Enter your name and an optional valid username." }); return;
    }
    const duplicate = store.accessRequests.find((candidate) => candidate.status === "pending" && candidate.displayName.toLowerCase() === displayName.toLowerCase());
    if (duplicate) { response.status(409).json({ ok: false, reason: "A pending request already exists for that name." }); return; }
    const accessRequest: HalieusAccessRequestSummary = {
      id: id("request"), displayName, preferredUsername, note, createdAt: Date.now(), status: "pending", reviewedAt: null, reviewedByAccountId: null,
    };
    store.accessRequests.push(accessRequest);
    addAudit(null, "access-request.created", "access-request", accessRequest.id, `${displayName} requested Halieus access.`);
    await saveStore(); response.status(201).json({ ok: true });
  });

  app.post("/auth/reset-password", async (request, response) => {
    if (!allowAuthAttempt(request, response, "reset-password", 10)) return;
    const resetCode = typeof request.body?.resetCode === "string" ? request.body.resetCode.trim().toUpperCase() : "";
    const reset = store.passwordResets.find((candidate) => candidate.codeHash === codeHash(resetCode));
    const now = Date.now();
    if (!reset || reset.usedAt || reset.expiresAt <= now || !validPassword(request.body?.password)) {
      response.status(403).json({ ok: false, reason: "That reset code is invalid or expired, or the new password is too short." }); return;
    }
    const account = store.accounts.find((candidate) => candidate.id === reset.accountId && candidate.status !== "deleted");
    if (!account) { response.status(404).json({ ok: false, reason: "That account no longer exists." }); return; }
    const password = await hashPassword(request.body.password);
    account.passwordSalt = password.salt; account.passwordHash = password.hash; reset.usedAt = now;
    store.sessions = store.sessions.filter((session) => session.accountId !== account.id);
    addAudit(account.id, "account.password-reset", "account", account.id, `${account.displayName} reset their password with an administrator-issued code.`);
    await createSession(request, response, account);
    response.json({ ok: true, account: publicAccount(account) });
  });

  app.get("/admin/snapshot", (request, response) => {
    if (!requireAdmin(request, response)) return;
    response.json({ ok: true, ...adminSnapshot() });
  });

  app.get("/admin/rooms/status", (request, response) => {
    if (!requireAdmin(request, response)) return;
    response.json({ ok: true, activeRooms: adminRuntimeControls?.getRoomCount() ?? 0 });
  });

  app.post("/admin/rooms/close-all", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    if (!adminRuntimeControls) { response.status(503).json({ ok: false, reason: "Room controls are not ready." }); return; }
    const result = await adminRuntimeControls.closeAllRooms(publicAccount(actor));
    addAudit(actor.id, "rooms.close-all", "system", null, `${actor.displayName} closed ${result.closed} live Halieus room${result.closed === 1 ? "" : "s"}.`);
    await saveStore();
    response.json({ ok: true, closed: result.closed });
  });

  app.post("/admin/invites", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const label = normaliseDisplayName(request.body?.label) || "Player invite";
    const expiryDaysRaw = Number(request.body?.expiryDays);
    const expiryMs = Number.isFinite(expiryDaysRaw) && expiryDaysRaw > 0 ? Math.min(expiryDaysRaw, 365) * 86400000 : INVITE_DEFAULT_MS;
    const rawCode = safeCode("HGR"); const now = Date.now();
    const invite: StoredInvite = {
      id: id("invite"), label, codeHash: codeHash(rawCode), codeLast4: rawCode.slice(-4), revealCode: rawCode, createdAt: now, expiresAt: now + expiryMs,
      usedAt: null, usedByAccountId: null, revokedAt: null, createdByAccountId: actor.id,
    };
    store.invites.push(invite); addAudit(actor.id, "invite.created", "invite", invite.id, `${actor.displayName} created invite “${label}”.`);
    await saveStore(); response.status(201).json({ ok: true, code: rawCode, invite: adminSnapshot().invites.find((candidate) => candidate.id === invite.id) });
  });

  app.get("/admin/invites/:inviteId/code", (request, response) => {
    if (!requireAdmin(request, response)) return;
    const invite = store.invites.find((candidate) => candidate.id === request.params.inviteId);
    if (!invite) { response.status(404).json({ ok: false, reason: "Invite not found." }); return; }
    if (!invite.revealCode) {
      response.status(409).json({ ok: false, reason: "This invitation was created before full-code history was enabled, so its original code cannot be recovered." }); return;
    }
    response.json({ ok: true, code: invite.revealCode });
  });

  app.post("/admin/invites/:inviteId/revoke", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const invite = store.invites.find((candidate) => candidate.id === request.params.inviteId);
    if (!invite) { response.status(404).json({ ok: false, reason: "Invite not found." }); return; }
    if (!invite.usedAt) { invite.revokedAt = Date.now(); }
    addAudit(actor.id, "invite.revoked", "invite", invite.id, `${actor.displayName} revoked invite “${invite.label}”.`);
    await saveStore(); response.json({ ok: true });
  });

  app.post("/admin/access-requests/:requestId/approve", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const accessRequest = store.accessRequests.find((candidate) => candidate.id === request.params.requestId);
    if (!accessRequest || accessRequest.status !== "pending") { response.status(404).json({ ok: false, reason: "Pending access request not found." }); return; }
    const rawCode = safeCode("HGR"); const now = Date.now();
    const invite: StoredInvite = { id: id("invite"), label: `Approved: ${accessRequest.displayName}`, codeHash: codeHash(rawCode), codeLast4: rawCode.slice(-4), revealCode: rawCode, createdAt: now, expiresAt: now + INVITE_DEFAULT_MS, usedAt: null, usedByAccountId: null, revokedAt: null, createdByAccountId: actor.id };
    store.invites.push(invite); accessRequest.status = "approved"; accessRequest.reviewedAt = now; accessRequest.reviewedByAccountId = actor.id;
    addAudit(actor.id, "access-request.approved", "access-request", accessRequest.id, `${actor.displayName} approved access for ${accessRequest.displayName}.`);
    await saveStore(); response.json({ ok: true, code: rawCode });
  });

  app.post("/admin/access-requests/:requestId/decline", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const accessRequest = store.accessRequests.find((candidate) => candidate.id === request.params.requestId);
    if (!accessRequest || accessRequest.status !== "pending") { response.status(404).json({ ok: false, reason: "Pending access request not found." }); return; }
    accessRequest.status = "declined"; accessRequest.reviewedAt = Date.now(); accessRequest.reviewedByAccountId = actor.id;
    addAudit(actor.id, "access-request.declined", "access-request", accessRequest.id, `${actor.displayName} declined access for ${accessRequest.displayName}.`);
    await saveStore(); response.json({ ok: true });
  });

  app.post("/admin/accounts/:accountId/status", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const account = store.accounts.find((candidate) => candidate.id === request.params.accountId);
    const status = request.body?.status as HalieusAccountStatus;
    if (!account || !["active", "suspended", "deleted"].includes(status)) { response.status(400).json({ ok: false, reason: "Account or status is invalid." }); return; }
    if (account.role === "owner" && status !== "active") { response.status(400).json({ ok: false, reason: "The owner account cannot be suspended or deleted." }); return; }
    account.status = status;
    if (status !== "active") store.sessions = store.sessions.filter((session) => session.accountId !== account.id);
    addAudit(actor.id, `account.${status}`, "account", account.id, `${actor.displayName} set ${account.displayName} to ${status}.`);
    await saveStore(); response.json({ ok: true });
  });

  app.post("/admin/accounts/:accountId/visibility", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const account = store.accounts.find((candidate) => candidate.id === request.params.accountId && candidate.status !== "deleted");
    const visibility = request.body?.visibility as HalieusPlayerVisibility;
    if (!account || !["visible", "hidden"].includes(visibility)) { response.status(400).json({ ok: false, reason: "Account or visibility is invalid." }); return; }
    if (account.role === "owner" && visibility === "hidden") { response.status(400).json({ ok: false, reason: "The owner account must remain visible." }); return; }
    account.visibility = visibility;
    addAudit(actor.id, `account.visibility.${visibility}`, "account", account.id, `${actor.displayName} made ${account.displayName} ${visibility}.`);
    await saveStore(); response.json({ ok: true });
  });

  app.post("/admin/accounts/:accountId/role", async (request, response) => {
    const actor = requireOwner(request, response); if (!actor) return;
    const account = store.accounts.find((candidate) => candidate.id === request.params.accountId);
    const role = request.body?.role as HalieusAccountRole;
    if (!account || !["admin", "player"].includes(role) || account.role === "owner") { response.status(400).json({ ok: false, reason: "That role change is not allowed." }); return; }
    account.role = role;
    addAudit(actor.id, "account.role-changed", "account", account.id, `${actor.displayName} changed ${account.displayName} to ${role}.`);
    await saveStore(); response.json({ ok: true });
  });

  app.post("/admin/accounts/:accountId/revoke-sessions", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const account = store.accounts.find((candidate) => candidate.id === request.params.accountId);
    if (!account) { response.status(404).json({ ok: false, reason: "Account not found." }); return; }
    store.sessions = store.sessions.filter((session) => session.accountId !== account.id);
    addAudit(actor.id, "account.sessions-revoked", "account", account.id, `${actor.displayName} signed ${account.displayName} out on every device.`);
    await saveStore(); response.json({ ok: true });
  });

  app.post("/admin/accounts/:accountId/password-reset", async (request, response) => {
    const actor = requireAdmin(request, response); if (!actor) return;
    const account = store.accounts.find((candidate) => candidate.id === request.params.accountId && candidate.status !== "deleted");
    if (!account) { response.status(404).json({ ok: false, reason: "Account not found." }); return; }
    const rawCode = safeCode("RESET"); const now = Date.now();
    const reset: StoredPasswordReset = { id: id("reset"), accountId: account.id, codeHash: codeHash(rawCode), codeLast4: rawCode.slice(-4), createdAt: now, expiresAt: now + RESET_DEFAULT_MS, usedAt: null, createdByAccountId: actor.id };
    store.passwordResets.push(reset);
    addAudit(actor.id, "account.reset-issued", "account", account.id, `${actor.displayName} issued a one-time password reset for ${account.displayName}.`);
    await saveStore(); response.status(201).json({ ok: true, code: rawCode, expiresAt: reset.expiresAt });
  });
}
