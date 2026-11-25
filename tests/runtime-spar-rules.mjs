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

for(const count of [2,3,4,5,6,7,8]) {
  const ids=Array.from({length:count},(_,n)=>String(n));
  const pack=makeSparDeck(count);
  const dealt=dealSparHands(ids,0,pack);
  assert.ok(ids.every(id=>dealt.hands[id].length===5));
  assert.equal(dealt.remaining.length,pack.length-count*5);
  assert.equal(new Set([...ids.flatMap(id=>dealt.hands[id]),...dealt.remaining]).size,pack.length);
  assert.deepEqual(dealt.hands[ids[1]].slice(0,3),pack.slice(0,3),
    "Cards are dealt 3 then 2, beginning with the player after dealer");
  assert.deepEqual(dealt.hands[ids[0]].slice(0,3),pack.slice((count-1)*3,count*3));
  assert.deepEqual(dealt.hands[ids[1]].slice(3),pack.slice(count*3,count*3+2));
}
const expanded=makeSparDeck(8);
assert.equal(expanded.length,40);
assert.equal(new Set(expanded).size,40);
assert.ok(expanded.includes("AS"));
for(const suit of ["C","D","H","S"]) assert.ok(expanded.includes("5"+suit));
assert.ok(sparValue("5H")<sparValue("6H"));
assert.equal(sparFinalTrickPoints("5H"),1);
assert.throws(()=>dealSparHands(Array.from({length:8},(_,i)=>String(i)),0,deck));
assert.throws(()=>dealSparHands(Array.from({length:9},(_,i)=>String(i)),0,expanded));
assert.throws(()=>dealSparHands(["same","same"],0,deck));
assert.throws(()=>dealSparHands(["a"],0,deck));
assert.throws(()=>dealSparHands(["a","b"],2,deck));

assert.deepEqual(legalSparCards(["6S","KH","9H","7D"],"H"),["KH","9H"]);
assert.deepEqual(legalSparCards(["6S","7D"],"H"),["6S","7D"]);
assert.deepEqual(legalSparCards(["6S","7D"],null),["6S","7D"]);

const trick=[
  {playerId:"a",playerName:"A",card:"6H"},
  {playerId:"b",playerName:"B",card:"9S"}, // off-suit card cannot win
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

const {parseSparCustomSettings,sparUnderTen,sparHandPoints}=await import("../shared/games/spar/rules.ts");
const {DEFAULT_SPAR_CUSTOM,sparCustomCapacity}=await import("../shared/games/spar/types.ts");
assert.deepEqual(parseSparCustomSettings(undefined),DEFAULT_SPAR_CUSTOM);
assert.equal(sparCustomCapacity(DEFAULT_SPAR_CUSTOM),7);
assert.equal(sparCustomCapacity({...DEFAULT_SPAR_CUSTOM,handSize:7}),5);
assert.equal(sparCustomCapacity({...DEFAULT_SPAR_CUSTOM,deck:"expanded"}),8);
assert.equal(sparCustomCapacity({...DEFAULT_SPAR_CUSTOM,underTen:true,showBottom:true}),5);
for(const [variant,size] of [["traditional",35],["full",36],["noaces",32],["expanded",40]]) {
 const cards=makeSparDeck(2,variant);
 assert.equal(cards.length,size);assert.equal(new Set(cards).size,size);
 if(variant==="noaces")assert.ok(cards.every(c=>!c.startsWith("A")));
 const ids=["a","b","c","d"];
 const dealt=dealSparHands(ids,0,cards,7);
 assert.ok(ids.every(id=>dealt.hands[id].length===7));
 assert.equal(new Set([...ids.flatMap(id=>dealt.hands[id]),...dealt.remaining]).size,size);
}
for(const bad of [{handSize:6},{deck:"fake"},{amount:0},{scoring:"ranked"},{underTen:"yes"},{unknown:true}])assert.equal(parseSparCustomSettings(bad),null);
assert.equal(sparUnderTen(["6C","7D","9H","8S","6D"]),true);
assert.equal(sparUnderTen(["10C","7D","9H","8S","6D"]),false);
assert.equal(sparHandPoints("6C","6D",true),6);
assert.equal(sparHandPoints("7C","6D",true),5);
assert.equal(sparHandPoints("7C","7D",true),4);
assert.equal(sparHandPoints("8C","6D",true),1);
assert.equal(sparHandPoints("6C","6D",false),3);
console.log("PASS Custom Spar decks, hand sizes, capacity, validation and optional scoring rules");

const {sparRevokePenalty,SPAR_RANKED_REVOKE_PENALTY}=await import("../shared/games/spar/types.ts");
assert.equal(SPAR_RANKED_REVOKE_PENALTY,2);
assert.equal(sparRevokePenalty("ranked",{...DEFAULT_SPAR_CUSTOM,revokePenalty:0}),2);
for(const n of [0,1,2,3,4,5])assert.equal(sparRevokePenalty("custom",parseSparCustomSettings({revokePenalty:n})),n);
for(const n of [-1,6,1.5,"2",null])assert.equal(parseSparCustomSettings({revokePenalty:n}),null);
console.log("PASS fixed Ranked revoke penalty and validated Custom choices");
