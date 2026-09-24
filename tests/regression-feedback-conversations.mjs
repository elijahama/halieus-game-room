import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const index=read("server/src/index.ts");
const server=read("server/src/platform/feedback.ts");
const paths=read("server/src/platform/dataPaths.ts");
const shared=read("shared/platform/feedback.ts");
const gameForm=read("client/src/platform/components/FeedbackForm.tsx");
const megaMenu=read("client/src/games/mega-board/components/GameMenu.tsx");
const poker=read("client/src/games/poker/PokerScreen.tsx");
const account=read("client/src/platform/accounts/AccountPanel.tsx");
const css=read("client/src/styles/hgr-design-v1.css");

assert.match(shared,/HalieusFeedbackStatus = "open" \| "reviewing" \| "answered" \| "closed"/,"Feedback must have an explicit owner workflow status");
assert.match(shared,/ownerReply: HalieusFeedbackReply \| null/,"Feedback contract must preserve an owner reply");
assert.match(shared,/gameName: string \| null/,"Feedback must preserve the specific game context");

assert.match(index,/registerFeedbackRoutes\(app, getAuthenticatedAccount, hasAdminSession\)/,"Server must register the account-aware feedback service");
assert.match(index,/await loadFeedbackStore\(\)/,"Feedback must be loaded before the server begins normal operation");
assert.doesNotMatch(index,/appendFile\([\s\S]*?feedback/s,"Server index must not keep the old write-only feedback endpoint");

assert.match(paths,/getFeedbackDataDirectory/,"Feedback must have a durable data directory");
assert.match(paths,/feedback\.ndjson/,"Legacy NDJSON path must remain available for migration");
assert.match(server,/feedback\.json/,"New feedback conversations must persist in a mutable JSON store");
assert.match(server,/migrateLegacyFeedback/,"Legacy feedback must be migrated instead of discarded");
assert.match(server,/app\.get\("\/feedback\/mine"/,"Players must be able to read their own feedback history");
assert.match(server,/app\.get\("\/admin\/feedback"/,"Owner tools must expose the feedback inbox");
assert.match(server,/app\.post\("\/admin\/feedback\/:feedbackId\/reply"/,"Owner must be able to reply to feedback");
assert.match(server,/entry\.status = "answered"/,"Replying must update feedback workflow state");

assert.match(gameForm,/accountApi\("\/feedback"/,"In-game feedback must use the authenticated API path");
assert.match(gameForm,/source: "game"/,"In-game feedback must be tagged as game feedback");
assert.match(gameForm,/gameName,/,"In-game feedback must send the game name");
assert.match(megaMenu,/accountApi\("\/feedback"/,"Mega Board feedback must use the persistent feedback service");
assert.match(megaMenu,/gameId: "mega-board"/,"Mega Board feedback must preserve its game identity");
assert.match(poker,/gameId="poker"/,"Poker feedback must preserve its game identity");
assert.match(account,/Send feedback/,"Player profile must expose feedback submission");
assert.match(account,/source: "profile"/,"Profile feedback must identify its source");
assert.match(account,/\/feedback\/mine/,"Player profile must show feedback history");
assert.match(account,/Feedback inbox/,"Owner tools must have an in-site feedback inbox");
assert.match(account,/\/admin\/feedback\/\$\{feedbackId\}\/reply/,"Owner tools must send replies through the feedback service");
assert.match(account,/Reply from \{entry\.ownerReply\.responderDisplayName\}/,"Players must see owner replies inside their profile");
assert.match(css,/\.account-feedback-card/,"Feedback profile surface must be styled as part of the account UI");
assert.match(css,/\.account-feedback-admin-list/,"Owner feedback inbox must have a dedicated layout");

console.log("HGR functional feedback conversation regression: PASS");
