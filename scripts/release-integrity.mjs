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
// VERSION is the sole production authority. Generate before hashing; verification
// is read-only and rejects stale generated consumers, including deployment ZIPs.
function artifact(file, expected) {
  if (mode === 'write') writeFileSync(resolve(root, file), expected);
  else if (readText(file) !== expected) throw new Error(`Stale release artifact: ${file}. Run npm run prepare:release.`);
}
for (const file of packages) {
  const metadata = JSON.parse(readText(file));
  metadata.version = npmVersion;
  artifact(file, `${JSON.stringify(metadata, null, 2)}\n`);
}
const generatedLock = JSON.parse(readText('package-lock.json'));
generatedLock.version = npmVersion;
for (const workspace of ['', 'client', 'server', 'shared']) generatedLock.packages[workspace].version = npmVersion;
artifact('package-lock.json', `${JSON.stringify(generatedLock, null, 2)}\n`);
artifact('shared/version.ts', `// Generated from VERSION by scripts/release-integrity.mjs. Do not edit.\nexport const APP_VERSION = ${JSON.stringify(version)};\n// Hide a zero patch only; corrective patch releases retain their full identity.\nexport const APP_RELEASE_LABEL = APP_VERSION.replace(/\\.0$/, "");\n`);
const cachePrefix = `halieus-shell-v${version.replaceAll('.', '-')}`;
artifact('client/public/sw.js', readText('client/public/sw.js').replace(
  /^const CACHE = .*;\r?$/m,
  `const CACHE = '${cachePrefix}-' + (new URL(self.location.href).searchParams.get('release') || 'unversioned');`,
));
artifact('client/index.html', readText('client/index.html').replace(
  /(href="\/favicon[^"?]*\?v=)[^"&]+/g, `$1${version}`,
));
artifact('README.md', readText('README.md').replace(/(\*\*Current milestone:\*\* )\S+/, `$1${version}`));
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
  'client/src', 'client/public', 'server/src', 'server/data', 'shared', 'deploy',
  'tests/dev-tools/Oracle Quick Deploy',
];
const singles = [
  'docs/HGR_4.5.1_THEME_PROGRESSION_HOTFIX.md',
  'docs/HGR_4.5.1_PART19_NAVIGATION.md',
  'tests/runtime-part18.mjs', 'tests/browser-part18.mjs', 'docs/HGR_4.5.1_PART18_IMPLEMENTATION.md',
  'scripts/generate-flat-brand.mjs', 'scripts/generate-platform-icons.mjs', 'scripts/copy-approved-pwa-icon.mjs',
  'assets/branding/references/ChatGPT Image 25 Sept 2026, 18_24_09.png', 'tests/regression-protected-brand-assets.mjs',
  'tests/regression-website-identity.mjs', 'tests/browser-website-identity.mjs',
  'tests/fixtures/pre2b-protected-assets.json', 'tests/fixtures/pre2b-website-assets.json',
  'docs/project/PART17_PRE2B_INSPECTION.md', 'docs/project/PART17_PRE2B_SCREENSHOT_MATRIX.md',
  'docs/project/PART17_PRE2B_REFERENCES.md', 'docs/project/PART17_PRE2B_IMPLEMENTATION.md',
  'docs/HGR_MODEL_SHEET_V1.md', 'tests/regression-4.5-foundation.mjs',
  'tests/runtime-part17.mjs', 'tests/browser-part17.mjs', 'docs/project/PART17_IMPLEMENTATION_CHECKLIST.md',
  'tests/runtime-classic-lifecycle.mjs', 'tests/fixtures/classic-lifecycle-server.mjs',
  'docs/project/PART17_STAGE2A_CLASSIC_LIFECYCLE.md',
  'desktop/package.json', 'tests/regression-release-identity.mjs', 'tests/browser-release-identity.mjs',
  'docs/project/PART17_STAGE1_RELEASE_IDENTITY.md',
  'tests/regression-4.1.1-part15.mjs', 'tests/regression-4.1.1-video-polish.mjs',
  'tests/regression-4.1.1-session-profile-hotfix.mjs',
  // Only tracked repository files belong in the release identity. Historical
  // docs that were removed from main must not block current release generation.
  'tests/package-oracle-4.0.0.ps1', 'docs/DEPLOYMENT_FIX_4.0.0.md', '.gitignore', 'SECURITY.md',
  'docs/AUDIT_4.0.0.md', 'docs/VALIDATION_4.0.0.md', 'tests/browser-4.0.0-handoff.mjs', 'tests/runtime-4.0.0-reconnect.mjs',
  'VERSION', 'package.json', 'package-lock.json', 'client/package.json',
  'client/index.html', 'client/vite.config.ts', 'server/package.json', 'shared/package.json',
  'Start Halieus Game Room.cmd', 'Restart Halieus Game Room.cmd', 'Close Halieus Game Room.cmd', 'assets/branding/Halieus Game Room.ico',
  'assets/branding/Halieus Game Room.png', 'scripts/windows/generate-launcher-icons.ps1', 'FIRST RUN - Refresh Halieus Launchers.cmd', 'scripts/windows/launcher-shortcuts.ps1',
  'scripts/windows/start-background.ps1', 'scripts/windows/restart-background.ps1', 'scripts/windows/stop-background.ps1', 'scripts/windows/start-production.ps1',
  'scripts/windows/tailscale-funnel.ps1', 'scripts/windows/show-feedback.ps1', 'scripts/windows/HGR GitHub Sync.cmd', 'scripts/windows/Install HGR GitHub Shortcut.cmd',
  'Update Halieus Website.cmd', 'Update HGR GitHub.cmd', 'scripts/release-integrity.mjs', 'tests/regression-3.6.3.mjs',
  'tests/regression-3.6.3b.mjs', 'tests/regression-3.6.4.mjs', 'tests/runtime-word-arena-3.6.4.mjs', 'tests/regression-3.6.4a.mjs',
  'tests/runtime-mega-roll-timer-3.6.4a.mjs', 'tests/regression-3.6.4b.mjs', 'tests/regression-3.6.5.mjs', 'tests/runtime-word-arena-ai-3.6.5.mjs',
  'tests/regression-3.6.6.mjs', 'tests/runtime-word-game-daily-3.6.6.mjs', 'tests/regression-3.6.7.mjs', 'tests/regression-3.6.8.mjs',
  'tests/regression-3.6.8a.mjs', 'tests/regression-3.6.8b.mjs', 'tests/regression-3.6.8c.mjs', 'tests/regression-3.6.8d.mjs',
  'tests/regression-3.6.8e.mjs', 'tests/regression-3.7.0.mjs', 'tests/regression-3.7.0a.mjs', 'tests/regression-3.7.0b.mjs',
  'tests/regression-3.7.0c.mjs', 'tests/regression-3.7.0d.mjs', 'tests/regression-3.7.0e.mjs', 'tests/regression-3.7.0f.mjs',
  'tests/regression-3.7.0g.mjs', 'tests/regression-3.7.0h.mjs', 'tests/regression-3.7.0i.mjs', 'tests/regression-3.7.0j.mjs',
  'tests/regression-3.7.0k.mjs', 'tests/regression-3.7.0l.mjs', 'tests/regression-4.0.0.mjs', 'tests/regression-4.0.1.mjs',
  'tests/regression-4.0.2.mjs', 'tests/regression-4.1.0.mjs', 'tests/regression-4.1.1.mjs', 'README.md', 'ARCHITECTURE.md',
  'docs/HGR_DESIGN_SYSTEM_V1.md', '.github/workflows/release-identity.yml', 'docs/releases/RELEASE_4.0.1.md', 'docs/releases/RELEASE_4.0.2.md',
  'docs/releases/RELEASE_4.1.0.md', 'docs/releases/RELEASE_4.1.1.md', 'docs/project/HGR_4.0.1_IMPLEMENTATION_LOG.md', 'docs/project/HGR_4.0.2_IMPLEMENTATION_LOG.md', 'docs/project/HGR_4.1.0_IMPLEMENTATION_LOG.md', 'docs/project/HGR_4.1.0_DEPLOYMENT_DEBUGGING_POSTMORTEM.md', 'docs/project/HGR_4.1.1_IMPLEMENTATION_LOG.md',
];
const excludedNames = new Set(['RELEASE.json', 'release.ts']);
const excludedExtensions = new Set(['.key', '.pem', '.ppk', '.pub']);
// server/data contains both shipped dictionaries and local runtime state.
// Fingerprint only the shipped source assets; account/social/session state must
// never become part of a release identity or deployment archive.
const excludedGeneratedPaths = new Set([
  // Materialised by client prebuild from the approved reference above. Hash the
  // source artwork, not this disposable copy, so build order cannot change the release identity.
  'client/public/app-icon-reference.png',
]);
const excludedRuntimePaths = new Set([
  'server/data/accounts',
  'server/data/sessions',
  'server/data/guilds',
  'server/data/invites',
  'server/data/backups',
  'server/data/runtime',
  'server/data/feedback.json',
  'server/data/feedback.ndjson',
  'server/data/rankings.json',
  'server/data/rooms.json',
]);
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === 'dist' || name === '.git' || name === '.runtime' || name === 'logs') continue;
    const full = resolve(dir, name);
    const rel = posix(relative(root, full));
    if (excludedRuntimePaths.has(rel) || excludedGeneratedPaths.has(rel)) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else {
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
    'new-game-server-type-contract-3.7.0c',
    'ayo-word-board-playtest-refinement-3.7.0d',
    'stabilized-game-lifecycle-3.7.0e',
    'private-card-state-redaction-3.7.0e',
    'word-board-scowl-dictionary-3.7.0e',
    'password-team-play-3.7.0e',
    'profile-picture-uploads-3.7.0e',
    'tablet-responsive-game-layouts-3.7.0e',
    'oracle-static-release-data-packaging-3.7.0f',
    'mega-debt-direct-property-liquidation-3.7.0g',
    'mega-shared-maximum-rent-3.7.0h',
    'client-finished-phase-typecheck-repair-3.7.0i',
    'mega-blitz-150-second-turn-timer-3.7.0j',
    'mega-live-turn-timer-control-refresh-persistence-3.7.0k',
    'consistent-bundled-game-icons-3.7.0l',
    'branded-session-arrival-4.0.0',
    'portfolio-readme-consolidation-4.0.0',
    // 4.0.1 is presentation-only: these flags protect the new mobile/result
    // contract without implying any change to authoritative ranked scoring.
    'mobile-layout-recovery-4.0.1',
    'ranked-results-hierarchy-4.0.1',
    'mobile-results-card-layout-4.0.1',
    // 4.0.2 removes the legacy mobile desktop-viewport emulation and makes
    // true device-width layout part of the signed release contract.
    'device-width-mobile-viewport-4.0.2',
    'mega-board-phone-layout-4.0.2',
    'mobile-decision-sheet-4.0.2',
    'hidden-dictator-mobile-bounds-4.0.2',
    // 4.1.0 extends the platform social layer without replacing the existing
    // server-authoritative game-room implementations.
    'persistent-guilds-4.1.0',
    'guild-role-permissions-4.1.0',
    'guild-persistent-chat-4.1.0',
    'guild-room-reservations-4.1.0',
    'guild-internal-leaderboard-4.1.0',
    'hgr-shared-design-tokens-4.1.0',
    'hgr-design-system-v1-4.1.0',
    'release-identity-before-build-4.1.0',
    'auto-release-identity-sync-4.1.0',
    'svg-platform-nav-icons-4.1.0',
    'hgr-project-history-4.1.0',
    'hgr-shared-game-shell-polish-4.1.0',
    'matte-launcher-family-4.1.0',
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
  if (releaseTs !== generatedTs) throw new Error('shared/release.ts identity mismatch');
  if (JSON.stringify(existing) !== JSON.stringify(manifest)) throw new Error('RELEASE.json metadata mismatch');
  console.log(`Release integrity verified: ${fingerprint} (${uniqueFiles.length} files)`);
}
