#!/usr/bin/env bash
# Builds the cPanel ZIP for booking.powertech.ma. Usage: scripts/package-o2switch.sh 1.0.0
# Output: /mnt/documents/booking-o2switch-v<version>.zip — never contains app/.env.
set -euo pipefail
VERSION="${1:?version required, e.g. 1.0.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE=/tmp/booking-stage
OUT=/tmp/booking-o2switch-v${VERSION}.zip
rm -rf "$STAGE" "$ROOT/dist" && mkdir -p "$STAGE"

# 1. Frontend (static SPA, API on same domain)
(cd "$ROOT" && VITE_API_BASE=/api npx vite build >/tmp/booking-build.log 2>&1)
cp -r "$ROOT/dist/." "$STAGE/"
rm -f "$STAGE/.htaccess"
cp "$ROOT/deploy/o2switch/root.htaccess" "$STAGE/.htaccess"

# 2. API entry point
mkdir -p "$STAGE/api"
cp "$ROOT/backend/public/index.php" "$STAGE/api/index.php"
cp "$ROOT/backend/public/.htaccess" "$STAGE/api/.htaccess"

# 3. Private PHP code
mkdir -p "$STAGE/app"
cp -r "$ROOT/backend/src" "$ROOT/backend/cli" "$STAGE/app/"
[ -d "$ROOT/backend/migrations" ] && cp -r "$ROOT/backend/migrations" "$STAGE/app/" || true
cp "$ROOT/backend/schema.sql" "$ROOT/backend/.env.example" "$STAGE/app/"
cp "$ROOT/deploy/o2switch/deny.htaccess" "$STAGE/app/.htaccess"

# 4. Docs + version
cp "$ROOT/deploy/o2switch/LISEZMOI.txt" "$ROOT/deploy/o2switch/CHANGELOG.txt" "$STAGE/"
echo "Booking Powertech v${VERSION} — $(date -u +%Y-%m-%d)" > "$STAGE/VERSION.txt"

rm -f "$STAGE/app/.env"
rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OUT" . -x '*.git*')
unzip -Z1 "$OUT" > /tmp/booking-zip-entries.txt
if grep -Eq '(^|/)\.git(/|$)|(^|/)\.env$' /tmp/booking-zip-entries.txt; then
  echo "Unsafe archive contents" >&2; exit 1
fi
mkdir -p /mnt/documents
cp "$OUT" "/mnt/documents/booking-o2switch-v${VERSION}.zip"
echo "$OUT"
