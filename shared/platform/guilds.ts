import type { HalieusGameStatLine } from "./accounts.js";

export type HalieusGuildRole = "owner" | "admin" | "moderator" | "member";
export type HalieusGuildRoomPolicy = "members" | "moderators" | "admins";
export type HalieusGuildRoomStatus = "setup" | "completed" | "ended";

export type HalieusGuildInvitationStatus = "pending" | "accepted" | "declined";

export interface HalieusGuildInvitation {
  id: string;
  guildId: string;
  guildName: string;
  senderAccountId: string;
  senderDisplayName: string;
  recipientAccountId: string;
  recipientDisplayName: string;
  status: HalieusGuildInvitationStatus;
  createdAt: number;
  respondedAt: number | null;
}

export interface HalieusGuildMember {
  accountId: string;
  username: string;
  displayName: string;
  avatar: string;
  profilePicture: string | null;
  playerColor: string;
  role: HalieusGuildRole;
  joinedAt: number;
}

export interface HalieusGuildMessage {
  id: string;
  guildId: string;
  senderAccountId: string;
  senderDisplayName: string;
  body: string;
  createdAt: number;
}

export interface HalieusGuildRoom {
  id: string;
  guildId: string;
  game: HalieusGameStatLine["game"];
  gameTitle: string;
  roomCode: string;
  createdByAccountId: string;
  createdByDisplayName: string;
  status: HalieusGuildRoomStatus;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  winner: string | null;
  winnerAccountId: string | null;
  participants: string[];
  participantAccountIds: string[];
}

export interface HalieusGuildLeaderboardEntry {
  accountId: string;
  displayName: string;
  playerColor: string;
  played: number;
  wins: number;
  winRate: number;
  hosted: number;
}

export interface HalieusGuildSummary {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  role: HalieusGuildRole;
  memberCount: number;
  roomCount: number;
  roomCreationPolicy: HalieusGuildRoomPolicy;
  canManage: boolean;
  canCreateRooms: boolean;
  /** Only guild owners/admins receive the current private invite code. */
  inviteCode: string | null;
}

export interface HalieusGuildDetail extends HalieusGuildSummary {
  members: HalieusGuildMember[];
  rooms: HalieusGuildRoom[];
  messages: HalieusGuildMessage[];
  leaderboard: HalieusGuildLeaderboardEntry[];
  pendingInvitations: HalieusGuildInvitation[];
}
