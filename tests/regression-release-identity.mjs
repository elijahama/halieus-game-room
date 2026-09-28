import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
// Intent, not a generated consumer: keep the release family deliberate without
// duplicating VERSION's patch number. Exact patch identity is validated below
// through the generated consumers. A self-consistent rollback to 4.1.1 must
// still fail this gate.
const version = read('VERSION').trim();
assert.match(version, /^4\.5\.\d+[a-z]?$/, `Approved HGR 4.5.x release intent (got ${version})`);
const manifest = JSON.parse(read('RELEASE.json'));
const approvedPwaSource = 'assets/branding/references/ChatGPT Image 25 Sept 2026, 18_24_09.png';
const generatedPwaCopy = 'client/public/app-icon-reference.png';
assert.ok(manifest.integrityFiles.includes(approvedPwaSource), 'Release identity must hash the approved PWA reference source');
assert.ok(!manifest.integrityFiles.includes(generatedPwaCopy), 'Generated PWA public copy must not become a release-identity input');
const run = (cwd, mode) => spawnSync(process.execPath, ['scripts/release-integrity.mjs', mode], { cwd, encoding: 'utf8' });
const good = run(root, '--verify');
assert.equal(good.status, 0, good.stderr);
assert.equal(manifest.version, version);
assert.ok(manifest.fingerprint.startsWith(`hgr-${version}-`));
const accountPanel = read('client/src/platform/accounts/AccountPanel.tsx');
assert.ok(accountPanel.includes('Build {APP_RELEASE_LABEL}'), 'AccountPanel.tsx must use the canonical display label');
assert.ok(accountPanel.includes('import { APP_RELEASE_LABEL } from "../../version"'));
const homeScreen = read('client/src/platform/components/HomeScreen.tsx');
assert.ok(!homeScreen.includes('halieus-side-build-info'), 'Build Info must not return to the Home sidebar');
assert.ok(!accountPanel.includes('buildInfoOpen'), 'Account build label must remain non-interactive');
assert.match(read('server/src/index.ts'), /version: APP_VERSION/);
assert.match(read('server/src/index.ts'), /releaseFingerprint: RELEASE_FINGERPRINT/);
assert.match(read('client/src/main.tsx'), /register\(`\/sw\.js\?release=\$\{encodeURIComponent\(RELEASE_FINGERPRINT\)\}`\)/);

// Exercise the real verifier against corrupted deployment contents, never the
// user's checkout. These cases must fail even if a stale file looks plausible.
const fixture = mkdtempSync(resolve(tmpdir(), 'hgr-identity-'));
try {
  for (const file of new Set([...manifest.integrityFiles, 'RELEASE.json', 'shared/release.ts'])) {
    mkdirSync(dirname(resolve(fixture, file)), { recursive: true });
    copyFileSync(resolve(root, file), resolve(fixture, file));
  }
  assert.equal(run(fixture, '--verify').status, 0, 'Untouched deployment fixture');
  // Client prebuild materialises this byte-for-byte copy after release preparation.
  // Its presence must not invalidate an otherwise identical release fingerprint.
  mkdirSync(dirname(resolve(fixture, generatedPwaCopy)), { recursive: true });
  copyFileSync(resolve(root, approvedPwaSource), resolve(fixture, generatedPwaCopy));
  assert.equal(run(fixture, '--verify').status, 0, 'Materialised PWA icon copy must not change release identity');
  const corruptions = [
    ['shared/version.ts', (s) => s.replace(version, '4.1.1')],
    ['package.json', (s) => s.replace(version, '4.1.1')],
    ['package-lock.json', (s) => s.replace(version, '4.1.1')],
    ['RELEASE.json', (s) => s.replace(version, '4.1.1')],
    ['shared/release.ts', (s) => s.replace(version, '4.1.1')],
    ['client/public/sw.js', (s) => s.replace(`v${version.replaceAll('.', '-')}`, 'v4-1-1')],
    ['client/index.html', (s) => s.replaceAll(`?v=${version}`, '?v=4.1.1')],
    ['client/src/platform/accounts/AccountPanel.tsx', (s) => s.replace('Build {APP_RELEASE_LABEL}', 'Build 4.1.1')],
    ['server/src/index.ts', (s) => s.replace('version: APP_VERSION', 'version: "4.1.1"')],
  ];
  for (const [file, corrupt] of corruptions) {
    const original = read(file);
    const changed = corrupt(original);
    assert.notEqual(changed, original, `${file}: mutation must exercise a real consumer`);
    writeFileSync(resolve(fixture, file), changed);
    assert.notEqual(run(fixture, '--verify').status, 0, `Accepted corrupt ${file}`);
    writeFileSync(resolve(fixture, file), original);
  }
  // A same-version source correction must produce a distinct fingerprint.
  writeFileSync(resolve(fixture, 'shared/version.ts'), 'stale generated artifact');
  writeFileSync(resolve(fixture, 'client/src/main.tsx'), `${read('client/src/main.tsx')}\n// corrective-build fixture\n`);
  const regenerated = run(fixture, '--write');
  assert.equal(regenerated.status, 0, regenerated.stderr);
  assert.equal(run(fixture, '--verify').status, 0);
  const corrected = JSON.parse(readFileSync(resolve(fixture, 'RELEASE.json'), 'utf8'));
  assert.equal(corrected.version, version);
  assert.notEqual(corrected.fingerprint, manifest.fingerprint);
  const stable = readFileSync(resolve(fixture, 'RELEASE.json'), 'utf8');
  assert.equal(run(fixture, '--write').status, 0);
  assert.equal(readFileSync(resolve(fixture, 'RELEASE.json'), 'utf8'), stable, 'Generation must be idempotent');
  console.log(`PASS: canonical ${version} intent on approved 4.5.x release family, 9 corrupted-package rejections, same-version identity and idempotent generation`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
