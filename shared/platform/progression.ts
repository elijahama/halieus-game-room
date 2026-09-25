export interface AchievementAward { id: string; title: string; points: number; earnedAt: number; sessionId: string; }
export interface PlayerProgression { gamerScore: number; activePlayMs: number; played: number; wins: number; awards: AchievementAward[]; byGame: Record<string, { played: number; wins: number }>; }
