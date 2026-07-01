#!/usr/bin/env bash
set -euo pipefail

echo "Checking Cimraan Finance Manager v3.0 Phase 4..."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is missing. Install Node.js LTS first."
  exit 1
fi

echo "Node: $(node -v)"

cd "$(dirname "$0")/../backend"
echo "Backend syntax check..."
npm run check

cd ../frontend
echo "Frontend build check..."
npm run build

echo "Project check complete."
