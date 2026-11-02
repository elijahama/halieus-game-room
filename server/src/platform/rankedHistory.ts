import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { getMegaBoardDataDirectory, getSessionDataDirectory } from "./dataPaths.js";
import type { HgrRankedHistoryMatch, HgrRankedHistoryPage, HgrRankedHistoryPlayer } from "../../../shared/platform/rankedHistory.js";

export const RANKED_HISTORY_GAMES = new Set([
  "mega-board","poker","blackjack","whot","ludo","hidden-dictator",
  "connect-four","cheat","dominoes","ayo","word-game","password","anagrams-race",
]);

interface HistoryLocations { sessionDirectories: string[]; megaBoardDirectory: string }
function defaults(): HistoryLocations {
  return {
    sessionDirectories: [...new Set([
      resolve(getSessionDataDirectory(), "finalized"),
      // Preserve the historic migration locations, like other HGR account stats.
      resolve(process.cwd(), "data", "sessions", "finalized"),
      resolve(process.cwd(), "server", "data", "sessions", "finalized"),
    ])],
    megaBoardDirectory: getMegaBoardDataDirectory(),
  };
}
function safeText(value: unknown, max = 96): string {
  return typeof value === "string" ? value.trim().slice(0,max) : "";
}
function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function visiblePlayers(state: any): HgrRankedHistoryPlayer[] {
  const players = Array.isArray(state?.players) ? state.players : [];
  const results = Array.isArray(state?.rankedResults) ? state.rankedResults : [];
  return players.filter((p: any) => p && p.isAi !== true && safeText(p.name)).slice(0,12)
    .map((player: any) => {
      const result = results.find((entry: any) => entry && entry.playerId === player.id);
      const position = numeric(result?.finishPosition ?? state?.playerStats?.[player.id]?.finishPosition);
      const ratingDelta = numeric(result?.ratingDelta);
      return {name:safeText(player.name),finishPosition:position && position>0?position:null,ratingDelta};
    });
}
function projectArchived(record: any): HgrRankedHistoryMatch | null {
  if (!record || typeof record !== "object" || !RANKED_HISTORY_GAMES.has(record.game)
    || !["completed","forfeit-completed"].includes(record.status)) return null;
  const state = record.state?.gameState ?? record.state;
  const ranked = record.game === "mega-board"
    ? (state?.ranked === true || state?.matchMode === "ranked")
    : state?.matchMode === "ranked";
  if (!ranked || state?.betaMode === true || state?.betaTournamentTest === true) return null;
  const sourcePlayers = Array.isArray(state?.players) ? state.players : [];
  // AI results must never be passed off as verified human-vs-human Ranked play.
  if (sourcePlayers.some((p: any) => p?.isAi === true)) return null;
  const id = safeText(record.sessionId, 180);
  const completedAt = numeric(record.finalisedAt);
  const players = visiblePlayers(state);
  if (!id || !completedAt || completedAt <= 0 || !players.length) return null;
  const winnerId = safeText(state?.winnerPlayerId ?? state?.winnerId ?? "");
  const winner = sourcePlayers.find((p: any) => p?.id === winnerId);
  const namedWinner = safeText(winner?.name ?? record.summary?.winner) || null;
  return {
    id,game:record.game,roomCode:safeText(record.roomCode,24),completedAt,
    status:record.status,winnerName:namedWinner,players,source:"finalized-session",
  };
}
function projectLegacyRankedMatch(match: any): HgrRankedHistoryMatch | null {
  const id=safeText(match?.matchId,180);
  const completedAt=numeric(match?.completedAt);
  if (!id || !completedAt || completedAt <= 0 || !Array.isArray(match?.players)) return null;
  const players=match.players.slice(0,12).filter((p: any)=>safeText(p?.playerName))
    .map((p: any):HgrRankedHistoryPlayer=>{
      const pos=numeric(p.finishPosition);
      return {name:safeText(p.playerName),finishPosition:pos && pos>0?pos:null,ratingDelta:numeric(p.ratingDelta)};
    });
  if (!players.length) return null;
  return {
    id,game:"mega-board",roomCode:safeText(match.roomCode,24),completedAt,
    status:"completed",winnerName:players.find((p:HgrRankedHistoryPlayer)=>p.finishPosition===1)?.name??null,
    players,source:"rankings-record",
  };
}
async function readDirectory(directory: string): Promise<unknown[]> {
  let files: string[];
  try {files=(await readdir(directory)).filter(file=>file.endsWith(".json"));}
  catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
  const output:unknown[]=[];
  // Keep disk work bounded even for a large history; do not expose raw records.
  for (let i=0;i<files.length;i+=32) {
    const batch=await Promise.all(files.slice(i,i+32).map(async file=>{
      try {return JSON.parse(await readFile(resolve(directory,file),"utf8"));}
      catch{return null;}
    }));
    for(const item of batch)if(item)output.push(item);
  }
  return output;
}
export function createRankedHistoryReader(locations: HistoryLocations = defaults()) {
  let cached: {at:number; entries:HgrRankedHistoryMatch[]} | null = null;
  let loading: Promise<HgrRankedHistoryMatch[]> | null = null;
  async function all(): Promise<HgrRankedHistoryMatch[]> {
    if(cached && Date.now()-cached.at<15_000)return cached.entries;
    if(loading)return loading;
    loading=(async()=>{
      const unique=new Map<string,HgrRankedHistoryMatch>();
      for(const directory of [...new Set(locations.sessionDirectories)]){
        for(const raw of await readDirectory(directory)){
          const projected=projectArchived(raw);
          if(projected && !unique.has(projected.id))unique.set(projected.id,projected);
        }
      }
      // Older Mega Board ranked summaries can exist without a finalized
      // session archive. Keep them as evidence, but never invent missing data.
      let snapshot:any=null;
      try {snapshot=JSON.parse(await readFile(resolve(locations.megaBoardDirectory,"rankings.json"),"utf8"));}
      catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")console.warn("Ranked history: legacy summary unavailable.");}
      const existingMegaIds=new Set<string>();
      for(const item of unique.values()){
        if(item.game!=="mega-board")continue;
        // Finalized session IDs are different from the Ranked match IDs.
        // If only the room and close time are available, use a conservative
        // time-window dedupe, not player-name identity guessing.
        existingMegaIds.add(item.id);
      }
      for(const raw of Array.isArray(snapshot?.matches)?snapshot.matches:[]){
        const projected=projectLegacyRankedMatch(raw);
        if(!projected)continue;
        // Archives can explicitly store a Ranked match ID, so check raw archive
        // state before deciding the fallback is genuinely a separate record.
        if(existingMegaIds.has(projected.id))continue;
        const collision=[...unique.values()].some(entry=>
          entry.game==="mega-board" && entry.roomCode===projected.roomCode
          && Math.abs(entry.completedAt-projected.completedAt)<120_000);
        if(!collision)unique.set(projected.id,projected);
      }
      const entries=[...unique.values()].sort((a,b)=>b.completedAt-a.completedAt||a.id.localeCompare(b.id));
      cached={at:Date.now(),entries};
      return entries;
    })();
    try{return await loading;}finally{loading=null;}
  }
  return async function list(options:{game?:string|null;offset?:number;limit?:number}={}):Promise<HgrRankedHistoryPage>{
    const game=options.game||null;
    if(game && !RANKED_HISTORY_GAMES.has(game))throw new RangeError("Unsupported Ranked game filter.");
    const offset=options.offset??0,limit=options.limit??25;
    if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>50)
      throw new RangeError("Invalid Ranked history page.");
    const entries=await all();
    const filtered=game?entries.filter(match=>match.game===game):entries;
    return {matches:filtered.slice(offset,offset+limit),total:filtered.length,
      nextOffset:offset+limit<filtered.length?offset+limit:null};
  };
}
export const listRankedHistory=createRankedHistoryReader();
