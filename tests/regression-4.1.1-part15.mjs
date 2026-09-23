import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

const currentVersion=read('VERSION').trim();
assert.equal(currentVersion,'4.1.1','Part 15 is a 4.1.1 platform/UI continuation');

const home=read('client/src/platform/components/HomeScreen.tsx');
const themeButton=read('client/src/platform/components/ThemeButton.tsx');
const playerIdentity=read('client/src/platform/components/PlayerIdentityCard.tsx');
const guildPanel=read('client/src/platform/components/GuildsPanel.tsx');
const css=read('client/src/styles/hgr-design-v1.css');

assert.match(themeButton,/createPortal/,'Theme selector popover/editor must escape sidebar overflow through a portal');
for(const mode of ['system','dark','light','blue','custom']) {
  assert.ok(themeButton.includes(`mode: "${mode}"`),`Theme selector missing ${mode}`);
}
assert.match(themeButton,/halieus-custom-theme-dialog/,'Custom palette must use a contained dialog');
assert.match(themeButton,/>Reset</,'Custom theme must expose Reset');
assert.match(themeButton,/>Cancel</,'Custom theme must expose Cancel');
assert.match(themeButton,/Apply custom theme/,'Custom theme must require explicit Apply');
assert.match(css,/\.halieus-theme-popover[\s\S]*?z-index:\s*1200/s,'Theme popover must stay above the Game Room shell');
assert.match(css,/body,[\s\S]*?#root,[\s\S]*?\.halieus-shell[\s\S]*?transition:\s*none !important/s,'Whole-shell theme switching must remain immediate');

assert.match(home,/const featureRotation = useMemo/,'Home must build a cycling feature rotation');
assert.match(home,/setInterval\(\(\) => setFeaturedRotationIndex/,'Home feature rotation must advance automatically');
assert.match(home,/halieus-feature-arrow is-previous/,'Home feature carousel must expose previous navigation');
assert.match(home,/halieus-feature-arrow is-next/,'Home feature carousel must expose next navigation');
assert.match(home,/halieus-feature-rail/,'Home feature carousel must expose direct feature indicators');

assert.match(home,/const \[inboxOpen, setInboxOpen\]/,'Game Room must expose an in-app player inbox');
assert.match(home,/\/guilds\/invitations/,'Inbox must load guild invitations');
assert.match(home,/HgrIcon name="inbox"/,'Inbox must be reachable from platform navigation');
assert.match(home,/halieus-inbox-panel/,'Inbox must render as a dedicated action surface');
assert.match(home,/PlayerIdentityCard/,'Home and player directory must consume the shared player identity component');
assert.match(playerIdentity,/player\.profilePicture\s*\?\s*<img/,'Shared player identity must prefer uploaded profile pictures');
assert.match(playerIdentity,/@\{player\.username\}/,'Shared player identity must retain the canonical @username');

assert.match(guildPanel,/Add to guild/,'Guild members must be addable directly from HGR');
assert.doesNotMatch(guildPanel,/\.slice\(0,\s*8\)/,'Guild invite browser must not hide eligible players behind an arbitrary first-eight cap');
assert.match(guildPanel,/!inviteSearch\.trim\(\)/,'Guild invite browser must show players before a search is entered');
assert.match(css,/\.halieus-guild-invite-results[\s\S]*?max-height:\s*360px[\s\S]*?overflow-y:\s*auto/s,'Full guild player list must remain contained and scrollable');

console.log('Halieus Game Room 4.1.1 Part 15 platform coherence regression: PASS');
