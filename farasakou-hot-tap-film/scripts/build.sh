#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 scripts/overlays.py
python3 scripts/narration.py
python3 scripts/score.py
python3 scripts/compose.py

echo "Film outputs:"
ls -lh output/*.mp4 2>/dev/null || true
