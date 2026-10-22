#!/usr/bin/env sh
# Baut und testet alles in Docker. Auf dem Rechner wird nur Docker benötigt.
#
#   ./scripts/test-docker.sh             # bauen und testen
#   SKIP_BUILD=1 ./scripts/test-docker.sh  # vorhandene Images verwenden
#
# Ablauf:
#   1. Images bauen (der Produktions-Build führt dabei die Unit-Tests aus)
#   2. Produktions-Container starten und auf „healthy“ warten
#   3. Härtung des Containers prüfen (read-only, Capabilities, Limits, Benutzer)
#   4. End-to-End-Tests aus dem Chromium-Container gegen die App
#   5. Aufräumen
set -eu
cd "$(dirname "$0")/.."

compose() { docker compose -f docker-compose.test.yml "$@"; }
cleanup() { compose down --remove-orphans --volumes >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$1"; exit 1; }
pass() { printf '\033[32m✓\033[0m %s\n' "$1"; }

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  step "Images bauen (inkl. Unit-Tests)"
  compose build
fi

step "Produktions-Container starten"
compose up -d --wait app || { compose logs app; fail "Container wird nicht healthy"; }
id=$(compose ps -q app)
pass "Container healthy"

step "Härtung prüfen"
check() { # check <Beschreibung> <Go-Template> <erwartet>
  actual=$(docker inspect -f "$2" "$id")
  [ "$actual" = "$3" ] && pass "$1 ($actual)" || fail "$1: erwartet '$3', ist '$actual'"
}
check "Dateisystem read-only"    '{{.HostConfig.ReadonlyRootfs}}' 'true'
check "Alle Capabilities entfernt" '{{.HostConfig.CapDrop}}'      '[ALL]'
check "no-new-privileges"        '{{.HostConfig.SecurityOpt}}'    '[no-new-privileges:true]'
check "Speicherlimit 64 MiB"     '{{.HostConfig.Memory}}'         '67108864'
check "Prozesslimit"             '{{.HostConfig.PidsLimit}}'      '64'
user=$(docker exec "$id" id -u)
[ "$user" != "0" ] && pass "läuft nicht als root (uid $user)" || fail "läuft als root"
docker exec "$id" sh -c 'touch /usr/share/nginx/html/probe' 2>/dev/null && fail "Webroot ist beschreibbar" || pass "Webroot nicht beschreibbar"
docker exec "$id" sh -c 'command -v node' >/dev/null 2>&1 && fail "Node.js im Laufzeit-Image" || pass "kein Node.js im Laufzeit-Image"

step "End-to-End-Tests (Chromium im Container)"
compose run --rm e2e || fail "End-to-End-Tests fehlgeschlagen"

step "Ressourcen nach den Tests"
docker stats --no-stream --format '{{.MemUsage}} RAM, {{.CPUPerc}} CPU' "$id"

printf '\n\033[32mAlle Docker-Tests bestanden.\033[0m\n'
