import assert from "node:assert/strict";
import { BOARD_SPACES, isUtilityBoardSpace } from "../shared/games/mega-board/board.ts";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";
import { getMatchAwards } from "../shared/games/mega-board/ranked.ts";
import { recordRentStats } from "../server/src/games/mega-board/utils/stats.ts";
import { createDebt, settleDebtIfAffordable } from "../server/src/games/mega-board/utils/debt.ts";

const utilities = BOARD_SPACES.filter(isUtilityBoardSpace);
assert.equal(utilities.length, 3, "Mega Board must have exactly three utilities");
const newGame = () => createInitialGameState("OBASEKI", [
  {id:"owner",name:"Utility Owner"},
  {id:"payer",name:"Rent Payer"},
  {id:"other",name:"Other Owner"},
]);
const award = (state) => getMatchAwards(state).find((entry) => entry.key === "obaseki");
const ownAll = (state, playerId="owner") => {
  const player = state.players.find((entry)=>entry.id===playerId);
  for (const utility of utilities) {
    state.propertyOwners[utility.id] = playerId;
    if (!player.properties.includes(utility.id)) player.properties.push(utility.id);
  }
};

const game = newGame();
const [owner,payer,other] = game.players;
assert.deepEqual(award(game).winnerIds, [], "Do not award on ownership alone");
recordRentStats(game,payer,owner,400,utilities[0].id);
assert.equal(game.playerStats[owner.id].peakUtilityRentWithAllUtilities,0,"Rent before complete ownership must not count");
ownAll(game);
recordRentStats(game,payer,owner,200,utilities[0].id);
assert.deepEqual(award(game).winnerIds,[],"Exactly £200 is not over £200");
recordRentStats(game,payer,owner,1,utilities[1].id);
assert.equal(game.playerStats[owner.id].peakUtilityRentWithAllUtilities,200);
assert.deepEqual(award(game).winnerIds,[],"Two smaller rents totalling £201 must not qualify");
recordRentStats(game,payer,owner,201,utilities[1].id);
assert.equal(game.playerStats[owner.id].peakUtilityRentWithAllUtilities,201);
assert.deepEqual(award(game).winnerIds,[owner.id],"A single utility rent above £200 under full ownership qualifies");
const normalSpace = BOARD_SPACES.find((space)=>space.type==="property");
recordRentStats(game,payer,owner,400,normalSpace.id);
assert.equal(game.playerStats[owner.id].peakUtilityRentWithAllUtilities,201,"Non-utility rent is excluded");
game.propertyOwners[utilities[2].id] = other.id;
recordRentStats(game,payer,owner,100,utilities[0].id);
assert.equal(game.playerStats[owner.id].peakUtilityRentWithAllUtilities,201,"Utility income after losing a utility must not qualify");
assert.deepEqual(award(game).winnerIds,[owner.id],"Previously earned match award persists across property trades");
const game2=newGame();
ownAll(game2);
const electric = utilities.find((space)=>space.name==="Electric Company") ?? utilities[1];
createDebt(game2,{
  debtorId:"payer",creditorId:"owner",amount:201,
  reason:`Rent for ${electric.name}`,resumeAction:"advance-turn"
});
assert.equal(settleDebtIfAffordable(game2),true,"Actual debt settlement must succeed");
assert.equal(game2.playerStats.owner.peakUtilityRentWithAllUtilities,201,"Deferred utility rent must be attributed on payment");
assert.deepEqual(award(game2).winnerIds,["owner"]);
const game3=newGame();
ownAll(game3);
createDebt(game3,{
  debtorId:"payer",creditorId:"owner",amount:200,
  reason:"Rent for Gas Company",resumeAction:"advance-turn"
});
assert.equal(settleDebtIfAffordable(game3),true);
assert.deepEqual(award(game3).winnerIds,[]);
console.log("PASS Obaseki Award: strictly >£200 in one verified utility rent payment under complete ownership, direct/deferred/no cumulative false positives");
