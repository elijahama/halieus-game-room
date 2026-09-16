import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const version = read('VERSION').trim();
const update = read('update-website.ps1');
const deploy = read('dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1');

assert.ok(version.startsWith('3.5.') && Number(version.split('.')[2]) >= 23, '3.5.23 guarantees must remain in later 3.5.x builds');
for (const [name, text] of [['root updater', update], ['Oracle deploy', deploy]]) {
  assert.match(text, /function Get-HalieusPublicHealth/gi, `${name} must use the shared health-check pattern`);
  assert.match(text, /Get-Command curl\.exe/gi, `${name} must prefer native curl.exe on Windows`);
  assert.match(text, /Net\.SecurityProtocolType\]::Tls12/gi, `${name} must force TLS 1.2 on the PowerShell fallback`);
  assert.match(text, /Get-HalieusPublicHealth -Uri/gi, `${name} must route public health checks through the robust helper`);
}
console.log('3.5.23 public-health verification regression checks passed.');
