#!/bin/bash
# ============================================================
# Church Bulletin – deploy latest from GitHub
# Run this on the VM whenever you push new changes.
# ============================================================
set -e

cd ~/bulletin

echo "▸ Pulling latest code..."
# The reset below would put the bulletins and plans people saved on the live site back to
# the committed copies, so set them aside and bring them back afterwards.
bash ~/bulletin/scripts/keep-data.sh save
git fetch origin main
git reset --hard origin/main
git clean -fd
bash ~/bulletin/scripts/keep-data.sh restore

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

# PDF export prints through headless Chrome on this VM. Without CJK fonts every Korean and
# Chinese character comes out as an empty box. Idempotent, best-effort on provisioned VMs
# (each export starts a fresh Chrome, so no restart is needed to pick the fonts up).
if ! fc-list 2>/dev/null | grep -qi "noto.*cjk"; then
  echo "▸ Installing CJK/Cyrillic fonts for PDF export..."
  sudo -n apt-get install -y -q fonts-noto-cjk fonts-liberation fonts-dejavu-core \
    && sudo -n fc-cache -f \
    || echo "  (skipped — run: sudo apt-get install -y fonts-noto-cjk fonts-liberation fonts-dejavu-core)"
fi

echo "▸ Restarting app..."
pm2 restart bulletin

echo ""
echo "✓ Deployed! $(date '+%Y-%m-%d %H:%M')"
