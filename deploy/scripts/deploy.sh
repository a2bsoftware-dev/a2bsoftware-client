#!/usr/bin/env bash
# Zero-downtime blue/green deploy. Run ON THE VPS by the GitHub Actions
# deploy workflow over SSH, after rsync has refreshed this deploy/ checkout
# (including app.tar.gz, the gzipped `docker save` of the image CI just
# built) and write-env.sh has (re)generated .env.
#
# Usage:
#   deploy.sh                 # CI path: load app.tar.gz, deploy whatever
#                              # image ref docker assigns it
#   deploy.sh <image_ref>      # manual path: deploy an already-local image
#                              # ref directly, no tarball needed - used by
#                              # rollback.sh to redeploy a past image found
#                              # in state/deploy_history
#
# Model: app_blue (127.0.0.1:3000) and app_green (127.0.0.1:3001) are the
# same image on two slots. nginx on this box is HOST-native (it also fronts
# Keycloak and the Spring Boot API on the same vhost - see
# deploy/nginx/sites-available/dashboard.a2bsoftware.com.conf), so cutover
# means rewriting state/upstream.conf's one `server` line and running
# `sudo nginx -s reload` (drains existing connections instead of dropping
# them), NOT touching a container. This script starts the new image on
# whichever slot is idle, health-checks it DIRECTLY over its own port
# (bypassing nginx), and only reloads nginx after that passes. The
# previously-active slot is stopped only after the public endpoint is
# verified end-to-end. On any failure - at any stage - the previously-active
# slot is left running (or restored), so a bad build never takes the site
# down. See docs/DEPLOYMENT.md "How deployment works" / "How rollback works".
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=./health-check.sh
source scripts/health-check.sh

IMAGE_REF="${1:-}"
COMPOSE_FILE="docker-compose.prod.yml"
STATE_DIR="state"
ACTIVE_SLOT_FILE="${STATE_DIR}/active_slot"
HISTORY_FILE="${STATE_DIR}/deploy_history"
UPSTREAM_FILE="${STATE_DIR}/upstream.conf"
MIN_FREE_DISK_MB="${MIN_FREE_DISK_MB:-2048}"

if [[ ! -f .env ]]; then
  echo "✖ Deployment Failed: .env not found in $(pwd) - run write-env.sh first." >&2
  exit 1
fi

mkdir -p "$STATE_DIR"
[[ -f "$ACTIVE_SLOT_FILE" ]] || echo "blue" > "$ACTIVE_SLOT_FILE"
# Brand-new server: seed the upstream include from the tracked template so
# nginx has something valid to point at before this script has ever run.
[[ -f "$UPSTREAM_FILE" ]] || cp nginx/upstream.conf.example "$UPSTREAM_FILE"

# .env holds real secrets, so it is deliberately never `source`d here - a
# secret value containing `$(...)` or backticks would execute as shell if it
# were. DOMAIN is the one plain value this script's own logic needs (for the
# post-cutover public health check), pulled out with a literal grep/cut
# instead. Everything else (ZAMP_KEY, EXIT_HMAC_KEY, ...) reaches the
# container only through Compose's own env_file loader, which parses .env
# literally too, not via a shell.
DOMAIN="$(grep -m1 '^DOMAIN=' .env | cut -d= -f2- || true)"
DOMAIN="${DOMAIN:-dashboard.a2bsoftware.com}"

# --- Disk space guard (catches "disk full" before it corrupts a load) -----
DOCKER_ROOT="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)"
FREE_MB="$(df -Pm "$DOCKER_ROOT" | tail -1 | awk '{print $4}')"
if (( FREE_MB < MIN_FREE_DISK_MB )); then
  echo "✖ Deployment Failed: only ${FREE_MB}MiB free on ${DOCKER_ROOT} (need >= ${MIN_FREE_DISK_MB}MiB)." >&2
  echo "  Free space first, e.g.: docker image prune -af --filter until=24h" >&2
  exit 1
fi

# --- Resolve IMAGE_REF: no registry involved - either an image ref was ----
# passed explicitly (rollback.sh redeploying a past, still-local image), or
# (the normal CI path) app.tar.gz was just rsynced alongside this script and
# needs loading first.
if [[ -z "$IMAGE_REF" ]]; then
  if [[ ! -f app.tar.gz ]]; then
    echo "✖ Deployment Failed: no image ref given and app.tar.gz not found in $(pwd)." >&2
    exit 1
  fi
  LOAD_OUTPUT="$(gunzip -c app.tar.gz | docker load)"
  IMAGE_REF="$(sed -n 's/^Loaded image: //p' <<<"$LOAD_OUTPUT")"
  if [[ -z "$IMAGE_REF" ]]; then
    echo "✖ Deployment Failed: could not parse an image ref out of 'docker load' output:" >&2
    echo "$LOAD_OUTPUT" >&2
    exit 1
  fi
  rm -f app.tar.gz
  echo "  loaded ${IMAGE_REF}"
fi

# IMAGE_REF changes on every deploy - upsert just that one line into .env
# (Compose reads ${IMAGE_REF} from here for both app_blue and app_green's
# `image:`), leaving every secret line write-env.sh wrote untouched.
grep -v '^IMAGE_REF=' .env > .env.tmp 2>/dev/null || true
echo "IMAGE_REF=${IMAGE_REF}" >> .env.tmp
mv .env.tmp .env
chmod 600 .env

echo "✔ Deployment Started (target image: ${IMAGE_REF})"

CURRENT_SLOT="$(cat "$ACTIVE_SLOT_FILE")"
if [[ "$CURRENT_SLOT" == "blue" ]]; then NEW_SLOT="green"; else NEW_SLOT="blue"; fi
NEW_SERVICE="app_${NEW_SLOT}"
OLD_SERVICE="app_${CURRENT_SLOT}"
if [[ "$NEW_SLOT" == "blue" ]]; then NEW_PORT=3000; OLD_PORT=3001; else NEW_PORT=3001; OLD_PORT=3000; fi
echo "  current slot: ${CURRENT_SLOT} (127.0.0.1:${OLD_PORT})  ->  deploying to: ${NEW_SLOT} (127.0.0.1:${NEW_PORT})"

# --- Start the new slot (image is already local - loaded above, or was ----
# already local for a rollback.sh-driven redeploy) --------------------------
docker compose -f "$COMPOSE_FILE" up -d --no-deps "$NEW_SERVICE"

# --- Health-check the new slot directly, bypassing nginx ------------------
if ! wait_for_healthy "$NEW_PORT"; then
  echo "✖ Deployment Failed: ${NEW_SERVICE} (127.0.0.1:${NEW_PORT}) never became healthy." >&2
  echo "✖ Rolling Back: ${OLD_SERVICE} was never touched and is still serving traffic." >&2
  docker compose -f "$COMPOSE_FILE" logs --tail=100 "$NEW_SERVICE" >&2 || true
  docker compose -f "$COMPOSE_FILE" stop "$NEW_SERVICE" || true
  echo "✔ Rollback Completed (no traffic was ever routed to the failed build)."
  exit 1
fi

# --- Cutover: point the host's nginx at the new slot ----------------------
cp "$UPSTREAM_FILE" "${UPSTREAM_FILE}.bak"
cat > "$UPSTREAM_FILE" <<EOF
# Rewritten by deploy.sh on every deploy - see that file before hand-editing.
upstream a2b_frontend {
  server 127.0.0.1:${NEW_PORT};
}
EOF

# The deploy user has a narrowly-scoped, passwordless sudo rule for exactly
# these two commands (see server-setup.sh) - nginx itself must run as root
# to bind low ports / read the TLS private key, so reloading it can't be
# done as an unprivileged user any other way.
if ! sudo /usr/sbin/nginx -t; then
  echo "✖ Deployment Failed: generated nginx config failed validation - NOT reloading." >&2
  mv "${UPSTREAM_FILE}.bak" "$UPSTREAM_FILE"
  docker compose -f "$COMPOSE_FILE" stop "$NEW_SERVICE" || true
  exit 1
fi
rm -f "${UPSTREAM_FILE}.bak"

sudo /usr/bin/systemctl reload nginx
echo "✔ Docker Image Pushed & cut over to ${NEW_SLOT}"

# --- Verify the real public path end-to-end (catches TLS/nginx-level -----
# misconfig the internal port-based checks above can't see). Checks / , not
# /api/health: the shared vhost (owned by the sibling a2bsoftware-backend
# repo) routes every /api/* path to the Spring Boot backend on 8081, so this
# app's own /api/health is only ever reachable directly (bypassing nginx,
# which is exactly what wait_for_healthy above already did) - never through
# the public domain. / is the one path guaranteed to reach this app here.
PUBLIC_OK=false
for _ in $(seq 1 10); do
  if curl -fsS --max-time 5 "https://${DOMAIN}/" >/dev/null 2>&1; then
    PUBLIC_OK=true
    break
  fi
  sleep 2
done

if [[ "$PUBLIC_OK" != "true" ]]; then
  echo "✖ Deployment Failed: public health check via nginx/TLS did not pass after cutover." >&2
  echo "✖ Rolling Back: reverting nginx to ${CURRENT_SLOT} (127.0.0.1:${OLD_PORT})." >&2
  cat > "$UPSTREAM_FILE" <<EOF
upstream a2b_frontend {
  server 127.0.0.1:${OLD_PORT};
}
EOF
  sudo /usr/bin/systemctl reload nginx
  docker compose -f "$COMPOSE_FILE" stop "$NEW_SERVICE" || true
  echo "✔ Rollback Completed: ${CURRENT_SLOT} is serving traffic again."
  exit 1
fi
echo "✔ Health Check Passed (public endpoint, https://${DOMAIN}/)"

# --- Retire the old slot, record success ----------------------------------
docker compose -f "$COMPOSE_FILE" stop "$OLD_SERVICE" || true
echo "$NEW_SLOT" > "$ACTIVE_SLOT_FILE"
printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$NEW_SLOT" "$IMAGE_REF" >> "$HISTORY_FILE"
tail -n 50 "$HISTORY_FILE" > "${HISTORY_FILE}.tmp" && mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE"

# Keeps a long run of deploys from slowly filling the disk (each deploy
# leaves the previous image layer behind until this runs).
docker image prune -af --filter "until=72h" >/dev/null 2>&1 || true

echo "✔ Deployment Successful (slot: ${NEW_SLOT}, image: ${IMAGE_REF})"
