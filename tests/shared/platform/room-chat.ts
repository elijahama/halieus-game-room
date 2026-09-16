export type RoomChatGame = "mega-board" | "poker" | "blackjack" | "whot" | "ludo" | "hidden-dictator" | "connect-four" | "word-game" | "password" | "anagrams-race" | "cheat" | "dominoes" | "ayo" | "word-board";
export type RoomChatRole = "player" | "spectator";

export interface RoomChatMessage {
  id: string;
  game: RoomChatGame;
  code: string;
  senderName: string;
  senderRole: RoomChatRole;
  text: string;
  at: number;
}

export interface RoomChatJoinResponse {
  ok: boolean;
  reason?: string;
  messages?: RoomChatMessage[];
  viewerRole?: RoomChatRole;
  viewerName?: string;
}

export interface RoomChatSendResponse {
  ok: boolean;
  reason?: string;
  message?: RoomChatMessage;
}
