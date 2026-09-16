export type HiddenDictatorMatchMode = "casual" | "ranked";
export type HiddenDictatorAiDifficulty = "easy" | "normal" | "hard";
export type HiddenDictatorRole = "citizen" | "authoritarian" | "dictator";
export type HiddenDictatorPolicy = "civic" | "control";
export type HiddenDictatorPhase = "lobby" | "nomination" | "voting" | "speaker-policy" | "deputy-policy" | "finished";

export interface HiddenDictatorPublicPlayer { id:string; name:string; isHost:boolean; isAi:boolean; aiDifficulty:HiddenDictatorAiDifficulty|null; isConnected:boolean; seat:number; result:string|null; }
export interface HiddenDictatorActionLogEntry { sequence:number; at:number; playerId:string|null; playerName:string|null; action:"table"|"nominate"|"vote"|"policy"|"forfeit"|"finish"; detail:string; }
export interface HiddenDictatorPublicState {
  code:string; createdAt:number; startedAt:number|null; updatedAt:number; phase:HiddenDictatorPhase; matchMode:HiddenDictatorMatchMode; players:HiddenDictatorPublicPlayer[]; spectatorCount:number; viewerPlayerId:string|null; isSpectator:boolean;
  speakerPlayerId:string|null; nominatedDeputyId:string|null; civicPolicies:number; controlPolicies:number; failedVotes:number; roundNumber:number; status:string; winner:"citizens"|"authoritarians"|null;
  viewerRole:HiddenDictatorRole|null; knownAuthoritarianPlayerIds:string[]; viewerVote:"approve"|"reject"|null; revealedVotes:Array<{playerId:string;vote:"approve"|"reject"}>|null; viewerPolicyHand:HiddenDictatorPolicy[]; actionLog:HiddenDictatorActionLogEntry[];
}
