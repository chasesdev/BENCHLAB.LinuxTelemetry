# benchlab-linux

Pipeline-centric Linux telemetry agent with BENCHLAB power/thermal correlation and CapFrameX-compatible exporter.

## Components
- `benchlabd` — BENCHLAB USB reader with offset calibration
- `telemetryd` — GPU/CPU/NIC/Disk poller
- `muxd` — alignment + Prometheus + Parquet/JSONL store
- `pipeline_probes` — GStreamer/SDK probes for latency stages
- `cx_exporter` — PresentMon/OCAT-style CSV exporter (maps pipeline latency to frametime)
- `retentiond` — 90-day retention/compaction
- `web` — embedded Next.js UI for ops + member narrative

## Quickstart (developer)
```bash
# Python env
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run telemetry and benchlab simulators (no devices required)
python apps/telemetryd/main.py --session dev --simulate
python apps/benchlabd/main.py --session dev --simulate

# Align and build latency stream (also starts Prometheus exporter on :9109)
python apps/muxd/main.py --session dev --pair ingress encoded --simulate

# Export CX CSV (maps pipeline latency to MsBetweenPresents)
python apps/cx_exporter/main.py --session dev --stage-a ingress --stage-b encoded --out /tmp/presentmon.csv

# Web UI (requires Node.js 18+)
cd web && npm install && npm run dev
```
## Production
See `scripts/install.sh` and `configs/systemd/*.service` for systemd units and hardening.
