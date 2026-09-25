import { publicProgressionPlayer } from "../../platform/progression.js";
import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { HalieusLiveRoomSummary } from "../../../../shared/platform/live-games.js";
import type { PasswordTeam, WordArenaActionLogEntry, WordArenaAiDifficulty, WordArenaGameId, WordArenaMatchMode, WordArenaPublicPlayer, WordArenaPublicState, WordGameMode, WordGuessFeedback } from "../../../../shared/games/word-arena/types.js";
import { finalizeSession, recordWorkingSession } from "../../platform/sessionArchive.js";

interface Player extends WordArenaPublicPlayer { reconnectToken: string; attempts: WordGuessFeedback[]; }
interface Room {
  game: WordArenaGameId; code: string; createdAt: number; startedAt: number | null; updatedAt: number;
  phase: "lobby" | "playing" | "round-over" | "finished"; matchMode: WordArenaMatchMode;
  players: Player[]; spectators: Map<string,string>; roundNumber: number; targetScore: number; aiDifficulty: WordArenaAiDifficulty;
  winnerPlayerId: string | null; roundWinnerPlayerId: string | null; status: string;
  secret: string | null; scramble: string | null; clue: string | null; clueGiverPlayerId: string | null;
  solvedPlayerIds: string[]; actionSequence: number; actionLog: WordArenaActionLogEntry[];
  wordGameMode: WordGameMode | null; wordPuzzleKey: string | null;
  passwordActiveTeam: PasswordTeam | null; passwordTeamScores: Record<PasswordTeam,number>;
}

const roomsByGame: Record<WordArenaGameId, Map<string, Room>> = {
  "word-game": new Map(), password: new Map(), "anagrams-race": new Map(),
};

const TITLES: Record<WordArenaGameId,string> = { "word-game": "Word Game", password: "Password", "anagrams-race": "Anagrams Race" };
const ACCENTS: Record<WordArenaGameId,string> = { "word-game": "#2563eb", password: "#7c3aed", "anagrams-race": "#ea580c" };
const WORDLE_WORDS = ["CRANE","SLATE","PLANT","BRICK","LIGHT","MOUSE","CROWN","SHARE","POINT","GRAPE","SMILE","TRAIN","WORLD","STONE","CHAIR","BREAD","CLOUD","FLAME","RIVER","NIGHT"];
const PASSWORD_WORDS = ["CASTLE","OCEAN","MUSIC","PLANET","FOREST","ROBOT","PIZZA","BRIDGE","CAMERA","DRAGON","CLOCK","GARDEN","PIRATE","ROCKET","WINTER","BUTTON","MARKET","SCHOOL","TUNNEL","ISLAND"];
const ANAGRAM_WORDS = ["ORANGE","GARDEN","PLANET","CASTLE","BUTTON","WINTER","CAMERA","MARKET","ROCKET","BRIDGE","PIRATE","TUNNEL","ISLAND","DRAGON","SILVER","POCKET","BOTTLE","STREAM","SPRING","MONKEY"];
const AI_NAMES = ["Lexi","Quill","Nova","Cipher","Milo","Echo","Rook"];
const PASSWORD_HINTS: Record<string,string> = {
  CASTLE:"FORTRESS", OCEAN:"WAVES", MUSIC:"MELODY", PLANET:"ORBIT", FOREST:"TREES", ROBOT:"MACHINE", PIZZA:"SLICE", BRIDGE:"CROSSING", CAMERA:"PHOTO", DRAGON:"FIRE",
  CLOCK:"TIME", GARDEN:"FLOWERS", PIRATE:"TREASURE", ROCKET:"SPACE", WINTER:"SNOW", BUTTON:"PRESS", MARKET:"SHOP", SCHOOL:"CLASS", TUNNEL:"UNDERGROUND", ISLAND:"WATER",
};

function token(){ return randomBytes(8).toString("base64url").slice(0,10).toUpperCase(); }
function roomCode(v:unknown){ return typeof v === "string" ? v.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6) : ""; }
function playerName(v:unknown){ return typeof v === "string" ? v.trim().slice(0,24) : ""; }
function mode(v:unknown):WordArenaMatchMode{ return v === "ranked" ? "ranked" : "casual"; }
function aiDifficulty(v:unknown):WordArenaAiDifficulty{ return v === "easy" || v === "hard" ? v : "normal"; }
function clampInt(v:unknown,min:number,max:number,fallback:number){ const n=Number(v); return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback; }
function cleanWord(v:unknown,max=18){ return typeof v === "string" ? v.trim().toUpperCase().replace(/[^A-Z]/g,"").slice(0,max) : ""; }
function cleanSingleWord(v:unknown,max=18){ if(typeof v!=="string")return "";const trimmed=v.trim();return /^[A-Za-z]+$/.test(trimmed)?trimmed.toUpperCase().slice(0,max):""; }
function randomWord(list:string[]){ return list[Math.floor(Math.random()*list.length)]!; }
function wordGameMode(v:unknown):WordGameMode{ return v === "practice" ? "practice" : "daily"; }
function dailyPuzzleKey(at=Date.now()){ return new Date(at).toISOString().slice(0,10); }
function dailyWord(at=Date.now()){
  const key=dailyPuzzleKey(at);
  const day=Math.floor(Date.parse(`${key}T00:00:00.000Z`)/86_400_000);
  return WORDLE_WORDS[((day % WORDLE_WORDS.length)+WORDLE_WORDS.length)%WORDLE_WORDS.length]!;
}
function shuffle(word:string){ const chars=word.split(""); for(let i=chars.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [chars[i],chars[j]]=[chars[j]!,chars[i]!]; } const next=chars.join(""); return next===word ? `${word.slice(1)}${word[0]}` : next; }
function publicPlayer(p:Player):WordArenaPublicPlayer{ const { reconnectToken:_r, attempts:_a, ...rest }=p; return publicProgressionPlayer(rest); }
function log(room:Room, entry:Omit<WordArenaActionLogEntry,"sequence"|"at">){ room.actionSequence++; room.actionLog.push({...entry,sequence:room.actionSequence,at:Date.now()}); if(room.actionLog.length>140)room.actionLog.splice(0,room.actionLog.length-140); }
function archive(room:Room){ return {...room,spectators:[...room.spectators.entries()]}; }
function feedback(secret:string,guess:string):WordGuessFeedback{ const marks:Array<"correct"|"present"|"absent">=Array(secret.length).fill("absent"); const remaining=secret.split(""); for(let i=0;i<secret.length;i++){ if(guess[i]===secret[i]){marks[i]="correct";remaining[i]="";} } for(let i=0;i<secret.length;i++){ if(marks[i]==="correct")continue; const at=remaining.indexOf(guess[i]??""); if(at>=0){marks[i]="present";remaining[at]="";} } return {guess,marks}; }
function isClueGiver(room:Room,viewerId:string|null){ return Boolean(viewerId && viewerId===room.clueGiverPlayerId); }
function publicState(room:Room, viewerId:string|null, spectator:boolean):WordArenaPublicState{
  const viewer=viewerId?room.players.find(p=>p.id===viewerId):null;
  const attemptsRemaining=room.game==="word-game"&&viewer ? Math.max(0,6-viewer.attempts.length) : null;
  const revealSecret = room.phase==="round-over" || room.phase==="finished" || (room.game==="password"&&isClueGiver(room,viewerId));
  return { game:room.game,gameTitle:TITLES[room.game],code:room.code,createdAt:room.createdAt,startedAt:room.startedAt,updatedAt:room.updatedAt,phase:room.phase,matchMode:room.matchMode,players:room.players.map(publicPlayer),spectatorCount:room.spectators.size,viewerPlayerId:viewerId,isSpectator:spectator,roundNumber:room.roundNumber,targetScore:room.targetScore,aiCount:room.players.filter(p=>p.isAi).length,aiDifficulty:room.aiDifficulty,winnerPlayerId:room.winnerPlayerId,status:room.status,prompt:room.game==="word-game"?"Guess the five-letter word.":room.game==="password"?(room.clue?`Clue: ${room.clue}`:"Waiting for the clue giver."):"Unscramble the word before everyone else.",scramble:room.scramble,clue:room.clue,clueGiverPlayerId:room.clueGiverPlayerId,viewerSecret:revealSecret?room.secret:null,viewerAttempts:viewer?.attempts??[],attemptsRemaining,solvedPlayerIds:[...room.solvedPlayerIds],roundWinnerPlayerId:room.roundWinnerPlayerId,actionLog:room.actionLog.slice(-140),wordGameMode:room.wordGameMode,wordPuzzleKey:room.wordPuzzleKey,passwordActiveTeam:room.game==="password"?room.passwordActiveTeam:null,passwordTeamScores:room.game==="password"?{...room.passwordTeamScores}:null};
}
function emit(io:Server,room:Room){ room.updatedAt=Date.now(); recordWorkingSession(room.game,room.code,room.createdAt,archive(room)); for(const p of room.players) if(p.isConnected&&!p.isAi)io.to(p.id).emit(`${room.game}:state`,publicState(room,p.id,false)); for(const id of room.spectators.keys())io.to(id).emit(`${room.game}:state`,publicState(room,null,true)); }
function finish(io:Server,room:Room,winner:Player|null,reason:string,winnerTeam:PasswordTeam|null=null, archiveStatus: "completed" | "host-ended" = "completed"){ room.phase="finished";room.winnerPlayerId=winner?.id??null;room.roundWinnerPlayerId=winner?.id??room.roundWinnerPlayerId;room.status=reason;for(const p of room.players)p.result=winnerTeam?(p.team===winnerTeam?"Winning team":"Runner-up"):p.id===winner?.id?"Winner":winner?"Runner-up":"Completed";log(room,{playerId:winner?.id??null,playerName:winner?.name??null,action:"finish",detail:reason});void finalizeSession(room.game,room.code,room.createdAt,archiveStatus,archive(room),{winner:winnerTeam?`Team ${winnerTeam}`:winner?.name??null,players:room.players.length,mode:room.matchMode,rounds:room.roundNumber,durationMs:Date.now()-room.createdAt});emit(io,room);io.emit("platform:game-finished",{id:`${room.game}-${room.code}-${room.actionSequence}`,game:room.game,gameTitle:TITLES[room.game],code:room.code,status:"game-finished",winner:winnerTeam?`Team ${winnerTeam}`:winner?.name??null,message:reason,at:room.updatedAt}); }
function resetAttempts(room:Room){ for(const p of room.players)p.attempts=[];room.solvedPlayerIds=[];room.roundWinnerPlayerId=null;room.clue=null; }
function aiReactionDelay(difficulty:WordArenaAiDifficulty, kind:"word"|"password"|"anagram"){
  const range = kind === "anagram"
    ? difficulty === "easy" ? [8000,12000] : difficulty === "hard" ? [1800,3600] : [4200,7200]
    : difficulty === "easy" ? [3600,6200] : difficulty === "hard" ? [1100,2600] : [2200,4300];
  return range[0]! + Math.floor(Math.random() * (range[1]! - range[0]! + 1));
}
function aiSuccessChance(difficulty:WordArenaAiDifficulty, attempt:number){
  if(difficulty === "hard") return Math.min(.96,.24 + attempt * .15);
  if(difficulty === "easy") return Math.min(.66,.06 + attempt * .08);
  return Math.min(.84,.12 + attempt * .12);
}
function scheduleWordAi(io:Server,room:Room,p:Player){
  setTimeout(()=>{
    if(room.phase!=="playing"||room.game!=="word-game"||!room.secret||!p.isAi||!p.isConnected||p.attempts.length>=6||room.solvedPlayerIds.includes(p.id))return;
    const attempt=p.attempts.length+1;
    const solve=Math.random()<aiSuccessChance(p.aiDifficulty??room.aiDifficulty,attempt);
    const pool=WORDLE_WORDS.filter(word=>word!==room.secret);
    const guess=solve?room.secret:randomWord(pool);
    const reason=wordGameSubmit(io,room,p,guess);
    if(!reason&&room.phase==="playing"&&!room.solvedPlayerIds.includes(p.id)&&p.attempts.length<6)scheduleWordAi(io,room,p);
  },aiReactionDelay(p.aiDifficulty??room.aiDifficulty,"word"));
}
function schedulePasswordAiGuess(io:Server,room:Room,p:Player){
  setTimeout(()=>{
    if(room.phase!=="playing"||room.game!=="password"||!room.secret||!room.clue||!p.isAi||!p.isConnected||p.id===room.clueGiverPlayerId)return;
    const difficulty=p.aiDifficulty??room.aiDifficulty;
    const solve=Math.random()<(difficulty==="hard"?.82:difficulty==="easy"?.28:.52);
    const wrongPool=PASSWORD_WORDS.filter(word=>word!==room.secret);
    const guess=solve?room.secret:randomWord(wrongPool);
    const reason=passwordGuess(io,room,p,guess);
    if(!reason&&room.phase==="playing")schedulePasswordAiGuess(io,room,p);
  },aiReactionDelay(p.aiDifficulty??room.aiDifficulty,"password"));
}
function schedulePasswordGuessers(io:Server,room:Room){ for(const p of room.players)if(p.isAi&&p.id!==room.clueGiverPlayerId)schedulePasswordAiGuess(io,room,p); }
function schedulePasswordAiClue(io:Server,room:Room,p:Player){
  setTimeout(()=>{
    if(room.phase!=="playing"||room.game!=="password"||room.clue||!room.secret||p.id!==room.clueGiverPlayerId||!p.isAi)return;
    passwordClue(io,room,p,PASSWORD_HINTS[room.secret]??"THING");
  },aiReactionDelay(p.aiDifficulty??room.aiDifficulty,"password"));
}
function scheduleAnagramAi(io:Server,room:Room,p:Player){
  setTimeout(()=>{
    if(room.phase!=="playing"||room.game!=="anagrams-race"||!room.secret||!p.isAi||!p.isConnected)return;
    anagramGuess(io,room,p,room.secret);
  },aiReactionDelay(p.aiDifficulty??room.aiDifficulty,"anagram"));
}
function scheduleRoundAi(_io:Server,_room:Room){
  // Intentionally empty: Word Arena games do not create AI seats in 3.6.8.
}
function beginRound(io:Server,room:Room){ room.roundNumber++;resetAttempts(room);room.phase="playing";if(room.game==="word-game"){room.wordPuzzleKey=room.wordGameMode==="daily"?dailyPuzzleKey():null;room.secret=room.wordGameMode==="daily"?dailyWord():randomWord(WORDLE_WORDS);room.scramble=null;room.clueGiverPlayerId=null;room.status=room.wordGameMode==="daily"?`Daily Puzzle · ${room.wordPuzzleKey}`:"Practice Puzzle · six guesses, five letters.";}else if(room.game==="password"){room.secret=randomWord(PASSWORD_WORDS);room.scramble=null;const preferred:PasswordTeam=room.roundNumber%2===1?"violet":"gold";const preferredPlayers=room.players.filter(p=>p.isConnected&&p.team===preferred);const other:PasswordTeam=preferred==="violet"?"gold":"violet";room.passwordActiveTeam=preferredPlayers.length>=2?preferred:other;const teammates=room.players.filter(p=>p.isConnected&&p.team===room.passwordActiveTeam);const cycle=Math.floor((room.roundNumber-1)/2);room.clueGiverPlayerId=teammates[cycle%Math.max(1,teammates.length)]?.id??null;room.status=`Team ${room.passwordActiveTeam==="violet"?"Violet":"Gold"}: ${room.players.find(p=>p.id===room.clueGiverPlayerId)?.name??"clue giver"} is choosing a one-word clue.`;}else{room.secret=randomWord(ANAGRAM_WORDS);room.scramble=shuffle(room.secret);room.clueGiverPlayerId=null;room.status=`Round ${room.roundNumber}: first correct answer wins the point.`;}log(room,{playerId:null,playerName:null,action:"round",detail:room.status});emit(io,room);scheduleRoundAi(io,room); }
function afterRound(io:Server,room:Room,winner:Player|null){ room.roundWinnerPlayerId=winner?.id??null;room.phase="round-over";if(winner&&room.game==="password"&&winner.team){const team=winner.team;room.passwordTeamScores[team]++;for(const player of room.players)if(player.team===team)player.score=room.passwordTeamScores[team];const label=team==="violet"?"Violet":"Gold";room.status=`Team ${label} wins round ${room.roundNumber}.`;if(room.passwordTeamScores[team]>=room.targetScore){finish(io,room,winner,`Team ${label} wins Password ${room.passwordTeamScores[team]}–${room.passwordTeamScores[team==="violet"?"gold":"violet"]}.`,team);return;}}else if(winner){winner.score++;room.status=`${winner.name} wins round ${room.roundNumber}.`;if(winner.score>=room.targetScore){finish(io,room,winner,`${winner.name} wins ${TITLES[room.game]} with ${winner.score} point${winner.score===1?"":"s"}.`);return;}}else room.status=`Round ${room.roundNumber} ended without a winner.`;emit(io,room); }
function wordGameSubmit(io:Server,room:Room,p:Player,raw:unknown){ if(room.phase!=="playing"||room.game!=="word-game"||!room.secret)return "That puzzle is not accepting guesses.";if(p.attempts.length>=6)return "You have used all six guesses.";if(room.solvedPlayerIds.includes(p.id))return "You already solved this puzzle.";const guess=cleanWord(raw,5);if(guess.length!==5)return "Enter exactly five letters.";const result=feedback(room.secret,guess);p.attempts.push(result);log(room,{playerId:p.id,playerName:p.name,action:"guess",detail:`${p.name} submitted guess ${p.attempts.length}.`});if(guess===room.secret){room.solvedPlayerIds.push(p.id);afterRound(io,room,p);return null;}const active=room.players.filter(x=>x.isConnected);if(active.every(x=>x.attempts.length>=6)){if(room.wordGameMode==="daily")finish(io,room,null,`Daily puzzle complete. The answer was ${room.secret}.`);else afterRound(io,room,null);return null;}emit(io,room);return null; }
function passwordClue(io:Server,room:Room,p:Player,raw:unknown){ if(room.game!=="password"||room.phase!=="playing"||p.id!==room.clueGiverPlayerId||!room.secret)return "Only the current clue giver can submit the clue.";if(room.clue)return "A clue is already live.";const clue=cleanSingleWord(raw,18);if(!clue)return "Enter one word using letters only.";if(clue===room.secret||clue.includes(room.secret)||room.secret.includes(clue))return "The clue cannot contain the password.";room.clue=clue;room.status=`${p.name} gave the clue “${clue}”.`;log(room,{playerId:p.id,playerName:p.name,action:"clue",detail:room.status});emit(io,room);schedulePasswordGuessers(io,room);return null; }
function passwordGuess(io:Server,room:Room,p:Player,raw:unknown){ if(room.game!=="password"||room.phase!=="playing"||!room.secret||!room.clue)return "Wait for a clue first.";if(p.team!==room.passwordActiveTeam)return "It is the other team’s turn.";if(p.id===room.clueGiverPlayerId)return "The clue giver cannot guess their own password.";const guess=cleanWord(raw,18);if(!guess)return "Enter a guess.";log(room,{playerId:p.id,playerName:p.name,action:"guess",detail:`${p.name} guessed ${guess}.`});if(guess===room.secret){afterRound(io,room,p);return null;}room.status=`${p.name} guessed ${guess}. Keep trying.`;emit(io,room);return null; }
function anagramGuess(io:Server,room:Room,p:Player,raw:unknown){ if(room.game!=="anagrams-race"||room.phase!=="playing"||!room.secret)return "That anagram round is not active.";const guess=cleanWord(raw,18);if(!guess)return "Enter your answer.";log(room,{playerId:p.id,playerName:p.name,action:"guess",detail:`${p.name} submitted an answer.`});if(guess===room.secret){afterRound(io,room,p);return null;}room.status=`${p.name} missed. The race is still open.`;emit(io,room);return null; }
function findRoom(game:WordArenaGameId,value:unknown){ return roomsByGame[game].get(roomCode(value)); }
function createAiPlayers(count:number,difficulty:WordArenaAiDifficulty,startSeat:number):Player[]{
  return Array.from({length:count},(_,index)=>({
    id:`ai-${token()}-${index}`,
    reconnectToken:"",
    name:`${AI_NAMES[index%AI_NAMES.length]} AI`,
    isHost:false,
    isConnected:true,
    seat:startSeat+index,
    score:0,
    result:null,
    attempts:[],
    isAi:true,
    aiDifficulty:difficulty,
    team:null,
  }));
}
function registerGame(io:Server,socket:Socket,game:WordArenaGameId){
  const title=TITLES[game];
  const maxPlayers=game==="word-game"?1:8;
  const minPlayers=game==="word-game"?1:game==="password"?4:2;
  const defaultTarget=game==="word-game"?1:5;
  socket.on(`${game}:create`,(payload:any,ack:(r:any)=>void)=>{
    const c=roomCode(payload?.code)||token().slice(0,6);
    const existing=roomsByGame[game].get(c);
    if(existing&&existing.phase!=="finished")return ack({ok:false,reason:`That ${title} room already exists.`});
    const n=playerName(payload?.playerName);
    if(!n)return ack({ok:false,reason:"Enter a player name."});
    const difficulty=aiDifficulty(payload?.aiDifficulty);
    // Word Game, Password and Anagrams Race are intentionally human-only in 3.6.8.
    const aiCount=0;
    const targetScore=game==="word-game"
      ? clampInt(payload?.targetScore,1,5,defaultTarget)
      : clampInt(payload?.targetScore,3,9,defaultTarget);
    const p:Player={id:socket.id,reconnectToken:token(),name:n,isHost:true,isConnected:true,seat:0,score:0,result:null,attempts:[],isAi:false,aiDifficulty:null,team:game==="password"?"violet":null};
    const bots: Player[]=[];
    const selectedWordMode=game==="word-game"?wordGameMode(payload?.wordGameMode):null;
    const room:Room={game,code:c,createdAt:Date.now(),startedAt:null,updatedAt:Date.now(),phase:"lobby",matchMode:mode(payload?.matchMode),players:[p,...bots],spectators:new Map(),roundNumber:0,targetScore,aiDifficulty:difficulty,winnerPlayerId:null,roundWinnerPlayerId:null,status:game==="word-game"?(selectedWordMode==="daily"?"Daily puzzle ready. One ranked attempt per day.":"Practice puzzle ready. Practice does not affect the daily leaderboard."):`Waiting for ${minPlayers===1?"you to start":`at least ${minPlayers} players`}.`,secret:null,scramble:null,clue:null,clueGiverPlayerId:null,solvedPlayerIds:[],actionSequence:0,actionLog:[],wordGameMode:selectedWordMode,wordPuzzleKey:null,passwordActiveTeam:null,passwordTeamScores:{violet:0,gold:0}};
    roomsByGame[game].set(c,room);
    log(room,{playerId:p.id,playerName:p.name,action:"room",detail:`${p.name} created the ${title} room${aiCount?` with ${aiCount} AI player${aiCount===1?"":"s"}`:""}.`});
    emit(io,room);
    ack({ok:true,code:c,playerId:p.id,reconnectToken:p.reconnectToken,state:publicState(room,p.id,false)});
  });
  socket.on(`${game}:join`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);
    if(!room)return ack({ok:false,reason:`${title} room not found.`});
    if(room.phase!=="lobby"||room.players.length>=maxPlayers)return ack({ok:false,reason:`That ${title} room is full or already started.`});
    const n=playerName(payload?.playerName);
    if(!n)return ack({ok:false,reason:"Enter a player name."});
    const usedSeats=new Set(room.players.map(p=>p.seat));
    let seat=0; while(usedSeats.has(seat))seat++;
    const violetCount=room.players.filter(x=>x.team==="violet").length;const goldCount=room.players.filter(x=>x.team==="gold").length;const team:PasswordTeam|null=game==="password"?(violetCount<=goldCount?"violet":"gold"):null;
    const p:Player={id:socket.id,reconnectToken:token(),name:n,isHost:false,isConnected:true,seat,score:0,result:null,attempts:[],isAi:false,aiDifficulty:null,team};
    room.players.push(p);room.players.sort((a,b)=>a.seat-b.seat);
    log(room,{playerId:p.id,playerName:p.name,action:"room",detail:`${p.name} joined the room.`});
    emit(io,room);
    ack({ok:true,code:room.code,playerId:p.id,reconnectToken:p.reconnectToken,state:publicState(room,p.id,false)});
  });
  socket.on(`${game}:reconnect`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);
    const t=typeof payload?.reconnectToken==="string"?payload.reconnectToken.trim().toUpperCase():"";
    const p=room?.players.find(x=>!x.isAi&&x.reconnectToken===t);
    if(!room||!p)return ack({ok:false,reason:`That saved ${title} seat is not available.`});
    const old=p.id;p.id=socket.id;p.isConnected=true;
    if(room.winnerPlayerId===old)room.winnerPlayerId=p.id;
    if(room.roundWinnerPlayerId===old)room.roundWinnerPlayerId=p.id;
    if(room.clueGiverPlayerId===old)room.clueGiverPlayerId=p.id;
    room.solvedPlayerIds=room.solvedPlayerIds.map(id=>id===old?p.id:id);
    emit(io,room);
    ack({ok:true,code:room.code,playerId:p.id,reconnectToken:p.reconnectToken,state:publicState(room,p.id,false)});
  });
  socket.on(`${game}:spectate`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);
    if(!room)return ack({ok:false,reason:`${title} room not found.`});
    room.spectators.set(socket.id,playerName(payload?.playerName)||"Spectator");emit(io,room);
    ack({ok:true,code:room.code,state:publicState(room,null,true)});
  });
  socket.on(`${game}:start`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);const host=room?.players.find(p=>p.id===socket.id&&p.isHost);
    if(!room||!host)return ack({ok:false,reason:`Only the host can start ${title}.`});
    if(room.phase!=="lobby"&&room.phase!=="finished")return ack({ok:false,reason:`${title} is already in progress.`});
    if(room.players.filter(p=>p.isConnected).length<minPlayers)return ack({ok:false,reason:`${title} needs at least ${minPlayers} player${minPlayers===1?"":"s"}. Invite another person to join.`});
    if(game==="password"&&(room.players.filter(p=>p.isConnected&&p.team==="violet").length<2||room.players.filter(p=>p.isConnected&&p.team==="gold").length<2))return ack({ok:false,reason:"Password needs at least two connected players on each team."});
    if(room.phase!=="lobby"&&room.phase!=="finished")return ack({ok:false,reason:"The current match is already in progress."});
    room.startedAt=Math.max(Date.now(),(room.startedAt??0)+1);room.players.forEach(p=>{p.score=0;p.result=null});room.passwordTeamScores={violet:0,gold:0};room.passwordActiveTeam=null;room.roundNumber=0;room.winnerPlayerId=null;
    log(room,{playerId:host.id,playerName:host.name,action:"start",detail:`${title} started.`});beginRound(io,room);ack({ok:true});
  });
  socket.on(`${game}:next-round`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);const host=room?.players.find(p=>p.id===socket.id&&p.isHost);
    if(!room||!host)return ack({ok:false,reason:"Only the host can start the next round."});
    if(room.phase!=="round-over")return ack({ok:false,reason:"The next round is not ready."});beginRound(io,room);ack({ok:true});
  });
  socket.on(`${game}:submit`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);const p=room?.players.find(x=>x.id===socket.id&&!x.isAi);
    if(!room||!p)return ack({ok:false,reason:`${title} seat not found.`});
    const reason=game==="word-game"?wordGameSubmit(io,room,p,payload?.value):game==="password"?passwordGuess(io,room,p,payload?.value):anagramGuess(io,room,p,payload?.value);
    if(reason)return ack({ok:false,reason});ack({ok:true});
  });
  if(game==="password")socket.on("password:clue",(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom("password",payload?.code);const p=room?.players.find(x=>x.id===socket.id&&!x.isAi);
    if(!room||!p)return ack({ok:false,reason:"Password seat not found."});const reason=passwordClue(io,room,p,payload?.value);if(reason)return ack({ok:false,reason});ack({ok:true});
  });
  socket.on(`${game}:end-game`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);const host=room?.players.find(p=>p.id===socket.id&&p.isHost);
    if(!room||!host)return ack({ok:false,reason:"Only the host can end the game."});finish(io,room,null,`${host.name} ended the ${title} session.`,null,"host-ended");ack({ok:true});
  });
  socket.on(`${game}:forfeit`,(payload:any,ack:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);const p=room?.players.find(x=>x.id===socket.id&&!x.isAi);
    if(!room||!p)return ack({ok:false,reason:`${title} seat not found.`});log(room,{playerId:p.id,playerName:p.name,action:"forfeit",detail:`${p.name} left the game.`});p.isConnected=false;p.result="Forfeited";
    const remaining=room.players.filter(x=>x.isConnected);
    if(room.phase!=="finished"&&remaining.length===1&&room.players.length>1)finish(io,room,remaining[0]!,`${remaining[0]!.name} wins after the other players left.`);else emit(io,room);ack({ok:true});
  });
  socket.on(`${game}:leave`,(payload:any,ack?:(r:any)=>void)=>{
    const room=findRoom(game,payload?.code);const p=room?.players.find(x=>x.id===socket.id&&!x.isAi);if(p)p.isConnected=false;room?.spectators.delete(socket.id);if(room)emit(io,room);ack?.({ok:true});
  });
}

export function registerWordArenaHandlers(io:Server,socket:Socket){ (Object.keys(roomsByGame) as WordArenaGameId[]).forEach(game=>registerGame(io,socket,game)); socket.on("disconnect",()=>{for(const game of Object.keys(roomsByGame) as WordArenaGameId[])for(const room of roomsByGame[game].values()){const p=room.players.find(x=>x.id===socket.id);if(p){p.isConnected=false;emit(io,room);}if(room.spectators.delete(socket.id))emit(io,room);}}); }
export function getWordArenaChatIdentity(game:WordArenaGameId,c:string,socketId:string){const room=findRoom(game,c);if(!room)return null;const p=room.players.find(x=>x.id===socketId&&x.isConnected);if(p)return{name:p.name,role:"player" as const};const s=room.spectators.get(socketId);return s?{name:s,role:"spectator" as const}:null;}
export function getWordArenaRoomCount(){let count=0;for(const game of Object.keys(roomsByGame) as WordArenaGameId[])count += [...roomsByGame[game].values()].filter(room=>room.phase!=="finished"&&(room.players.some(p=>p.isConnected)||room.spectators.size>0)).length;return count;}
export function getWordArenaLiveRoomSummaries():HalieusLiveRoomSummary[]{const output:HalieusLiveRoomSummary[]=[];for(const game of Object.keys(roomsByGame) as WordArenaGameId[])for(const room of roomsByGame[game].values())if(room.phase!=="finished"&&(room.players.some(p=>p.isConnected)||room.spectators.size>0))output.push({game,gameTitle:TITLES[game],code:room.code,phase:room.phase,matchMode:room.matchMode,started:room.phase!=="lobby",createdAt:room.createdAt,startedAt:room.startedAt,updatedAt:room.updatedAt,playerCount:room.players.length,maximumPlayers:game==="word-game"?1:8,humanPlayers:room.players.filter(p=>p.isConnected&&!p.isAi).map(p=>p.name),aiCount:room.players.filter(p=>p.isAi).length,spectatorCount:room.spectators.size,joinable:room.phase==="lobby"&&room.players.length<(game==="word-game"?1:8),spectatable:true});return output;}
export function closeAllWordArenaRooms(){const count=getWordArenaRoomCount();for(const game of Object.keys(roomsByGame) as WordArenaGameId[])roomsByGame[game].clear();return count;}
export const WORD_ARENA_ACCENTS=ACCENTS;
