#!/usr/bin/env bash
set -euo pipefail

SOURCE_ZIP="${SOURCE_ZIP:-/tmp/halieus-game-room-source.zip}"
LEGACY_DATA_ARCHIVE="${LEGACY_DATA_ARCHIVE:-/tmp/halieus-game-room-data.tar.gz}"
APP_DIR="${APP_DIR:-/opt/halieus-game-room}"
DATA_DIR="${DATA_DIR:-/var/lib/halieus-game-room}"
ENV_DIR="${ENV_DIR:-/etc/halieus-game-room}"
SERVICE_USER="${SERVICE_USER:-halieus}"
DOMAIN="${DOMAIN:-halieus.remotewire.net}"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer with sudo/root." >&2
  exit 1
fi

if [[ ! -f "$SOURCE_ZIP" ]]; then
  echo "Missing source ZIP: $SOURCE_ZIP" >&2
  exit 1
fi

require_runtime() {
  local missing=0
  for cmd in unzip curl rsync node npm systemctl; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "Missing required runtime command: $cmd" >&2
      missing=1
    fi
  done
  local major=0
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
  fi
  if [[ "$major" -lt 20 ]]; then
    echo "Node.js 20+ is required; found major version ${major:-0}." >&2
    missing=1
  fi
  if [[ "$missing" -ne 0 ]]; then
    echo "Oracle is not provisioned for Halieus updates. Run the separate provision-oracle.sh tool once; routine Update must not install OS packages." >&2
    exit 1
  fi
}

ensure_swap() {
  if swapon --show --noheadings 2>/dev/null | grep -q .; then
    return
  fi
  local mem_kb
  mem_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  if [[ "${mem_kb:-0}" -lt 2097152 ]]; then
    echo "Low-memory VM has no swap. Refusing to alter OS configuration during Update." >&2
    echo "Run the separate provisioning tool once to configure swap, then retry." >&2
    exit 1
  fi
}

require_runtime
ensure_swap

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "Halieus service user '$SERVICE_USER' is missing. Routine Update will not create operating-system accounts." >&2
  echo "Run the separate provision-oracle.sh tool once, then retry Update." >&2
  exit 1
fi

STAGE="$(mktemp -d /tmp/halieus-stage.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT
unzip -q "$SOURCE_ZIP" -d "$STAGE/source"
if [[ -f "$STAGE/source/package.json" && -f "$STAGE/source/package-lock.json" ]]; then
  SOURCE_ROOT="$STAGE/source"
else
  SOURCE_ROOT="$(find "$STAGE/source" -mindepth 2 -maxdepth 3 -type f -name package-lock.json -printf '%h\n' | sort | head -n1)"
fi
if [[ -z "${SOURCE_ROOT:-}" || ! -f "$SOURCE_ROOT/package.json" || ! -f "$SOURCE_ROOT/package-lock.json" || ! -f "$SOURCE_ROOT/VERSION" || ! -f "$SOURCE_ROOT/RELEASE.json" || ! -f "$SOURCE_ROOT/scripts/release-integrity.mjs" ]]; then
  echo "Could not identify a complete Halieus source root in ZIP." >&2
  exit 1
fi

EXPECTED_VERSION="$(tr -d '\r\n[:space:]' < "$SOURCE_ROOT/VERSION")"
if [[ -z "$EXPECTED_VERSION" ]]; then
  echo "Candidate VERSION is empty." >&2
  exit 1
fi

node - "$EXPECTED_VERSION" "$SOURCE_ROOT" <<'NODE'
const fs = require('fs');
const path = require('path');
const expected = process.argv[2];
const root = process.argv[3];
const match = expected.match(/^(\d+\.\d+\.\d+)([A-Za-z])?$/);
if (!match) {
  console.error(`Invalid Halieus VERSION: ${expected}`);
  process.exit(1);
}
const expectedPackageVersion = match[2] ? `${match[1]}-${match[2].toLowerCase()}` : expected;
for (const relative of ['package.json', 'client/package.json', 'server/package.json', 'shared/package.json']) {
  const file = path.join(root, relative);
  const actual = JSON.parse(fs.readFileSync(file, 'utf8')).version;
  if (actual !== expectedPackageVersion) {
    console.error(`Mixed release: VERSION is ${expected} (npm ${expectedPackageVersion}), but ${relative} is ${actual}.`);
    process.exit(1);
  }
}
NODE

echo "Validated deployment candidate version: $EXPECTED_VERSION"

echo "Verifying release source fingerprint before build..."
cd "$SOURCE_ROOT"
node scripts/release-integrity.mjs --verify
EXPECTED_FINGERPRINT="$(node -e 'const fs=require("fs");const m=JSON.parse(fs.readFileSync("RELEASE.json","utf8"));process.stdout.write(String(m.fingerprint||""))')"
if [[ -z "$EXPECTED_FINGERPRINT" ]]; then
  echo "RELEASE.json fingerprint is missing." >&2
  exit 1
fi
echo "Validated release fingerprint: $EXPECTED_FINGERPRINT"

# Build and validate the candidate OUTSIDE the live application directory.
# A failed npm install/build must never take the currently working site down.
echo "Installing dependencies into deployment candidate..."
cd "$SOURCE_ROOT"
npm ci

echo "Running npm security audit (HIGH or CRITICAL blocks deploy; lower severities remain visible)..."
# npm audit still prints low/moderate advisories for owner awareness, but the
# established Halieus release gate blocks only HIGH/CRITICAL findings. This
# avoids turning non-blocking advisory noise into a false deployment failure.
npm audit --audit-level=high

echo "Building deployment candidate..."
npm run build

if [[ ! -f "$SOURCE_ROOT/client/dist/index.html" ]]; then
  echo "Client build validation failed: client/dist/index.html is missing." >&2
  exit 1
fi
if [[ ! -f "$SOURCE_ROOT/server/dist/server/src/index.js" ]]; then
  echo "Server build validation failed: server/dist/server/src/index.js is missing." >&2
  exit 1
fi

# Production only needs runtime dependencies after the build artifacts exist.
npm prune --omit=dev

CANDIDATE_DIR="${APP_DIR}.candidate-${STAMP}"
BACKUP_DIR="${APP_DIR}.backup-${STAMP}"
rm -rf "$CANDIDATE_DIR"
mkdir -p "$CANDIDATE_DIR"
rsync -a --delete --exclude 'server/data/' "$SOURCE_ROOT/" "$CANDIDATE_DIR/"

mkdir -p "$DATA_DIR" "$DATA_DIR/accounts" "$DATA_DIR/sessions" "$DATA_DIR/mega-board" "$DATA_DIR/feedback"
chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"

DATA_HAS_FILES="$(find "$DATA_DIR" -type f -print -quit 2>/dev/null || true)"
if [[ -f "$LEGACY_DATA_ARCHIVE" && ( -z "$DATA_HAS_FILES" || "${FORCE_DATA_IMPORT:-0}" == "1" ) ]]; then
  echo "Importing existing Halieus account/game data into canonical Oracle data root..."
  if [[ -n "$DATA_HAS_FILES" ]]; then
    tar -C "$DATA_DIR" -czf "/root/halieus-data-backup-${STAMP}.tar.gz" .
  fi
  mkdir -p "$STAGE/legacy"
  tar -xzf "$LEGACY_DATA_ARCHIVE" -C "$STAGE/legacy"
  LEGACY_ROOT="$STAGE/legacy"
  if [[ -d "$STAGE/legacy/data" ]]; then LEGACY_ROOT="$STAGE/legacy/data"; fi

  if [[ -d "$LEGACY_ROOT/accounts" ]]; then rsync -a "$LEGACY_ROOT/accounts/" "$DATA_DIR/accounts/"; fi
  if [[ -d "$LEGACY_ROOT/sessions" ]]; then rsync -a "$LEGACY_ROOT/sessions/" "$DATA_DIR/sessions/"; fi
  if [[ -f "$LEGACY_ROOT/rooms.json" ]]; then cp "$LEGACY_ROOT/rooms.json" "$DATA_DIR/mega-board/rooms.json"; fi
  if [[ -f "$LEGACY_ROOT/rankings.json" ]]; then cp "$LEGACY_ROOT/rankings.json" "$DATA_DIR/mega-board/rankings.json"; fi
  if [[ -f "$LEGACY_ROOT/feedback.ndjson" ]]; then cp "$LEGACY_ROOT/feedback.ndjson" "$DATA_DIR/feedback/feedback.ndjson"; fi

  # Refuse to silently finish a first migration without the account store when
  # one was present in the source path supplied by the owner.
  if [[ -d "$LEGACY_ROOT/accounts" && ! -f "$DATA_DIR/accounts/accounts.json" ]]; then
    echo "Account migration validation failed: accounts.json was not imported." >&2
    exit 1
  fi
  chown -R "$SERVICE_USER:$SERVICE_USER" "$DATA_DIR"
fi

if [[ ! -f "$ENV_DIR/halieus.env" ]]; then
  echo "Halieus production environment file is missing: $ENV_DIR/halieus.env" >&2
  echo "Routine Update will not create production configuration. Run provisioning/recovery deliberately, then retry." >&2
  exit 1
fi
chown root:"$SERVICE_USER" "$ENV_DIR/halieus.env"
chmod 640 "$ENV_DIR/halieus.env"

# Candidate has passed install/build validation. Warn connected players before
# the production service is stopped. This talks only to the current server over
# Oracle loopback; it does not expose a public maintenance-control endpoint.
MAINTENANCE_GRACE_SECONDS="${MAINTENANCE_GRACE_SECONDS:-12}"
MAINTENANCE_JSON="$(node -e 'const version=process.argv[1];const seconds=Number(process.argv[2])||12;process.stdout.write(JSON.stringify({state:"scheduled",reason:"HGR is about to restart for an update.",targetVersion:version,estimatedSeconds:seconds}))' "$EXPECTED_VERSION" "$MAINTENANCE_GRACE_SECONDS")"
if curl -fsS -X POST   -H 'Content-Type: application/json'   --data "$MAINTENANCE_JSON"   http://127.0.0.1:3000/internal/maintenance >/dev/null 2>&1; then
  echo "Connected players notified of the incoming HGR restart."
  sleep "$MAINTENANCE_GRACE_SECONDS"
else
  echo "Current server does not support maintenance notices yet; continuing activation."
fi

echo "Activating validated Halieus candidate..."
systemctl stop halieus-game-room 2>/dev/null || true
if [[ -d "$APP_DIR" ]]; then
  mv "$APP_DIR" "$BACKUP_DIR"
fi
mv "$CANDIDATE_DIR" "$APP_DIR"

cp "$APP_DIR/deploy/oracle/halieus-game-room.service" /etc/systemd/system/halieus-game-room.service

# Routine updates are application-only. nginx/Certbot/OS packages are owned by
# the one-time provisioning tool and are deliberately not touched here.
systemctl daemon-reload
systemctl enable --now halieus-game-room

HEALTH_JSON=""
HEALTH_VERSION=""
HEALTH_FINGERPRINT=""
for _attempt in $(seq 1 30); do
  if HEALTH_JSON="$(curl -fsS -H 'Cache-Control: no-cache' http://127.0.0.1:3000/health 2>/dev/null)"; then
    HEALTH_VERSION="$(printf '%s' "$HEALTH_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{process.stdout.write(String(JSON.parse(s).version||""))}catch{process.exit(1)}})')" || HEALTH_VERSION=""
    HEALTH_FINGERPRINT="$(printf '%s' "$HEALTH_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{process.stdout.write(String(JSON.parse(s).releaseFingerprint||""))}catch{process.exit(1)}})')" || HEALTH_FINGERPRINT=""
    if [[ "$HEALTH_VERSION" == "$EXPECTED_VERSION" && "$HEALTH_FINGERPRINT" == "$EXPECTED_FINGERPRINT" ]]; then
      break
    fi
  fi
  sleep 1
done

if [[ "$HEALTH_VERSION" != "$EXPECTED_VERSION" || "$HEALTH_FINGERPRINT" != "$EXPECTED_FINGERPRINT" ]]; then
  echo >&2
  echo "New Halieus release failed exact release verification. Expected $EXPECTED_VERSION / $EXPECTED_FINGERPRINT; got ${HEALTH_VERSION:-unreachable} / ${HEALTH_FINGERPRINT:-missing}. Rolling back..." >&2
  systemctl stop halieus-game-room 2>/dev/null || true
  FAILED_DIR="${APP_DIR}.failed-${STAMP}"
  mv "$APP_DIR" "$FAILED_DIR"
  if [[ -d "$BACKUP_DIR" ]]; then
    mv "$BACKUP_DIR" "$APP_DIR"
    systemctl daemon-reload
    systemctl enable --now halieus-game-room
    sleep 2
    curl -fsS http://127.0.0.1:3000/health || true
  fi
  exit 1
fi

printf '%s\n' "$HEALTH_JSON"
echo "Oracle local health verified exact release: $EXPECTED_VERSION / $EXPECTED_FINGERPRINT"

# Keep the newest rollback copy, but remove older application backups to avoid
# silently filling the small Oracle boot volume across frequent UI releases.
find "$(dirname "$APP_DIR")" -maxdepth 1 -type d -name "$(basename "$APP_DIR").backup-*" ! -path "$BACKUP_DIR" -mtime +1 -exec rm -rf {} + 2>/dev/null || true

echo
echo "============================================================"
echo "HALIEUS ORACLE APPLICATION IS RUNNING LOCALLY ON ORACLE."
echo "============================================================"
echo "Canonical data root: ${DATA_DIR}"
echo "Public host: https://${DOMAIN}"
echo "Do NOT delete the old laptop backup until account login is confirmed."
