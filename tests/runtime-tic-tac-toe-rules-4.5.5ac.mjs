import assert from "node:assert/strict";
import { newGame, play, findWinningLine, finalResultCandidate } from "../shared/games/tic-tac-toe/rules.ts";

for (const size of [3,4,5]) {
  const n=size*size;
  const variants = {
    row: Array.from({length:size},(_,i)=>i),
    column: Array.from({length:size},(_,i)=>i*size),
    diagonal: Array.from({length:size},(_,i)=>i*size+i),
    antiDiagonal: Array.from({length:size},(_,i)=>i*size+size-1-i),
  };
  for(const [label,line] of Object.entries(variants)){
    let state=newGame(size,"ranked");
    const original=state;
    const counter=Array.from({length:n},(_,i)=>i).filter(i=>!line.includes(i));
    for(let i=0;i<size;i++){
      const before=state;
      state=play(state,"X",line[i]);
      assert.equal(before.board[line[i]],null,"Moves must never mutate previous state");
      if(i<size-1) state=play(state,"O",counter[i]);
    }
    assert.equal(original.moves,0);
    assert.equal(state.outcome,"won",size+"x"+size+" "+label);
    assert.equal(state.winner,"X");
    assert.equal(state.moves,2*size-1);
    assert.deepEqual(state.winningLine,line);
    assert.equal(state.revision,state.moves);
    const result=finalResultCandidate(state);
    assert.equal(result.format,size+"x"+size);
    assert.equal(result.mode,"ranked");
    assert.equal(result.winner,"X");
    assert.throws(()=>play(state,"O",counter[size-1]),/finished/,"Reject late moves");
  }
  assert.equal(findWinningLine(Array(n).fill(null),size).length,0);
  assert.throws(()=>newGame(size,"unrecognised"),/match mode/);
}
// A full legal 3x3 board with no line is a draw, not a stale win.
let draw=newGame(3,"casual");
for(const i of [0,1,2,4,3,5,7,6,8]) draw=play(draw,draw.next,i);
assert.equal(draw.outcome,"draw");
assert.equal(draw.winner,null);
assert.equal(draw.moves,9);
assert.equal(finalResultCandidate(draw).draw,true);
assert.equal(finalResultCandidate(draw).mode,"casual");
assert.throws(()=>play(draw,"O",0),/finished/);
// Server will choose which authenticated player owns X and O; pure rules enforce mark turns.
let start=newGame(4,"ranked","O");
assert.equal(start.next,"O");
assert.throws(()=>finalResultCandidate(start),/Live games/);
assert.throws(()=>play(start,"X",0),/turn/);
assert.throws(()=>play(start,"O",-1),/outside/);
assert.throws(()=>play(start,"O",16),/outside/);
assert.throws(()=>play(start,"O",1.4),/outside/);
const played=play(start,"O",0);
assert.equal(start.board[0],null);
assert.equal(played.board[0],"O");
assert.throws(()=>play(played,"X",0),/occupied/);
const restored=JSON.parse(JSON.stringify(played));
const resume=play(restored,"X",2);
assert.equal(resume.moves,2,"JSON roundtrip must preserve deterministic next turn");
assert.throws(()=>play({...played,revision:0},"X",2),/Invalid game state/);
assert.throws(()=>newGame(6),/size/);
assert.throws(()=>newGame(3,"casual","Z"),/starting/);
console.log("PASS tic-tac-toe: NxN=3/4/5 rows, columns, diagonals, anti-diagonals; ranked format, draw, immutable moves, replay/turn validation");
