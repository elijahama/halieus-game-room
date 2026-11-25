import type { GameState } from "../../../../../shared/games/mega-board/game-state.js";
import { getAwardBonusForPlayer, RANKED_AWARD_DEFINITIONS, MAX_AWARD_RATING_BONUS, MINIMUM_RANKED_RATING, type RankedMatchSummary } from "../../../../../shared/games/mega-board/ranked.js";
/** Dry-run only. The archived result and current ledger are never mutated.
 * Require observed stats for each award on every seat; missing historical
 * metrics must not turn into fabricated zeroes or winners. */
const evidence=["peakProperties","buildingEvents","rentCollected","peakUtilityRentWithAllUtilities","auctionEvents","tradeEvents","rolls","busTicketsUsed","kassManeuvers","peakNetWorth","revenue","expenses"] as const;
export function auditRankedMatchAwards(state:GameState, retained:RankedMatchSummary){
 if(state.ranked!==true||state.phase!=="finished"||state.rankedMatchId!==retained.matchId||state.roomCode!==retained.roomCode)throw new Error("Matching finished Ranked archive required");
 if(!Array.isArray(state.players)||state.players.length<2||state.players.some(p=>p.isAi)||new Set(state.players.map(p=>p.id)).size!==state.players.length)throw new Error("Verified human seats required");
 if(retained.players.length!==state.players.length||new Set(retained.players.map(p=>p.playerId)).size!==retained.players.length||retained.players.some(p=>!state.players.some(s=>s.id===p.playerId)))throw new Error("Ranked ledger seat mismatch");
 const missing=state.players.flatMap(p=>evidence.filter(k=>!Number.isFinite(state.playerStats?.[p.id]?.[k])).map(k=>({playerId:p.id,field:k})));
 if(missing.length)return {matchId:retained.matchId,status:"missing-evidence" as const,missing,rows:[]};
 const known=new Set(RANKED_AWARD_DEFINITIONS.map(a=>a.title));
 const rows=retained.players.map(p=>{
  if(![p.ratingBefore,p.ratingAfter,p.placementDelta,p.performanceBonus,p.awardBonus,p.ratingDelta].every(Number.isFinite)||p.awardBonus<0||p.awardBonus>MAX_AWARD_RATING_BONUS||p.ratingAfter-p.ratingBefore!==p.ratingDelta||!Array.isArray(p.awards)||p.awards.some(a=>!known.has(a)))throw new Error("Unrecognised historical Ranked award ledger");
  const calculated=getAwardBonusForPlayer(state,p.playerId);
  const proposedRatingAfter=Math.max(MINIMUM_RANKED_RATING,p.ratingBefore+p.placementDelta+p.performanceBonus+calculated.bonus);
  return {playerId:p.playerId,previousAwardBonus:p.awardBonus,proposedAwardBonus:calculated.bonus,previousAwards:[...p.awards],proposedAwards:calculated.awards,awardDelta:calculated.bonus-p.awardBonus,previousRatingAfter:p.ratingAfter,proposedRatingAfter,localRatingDelta:proposedRatingAfter-p.ratingAfter};
 });
 return {matchId:retained.matchId,status:"audited" as const,missing:[],rows};
}
