#!/bin/sh

set -eu

PROJECT_ROOT=${PROJECT_ROOT:-/opt/ai-xiaohongshu}
FRONTEND_DIR="$PROJECT_ROOT/frontend"

cd "$FRONTEND_DIR"
npm install
npm run build
