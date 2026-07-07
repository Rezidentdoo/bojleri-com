#!/usr/bin/env bash
# Kreira ZIP za upload na unlimited.rs (bez node_modules i .next)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/../bojleri-deploy-$(date +%Y%m%d).tar.gz"

cd "$ROOT/.."
tar -czf "$OUT" \
  --exclude='web/node_modules' \
  --exclude='web/.next' \
  --exclude='web/.git' \
  --exclude='web/.vercel' \
  --exclude='web/backups' \
  --exclude='web/.env.local' \
  --exclude='web/.env.selfhosted' \
  --exclude='web/.env.production.local' \
  --exclude='web/.env.prod.test' \
  --exclude='web/scraper/node_modules' \
  web

echo ""
echo "Deploy arhiva: $OUT"
echo "Veličina: $(du -h "$OUT" | cut -f1)"
echo ""
echo "Upload preko cPanel File Manager ili FTP u folder aplikacije, zatim:"
echo "  tar -xzf bojleri-deploy-*.tar.gz"
echo "  cd web && npm install && npm run build"