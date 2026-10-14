#!/bin/bash
# ============================================================
# Church Bulletin – deploy latest from GitHub
# Run this on the VM whenever you push new changes.
# ============================================================
set -e

cd ~/bulletin

echo "▸ Pulling latest code..."
git fetch origin main
git reset --hard origin/main
git clean -fd

echo "▸ Installing dependencies..."
npm install

echo "▸ Building..."
npm run build

# OCR uploads can run longer than nginx's old 60s proxy_read_timeout (which turned into an
# HTML 504 page in the browser). Idempotent, best-effort bump on already-provisioned VMs.
if grep -rqs "proxy_read_timeout 60s" /etc/nginx/sites-available/bulletin; then
  echo "▸ Raising nginx proxy_read_timeout to 180s..."
  sudo -n sed -i 's/proxy_read_timeout 60s;/proxy_read_timeout 180s;/' /etc/nginx/sites-available/bulletin \
    && sudo -n nginx -t && sudo -n systemctl reload nginx || echo "  (skipped — needs manual nginx update)"
fi

echo "▸ Restarting app..."
pm2 restart bulletin

echo ""
echo "✓ Deployed! $(date '+%Y-%m-%d %H:%M')"
