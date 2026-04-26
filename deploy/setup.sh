#!/usr/bin/env bash
# Calida — first-time deploy on this VPS.
# Run as: sudo bash /home/wojciem/cycle-app/deploy/setup.sh
#
# Idempotent: safe to re-run. Will:
#   1. Install nginx vhost for calida.app + www.calida.app
#   2. Get Let's Encrypt HTTPS cert via certbot
#   3. Install systemd service for the Express API
#   4. Kill any old nohup node server.js, start systemd service
#   5. Configure firewall (ufw) — allow 22, 80, 443

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: must be run as root (sudo)" >&2
  exit 1
fi

EMAIL="harimati@gmail.com"
NGINX_VHOST_SRC="/tmp/calida-nginx.conf"
NGINX_VHOST_DEST="/etc/nginx/sites-available/calida"

echo "==> 1/5 Install HTTP-only nginx vhost (certbot will add SSL block)"
if [[ ! -f "$NGINX_VHOST_SRC" ]]; then
  echo "ERROR: $NGINX_VHOST_SRC not found. The deploy script expects it to be staged there." >&2
  exit 1
fi
cp "$NGINX_VHOST_SRC" "$NGINX_VHOST_DEST"
ln -sf "$NGINX_VHOST_DEST" /etc/nginx/sites-enabled/calida

echo "==> 2/5 Test + reload nginx"
nginx -t
systemctl reload nginx

echo "==> 3/5 Get Let's Encrypt cert via certbot — also adds SSL server block + HTTP->HTTPS redirect"
certbot --nginx \
  -d calida.app -d www.calida.app \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  --redirect \
  --non-interactive

echo "==> 4/5 Install systemd service for the Express API"
cat > /etc/systemd/system/calida-api.service <<'UNIT'
[Unit]
Description=Calida API (Express)
After=network.target

[Service]
Type=simple
User=wojciem
WorkingDirectory=/home/wojciem/cycle-app
EnvironmentFile=/home/wojciem/cycle-app/.env
ExecStart=/home/linuxbrew/.linuxbrew/bin/node /home/wojciem/cycle-app/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload

echo "==> 5a/5 Stop existing nohup node processes (if any)"
pkill -9 -f "node /home/wojciem/cycle-app/server.js" 2>/dev/null || true
pkill -9 -f "node server.js" 2>/dev/null || true
sleep 2

echo "==> 5b/5 Enable + start systemd service"
systemctl enable --now calida-api
sleep 3
systemctl --no-pager status calida-api | head -20 || true

echo "==> 6/5 Firewall (ufw)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  ufw status
else
  echo "  ufw not installed — skipping. Consider: apt install ufw"
fi

echo ""
echo "============================="
echo "DONE — verify with:"
echo "  curl -I https://calida.app"
echo "  curl -s https://calida.app/api/founders/remaining"
echo "  systemctl status calida-api"
echo "  journalctl -u calida-api -n 30 --no-pager"
echo "============================="
