import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const expected = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/pre2b-protected-assets.json'), 'utf8'));
const actualPaths = [];
function walk(dir) {
  for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(path); else actualPaths.push(path);
  }
}
walk('assets/branding/references');
walk('assets/branding/launchers');
assert.deepEqual(actualPaths.sort(), expected.map(a => a.path).sort(), 'Protected reference/launcher inventory changed; review the entire set');
for (const asset of expected) {
  const bytes = readFileSync(resolve(root, asset.path));
  // Exact byte check for this Windows snapshot. On other checkout platforms,
  // only CRLF/LF conversion of text is permitted; binary artwork is always exact.
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== asset.sha256 && /\.(svg|md)$/.test(asset.path)) {
    assert.equal(createHash('sha256').update(bytes.toString('utf8').replace(/\r?\n/g, '\r\n')).digest('hex'), asset.sha256, asset.path);
  } else assert.equal(hash, asset.sha256, asset.path);
}
console.log(`PASS protected branding: ${expected.length} independent reference/launcher files`);
