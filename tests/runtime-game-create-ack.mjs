import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import ts from 'typescript';

const data = await mkdtemp(resolve(tmpdir(), 'hgr-create-ack-'));
process.env.HALIEUS_DATA_DIR = data;
const { registerLobbyHandlers } = await import('../server/src/games/mega-board/handlers/lobbyHandlers.ts');
const { rooms } = await import('../server/src/games/mega-board/state/rooms.ts');
const { flushRoomSave } = await import('../server/src/games/mega-board/utils/persistence.ts');
const http = createServer();
const io = new Server(http);
let mode = 'normal', drop = false, finishLate;
io.on('connection', socket => {
  const originalOn = socket.on.bind(socket);
  socket.on = (event, handler) => originalOn(event, event === 'game:create' ? (payload, ack) => handler(payload, response => {
    if (drop) { drop = false; return; }
    ack(response);
  }) : handler);
  registerLobbyHandlers(io, socket, async () => {
    if (mode === 'stall') return new Promise(resolve => { finishLate = resolve; });
    if (mode === 'reject') throw Error('storage unavailable');
    return { preferences: { 'mega-board': 'muted-tournament-board' }, entitlements: [] };
  });
});
await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
const clients = [];
async function client() {
  const s = connect(`http://127.0.0.1:${http.address().port}`, { transports: ['websocket'], reconnection: false });
  clients.push(s); await new Promise((resolve,reject) => { s.once('connect',resolve); s.once('connect_error',reject); }); return s;
}
const ack = (s,payload) => s.timeout(5000).emitWithAck('game:create',payload);
// Execute the actual App submit handler with its React setters captured, not a copy.
const app = await readFile(new URL('../client/src/App.tsx', import.meta.url),'utf8');
const handler = app.slice(app.indexOf('  function handleCreateGame('),app.indexOf('  function handleJoinGame()'));
const js = ts.transpile(handler, { target: ts.ScriptTarget.ES2022 });
function submitHarness(socket, code) {
  const values = {};
  const setters = ['setIsCreating','setMessage','setMegaBoardParked','setLobby','setRanked','setBlitz','setIsSpectator','saveSession','setSavedSession','setRecoveryCode','setInviteCode','setInvitePreview','updateBrowserPath'];
  const args = { socket, isCreating:false, playerName:'Host', roomCode:code, ranked:true, blitz:false, freeParkingJackpotEnabled:true };
  for (const name of setters) args[name] = value => { values[name] = value; };
  const submit = new Function(...Object.keys(args), js+'; return handleCreateGame;')(...Object.values(args));
  return { values, submit: () => submit({preventDefault(){}}) };
}
async function settled(h) {
  for (let i=0;i<130 && h.values.setIsCreating;i++) await new Promise(r=>setTimeout(r,100));
  assert.equal(h.values.setIsCreating,false,'Creating must always settle');
}
try {
  const host=await client(), guest=await client();
  const good=submitHarness(host,'ACK001');good.submit();await settled(good);
  assert.equal(good.values.setLobby.code,'ACK001');
  assert.equal(good.values.setLobby.boardStyle,'muted-tournament-board');
  assert.equal(good.values.updateBrowserPath,'/game/ACK001');
  assert.ok(good.values.saveSession.reconnectToken);
  assert.equal(rooms.get('ACK001').freeParkingJackpotEnabled,false,'ranked rules preserved');
  const retry=await ack(host,{code:'ACK001',playerName:'Host'});
  assert.equal(retry.reconnectToken,good.values.saveSession.reconnectToken);
  assert.equal(rooms.get('ACK001').players.length,1);
  assert.equal((await ack(guest,{code:'ACK001',playerName:'Host'})).ok,false,'other socket cannot recover the host key');
  assert.equal((await ack(host,null)).ok,false,'malformed requests are acknowledged');
  assert.equal((await ack(host,{code:42,playerName:{}})).ok,false);
  mode='stall';const stalled=await ack(host,{code:'ACK002',playerName:'Host'});
  assert.equal(stalled.ok,true);assert.equal(stalled.room.boardStyle,'classic-board');
  finishLate({preferences:{'mega-board':'tycoon-board'},entitlements:[]});
  await new Promise(r=>setTimeout(r,20));assert.equal(rooms.get('ACK002').boardStyle,'classic-board');
  mode='reject';assert.equal((await ack(host,{code:'ACK003',playerName:'Host'})).ok,true);
  mode='normal';drop=true;
  const lost=submitHarness(host,'ACK004');lost.submit();await settled(lost);
  assert.match(lost.values.setMessage,/retry with the same room code/);
  assert.equal(lost.values.setLobby,undefined,'timeout cannot fabricate successful creation');
  assert.ok(rooms.has('ACK004'),'server creation survives a lost acknowledgement');
  lost.submit();await settled(lost);
  assert.equal(lost.values.setLobby.code,'ACK004');assert.ok(lost.values.saveSession.reconnectToken);
  assert.equal(rooms.get('ACK004').players.length,1);
  drop=true;const disconnected=submitHarness(guest,'ACK005');disconnected.submit();guest.disconnect();await settled(disconnected);
  assert.match(disconnected.values.setMessage,/not confirmed/);
  console.log('PASS game:create real sockets: acknowledgement, cosmetics deadline/rejection, lost-ack retry, host-key isolation, malformed payload, client success/timeout/disconnect');
} finally {
  for(const s of clients)s.disconnect();await new Promise(r=>io.close(r));
  rooms.clear();await flushRoomSave();await rm(data,{recursive:true,force:true});
}
