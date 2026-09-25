// Production React components, real release CSS, deterministic public states.
// This harness is test-only; no debug route is added to the application.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const css=(await Promise.all(['index.css','styles/hgr-theme.css','styles/hgr-design-v1.css','styles/hgr-game-surfaces-v45.css','styles/hgr-part17.css','styles/hgr-4.5.1.css'].map(f=>readFile(resolve(root,'client/src',f),'utf8')))).join('\n');
const bundle=await build({stdin:{contents:`
 import React from 'react'; import {createRoot} from 'react-dom/client';
 import {LobbyScreen} from './client/src/games/mega-board/components/LobbyScreen';
 import {GameBoard} from './client/src/games/mega-board/components/GameBoard';
 import {WinnerScreen} from './client/src/games/mega-board/components/WinnerScreen';
 import {LeaderboardModal} from './client/src/games/mega-board/components/LeaderboardModal';
 import {DiceRollOverlay} from './client/src/games/mega-board/components/DiceRollOverlay';
 import {lightTheme,darkTheme} from './client/src/games/mega-board/styles/gameStyles';
 import {createInitialGameState} from './shared/games/mega-board/game-state';
 import {ThemeButton} from './client/src/platform/components/ThemeButton';
 import {RoomChatPanel} from './client/src/platform/components/RoomChatPanel';
 const root=createRoot(document.getElementById('root'));const noop=()=>{};
 const players=Array.from({length:8},(_,i)=>({id:'p'+i,name:i===0?'A long player display name':'Player '+i,isConnected:true,isHost:i===0}));
 const state=createInitialGameState('VIS451',players);Object.assign(state,{phase:'playing',turnPhase:'roll',busTicketsRemaining:7,busTicketDeck:['bus-expire-1','bus-expire-2','normal-1'],winnerId:'p0'});
 window.renderCase=(screen,mode='light',stage=0,count=3)=>{
 document.documentElement.dataset.theme=mode;const theme=mode==='light'?lightTheme:darkTheme;
 const shared={theme,darkMode:mode==='dark',onToggleDarkMode:noop};
 const board={roomCode:'VIS451',playerId:'p0',gameState:state,message:'',...shared};
 const dock=<RoomChatPanel game="mega-board" code="VIS451" accent="#168a42" spectatorCount={2} spectatorNames={['Spectator one','Spectator two']}/>;
 root.render(<React.Fragment key={screen+mode+stage+count}>
 {screen==='lobby'&&<><LobbyScreen {...shared} lobby={{code:'VIS451',playerId:'p0',players}} connectionStatus="Connected" recoveryKey="RECOVERY-451" message="" betaMode={false} onStartGame={noop} onLeaveLobby={noop} onBackToGameRoom={noop} onAddAi={noop} onRemoveAi={noop} onTurnTimerChange={noop}/>{dock}</>}
 {screen==='board'&&<main className="game-page mega-live-page"><GameBoard {...board}/>{dock}</main>}
 {screen==='results'&&<><WinnerScreen {...shared} gameState={{...state,phase:'finished'}} isHost={true} onExit={noop}/>{dock}</>}
 {screen==='podium'&&<LeaderboardModal {...shared} entries={players.slice(0,count).map((p,i)=>({playerKey:p.id,playerName:p.name,rating:1500-i*100,wins:3,gamesPlayed:7,podiums:4,averageFinish:2,awardsWon:1,profilePicture:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="green"/></svg>'}))} recentMatches={[]} loading={false} error="" onRefresh={noop} onClose={noop}/>}
 {screen==='dice'&&<DiceRollOverlay roll={{white1:2,white2:2,speed:null,movementTotal:4}} doublesStage={stage} settleMs={1}/>}
 {screen==='theme'&&<ThemeButton {...shared} background={theme.cardBackground} colour={theme.text} borderColour={theme.border} onToggle={noop}/>}
 </React.Fragment>);
 };
 `,loader:'tsx',resolveDir:root},loader:{'.svg':'dataurl'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env.PROD':'false','import.meta.env.DEV':'false','import.meta.env.VITE_SERVER_URL':'""'},logLevel:'silent'});
const browser=await chromium.launch({headless:true,executablePath:process.env.HGR_BROWSER_EXECUTABLE});
const shots=process.env.HGR_SCREENSHOTS;if(shots)await mkdir(shots,{recursive:true});
try{
for(const [device,width,height] of [['desktop',1440,900],['short',1280,600],['tablet',820,1180],['phone',390,844],['small-phone',360,640]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://hgr.test/**',r=>r.fulfill({contentType:'text/html',body:'<html><body><div id="root"></div></body></html>'}));
 await page.route('**/accounts/me/**',r=>r.fulfill({json:{stats:{played:0,wins:0,winRate:0,byGame:[],recent:[]},preferences:{interface:'classic',cards:'classic','mega-board':'classic-board','poker-table':'classic'},entitlements:['classic-board']}}));
 await page.goto('http://hgr.test');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
 const show=async(screen,mode='light',stage=0,count=3)=>{await page.evaluate(args=>window.renderCase(...args),[screen,mode,stage,count]);};
 const contained=async(selector)=>{const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1,`${device}: ${selector} horizontal ${JSON.stringify(box)}`);};
 for(const mode of ['light','dark']){
  await show('lobby',mode);await page.locator('.lobby-card-v2').waitFor();await contained('.lobby-card-v2');
  if(width>920){const a=await page.locator('.players-panel-v2').boundingBox(),b=await page.locator('.lobby-side-panel').boundingBox();assert.ok(Math.abs(a.y+a.height-b.y-b.height)<3,`${device} roster/control bottoms ${JSON.stringify({a,b})}`);}
  await page.getByRole('button',{name:/Board styles/}).click();await page.getByRole('dialog',{name:'HGR skins'}).waitFor();assert.ok(await page.locator('.halieus-skins-grid button:disabled').count()>0,'Locked boards show requirements');await page.keyboard.press('Escape');
  if(shots)await page.screenshot({path:resolve(shots,`${device}-${mode}-lobby.png`),fullPage:true});
  await show('board',mode);await page.locator('.board-bus-ticket-button').waitFor();await contained('.board-frame');
  await page.locator('.board-bus-ticket-button').click();await page.getByRole('dialog',{name:'Bus Ticket deck information'}).waitFor();await page.getByRole('heading',{name:'7 remaining'}).waitFor();await page.keyboard.press('Escape');await page.locator('.bus-ticket-info-card').waitFor({state:'hidden'});
  if(shots)await page.screenshot({path:resolve(shots,`${device}-${mode}-board.png`),fullPage:true});
  await show('results',mode);await page.locator('.mario-results-card').waitFor();await contained('.mario-results-card');
  for(const tab of ['Results','Stats','Awards']){await page.locator('.results-tabs button').filter({hasText:tab}).click();await page.locator('.results-footer button').last().scrollIntoViewIfNeeded();const footer=await page.locator('.results-footer').boundingBox(),dock=await page.locator('.room-chat-trigger').boundingBox();assert.ok(footer.y+footer.height<=dock.y+1,`${device} ${tab} footer collides with dock ${JSON.stringify({footer,dock})}`);}
  if(shots)await page.screenshot({path:resolve(shots,`${device}-${mode}-results.png`),fullPage:true});
 }
 await show('podium');await page.locator('.leaderboard-podium').waitFor();const rects=await page.locator('.leaderboard-podium article').evaluateAll(es=>es.map(e=>({rank:e.className,...e.getBoundingClientRect().toJSON()})));const first=rects.find(r=>r.rank==='is-rank-1'),second=rects.find(r=>r.rank==='is-rank-2'),third=rects.find(r=>r.rank==='is-rank-3');assert.ok(second.x<first.x&&first.x<third.x&&first.height>second.height&&second.height>third.height,JSON.stringify(rects));assert.equal(await page.locator('.leaderboard-grid:not(.leaderboard-grid-head)').count(),3);assert.equal(await page.locator('.leaderboard-podium img').count(),3);
 await show('podium','light',0,1);await page.waitForFunction(()=>document.querySelectorAll('.leaderboard-podium article').length===1);assert.equal(await page.locator('.is-rank-1').evaluate(e=>getComputedStyle(e).gridColumnStart),'2');
 for(const stage of [1,2,3,0]){await show('dice','dark',stage);await page.locator('.dice-roll-overlay.is-settled').waitFor();assert.equal(await page.locator('.dice-roll-overlay').evaluate(e=>e.className.includes('is-doubles-stage-')),stage>0);if(stage)assert.ok(await page.locator('.is-doubles-stage-'+stage).count());}
 assert.deepEqual(errors,[]);console.log(`PASS ${device}: light/dark lobby, cosmetics locks, board geometry containment, Bus Ticket, results/dock, podium 1–3, doubles 0–3`);await page.close();
}
}finally{await browser.close();}
