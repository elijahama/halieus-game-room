export type HalieusAccountRole = "owner" | "admin" | "player";
export type HalieusAccountStatus = "active" | "suspended" | "deleted";

export type HalieusPlayerVisibility = "visible" | "hidden";

export interface HalieusAccountSummary {
  id: string;
  username: string;
  displayName: string;
  role: HalieusAccountRole;
  status: HalieusAccountStatus;
  avatar: string;
  profilePicture: string | null;
  playerColor: string;
  createdAt: number;
  lastLoginAt: number | null;
  createdViaInviteLabel: string | null;
  visibility: HalieusPlayerVisibility;
}

export interface HalieusAuthStatus {
  ok: boolean;
  setupRequired: boolean;
  authenticated: boolean;
  account: HalieusAccountSummary | null;
  registration: "invite-only";
  accessRequestsEnabled: boolean;
}

export interface HalieusInviteSummary {
  id: string;
  label: string;
  codeLast4: string;
  createdAt: number;
  expiresAt: number | null;
  usedAt: number | null;
  usedByAccountId: string | null;
  revokedAt: number | null;
  createdByAccountId: string;
  /** True when the private server store still retains the original code for owner/admin reveal. */
  codeRevealAvailable?: boolean;
}

export interface HalieusAccessRequestSummary {
  id: string;
  displayName: string;
  preferredUsername: string;
  note: string;
  createdAt: number;
  status: "pending" | "approved" | "declined";
  reviewedAt: number | null;
  reviewedByAccountId: string | null;
}

export interface HalieusAuditEntry {
  id: string;
  at: number;
  actorAccountId: string | null;
  action: string;
  targetType: "account" | "invite" | "access-request" | "session" | "system";
  targetId: string | null;
  summary: string;
}

export interface HalieusAdminSnapshot {
  accounts: HalieusAccountSummary[];
  onlineAccountIds: string[];
  invites: HalieusInviteSummary[];
  accessRequests: HalieusAccessRequestSummary[];
  audit: HalieusAuditEntry[];
}

export interface HalieusPlayerDirectoryEntry {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  profilePicture: string | null;
  playerColor: string;
  role: HalieusAccountRole;
  online: boolean;
  lastSeenAt: number | null;
}

export type HalieusGameRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired" | "closed";

export interface HalieusGameRequestSummary {
  id: string;
  senderAccountId: string;
  senderDisplayName: string;
  recipientAccountId: string;
  recipientDisplayName: string;
  game: HalieusGameStatLine["game"];
  gameTitle: string;
  status: HalieusGameRequestStatus;
  createdAt: number;
  expiresAt: number;
  respondedAt: number | null;
  roomCode: string | null;
}

export interface HalieusGameStatLine {
  game: "mega-board" | "poker" | "blackjack" | "whot" | "ludo" | "hidden-dictator" | "connect-four" | "word-game" | "password" | "anagrams-race" | "cheat" | "dominoes" | "ayo" | "word-board";
  gameTitle: string;
  played: number;
  wins: number;
  winRate: number;
}

export interface HalieusPersonalStats {
  played: number;
  wins: number;
  winRate: number;
  byGame: HalieusGameStatLine[];
  recent: Array<{ game: HalieusGameStatLine["game"]; gameTitle: string; roomCode: string; at: number; won: boolean; result: string }>;
}

export interface HalieusQuickPlayPreference {
  game: HalieusGameStatLine["game"];
  plays: number;
  matchMode?: "casual" | "ranked" | "blitz";
  pokerVariant?: "texas-holdem" | "omaha" | "five-card-draw" | "seven-card-stud";
  pokerStartingChips?: number;
  pokerSmallBlind?: number;
  pokerBigBlind?: number;
  connectFourBestOf?: 1 | 3 | 5;
}

export interface HalieusQuickPlayProfile {
  preferences: HalieusQuickPlayPreference[];
}

export interface HalieusGameInviteSummary {
  id: string;
  senderAccountId: string;
  senderDisplayName: string;
  recipientAccountId: string;
  game: HalieusGameStatLine["game"];
  gameTitle: string;
  roomCode: string;
  createdAt: number;
  expiresAt: number;
}


export interface WordGameDailyLeaderboardEntry {
  rank: number;
  accountId: string;
  displayName: string;
  avatar: string;
  playerColor: string;
  guesses: number;
  solveTimeMs: number;
  solvedAt: number;
}

export interface WordGameAllTimeLeaderboardEntry {
  rank: number;
  accountId: string;
  displayName: string;
  avatar: string;
  playerColor: string;
  dailyPlayed: number;
  dailySolved: number;
  averageGuesses: number | null;
  bestStreak: number;
  fastestSolveMs: number | null;
}

export interface WordGamePersonalStats {
  dailyPlayed: number;
  dailySolved: number;
  solveRate: number;
  averageGuesses: number | null;
  fastestSolveMs: number | null;
  currentStreak: number;
  bestStreak: number;
  today: { solved: boolean; guesses: number | null; solveTimeMs: number | null; rank: number | null } | null;
}

export interface WordGameLeaderboardSnapshot {
  puzzleKey: string;
  today: WordGameDailyLeaderboardEntry[];
  friends: WordGameDailyLeaderboardEntry[];
  allTime: WordGameAllTimeLeaderboardEntry[];
  stats: WordGamePersonalStats;
}
