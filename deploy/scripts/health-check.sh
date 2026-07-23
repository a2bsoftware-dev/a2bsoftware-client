#!/usr/bin/env bash
# Polls a slot's /api/health endpoint over its published loopback port
# (app_blue -> 127.0.0.1:3000, app_green -> 127.0.0.1:3001 - see
# docker-compose.prod.yml) with retries/backoff, bypassing nginx entirely.
#
# Usable standalone: ./health-check.sh 3000
# Or sourced by deploy.sh/rollback.sh for the wait_for_healthy function.
set -euo pipefail

MAX_ATTEMPTS="${HEALTH_CHECK_MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${HEALTH_CHECK_INTERVAL:-2}"

wait_for_healthy() {
  local port="$1"
  local attempt=1

  while (( attempt <= MAX_ATTEMPTS )); do
    if curl -fsS --max-time 3 "http://127.0.0.1:${port}/api/health" >/dev/null 2>&1; then
      echo "✔ Health check passed for 127.0.0.1:${port} (attempt ${attempt}/${MAX_ATTEMPTS})"
      return 0
    fi
    echo "… waiting for 127.0.0.1:${port} to become healthy (attempt ${attempt}/${MAX_ATTEMPTS})"
    sleep "$SLEEP_SECONDS"
    (( attempt++ ))
  done

  echo "✖ Health check timed out for 127.0.0.1:${port} after ${MAX_ATTEMPTS} attempts (~$(( MAX_ATTEMPTS * SLEEP_SECONDS ))s)" >&2
  return 1
}

# Only run as a standalone check when executed directly - when sourced by
# deploy.sh/rollback.sh, only the function above should be defined.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [[ $# -lt 1 ]]; then
    echo "usage: $(basename "$0") <port>" >&2
    exit 2
  fi
  wait_for_healthy "$@"
fi
