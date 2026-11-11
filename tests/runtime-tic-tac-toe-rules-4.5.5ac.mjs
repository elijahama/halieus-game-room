import assert from "node:assert/strict";
import { newGame, play, findWinningLine, finalResultCandidate, assertValidGameState } from "../shared/games/tic-tac-toe/rules.ts";

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
    assertValidGameState(state);
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
assertValidGameState(draw);
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
assertValidGameState(restored);
const resume=play(restored,"X",2);
assert.equal(resume.moves,2,"JSON roundtrip must preserve deterministic next turn");
assert.throws(()=>play({...played,revision:0},"X",2),/Invalid game state/);
assert.throws(()=>newGame(6),/size/);
assert.throws(()=>newGame(3,"casual","Z"),/starting/);

// Part 32: stale/corrupted reconnect snapshots must never authorize a move or a result.
const invalid = (state) => {
  assert.throws(() => assertValidGameState(state), /Invalid game state/);
  assert.throws(() => finalResultCandidate(state), /Invalid game state/);
  assert.throws(() => play(state,state.next,0), /Invalid game state/);
};
let win=newGame(3);
for(const i of [0,3,1,4,2]) win=play(win,win.next,i);
invalid({...win,outcome:"playing",winner:null,winningLine:[],next:"O"});
invalid({...win,winningLine:[0,1,5]});
invalid({...win,winner:"O"});
invalid({...win,lastMove:4});
invalid({...win,board:[...win.board.slice(0,2),null,...win.board.slice(3)]});
invalid({...win,starting:"O"});
invalid({...draw,outcome:"won",winner:"X",winningLine:[0,1,2]});
invalid({...draw,outcome:"playing",next:"X"});
invalid({...played,next:"O"});
invalid({...played,lastMove:null});
invalid({...played,board:played.board.map((cell,i)=>i===1?"X":cell),moves:2,revision:2});
invalid({...newGame(3),board:["X",...Array(8).fill(null)],moves:1,revision:1,lastMove:0,next:"X"});
invalid({...newGame(3),mode:"unrecognised"});
invalid({...newGame(3),size:4});
invalid({...newGame(3),board:Array(9).fill(undefined)});
invalid({...newGame(3),revision:-1});
// 3x3 double win cannot be created by a legitimate final move for opposing marks.
invalid({...win,board:["X","X","X","O","O","O","X","O","X"],moves:9,revision:9,lastMove:8});
// Many legal persisted states, including O starts, should remain accepted.
for (const size of [3,4,5]) for (const first of ["X","O"]) {
  for (let seed=1;seed<=150;seed++) {
    let state=newGame(size,"casual",first);
    let available=Array.from({length:size*size},(_,i)=>i);
    let random=seed*1664525+size;
    while(state.outcome==="playing") {
      random=(Math.imul(random,1664525)+1013904223)>>>0;
      const offset=random%available.length;
      const [chosen]=available.splice(offset,1);
      state=play(JSON.parse(JSON.stringify(state)),state.next,chosen);
      assertValidGameState(state);
    }
    assert.ok(finalResultCandidate(state));
  }
}
console.log("PASS tic-tac-toe: 3/4/5 rules, immutable moves, reconnect integrity, terminal winner/draw validation and corrupted-state rejection");
