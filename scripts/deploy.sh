#!/bin/bash
# ============================================================
# Church Bulletin – deploy latest from GitHub
# Run this on the VM whenever you push new changes.
# ============================================================
set -e

cd ~/bulletin

echo "▸ Pulling latest code..."
git pull

echo "▸ Installing dependencies..."
npm ci --prefer-offline

echo "▸ Building..."
npm run build

echo "▸ Restarting app..."
pm2 restart bulletin

echo ""
echo "✓ Deployed! $(date '+%Y-%m-%d %H:%M')"
