import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const json=(p)=>JSON.parse(read(p));

assert.equal(read('VERSION').trim(),'4.0.0');
for(const file of ['package.json','client/package.json','server/package.json','shared/package.json','desktop/package.json']) {
  assert.equal(json(file).version,'4.0.0',`${file} version mismatch`);
}
const rootPackage=json('package.json');
assert.match(rootPackage.scripts['test:regression'],/regression-3\.7\.0l\.mjs.*regression-4\.0\.0\.mjs/s,'Regression chain must preserve 3.7.0l before 4.0.0');

const app=read('client/src/App.tsx');
const intro=read('client/src/platform/components/HalieusIntro.tsx');
const css=read('client/src/index.css');
const readme=read('README.md');

assert.match(app,/import \{ HalieusIntro \} from "\.\/platform\/components\/HalieusIntro";/,'App must mount the branded intro component');
assert.match(app,/INTRO_SESSION_KEY = "halieus-intro-seen-v4"/,'4.0.0 session intro key missing');
assert.match(app,/directGuestRoute \|\| sessionStorage\.getItem\(INTRO_SESSION_KEY\) === "1"/,'Direct room routes and already-seen sessions must bypass the intro');
assert.match(app,/sessionStorage\.setItem\(INTRO_SESSION_KEY, "1"\)/,'Intro must mark itself seen for refresh continuity');
assert.match(app,/sessionStorage\.removeItem\(INTRO_SESSION_KEY\)/,'Explicit logout must allow the next login to show the intro again');
assert.match(app,/const showSiteIntro = !directGuestRoute && !hasRecoverableSession && Boolean\(authStatus\?\.authenticated\) && !siteIntroSeen/,'Only authenticated normal-root sessions without recovery should receive the intro');
assert.ok(app.indexOf('!authStatus.authenticated') < app.indexOf('<HalieusIntro'),'Account portal must remain before the signed-in intro gate');

assert.match(intro,/Welcome to<br \/>Halieus Game Room/,'Intro must use the approved welcome copy');
assert.match(intro,/Your games\. Your people\. One room\./,'Intro must state the concise platform line');
assert.match(intro,/AUTO_ENTER_MS = 3200/,'Intro should auto-advance instead of becoming a mandatory gate');
assert.match(intro,/Skip intro/,'Intro must provide an immediate skip affordance');
assert.match(intro,/Enter Game Room/,'Intro must provide a direct enter action');
assert.match(intro,/app-icon-192\.png\?v=4\.0\.0/,'Intro must use the versioned Halieus identity asset');
assert.doesNotMatch(intro,/seven games|7 games/i,'4.0.0 intro must not carry the obsolete seven-game copy');

assert.match(css,/4\.0\.0 — Halieus branded arrival/,'4.0.0 intro CSS marker missing');
assert.match(css,/html\[data-theme="light"\] \.halieus-intro-v4/,'Intro must respect the saved light theme');
assert.match(css,/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.halieus-intro-v4/s,'Intro must respect reduced-motion preferences');

assert.match(readme,/Current milestone: 4\.0\.0/,'Root README must describe the 4.0.0 milestone');
assert.match(readme,/Human-directed, AI-assisted engineering/,'README must transparently describe the AI-assisted development model');
assert.match(readme,/server-authoritative real-time multiplayer architecture/i,'README must explain the authoritative architecture');
assert.match(readme,/Welcome to Halieus Game Room/,'README must document the new arrival experience');

console.log('Halieus Game Room 4.0.0 branded arrival + portfolio README regression: PASS');
