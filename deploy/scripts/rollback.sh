#!/usr/bin/env bash
# Manual rollback for "it deployed cleanly but we found a problem after the
# fact" - redeploys a previously-successful image through the EXACT same
# safe blue/green pipeline as deploy.sh, so rollback is itself zero-downtime
# and health-checked, never a raw `docker compose down`.
#
# (Automatic rollback for a build that fails its OWN health check happens
# inside deploy.sh directly and doesn't need this script at all.)
#
# Usage:
#   rollback.sh                # roll back to the last successful image
#                               # before the one currently live
#   rollback.sh <image_ref>    # roll back to a specific tag
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

STATE_DIR="state"
HISTORY_FILE="${STATE_DIR}/deploy_history"

if [[ $# -ge 1 ]]; then
  TARGET_IMAGE="$1"
else
  if [[ ! -s "$HISTORY_FILE" ]]; then
    echo "✖ No deploy history found (${HISTORY_FILE}) - pass an already-local image ref explicitly:" >&2
    echo "    rollback.sh a2bsoftware-client:<tag>   (see: docker images)" >&2
    exit 1
  fi
  CURRENT_IMAGE="$(tail -n 1 "$HISTORY_FILE" | cut -f3)"
  # Walk backwards past any consecutive re-deploys of the SAME tag to find
  # the most recent genuinely different image.
  TARGET_IMAGE="$(tac "$HISTORY_FILE" | cut -f3 | awk -v cur="$CURRENT_IMAGE" '$0 != cur { print; exit }')"
  if [[ -z "$TARGET_IMAGE" ]]; then
    echo "✖ No earlier image found in ${HISTORY_FILE} to roll back to." >&2
    exit 1
  fi
fi

echo "↺ Rolling back to ${TARGET_IMAGE}"
exec scripts/deploy.sh "$TARGET_IMAGE"
