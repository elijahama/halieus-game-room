export type HalieusFeedbackSource = "game" | "profile";
export type HalieusFeedbackStatus = "open" | "reviewing" | "answered" | "closed";

export interface HalieusFeedbackReply {
  message: string;
  at: number;
  responderAccountId: string;
  responderDisplayName: string;
}

export interface HalieusFeedbackSummary {
  id: string;
  submittedAt: number;
  source: HalieusFeedbackSource;
  category: string;
  details: string;
  gameId: string | null;
  gameName: string | null;
  roomCode: string | null;
  submitterAccountId: string | null;
  submitterDisplayName: string;
  submitterUsername: string | null;
  pageUrl: string;
  appVersion: string;
  status: HalieusFeedbackStatus;
  ownerReply: HalieusFeedbackReply | null;
}
