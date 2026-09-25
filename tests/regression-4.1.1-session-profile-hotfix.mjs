import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),'utf8');

// Current release intent is checked by regression-release-identity.mjs.

const server=read('server/src/index.ts');
const accounts=read('server/src/platform/accounts.ts');
const app=read('client/src/App.tsx');
const accountPanel=read('client/src/platform/accounts/AccountPanel.tsx');
const css=read('client/src/styles/hgr-design-v1.css');

assert.match(server,/express\.json\(\{ limit: "2mb" \}\)/,'Server JSON parser must allow Base64 profile-picture requests');
assert.match(accounts,/profilePictureRaw\.length > 1_400_000/,'Profile route must retain the 1 MB image safety contract after Base64 expansion');
assert.match(accountPanel,/file\.size > 1_000_000/,'Client must reject raw profile pictures over 1 MB before upload');
assert.match(accountPanel,/readAsDataURL\(file\)/,'Profile picture upload must continue sending an image data URL');

assert.match(app,/if \(directGuestRoute \|\| !authStatus\?\.authenticated \|\| siteIntroSeen \|\| !hasRecoverableSession\) return;/,'Recoverable rooms must mark the intro handled for this browsing session');
assert.match(app,/setSiteIntroSeen\(true\);[\s\S]*?sessionStorage\.setItem\(INTRO_SESSION_KEY, "1"\)/s,'Recoverable-session intro suppression must update both React state and session storage');
assert.match(app,/const showSiteIntro = !directGuestRoute && !hasRecoverableSession && Boolean\(authStatus\?\.authenticated\) && !siteIntroSeen/,'Fresh authenticated sessions must remain eligible for the intro');

assert.match(css,/\.account-profile-picture-editor[\s\S]*?grid-template-columns:\s*78px minmax\(0,1fr\)/s,'Profile-picture controls must use the compact editor layout');
assert.match(css,/\.halieus-feature-arrow[\s\S]*?width:\s*34px !important;[\s\S]*?height:\s*34px !important;/s,'Featured-game arrows must be compact and square');
assert.match(css,/\.view-players \.halieus-players-layout\.has-selection[\s\S]*?minmax\(360px,430px\)/s,'Selected player record must use a narrower drill-down column');
assert.match(css,/\.lobby-main-grid[\s\S]*?grid-template-columns:\s*minmax\(0,1\.9fr\) minmax\(260px,\.7fr\)/s,'Mega Board waiting room must use the streamlined desktop proportions');

console.log('Halieus Game Room 4.1.1 session/profile hotfix regression: PASS');
