#!/bin/bash
# ============================================================
# Church Bulletin – GCE e2-micro one-time setup
# Run this once after SSH-ing into a fresh Debian/Ubuntu VM.
# ============================================================
set -eo pipefail

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Church Bulletin – VM Setup              ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Swap (critical: e2-micro has only 1 GB RAM) ──────────
echo "▸ Adding 1 GB swap..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
fi

# ── 2. System packages ───────────────────────────────────────
echo "▸ Installing system packages..."
sudo apt-get update -y -q
sudo apt-get install -y -q curl git nginx

# ── 3. Node.js 20 ────────────────────────────────────────────
echo "▸ Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y -q nodejs

# ── 4. PM2 (process manager / auto-restart on reboot) ────────
echo "▸ Installing PM2..."
sudo npm install -g pm2 --silent

# ── 5. Google Chrome (for PDF export) ────────────────────────
echo "▸ Installing Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
  | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] \
https://dl.google.com/linux/chrome/deb/ stable main" \
  | sudo tee /etc/apt/sources.list.d/google-chrome.list > /dev/null
sudo apt-get update -y -q
sudo apt-get install -y -q google-chrome-stable --no-install-recommends

# ── 6. Clone repo ─────────────────────────────────────────────
echo "▸ Cloning repo..."
if [ ! -d ~/bulletin ]; then
  git clone https://github.com/DennisD0/JBCHNY-bulletin.git ~/bulletin
fi
cd ~/bulletin

# ── 7. Environment variables ──────────────────────────────────
echo "▸ Writing .env.local..."
cat > .env.local << 'EOF'
BULLETIN_BASE_URL=http://localhost:3000
CHROME_DIRECTORY=/usr/bin
EOF

# ── 8. Install deps + build ───────────────────────────────────
echo "▸ Installing dependencies..."
npm install

echo "▸ Building app (may take 2–3 min)..."
npm run build

# ── 9. Start with PM2 + enable on reboot ─────────────────────
echo "▸ Starting with PM2..."
pm2 start npm --name bulletin -- start
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash
pm2 save

# ── 10. Nginx reverse proxy (port 80 → 3000) ─────────────────
echo "▸ Configuring nginx..."
sudo tee /etc/nginx/sites-available/bulletin > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/bulletin /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# ── Done ──────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s --max-time 3 ifconfig.me || echo "<your-vm-ip>")
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Setup complete!                         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  App URL:  http://$PUBLIC_IP"
echo ""
echo "  To update later, run:  ~/bulletin/scripts/deploy.sh"
echo ""
