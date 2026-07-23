# Deployment & CI/CD

How a2bsoftware-client gets from a `git push` to running in production, how
its secrets are protected, and how to recover when something goes wrong.

> **Urgent, unrelated to this pipeline:** `ZAMP_KEY`'s current value is
> present in this repo's git history in plaintext (it was hardcoded as a
> fallback default in application code before being moved to `.env` -
> `git log -p -S ZAMP_KEY` shows it). Anyone who has ever cloned this repo
> can read it. Treat it as compromised: rotate it at its source and update
> `.env`/the `ZAMP_KEY` GitHub Secret before relying on the guidance below.
> Removing it from history entirely (`git filter-repo`/BFG + a force-push)
> is possible but rewrites every collaborator's history - decide that with
> the team, it's not something to do unilaterally.

## Contents

- [Architecture](#architecture)
- [Pipeline overview](#pipeline-overview)
- [GitHub Secrets - what they are and how to get each value](#github-secrets)
- [GitHub Variables - what they are and how to get each value](#github-variables)
- [How secret injection works](#how-secret-injection-works)
- [How deployment works](#how-deployment-works)
- [How rollback works](#how-rollback-works)
- [First-time VPS setup](#first-time-vps-setup)
- [Adding a new secret](#adding-a-new-secret)
- [Rotating a secret](#rotating-a-secret)
- [Troubleshooting / recovering from failures](#troubleshooting--recovering-from-failures)
- [Manual deploy without CI/CD](#manual-deploy-without-cicd)

## Architecture

One VPS runs three services behind one HOST-native nginx (not a container -
owned and version-controlled by the **sibling `a2bsoftware-backend` repo**,
not this one - see `a2bsoftware-backend/deploy/nginx/client.a2bsoftware.com.conf`),
all on `client.a2bsoftware.com`:

```
                         client.a2bsoftware.com (nginx, host-native, TLS)
                                        │
        ┌───────────────┬──────────────┼──────────────────┐
        │               │              │                  │
     /api/*      /actuator/*          /*         auth.a2bsoftware.com
        │               │              │                  │
  Spring Boot API   Spring Boot    Next.js frontend      Keycloak
  127.0.0.1:8081    127.0.0.1:8081  127.0.0.1:5000/:5001  (own domain,
  (a2bsoftware-backend repo)        (blue/green - THIS    own container)
                                     REPO, see below)
```

**This repo owns exactly one file on the server**: `state/upstream.conf`,
included by the backend repo's shared vhost config. This repo's CI/CD never
touches the vhost file itself, TLS certs, or any other service - just its
own two container slots and that one upstream include. See the "shared
server" note in [First-time VPS setup](#first-time-vps-setup) for how the
two repos' setup scripts coordinate on a server that runs both.

**Zero-downtime via blue/green:** `app_blue` (container port 5000, published
to `127.0.0.1:5000`) and `app_green` (published to `127.0.0.1:5001`) run the
same image on two slots. Every deploy starts the new image on whichever
slot is idle, health-checks it directly on its own port, and only then
rewrites `state/upstream.conf`'s one `server` line and runs
`nginx -s reload` - which drains existing connections instead of dropping
them - to cut traffic over. See [How deployment works](#how-deployment-works).

**No registry**: the Docker image never leaves GitHub Actions and the VPS
except as a gzipped `docker save` tarball, shipped over the same SSH/rsync
connection used for everything else - mirrors `a2bsoftware-backend`'s
pipeline.

## Pipeline overview

```
git push main / workflow_dispatch ──► deploy.yml (single workflow)
    ├─ npm ci
    ├─ lint (non-blocking), typecheck (blocking)
    ├─ next build (blocking - fail-fast gate)
    ├─ docker build (local only, not pushed anywhere)
    ├─ docker save | gzip -> app.tar.gz
    ├─ rsync deploy/ + app.tar.gz -> server
    ├─ write .env on the server (secrets piped over SSH stdin)
    └─ scripts/deploy.sh over SSH
         (docker load -> blue/green cutover, health-checked, auto-rollback)
```

| File | Purpose |
|---|---|
| `.github/workflows/deploy.yml` | Everything: build, test-gate, image build, ship, deploy. Runs on every push to `main` and via manual `workflow_dispatch` |

## GitHub Secrets

**Settings → Secrets and variables → Actions → Secrets tab.** Never put
these in Variables - Variables are visible in workflow logs and to anyone
with read access to the repo; Secrets are masked and access-controlled.

| Secret | What it is | How to get it |
|---|---|---|
| `SSH_HOST` | The VPS's public IP or hostname | Your hosting provider's dashboard, or run `server-setup.sh` (below) - it prints this automatically via `curl ifconfig.me`. If this server already runs `a2bsoftware-backend`, it's the same host |
| `SSH_PORT` | SSH port | `22` unless hardened to a custom port |
| `SSH_USER` | The unprivileged deploy account | `deploy`. On a shared server, this is the SAME account `a2bsoftware-backend` already deploys as - no new user needed |
| `SSH_PRIVATE_KEY` | Private half of a deploy keypair | On a shared server, reuse `a2bsoftware-backend`'s existing deploy key (same user, same privilege level either way). Otherwise generate a dedicated one: `ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./a2b_deploy_key -N ""`, install the `.pub` half on the server, paste the contents of the private half (no `.pub`) here |

`ZAMP_KEY`/`EXIT_HMAC_KEY` are NOT needed here - they were leftover from this repo's
original bootstrap as a copy of `a2bsoftware-frontend` and aren't referenced anywhere
in this app's trimmed-down code (client-facing pages only call the backend's own
endpoints). See the urgent notice at the top of this file though - `ZAMP_KEY`'s value
is still exposed in this repo's git history and should be rotated at its source
regardless of whether this app uses it going forward.

## GitHub Variables

**Settings → Secrets and variables → Actions → Variables tab.**

| Variable | Value | Notes |
|---|---|---|
| `DEPLOY_PATH` | `/opt/a2bsoftware-client` | Matches `server-setup.sh`'s default - deliberately distinct from the backend repo's own `DEPLOY_PATH` (different app, same server) |
| `DOMAIN` | `client.a2bsoftware.com` | Used for the post-deploy public health check |
| `NEXT_PUBLIC_API_BASE_URL` | `https://client.a2bsoftware.com` | **Same origin as the frontend itself.** The browser calls `${NEXT_PUBLIC_API_BASE_URL}/api/...` directly - nginx already proxies `/api/*` to Spring Boot on this same domain. Same-origin means no CORS config needed anywhere |
| `NEXT_PUBLIC_BACKEND_URL` | `http://host.docker.internal:8081` | Used **server-side only**, by `next.config.ts`'s `rewrites()` for the legacy non-migrated routes - this is the frontend container calling the backend directly. `host.docker.internal` reaches the host's `127.0.0.1:8081` from inside the container (`extra_hosts` is set up for this in `docker-compose.prod.yml`) |
| `LOG_LEVEL` | `info` | Optional, defaults to `info` if unset |

## How secret injection works

```
GitHub Secret (encrypted at rest, masked in logs)
        │
        ▼
GitHub Actions runtime (deploy.yml's "Write .env on the server" step)
        │  piped over SSH stdin - never a CLI arg, never echoed
        ▼
deploy/scripts/write-env.sh on the VPS
        │  writes to a temp file (chmod 600), then atomically mv's it over .env
        ▼
docker-compose.prod.yml's `env_file: .env`
        │  Compose's own literal parser, not a shell - no injection risk
        ▼
The app_blue/app_green container's environment
```

Concretely, this means:

- Secrets never touch disk in this repo, in a workflow log, or in `ps aux`
  on the server (CLI args are visible there; stdin is not).
- `.env` on the server is regenerated in full on every deploy, `chmod 600`,
  owned by the `deploy` user only.
- `deploy.sh` itself never `source`s `.env` (a secret value containing
  `` $(...) `` or backticks would otherwise execute as shell) - it reads
  the one plain value it needs (`DOMAIN`) with a literal `grep`/`cut`, and
  lets Compose's own `.env` parser (which treats values literally, not as
  shell) handle everything else.
- GitHub already masks every `secrets.*` value that appears in a raw log,
  regardless of the above - this is defense in depth, not the only layer.

## How deployment works

`deploy.yml`, on every push to `main` (and on manual `workflow_dispatch`):

1. **Fail-fast checks**: `npm ci`, lint (non-blocking), typecheck (blocking),
   `next build` (blocking - catches a broken build in ~1-2 minutes instead
   of waiting for the slower Docker build).
2. **Build**: `docker build` locally on the runner (never pushed anywhere),
   tagged with the short commit SHA.
3. **Compress & ship**: `docker save | gzip` into `app.tar.gz`, `rsync`'d to
   the server alongside this repo's `deploy/` directory (excluding `.env`
   and `state/`, which are server-only).
4. **Write `.env`**: see [above](#how-secret-injection-works).
5. **Deploy** (`deploy/scripts/deploy.sh`, run over SSH):
   - `docker load`s the shipped tarball.
   - Picks whichever slot (blue/green) is currently idle.
   - Starts the new image there - the live slot is completely untouched at
     this point.
   - Health-checks the new slot directly on its own port (`/api/health`),
     bypassing nginx.
   - Only if that passes: rewrites `state/upstream.conf` to point at the new
     slot and runs `sudo nginx -s reload` (drains connections, doesn't drop
     them).
   - Verifies the real public URL (`https://client.a2bsoftware.com/api/health`)
     through nginx/TLS end-to-end.
   - Only then stops the old slot and records the new image ref in
     `state/deploy_history`.

## How rollback works

Two distinct mechanisms:

- **Automatic**, inside `deploy.sh` itself: if the new slot fails its
  health check, or the public endpoint doesn't come back healthy after
  cutover, the script reverts on its own (stops the failed new slot / flips
  `state/upstream.conf` back) - the previously-working slot was never
  touched, or is restored immediately. No human action needed; this is why
  a bad build can't take the site down.
- **Manual**, for "it deployed cleanly but we found a problem later" -
  SSH in and run:
  ```
  ssh deploy@<host>
  cd /opt/a2bsoftware-client && ./scripts/rollback.sh
  ```
  (no argument = roll back to the last different image in
  `state/deploy_history`; pass an image ref explicitly to target a specific
  one - see `docker images` on the server for what's still local). This
  runs the *same* safe blue/green pipeline as a normal deploy - rollback is
  itself zero-downtime and health-checked, never a raw `docker compose down`.

## First-time VPS setup

**Shared-server note**: if this server already runs `a2bsoftware-backend`
on the same `client.a2bsoftware.com` vhost, Docker/nginx/certbot/ufw/the
`deploy` user and the TLS certificate all already exist - skip straight to
step 4 below (this repo's own `DEPLOY_PATH` + upstream include), reusing
that repo's SSH key/host/user for the Secrets in step 3.

1. Provision an Ubuntu/Debian VPS (or use the existing one). Point
   `client.a2bsoftware.com`'s DNS A/AAAA record at its IP (skip if
   already pointed there).
2. Copy `deploy/scripts/server-setup.sh` to the server and run, as root:
   ```
   DOMAIN=client.a2bsoftware.com ./server-setup.sh
   ```
   Safe to re-run / already-partially-done - see the comment at the top of
   that script. Prints the exact Secrets/Variables values for step 3.
3. Add those Secrets/Variables to the repo (Settings → Secrets and
   variables → Actions).
4. Seed this repo's one piece of the shared nginx vhost - **must exist
   before `a2bsoftware-backend`'s nginx config (which `include`s it) is
   applied**, or nginx will refuse to start:
   ```
   ssh deploy@<host>
   mkdir -p /opt/a2bsoftware-client/state
   cat > /opt/a2bsoftware-client/state/upstream.conf <<'EOF'
   upstream a2b_frontend {
     server 127.0.0.1:5000;
   }
   EOF
   ```
5. Push to `main` (or run the `Deploy` workflow) for the first real deploy.

## Adding a new secret

1. Add it in GitHub (Secrets tab).
2. Add it to the heredoc in the **"Write .env on the server"** step of
   `.github/workflows/deploy.yml`:
   ```
   MY_NEW_SECRET=${{ secrets.MY_NEW_SECRET }}
   ```
   No quotes around the value - see the comment at the top of
   `deploy/scripts/write-env.sh` for why.
3. If the app reads it via `process.env.MY_NEW_SECRET`, nothing else is
   needed - Compose's `env_file: .env` already passes every line in `.env`
   through to the container.
4. If it needs to be baked in at BUILD time instead (a `NEXT_PUBLIC_*` var,
   for instance), it's a Variable, not a Secret - add it as a `build-args`
   entry in `deploy.yml`'s "Build Docker image" step and an `ARG`/`ENV` pair
   in the `Dockerfile` instead (follow the existing
   `NEXT_PUBLIC_API_BASE_URL` pattern there).

## Rotating a secret

1. Generate/obtain the new value at its source.
2. Update the GitHub Secret with the new value.
3. Re-run `deploy.yml` (push a no-op commit, or `gh workflow run deploy.yml`).
   The next deploy's `write-env.sh` call overwrites `.env` on the server
   with the new value and the app picks it up on its next container start -
   which the blue/green cutover does for you, with no manual restart.
4. Update your local `.env` to match, so local dev doesn't drift.
5. For `ZAMP_KEY` specifically: also revoke/rotate it at the issuing
   service, since the current value is exposed in git history (see the
   notice at the top of this file) independent of anything in GitHub.

## Troubleshooting / recovering from failures

| Symptom | What's actually happening | What to do |
|---|---|---|
| SSH steps fail with a connection error | `SSH_HOST`/`SSH_PORT` unreachable, or the firewall blocks the runner's IP range | Confirm the VPS is up; `ufw status` on the server |
| `could not parse an image ref out of 'docker load' output` | The rsynced `app.tar.gz` is missing or corrupt | Re-run the deploy; check the runner's "Save and compress the image" step succeeded |
| `<slot> never became healthy` | Container crashed, or `/api/health` never returns 200 within the retry window | `deploy.sh` already printed the last 100 log lines to the job output - check for a missing/wrong env var; the old slot was never touched, site is still up |
| `generated nginx config failed validation` | A typo made it into the upstream rewrite (shouldn't happen since `deploy.sh` writes it verbatim, but the check exists as a safety net) | The script already restored the previous config automatically - `sudo nginx -t` on the server to see the exact syntax error |
| `public health check via nginx/TLS did not pass after cutover` | Cutover happened but the public path is broken (cert expired, nginx misconfigured some other way, or `a2bsoftware-backend`'s vhost doesn't `include` `state/upstream.conf` yet) | Script already reverted `state/upstream.conf` to the old slot automatically. `sudo nginx -t`, check `sudo journalctl -u nginx` |
| `only <N>MiB free` | Disk full on the Docker data root | `docker image prune -af --filter until=24h` on the server, or grow the disk |
| Port already in use | Shouldn't happen - `app_blue`/`app_green` bind fixed, distinct loopback ports (5000/5001) never shared with anything else | If it does, `docker ps` on the server to find what's squatting on 5000/5001 |
| A deploy is stuck / hung | The `frontend-deploy` concurrency group means a new push queues behind it rather than cancelling it (intentional - see the comment in `deploy.yml`) | Check the Actions tab for the in-progress run; cancel it manually there only if you're sure the server-side `deploy.sh` process itself is also dead (SSH in and check `ps aux \| grep deploy.sh`) |
| Need to roll back after a bad manual rollback | `rollback.sh`/`deploy.sh` are idempotent and safe to re-run | `rollback.sh <a-known-good-image-ref>` explicitly, or check `state/deploy_history` for the full list of previously-deployed images |

## Manual deploy without CI/CD

If GitHub Actions is unavailable, you can do everything it does by hand
from your own machine (needs Docker + `rsync` + the deploy SSH key locally):

```bash
# 1. Build the image locally
docker build -t a2bsoftware-client:manual \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://client.a2bsoftware.com \
  --build-arg NEXT_PUBLIC_BACKEND_URL=http://host.docker.internal:8081 .

# 2. Compress and ship it alongside deploy/
docker save a2bsoftware-client:manual | gzip > app.tar.gz
rsync -az --exclude ".env" --exclude "state/" \
  deploy/ app.tar.gz deploy@<host>:/opt/a2bsoftware-client/

# 3. Write .env on the server (fill in real values - never commit this)
ssh deploy@<host> 'bash /opt/a2bsoftware-client/scripts/write-env.sh' <<'EOF'
NEXT_PUBLIC_API_BASE_URL=https://client.a2bsoftware.com
NEXT_PUBLIC_BACKEND_URL=http://host.docker.internal:8081
DOMAIN=client.a2bsoftware.com
LOG_LEVEL=info
EOF

# 4. Deploy (loads app.tar.gz automatically since no image ref is given)
ssh deploy@<host> 'cd /opt/a2bsoftware-client && bash scripts/deploy.sh'
```
