#!/usr/bin/env bash
set -euo pipefail
export BENCHLAB_DATA_ROOT="$PWD/.benchlab"
mkdir -p "$BENCHLAB_DATA_ROOT/sessions/dev/raw"
cp data/sample/*.jsonl "$BENCHLAB_DATA_ROOT/sessions/dev/raw/"
python -m apps.muxd.main --data-root "$BENCHLAB_DATA_ROOT" --session dev --pair ingress encoded &
sleep 1
python apps/cx_exporter/main.py --data-root "$BENCHLAB_DATA_ROOT" --session dev --stage-a ingress --stage-b encoded --out "$PWD/presentmon_demo.csv"
echo "CSV exported to presentmon_demo.csv"
