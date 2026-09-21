import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Express, Request, Response } from "express";

import type { HalieusAccountSummary, HalieusGameStatLine } from "../../../shared/platform/accounts.js";
import type {
  HalieusGuildDetail,
  HalieusGuildLeaderboardEntry,
  HalieusGuildMember,
  HalieusGuildMessage,
  HalieusGuildRole,
  HalieusGuildRoom,
  HalieusGuildRoomPolicy,
  HalieusGuildSummary,
} from "../../../shared/platform/guilds.js";
import { getGuildDataDirectory } from "./dataPaths.js";

type GuildAuthResolver = (request: Request) => HalieusAccountSummary | null;

interface StoredGuild {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  roomCreationPolicy: HalieusGuildRoomPolicy;
  inviteCodeHash: string;
  inviteCodeReveal: string;
  members: HalieusGuildMember[];
  messages: HalieusGuildMessage[];
  rooms: HalieusGuildRoom[];
}

interface GuildStore {
  version: 1;
  guilds: StoredGuild[];
}

const MAX_MESSAGES_PER_GUILD = 500;
const MAX_ROOMS_PER_GUILD = 300;
const dataDirectory = getGuildDataDirectory();
const storePath = resolve(dataDirectory, "guilds.json");

let store: GuildStore = { version: 1, guilds: [] };
let saveQueue: Promise<void> = Promise.resolve();

const GAME_TITLES: Record<HalieusGameStatLine["game"], string> = {
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

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
}

function normaliseName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 48) : "";
}

function normaliseDescription(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 240) : "";
}

function normaliseMessage(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 600) : "";
}

function inviteHash(value: string): string {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

function makeInviteCode(): string {
  const body = randomBytes(8).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(8, "X").slice(0, 8);
  return `GUILD-${body.slice(0, 4)}-${body.slice(4)}`;
}

function makeRoomCode(): string {
  const used = new Set(store.guilds.flatMap((guild) => guild.rooms.map((room) => room.roomCode)));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = randomBytes(6).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (candidate.length === 6 && !used.has(candidate)) return candidate;
  }
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

function memberFromAccount(account: HalieusAccountSummary, role: HalieusGuildRole): HalieusGuildMember {
  return {
    accountId: account.id,
    username: account.username,
    displayName: account.displayName,
    avatar: account.avatar,
    profilePicture: account.profilePicture,
    playerColor: account.playerColor,
    role,
    joinedAt: Date.now(),
  };
}

function memberFor(guild: StoredGuild, accountId: string): HalieusGuildMember | null {
  return guild.members.find((member) => member.accountId === accountId) ?? null;
}

function canManage(role: HalieusGuildRole): boolean {
  return role === "owner" || role === "admin";
}

function canCreateRoom(role: HalieusGuildRole, policy: HalieusGuildRoomPolicy): boolean {
  if (role === "owner" || role === "admin") return true;
  if (policy === "admins") return false;
  if (role === "moderator") return true;
  return policy === "members";
}

function leaderboardFor(guild: StoredGuild): HalieusGuildLeaderboardEntry[] {
  return guild.members
    .map((member) => {
      const aliases = new Set([member.displayName, member.username].map((value) => value.trim().toLowerCase()));
      const completed = guild.rooms.filter((room) =>
        room.status === "completed" &&
        (
          room.participantAccountIds?.includes(member.accountId) ||
          room.participants.some((name) => aliases.has(name.trim().toLowerCase()))
        ),
      );
      const wins = completed.filter((room) =>
        room.winnerAccountId === member.accountId ||
        Boolean(room.winner && aliases.has(room.winner.trim().toLowerCase())),
      ).length;
      const hosted = guild.rooms.filter((room) => room.createdByAccountId === member.accountId).length;
      return {
        accountId: member.accountId,
        displayName: member.displayName,
        playerColor: member.playerColor,
        played: completed.length,
        wins,
        winRate: completed.length ? Math.round((wins / completed.length) * 100) : 0,
        hosted,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.played - a.played || b.hosted - a.hosted || a.displayName.localeCompare(b.displayName));
}

function summaryFor(guild: StoredGuild, accountId: string): HalieusGuildSummary | null {
  const member = memberFor(guild, accountId);
  if (!member) return null;
  const manager = canManage(member.role);
  return {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    createdAt: guild.createdAt,
    updatedAt: guild.updatedAt,
    role: member.role,
    memberCount: guild.members.length,
    roomCount: guild.rooms.length,
    roomCreationPolicy: guild.roomCreationPolicy,
    canManage: manager,
    canCreateRooms: canCreateRoom(member.role, guild.roomCreationPolicy),
    inviteCode: manager ? guild.inviteCodeReveal : null,
  };
}

function detailFor(guild: StoredGuild, accountId: string): HalieusGuildDetail | null {
  const summary = summaryFor(guild, accountId);
  if (!summary) return null;
  return {
    ...summary,
    members: guild.members.slice().sort((a, b) => {
      const weight: Record<HalieusGuildRole, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };
      return weight[b.role] - weight[a.role] || a.displayName.localeCompare(b.displayName);
    }),
    rooms: guild.rooms.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 80),
    messages: guild.messages.slice(-100),
    leaderboard: leaderboardFor(guild),
  };
}

async function saveStore(): Promise<void> {
  const snapshot = JSON.stringify(store, null, 2);
  saveQueue = saveQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const temporary = `${storePath}.tmp`;
    await writeFile(temporary, snapshot, "utf8");
    await rename(temporary, storePath);
  });
  return saveQueue;
}

export async function loadGuildStore(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  if (!existsSync(storePath)) {
    await saveStore();
    return;
  }

  const parsed = JSON.parse(await readFile(storePath, "utf8")) as Partial<GuildStore>;
  store = {
    version: 1,
    guilds: Array.isArray(parsed.guilds) ? parsed.guilds as StoredGuild[] : [],
  };

  // Older/future-tolerant normalisation keeps a partially written optional
  // field from taking the entire social layer offline after a deployment.
  for (const guild of store.guilds) {
    guild.description = typeof guild.description === "string" ? guild.description : "";
    guild.roomCreationPolicy = guild.roomCreationPolicy === "admins" || guild.roomCreationPolicy === "moderators"
      ? guild.roomCreationPolicy
      : "members";
    guild.members = Array.isArray(guild.members) ? guild.members : [];
    guild.messages = Array.isArray(guild.messages) ? guild.messages.slice(-MAX_MESSAGES_PER_GUILD) : [];
    guild.rooms = Array.isArray(guild.rooms) ? guild.rooms.slice(-MAX_ROOMS_PER_GUILD) : [];
    for (const room of guild.rooms) {
      room.participants = Array.isArray(room.participants) ? room.participants : [];
      room.participantAccountIds = Array.isArray(room.participantAccountIds) ? room.participantAccountIds : [];
      room.winnerAccountId = typeof room.winnerAccountId === "string" ? room.winnerAccountId : null;
    }
  }
  await saveStore();
}

function requireAccount(resolveAccount: GuildAuthResolver, request: Request, response: Response): HalieusAccountSummary | null {
  const account = resolveAccount(request);
  if (!account) {
    response.status(401).json({ ok: false, reason: "Sign in first." });
    return null;
  }
  return account;
}

function requireGuildMember(guildId: string, account: HalieusAccountSummary, response: Response): { guild: StoredGuild; member: HalieusGuildMember } | null {
  const guild = store.guilds.find((candidate) => candidate.id === guildId);
  const member = guild ? memberFor(guild, account.id) : null;
  if (!guild || !member) {
    response.status(404).json({ ok: false, reason: "Guild not found." });
    return null;
  }
  return { guild, member };
}

/**
 * Guild rooms reserve a normal HGR room code; the existing game module still
 * creates and validates the actual live room. This keeps one authoritative
 * room/game stack instead of inventing a second multiplayer implementation.
 */
export function registerGuildRoutes(app: Express, resolveAccount: GuildAuthResolver): void {
  app.get("/guilds", (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const guilds = store.guilds
      .map((guild) => summaryFor(guild, account.id))
      .filter((guild): guild is HalieusGuildSummary => Boolean(guild))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    response.json({ ok: true, guilds });
  });

  app.post("/guilds", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;

    const name = normaliseName(request.body?.name);
    const description = normaliseDescription(request.body?.description);
    const roomCreationPolicy: HalieusGuildRoomPolicy =
      request.body?.roomCreationPolicy === "admins" || request.body?.roomCreationPolicy === "moderators"
        ? request.body.roomCreationPolicy
        : "members";

    if (name.length < 3) {
      response.status(400).json({ ok: false, reason: "Guild names need at least 3 characters." });
      return;
    }

    const inviteCode = makeInviteCode();
    const now = Date.now();
    const guild: StoredGuild = {
      id: id("guild"),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      roomCreationPolicy,
      inviteCodeHash: inviteHash(inviteCode),
      inviteCodeReveal: inviteCode,
      members: [memberFromAccount(account, "owner")],
      messages: [],
      rooms: [],
    };
    store.guilds.push(guild);
    await saveStore();
    response.status(201).json({ ok: true, guild: detailFor(guild, account.id) });
  });

  app.post("/guilds/join", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const code = typeof request.body?.inviteCode === "string" ? request.body.inviteCode.trim().toUpperCase() : "";
    const guild = store.guilds.find((candidate) => candidate.inviteCodeHash === inviteHash(code));
    if (!guild) {
      response.status(404).json({ ok: false, reason: "That guild invite code is not valid." });
      return;
    }

    const existing = memberFor(guild, account.id);
    if (!existing) {
      guild.members.push(memberFromAccount(account, "member"));
      guild.updatedAt = Date.now();
      guild.messages.push({
        id: id("guild-message"),
        guildId: guild.id,
        senderAccountId: account.id,
        senderDisplayName: account.displayName,
        body: `${account.displayName} joined the guild.`,
        createdAt: Date.now(),
      });
      guild.messages = guild.messages.slice(-MAX_MESSAGES_PER_GUILD);
      await saveStore();
    }
    response.json({ ok: true, guild: detailFor(guild, account.id) });
  });

  app.get("/guilds/:guildId", (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const membership = requireGuildMember(request.params.guildId, account, response);
    if (!membership) return;
    response.json({ ok: true, guild: detailFor(membership.guild, account.id) });
  });

  app.post("/guilds/:guildId/messages", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const membership = requireGuildMember(request.params.guildId, account, response);
    if (!membership) return;
    const body = normaliseMessage(request.body?.body);
    if (!body) {
      response.status(400).json({ ok: false, reason: "Write a message first." });
      return;
    }

    const message: HalieusGuildMessage = {
      id: id("guild-message"),
      guildId: membership.guild.id,
      senderAccountId: account.id,
      senderDisplayName: account.displayName,
      body,
      createdAt: Date.now(),
    };
    membership.guild.messages.push(message);
    membership.guild.messages = membership.guild.messages.slice(-MAX_MESSAGES_PER_GUILD);
    membership.guild.updatedAt = Date.now();
    await saveStore();
    response.status(201).json({ ok: true, message });
  });

  app.post("/guilds/:guildId/rooms", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const membership = requireGuildMember(request.params.guildId, account, response);
    if (!membership) return;
    if (!canCreateRoom(membership.member.role, membership.guild.roomCreationPolicy)) {
      response.status(403).json({ ok: false, reason: "Your guild role cannot create rooms." });
      return;
    }

    const game = typeof request.body?.game === "string" && request.body.game in GAME_TITLES
      ? request.body.game as HalieusGameStatLine["game"]
      : null;
    if (!game) {
      response.status(400).json({ ok: false, reason: "Choose a supported HGR game." });
      return;
    }

    const now = Date.now();
    const room: HalieusGuildRoom = {
      id: id("guild-room"),
      guildId: membership.guild.id,
      game,
      gameTitle: GAME_TITLES[game],
      roomCode: makeRoomCode(),
      createdByAccountId: account.id,
      createdByDisplayName: account.displayName,
      status: "setup",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      winner: null,
      winnerAccountId: null,
      participants: [],
      participantAccountIds: [],
    };
    membership.guild.rooms.push(room);
    membership.guild.rooms = membership.guild.rooms.slice(-MAX_ROOMS_PER_GUILD);
    membership.guild.updatedAt = now;
    membership.guild.messages.push({
      id: id("guild-message"),
      guildId: membership.guild.id,
      senderAccountId: account.id,
      senderDisplayName: account.displayName,
      body: `${account.displayName} opened ${room.gameTitle} room ${room.roomCode}.`,
      createdAt: now,
    });
    membership.guild.messages = membership.guild.messages.slice(-MAX_MESSAGES_PER_GUILD);
    await saveStore();
    response.status(201).json({ ok: true, room, guild: detailFor(membership.guild, account.id) });
  });

  app.patch("/guilds/:guildId", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const membership = requireGuildMember(request.params.guildId, account, response);
    if (!membership) return;
    if (!canManage(membership.member.role)) {
      response.status(403).json({ ok: false, reason: "Guild admin access is required." });
      return;
    }

    if (request.body?.name !== undefined) {
      const name = normaliseName(request.body.name);
      if (name.length < 3) {
        response.status(400).json({ ok: false, reason: "Guild names need at least 3 characters." });
        return;
      }
      membership.guild.name = name;
    }
    if (request.body?.description !== undefined) {
      membership.guild.description = normaliseDescription(request.body.description);
    }
    if (request.body?.roomCreationPolicy !== undefined) {
      const policy = request.body.roomCreationPolicy;
      if (policy !== "members" && policy !== "moderators" && policy !== "admins") {
        response.status(400).json({ ok: false, reason: "Unknown room creation policy." });
        return;
      }
      membership.guild.roomCreationPolicy = policy;
    }
    membership.guild.updatedAt = Date.now();
    await saveStore();
    response.json({ ok: true, guild: detailFor(membership.guild, account.id) });
  });

  app.post("/guilds/:guildId/invite/regenerate", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const membership = requireGuildMember(request.params.guildId, account, response);
    if (!membership) return;
    if (!canManage(membership.member.role)) {
      response.status(403).json({ ok: false, reason: "Guild admin access is required." });
      return;
    }
    const code = makeInviteCode();
    membership.guild.inviteCodeHash = inviteHash(code);
    membership.guild.inviteCodeReveal = code;
    membership.guild.updatedAt = Date.now();
    await saveStore();
    response.json({ ok: true, guild: detailFor(membership.guild, account.id) });
  });

  app.post("/guilds/:guildId/members/:accountId/role", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const membership = requireGuildMember(request.params.guildId, account, response);
    if (!membership) return;
    if (!canManage(membership.member.role)) {
      response.status(403).json({ ok: false, reason: "Guild admin access is required." });
      return;
    }

    const target = memberFor(membership.guild, request.params.accountId);
    const nextRole = request.body?.role as HalieusGuildRole | undefined;
    if (!target || target.role === "owner" || target.accountId === account.id) {
      response.status(400).json({ ok: false, reason: "That guild role cannot be changed here." });
      return;
    }
    if (nextRole !== "admin" && nextRole !== "moderator" && nextRole !== "member") {
      response.status(400).json({ ok: false, reason: "Choose a valid guild role." });
      return;
    }
    if (membership.member.role === "admin" && (target.role === "admin" || nextRole === "admin")) {
      response.status(403).json({ ok: false, reason: "Only the guild owner can manage admins." });
      return;
    }
    target.role = nextRole;
    membership.guild.updatedAt = Date.now();
    await saveStore();
    response.json({ ok: true, guild: detailFor(membership.guild, account.id) });
  });

  app.delete("/guilds/:guildId/members/:accountId", async (request, response) => {
    const account = requireAccount(resolveAccount, request, response);
    if (!account) return;
    const membership = requireGuildMember(request.params.guildId, account, response);
    if (!membership) return;
    const target = memberFor(membership.guild, request.params.accountId);
    if (!target) {
      response.status(404).json({ ok: false, reason: "Guild member not found." });
      return;
    }
    if (target.role === "owner") {
      response.status(400).json({ ok: false, reason: "The guild owner cannot leave or be removed yet." });
      return;
    }

    const selfLeave = target.accountId === account.id;
    const managerRemoval = canManage(membership.member.role) && target.role !== "owner";
    if (!selfLeave && !managerRemoval) {
      response.status(403).json({ ok: false, reason: "Guild admin access is required." });
      return;
    }
    if (membership.member.role === "admin" && target.role === "admin" && !selfLeave) {
      response.status(403).json({ ok: false, reason: "Only the guild owner can remove another admin." });
      return;
    }

    membership.guild.members = membership.guild.members.filter((member) => member.accountId !== target.accountId);
    membership.guild.updatedAt = Date.now();
    await saveStore();
    response.json({ ok: true });
  });
}

/**
 * SessionArchive calls this after any HGR game finalises. A guild room is only
 * social metadata around a normal HGR room, so result association is by the
 * reserved game + room code pair rather than by a second game-state system.
 */
export async function recordGuildSessionResult(
  game: HalieusGameStatLine["game"],
  roomCode: string,
  archiveStatus: string,
  payload: unknown,
  summary: Record<string, unknown>,
): Promise<void> {
  const code = roomCode.trim().toUpperCase();
  const matches = store.guilds.flatMap((guild) =>
    guild.rooms
      .filter((room) => room.game === game && room.roomCode === code && room.status === "setup")
      .map((room) => ({ guild, room })),
  );
  if (!matches.length) return;

  const object = payload && typeof payload === "object" ? payload as Record<string, any> : {};
  const playerList = Array.isArray(object.players)
    ? object.players
    : Array.isArray(object.gameState?.players)
      ? object.gameState.players
      : [];
  const participants = [...new Set(playerList
    .map((player: any) => typeof player?.name === "string" && !player?.isAi ? player.name.trim() : "")
    .filter(Boolean))];
  const winner = typeof summary.winner === "string" && summary.winner.trim() ? summary.winner.trim() : null;
  const completed = archiveStatus === "completed" || archiveStatus === "forfeit-completed";
  const now = Date.now();

  for (const { guild, room } of matches) {
    const participantKeys = new Set(participants.map((name) => name.trim().toLowerCase()));
    const matchedParticipantIds = guild.members
      .filter((member) => participantKeys.has(member.displayName.trim().toLowerCase()) || participantKeys.has(member.username.trim().toLowerCase()))
      .map((member) => member.accountId);
    const winnerKey = winner?.trim().toLowerCase() ?? null;
    const winnerMember = winnerKey
      ? guild.members.find((member) => member.displayName.trim().toLowerCase() === winnerKey || member.username.trim().toLowerCase() === winnerKey)
      : null;

    room.status = completed ? "completed" : "ended";
    room.updatedAt = now;
    room.completedAt = now;
    room.winner = winner;
    room.winnerAccountId = winnerMember?.accountId ?? null;
    room.participants = participants;
    room.participantAccountIds = matchedParticipantIds;
    guild.updatedAt = now;
    guild.messages.push({
      id: id("guild-message"),
      guildId: guild.id,
      senderAccountId: "system",
      senderDisplayName: "Halieus",
      body: completed
        ? `${room.gameTitle} · ${room.roomCode} finished${winner ? ` — ${winner} won.` : "."}`
        : `${room.gameTitle} · ${room.roomCode} ended.`,
      createdAt: now,
    });
    guild.messages = guild.messages.slice(-MAX_MESSAGES_PER_GUILD);
  }
  await saveStore();
}
