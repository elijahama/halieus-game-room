import assert from "node:assert/strict";
import {
  makeSparDeck, shuffleSparDeck, dealSparHands, legalSparCards,
  sparSuit, sparRank, sparValue, sparFinalTrickPoints,
  resolveSparTrick, chooseSparAiCard, SPAR_STONE_POOL,
} from "../shared/games/spar/rules.ts";

const deck=makeSparDeck();
assert.equal(deck.length,35,"Traditional Spar must have 35 cards");
assert.equal(new Set(deck).size,35);
assert.ok(!deck.includes("AS"),"A♠ is removed from the Ghanaian pack");
assert.ok(deck.includes("AC")&&deck.includes("KH"));
assert.ok(sparValue("AC")>sparValue("KC"));
assert.equal(sparRank("10S"),"10");
assert.equal(sparSuit("10S"),"S");
assert.equal(SPAR_STONE_POOL,5);

for(const count of [2,3,4]) {
  const ids=Array.from({length:count},(_,n)=>String(n));
  const dealt=dealSparHands(ids,0,deck);
  assert.ok(ids.every(id=>dealt.hands[id].length===5));
  assert.equal(dealt.remaining.length,35-count*5);
  assert.equal(new Set([...ids.flatMap(id=>dealt.hands[id]),...dealt.remaining]).size,35);
  assert.deepEqual(dealt.hands[ids[1]].slice(0,3),deck.slice(0,3),
    "Cards are dealt 3 then 2, beginning with the player after dealer");
  assert.deepEqual(dealt.hands[ids[0]].slice(0,3),deck.slice((count-1)*3,count*3));
  assert.deepEqual(dealt.hands[ids[1]].slice(3),deck.slice(count*3,count*3+2));
}
assert.throws(()=>dealSparHands(["same","same"],0,deck));
assert.throws(()=>dealSparHands(["a"],0,deck));
assert.throws(()=>dealSparHands(["a","b"],2,deck));

assert.deepEqual(legalSparCards(["6S","KH","9H","7D"],"H"),["KH","9H"]);
assert.deepEqual(legalSparCards(["6S","7D"],"H"),["6S","7D"]);
assert.deepEqual(legalSparCards(["6S","7D"],null),["6S","7D"]);

const trick=[
  {playerId:"a",playerName:"A",card:"6H"},
  {playerId:"b",playerName:"B",card:"AS"}, // invalid deck card; only suit matters
  {playerId:"c",playerName:"C",card:"QH"},
  {playerId:"d",playerName:"D",card:"KD"},
];
const result=resolveSparTrick(trick);
assert.deepEqual(result,{winnerPlayerId:"c",winningCard:"QH",leadSuit:"H"});
assert.equal(sparFinalTrickPoints("6H"),3);
assert.equal(sparFinalTrickPoints("7H"),2);
for(const rank of ["8","9","10","J","Q","K","A"])assert.equal(sparFinalTrickPoints(rank+"H"),1);
for(const difficulty of ["easy","normal","hard"]){
 for(const number of [1,3,5]){
  for(let i=0;i<40;i++){
   const hand=shuffleSparDeck(deck).slice(0,5);
   const leading="H";
   const legal=legalSparCards(hand,leading);
   assert.ok(legal.includes(chooseSparAiCard(hand,leading,number,difficulty)));
  }
 }
}
assert.throws(()=>chooseSparAiCard([],null,1,"hard"));
console.log("PASS Spar rules: canonical Ghanaian 35-card pack, 3+2 deal, follow-suit, 5-trick scoring, finite stones, AI legality");
