#!/bin/sh

set -eu

PROJECT_ROOT=${PROJECT_ROOT:-/opt/ai-xiaohongshu}
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$BACKEND_DIR"
python3 -m venv .venv
. .venv/bin/activate
pip install --break-system-packages -e .
