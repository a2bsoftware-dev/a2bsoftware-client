#!/usr/bin/env bash
# First-time VPS bootstrap. Run ONCE, manually, as root - never invoked by
# CI. Everything after this point is handled by the GitHub Actions deploy
# workflow over SSH, as the unprivileged deploy user this script creates.
#
# Safe to re-run (every step here is idempotent) - in particular, if this
# server already runs the sibling a2bsoftware-backend repo (same box, same
# client.a2bsoftware.com vhost - see the "shared server" note in
# docs/DEPLOYMENT.md), Docker/nginx/certbot/ufw/the `deploy` user all already
# exist and this script just no-ops past them to the parts that are new:
# this repo's own DEPLOY_PATH, its narrowly-scoped nginx-reload sudo rule,
# and the printed Secrets/Variables list below.
#
# What it does:
#   1. Installs Docker Engine + Compose plugin, host nginx, and certbot
#      (nginx here is HOST-native, not a container - it already fronts
#      Keycloak/Spring Boot for the sibling a2bsoftware-backend stack on
#      the same vhost, see deploy/nginx/sites-available/)
#   2. Creates a dedicated, unprivileged `deploy` user (docker group,
#      SSH-key-only login, no password) - this is the SSH_USER secret
#   3. Grants that user a NARROWLY scoped, passwordless sudo rule for
#      exactly two commands (`nginx -t`, `systemctl reload nginx`) - the
#      only root-level actions deploy.sh's zero-downtime cutover needs
#   4. Locks the firewall (ufw) down to SSH + HTTP + HTTPS only
#   5. Creates DEPLOY_PATH with the layout docker-compose.prod.yml expects
#   6. Prints the exact values to paste into GitHub Secrets/Variables
#
# Deliberately does NOT install the nginx site config itself - deploy/ (and
# therefore the real site config + upstream template) isn't on this server
# yet at this point. Run deploy/scripts/bootstrap-tls.sh after the first
# rsync for that - see docs/DEPLOYMENT.md "First-time VPS setup".
#
# Usage:
#   DOMAIN=client.a2bsoftware.com ./server-setup.sh
set -euo pipefail

DOMAIN="${DOMAIN:?set DOMAIN, e.g. DOMAIN=client.a2bsoftware.com}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/a2bsoftware-client}"
SSH_PORT="${SSH_PORT:-22}"

if [[ $EUID -ne 0 ]]; then
  echo "✖ Run this as root (or with sudo)." >&2
  exit 1
fi

echo "==> Installing Docker Engine + Compose plugin"
apt-get update -y
apt-get install -y --no-install-recommends ca-certificates curl gnupg ufw nginx certbot
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Creating unprivileged deploy user '${DEPLOY_USER}'"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  passwd -l "$DEPLOY_USER"   # locks password login - SSH key only from here on
fi
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 700 "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"

echo "==> Granting '${DEPLOY_USER}' passwordless sudo for exactly: nginx -t, systemctl reload nginx"
cat > /etc/sudoers.d/a2b-client-nginx-reload <<EOF
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/sbin/nginx -t
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx
EOF
chmod 440 /etc/sudoers.d/a2b-client-nginx-reload
visudo -cf /etc/sudoers.d/a2b-client-nginx-reload

echo "==> Firewall (ufw): allow SSH/${SSH_PORT}, 80, 443 only"
ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Disabling the stock nginx default site"
# Ships enabled by the Ubuntu/Debian nginx package - its `default_server`
# would otherwise compete with client.a2bsoftware.com's own vhost and
# serve the nginx welcome page to anything hitting this IP by hostname.
rm -f /etc/nginx/sites-enabled/default

echo "==> Creating ${DEPLOY_PATH}"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_PATH"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${DEPLOY_PATH}/state"

PUBLIC_IP="$(curl -fsS ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"

cat <<EOF

============================================================
✔ Server bootstrap complete.

Next steps:

1. Deploy keypair: if this server already runs a2bsoftware-backend and its
   deploy key is already in /home/${DEPLOY_USER}/.ssh/authorized_keys, reuse
   it - same unprivileged user, same blast radius either way, one less key
   to rotate. Otherwise generate a dedicated one (not your personal key):
     ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./a2b_deploy_key -N ""
     cat a2b_deploy_key.pub | ssh root@${PUBLIC_IP} \\
       "tee -a /home/${DEPLOY_USER}/.ssh/authorized_keys"

2. Add these in the GitHub repo -> Settings -> Secrets and variables -> Actions:
     Secret   SSH_HOST                 = ${PUBLIC_IP}
     Secret   SSH_PORT                 = ${SSH_PORT}
     Secret   SSH_USER                 = ${DEPLOY_USER}
     Secret   SSH_PRIVATE_KEY          = <contents of a2b_deploy_key - the PRIVATE half>
     Variable DEPLOY_PATH              = ${DEPLOY_PATH}
     Variable DOMAIN                   = ${DOMAIN}
     Variable NEXT_PUBLIC_API_BASE_URL = https://${DOMAIN}
     Variable NEXT_PUBLIC_BACKEND_URL  = http://host.docker.internal:8081
   (Full list and how to get each value: docs/DEPLOYMENT.md)

3. Point ${DOMAIN}'s DNS A/AAAA record at ${PUBLIC_IP} - skip this if it
   already points here (e.g. a shared server already running
   a2bsoftware-backend on this same domain).

4. Seed this repo's one piece of the shared nginx vhost - the upstream
   include a2bsoftware-backend's client.a2bsoftware.com.conf `include`s
   (see that repo's nginx config) - BEFORE that repo's nginx is reloaded
   with the include pointed at it, or nginx will fail to start:
     install -d -o ${DEPLOY_USER} -g ${DEPLOY_USER} ${DEPLOY_PATH}/state
     cat > ${DEPLOY_PATH}/state/upstream.conf <<'UPSTREAM_EOF'
     upstream a2b_client {
       server 127.0.0.1:5000;
     }
     UPSTREAM_EOF
     chown ${DEPLOY_USER}:${DEPLOY_USER} ${DEPLOY_PATH}/state/upstream.conf

   This repo does NOT own or install the shared vhost/TLS cert itself -
   that's a2bsoftware-backend's job (its server-setup.sh + bootstrap-tls.sh,
   already run if this is a shared server). Push to main (or run the Deploy
   workflow) once the above is in place for the first real deploy.
============================================================
EOF
