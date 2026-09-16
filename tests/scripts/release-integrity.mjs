import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const mode = process.argv.includes('--write') ? 'write' : 'verify';
const posix = (value) => value.replaceAll('\\', '/');
const readText = (path) => readFileSync(resolve(root, path), 'utf8');
const version = readText('VERSION').trim();

const versionMatch = version.match(/^(\d+\.\d+\.\d+)([a-z])?$/);
if (!versionMatch) throw new Error(`Invalid VERSION: ${version}`);
const npmVersion = versionMatch[2] ? `${versionMatch[1]}-${versionMatch[2]}` : version;

const packages = ['package.json', 'client/package.json', 'server/package.json', 'shared/package.json', 'desktop/package.json'];
for (const file of packages) {
  const actual = JSON.parse(readText(file)).version;
  if (actual !== npmVersion) throw new Error(`Mixed release: VERSION=${version} (npm ${npmVersion}), ${file}=${actual}`);
}

const sharedVersion = readText('shared/version.ts');
if (!sharedVersion.includes(`APP_VERSION = "${version}"`)) {
  throw new Error(`shared/version.ts does not expose APP_VERSION ${version}`);
}

const lock = JSON.parse(readText('package-lock.json'));
if (lock.version !== npmVersion) throw new Error(`Mixed release: VERSION=${version} (npm ${npmVersion}), package-lock.json=${lock.version}`);
for (const workspace of ['', 'client', 'server', 'shared']) {
  const actual = lock.packages?.[workspace]?.version;
  if (actual !== npmVersion) throw new Error(`Mixed release lock entry: VERSION=${version} (npm ${npmVersion}), package-lock packages[${JSON.stringify(workspace)}]=${actual ?? 'missing'}`);
}

const roots = [
  'client/src', 'client/public', 'server/src', 'shared', 'deploy',
  'dev-tools/Oracle Quick Deploy',
];
const singles = [
  'VERSION', 'package.json', 'package-lock.json',
  'client/package.json', 'client/index.html', 'client/vite.config.ts',
  'server/package.json', 'shared/package.json',
  'Start Halieus Game Room.cmd', 'Restart Halieus Game Room.cmd', 'Close Halieus Game Room.cmd',
  // The main root ICO is a Windows launcher convenience, not an Oracle runtime input.
  // It still ships in the downloadable ZIP but its absence must not invalidate website deployment.
  'Start Halieus Game Room.ico', 'Restart Halieus Game Room.ico', 'Update Halieus Website.ico', 'Close Halieus Game Room.ico',
  'FIRST RUN - Refresh Halieus Launchers.cmd', 'launcher-shortcuts.ps1',
  'Update Halieus Website.cmd', 'update-website.ps1',
  'scripts/release-integrity.mjs',
  'tests/regression-3.6.3.mjs', 'tests/regression-3.6.3b.mjs', 'tests/regression-3.6.4.mjs', 'tests/runtime-word-arena-3.6.4.mjs', 'tests/regression-3.6.4a.mjs', 'tests/runtime-mega-roll-timer-3.6.4a.mjs', 'tests/regression-3.6.4b.mjs', 'tests/regression-3.6.5.mjs', 'tests/runtime-word-arena-ai-3.6.5.mjs', 'tests/regression-3.6.6.mjs', 'tests/runtime-word-game-daily-3.6.6.mjs', 'tests/regression-3.6.7.mjs', 'tests/regression-3.6.8.mjs', 'tests/regression-3.6.8a.mjs', 'tests/regression-3.6.8b.mjs', 'tests/regression-3.6.8c.mjs', 'tests/regression-3.6.8d.mjs', 'tests/regression-3.6.8e.mjs', 'tests/regression-3.7.0.mjs', 'tests/regression-3.7.0a.mjs', 'tests/regression-3.7.0b.mjs', 'README.md', 'ARCHITECTURE.md',
  'docs/releases/RELEASE_3.6.3.md', 'docs/releases/RELEASE_3.6.3_VALIDATION.md',
  'docs/releases/RELEASE_3.6.3b.md', 'docs/releases/RELEASE_3.6.3b_VALIDATION.md',
  'docs/releases/RELEASE_3.6.4.md', 'docs/releases/RELEASE_3.6.4_VALIDATION.md',
  'docs/releases/RELEASE_3.6.4a.md', 'docs/releases/RELEASE_3.6.4a_VALIDATION.md',
  'docs/releases/RELEASE_3.6.4b.md', 'docs/releases/RELEASE_3.6.4b_VALIDATION.md',
  'docs/releases/RELEASE_3.6.5.md', 'docs/releases/RELEASE_3.6.5_VALIDATION.md',
  'docs/releases/RELEASE_3.6.6.md', 'docs/releases/RELEASE_3.6.6_VALIDATION.md',
  'docs/releases/RELEASE_3.6.7.md', 'docs/releases/RELEASE_3.6.7_VALIDATION.md',
  'docs/releases/RELEASE_3.6.7b.md', 'docs/releases/RELEASE_3.6.7b_VALIDATION.md',
  'docs/releases/RELEASE_3.6.8.md', 'docs/releases/RELEASE_3.6.8_VALIDATION.md',
  'docs/releases/RELEASE_3.6.8a.md', 'docs/releases/RELEASE_3.6.8a_VALIDATION.md',
  'docs/releases/RELEASE_3.6.8b.md', 'docs/releases/RELEASE_3.6.8b_VALIDATION.md',
  'docs/releases/RELEASE_3.6.8c.md', 'docs/releases/RELEASE_3.6.8c_VALIDATION.md',
  'docs/releases/RELEASE_3.6.8e.md', 'docs/releases/RELEASE_3.6.8e_VALIDATION.md',
  'docs/releases/RELEASE_3.7.0a.md', 'docs/releases/RELEASE_3.7.0a_VALIDATION.md', 'docs/releases/RELEASE_3.7.0b.md', 'docs/releases/RELEASE_3.7.0b_VALIDATION.md',
  'docs/project/HGR_3.6.4_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.4a_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.4b_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.5_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.6_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.7_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.7b_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.8_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.8a_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.8b_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.8c_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.6.8e_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.7.0a_IMPLEMENTATION_LOG.md', 'docs/project/HGR_3.7.0b_IMPLEMENTATION_LOG.md',
];
const excludedNames = new Set(['RELEASE.json', 'release.ts']);
const excludedExtensions = new Set(['.key', '.pem', '.ppk', '.pub']);
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === 'dist' || name === '.git' || name === '.runtime' || name === 'logs') continue;
    const full = resolve(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else {
      const rel = posix(relative(root, full));
      if (excludedNames.has(name)) continue;
      const lower = name.toLowerCase();
      if ([...excludedExtensions].some((ext) => lower.endsWith(ext))) {
        // Owner workspaces may contain a legacy Oracle key from older Halieus
        // releases. Private keys are never release inputs and are excluded from
        // the fingerprint/package instead of blocking the update.
        continue;
      }
      files.push(rel);
    }
  }
}

for (const item of singles) {
  const full = resolve(root, item);
  if (!existsSync(full)) throw new Error(`Release integrity input missing: ${item}`);
  files.push(posix(item));
}
for (const item of roots) {
  const full = resolve(root, item);
  if (!existsSync(full)) throw new Error(`Release integrity root missing: ${item}`);
  walk(full);
}

// Private-key-like files are intentionally ignored by release integrity.
// The Windows packer also excludes them from every deployment archive.

const uniqueFiles = [...new Set(files)].sort();
const hash = createHash('sha256');
for (const file of uniqueFiles) {
  hash.update(file, 'utf8');
  hash.update('\0');
  hash.update(readFileSync(resolve(root, file)));
  hash.update('\0');
}
const fullHash = hash.digest('hex');
const fingerprint = `hgr-${version}-${fullHash.slice(0, 16)}`;

const manifest = {
  product: 'Halieus Game Room',
  version,
  fingerprint,
  algorithm: 'sha256',
  sourceHash: fullHash,
  integrityFileCount: uniqueFiles.length,
  integrityFiles: uniqueFiles,
  requiredFeatures: [
    'release-fingerprint-verification',
    'start-restart-no-deploy',
    'update-no-server-provisioning',
    'intro-bypass',
    'system-light-dark-theme',
    'fixed-game-room-sidebar',
    'profile-first-sidebar',
    'viewport-centered-room-modals',
    'home-active-game-discovery',
    'native-game-invites',
    'player-stat-hub',
    'mega-board-authoritative-square-fit',
    'ludo-protected-layout',
    'poker-table-protected-chat-fit',
    'blackjack-ground-up-rebuild',
    'whot-ground-up-rebuild',
    'cheat-live-module',
    'dominoes-live-module',
    'blackjack-whot-ai-room-options',
    'classic-table-ai-room-options',
    'build-info-on-demand',
    'noninteractive-future-game-roadmap',
    'mobile-build-marker-hidden',
    'action-coloured-windows-launchers',
    'owner-dashboard-sections',
    'owner-connected-tab-hub',
    'owner-invites-connected-subnav',
    'games-single-category-heading',
    'word-game-live-module',
    'password-live-module',
    'anagrams-race-live-module',
    'word-arena-room-recovery-chat-spectators',
    'mega-depot-distinct-action-colour',
    'mega-trade-decline-all-full-width',
    'password-human-only',
    'anagrams-human-only',
    'room-recovery-id-remap',
    'human-join-replaces-ai-in-open-lobbies',
    'fresh-room-code-on-create',
    'game-viewport-fit',
    'whot-centred-single-scroll-layout',
    'classic-table-dark-theme',
    'word-game-daily-single-player',
    'word-game-daily-leaderboard',
    'word-game-practice-unranked',
    'word-game-collapsible-social-room',
    'owner-content-height-dialog',
    'ranked-leaderboard-global-top-layer',
    'ranked-leaderboard-create-room-access',
    'uniform-game-icon-outline',
    'dependency-security-floor-3.6.8b',
    'oracle-audit-high-severity-gate-3.6.8c',
    'uniform-game-icon-single-outline-3.6.8d',
    'mega-bank-live-building-inventory-3.6.8e',
    'pwa-install-shell-3.7.0',
    'ios-network-fallback-diagnostics-3.7.0',
    'persistent-game-requests-3.7.0',
    'admin-player-visibility-3.7.0',
    'ayo-traditional-yoruba-module-3.7.0',
    'word-board-original-crossword-module-3.7.0',
    'oracle-ssh-key-acl-self-repair-3.7.0a',
    'new-game-results-report-contract-3.7.0b',
  ],
};

const generatedTs = `// Generated by scripts/release-integrity.mjs. Do not edit by hand.\nexport const RELEASE_FINGERPRINT = ${JSON.stringify(fingerprint)};\nexport const RELEASE_SOURCE_HASH = ${JSON.stringify(fullHash)};\n`;

if (mode === 'write') {
  writeFileSync(resolve(root, 'RELEASE.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(root, 'shared/release.ts'), generatedTs);
  console.log(`Wrote release manifest ${fingerprint} (${uniqueFiles.length} integrity files)`);
} else {
  if (!existsSync(resolve(root, 'RELEASE.json'))) throw new Error('RELEASE.json is missing. Run release-integrity.mjs --write.');
  if (!existsSync(resolve(root, 'shared/release.ts'))) throw new Error('shared/release.ts is missing. Run release-integrity.mjs --write.');
  const existing = JSON.parse(readText('RELEASE.json'));
  if (existing.version !== version) throw new Error(`RELEASE.json version ${existing.version} does not match ${version}`);
  if (existing.fingerprint !== fingerprint || existing.sourceHash !== fullHash) {
    throw new Error(`Release source changed after manifest generation. Expected ${existing.fingerprint}; current ${fingerprint}. Regenerate before packaging.`);
  }
  const releaseTs = readText('shared/release.ts');
  if (!releaseTs.includes(`RELEASE_FINGERPRINT = ${JSON.stringify(fingerprint)}`)) throw new Error('shared/release.ts fingerprint mismatch');
  console.log(`Release integrity verified: ${fingerprint} (${uniqueFiles.length} files)`);
}
