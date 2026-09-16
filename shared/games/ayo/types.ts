export type AyoMatchMode = "casual" | "ranked";
export type AyoAiDifficulty = "easy" | "normal" | "hard";
export interface AyoPlayer { id:string; name:string; isHost:boolean; isAi:boolean; aiDifficulty:AyoAiDifficulty|null; isConnected:boolean; seat:0|1; captured:number; result:string|null; }
export interface AyoActionLogEntry { sequence:number; at:number; playerId:string|null; playerName:string|null; action:"start"|"sow"|"capture"|"finish"|"forfeit"|"table"; pit:number|null; detail:string; }
export interface AyoPublicState { game:"ayo"; gameTitle:"Ayo"; code:string; createdAt:number; startedAt:number|null; updatedAt:number; phase:"lobby"|"playing"|"finished"; matchMode:AyoMatchMode; players:AyoPlayer[]; spectatorCount:number; viewerPlayerId:string|null; isSpectator:boolean; pits:number[]; currentPlayerId:string|null; winnerPlayerId:string|null; status:string; actionLog:AyoActionLogEntry[]; }
