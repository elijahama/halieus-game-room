import assert from "node:assert/strict";
import { createInitialGameState } from "../shared/games/mega-board/game-state.ts";
import { formatMegaMoveRows, buildMegaMoveTranscript } from "../client/src/games/mega-board/utils/moveNotation.ts";
import { buildGameReport } from "../client/src/games/mega-board/utils/gameReport.ts";

const state = createInitialGameState("MOVES1",[
  {id:"host-a",name:"Ava"},{id:"guest-b",name:"Sam"},
]);
state.phase="playing";
state.turnPhase="roll";
state.activityLog = [
  {id:"a1",at:1760000000000,turnNumber:1,kind:"roll",message:"Ava rolled 2 + 3",playerId:"host-a"},
  {id:"a2",at:1760000001200,turnNumber:1,kind:"purchase",message:"Ava bought The Angel, Islington",playerId:"host-a"},
  {id:"a3",at:1760000001700,turnNumber:2,kind:"trade",message:"Sam proposed a deal\nfor £50",playerId:"guest-b"},
  {id:"a4",at:1760000002000,turnNumber:2,kind:"turn",message:"Turn advanced"},
];
const rows = formatMegaMoveRows(state.activityLog,state.players);
assert.equal(rows.length,4);
assert.equal(rows[0].notation,"001. | T1 | Ava | ROLL | Ava rolled 2 + 3");
assert.equal(rows[1].id,"a2");
assert.equal(rows[2].notation,"003. | T2 | Sam | TRADE | Sam proposed a deal for £50");
assert.equal(rows[3].actor,"System");
assert.equal(rows[3].turn,2);
const clipboard = buildMegaMoveTranscript(state.roomCode,state.activityLog,state.players);
assert.match(clipboard,/HGR MEGA BOARD — MOVE-BY-MOVE RECORD/);
assert.match(clipboard,/002\. \| T1 \| Ava \| PURCHASE/);
assert.ok(!clipboard.includes("reconnectToken"));
assert.ok(!clipboard.includes("host-private-key"));
assert.match(clipboard,/not chess PGN/);
const report = buildGameReport(state);
assert.match(report,/MOVE-BY-MOVE RECORD — COPY \/ PASTE/);
assert.ok(report.includes(rows[0].notation));
assert.ok(report.includes(rows[3].notation));
assert.match(report,/FULL MATCH ACTIVITY/);
assert.equal(formatMegaMoveRows([],state.players).length,0);
assert.match(buildMegaMoveTranscript("EMPTY",[],state.players),/No recorded moves yet/);
console.log("PASS move-by-move numbered notation: faithful ordering, IDs, multiline, copy transcript and full Game Report inclusion");
