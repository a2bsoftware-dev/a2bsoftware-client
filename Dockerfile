# syntax=docker/dockerfile:1
# Pinning the Dockerfile syntax version keeps `--mount=type=cache` and other
# BuildKit features reproducible across CI runners and local machines.

# --- Dependencies -----------------------------------------------------------
FROM node:26-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# Cache-mounting ~/.npm means repeat CI builds only re-download packages that
# actually changed in package-lock.json, instead of the whole tree every run.
RUN --mount=type=cache,target=/root/.npm npm ci

# --- Build --------------------------------------------------------------
FROM node:26-slim AS builder
WORKDIR /app

# Telemetry would otherwise phone home on every CI build; disabling it is a
# minor privacy/perf win and keeps CI logs free of the opt-out banner.
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Both are inlined into the client bundle at build time (Next.js only inlines
# NEXT_PUBLIC_* vars it sees during `next build`) AND compiled into the
# standalone server's routes manifest for next.config.ts's rewrites() - so
# both must be real, reachable URLs at BUILD time, not just at container
# start time. Passed in as --build-arg by CI from GitHub Variables; the
# defaults below only cover ad-hoc local `docker build` runs.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

RUN --mount=type=cache,target=/app/.next/cache npm run build

# --- Runtime ------------------------------------------------------------
FROM node:26-slim AS runner
WORKDIR /app

# OCI labels let `docker inspect` / registry UIs / Trivy-style tools trace an
# image back to the exact commit and pipeline run that produced it -
# populated by deploy.yml via --build-arg, never guessed inside the image.
ARG VERSION=0.0.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="a2bsoftware-frontend" \
      org.opencontainers.image.description="A2B Software survey/dashboard frontend (Next.js)" \
      org.opencontainers.image.source="https://github.com/a2bsoftware-dev/a2bsoftware-frontend" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.licenses="UNLICENSED"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The official node:20-slim image ships a pre-created, unprivileged `node`
# user (uid/gid 1000) - reusing it avoids the attack-surface and image-size
# cost of installing shadow-utils just to `useradd` a custom one.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/healthcheck.js ./healthcheck.js

USER node

EXPOSE 3000

# Shells out to Node instead of curl/wget - neither is installed in this
# image, and adding one just for a healthcheck would widen the attack
# surface this stage is otherwise deliberately minimal. See healthcheck.js.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "healthcheck.js"]

CMD ["node", "server.js"]
