import fs from 'node:fs';
import assert from 'node:assert/strict';
for (const file of ['Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd']) {
  const s=fs.readFileSync(new URL('../'+file, import.meta.url),'utf8');
  assert(!/update-website\.ps1/i.test(s), `${file} must not invoke update-website.ps1`);
  assert(!/deploy-from-windows\.ps1/i.test(s), `${file} must not invoke Oracle deploy`);
  assert(!/\bssh\b/i.test(s), `${file} must not invoke SSH`);
}
console.log('3.5.27 launcher separation regression: PASS');
