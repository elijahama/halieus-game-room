export type WordBoardMatchMode = "casual" | "ranked";
export type WordBoardDictionaryMode = "standard" | "challenge" | "open";
export type WordBoardAiDifficulty = "easy" | "normal" | "hard";
export type WordBoardBonus = "normal"|"dl"|"tl"|"dw"|"tw"|"center";
export interface WordBoardTile { id:string; letter:string; value:number; blank?:boolean; }
export interface WordBoardCell { tile:WordBoardTile|null; bonus:WordBoardBonus; }
export interface WordBoardPlayer { id:string; name:string; isHost:boolean; isAi:boolean; aiDifficulty:WordBoardAiDifficulty|null; isConnected:boolean; seat:number; score:number; rackCount:number; result:string|null; }
export interface WordBoardActionLogEntry { sequence:number; at:number; playerId:string|null; playerName:string|null; action:"start"|"play"|"pass"|"exchange"|"finish"|"forfeit"|"table"; detail:string; score?:number; words?:string[]; }
export interface WordBoardPlacement { row:number; col:number; tileId:string; letter?:string; }
export interface WordBoardPublicState { game:"word-board"; gameTitle:"Word Board"; code:string; createdAt:number; startedAt:number|null; updatedAt:number; phase:"lobby"|"playing"|"finished"; matchMode:WordBoardMatchMode; players:WordBoardPlayer[]; spectatorCount:number; viewerPlayerId:string|null; isSpectator:boolean; board:WordBoardCell[]; rack:WordBoardTile[]; bagCount:number; currentPlayerId:string|null; winnerPlayerId:string|null; consecutivePasses:number; status:string; actionLog:WordBoardActionLogEntry[]; dictionaryMode:WordBoardDictionaryMode; }
