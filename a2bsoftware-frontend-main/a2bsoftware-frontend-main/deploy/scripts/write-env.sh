#!/usr/bin/env bash
# Atomically (re)writes the production .env from stdin. Called by the
# deploy workflow like:
#
#   ssh deploy@host 'bash /opt/a2bsoftware-frontend/scripts/write-env.sh' <<'ENV_EOF'
#   ZAMP_KEY=...
#   EXIT_HMAC_KEY=...
#   ENV_EOF
#
# Secret content is deliberately taken over stdin, never as a CLI argument -
# CLI args are visible to every other process on the box via `ps aux`/
# `/proc/<pid>/cmdline`, which stdin is not. This script also never echoes
# what it received, only a line count, so an operator can sanity-check
# nothing was truncated without any secret value touching the logs.
#
# Values must NOT be wrapped in quotes (KEY=value, not KEY="value") - this
# same file is read both by Compose's variable interpolation and by each
# service's `env_file:` list, which parse quotes differently from each
# other and from a shell; writing no quotes at all is the one format both
# agree on.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

TMP_FILE="$(mktemp .env.tmp.XXXXXX)"
trap 'rm -f "$TMP_FILE"' EXIT
cat > "$TMP_FILE"
chmod 600 "$TMP_FILE"
mv -f "$TMP_FILE" .env
trap - EXIT

echo "✔ .env written ($(wc -l < .env) lines; contents not logged)"
