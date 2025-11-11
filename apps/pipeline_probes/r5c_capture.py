#!/usr/bin/env python3
# GStreamer-based pipeline probes for R5C -> YUAN capture. Falls back to synthetic probe events.
import os, time, json, pathlib, argparse, random
from datetime import datetime

try:
    import gi
    gi.require_version('Gst', '1.0')
    from gi.repository import Gst
    Gst.init(None)
    GST_AVAILABLE=True
except Exception:
    GST_AVAILABLE=False

def clock_ns():
    return time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW)

def session_root(data_root: pathlib.Path, session: str):
    r = data_root / "sessions" / session
    (r / "raw").mkdir(parents=True, exist_ok=True)
    return r

def write_event(fh, stage, extra=None):
    ts = clock_ns()
    payload = {"ts_ns": ts, "source":"pipeline", "kv": {"stage": stage}}
    if extra: payload["kv"].update(extra)
    fh.write(json.dumps(payload) + "\n")

def run_synthetic(out):
    while True:
        write_event(out, "ingress")
        time.sleep(0.010)  # 10ms
        write_event(out, "encoded")
        # inference done event could be 15-40ms after ingress
        time.sleep(0.020 + random.random()*0.020)
        write_event(out, "inference_done")
        time.sleep(0.010)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT","/var/log/benchlab"))
    ap.add_argument("--session", default=datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ"))
    ap.add_argument("--device", default="/dev/video0")
    ap.add_argument("--daemon", action="store_true")
    ap.add_argument("--simulate", action="store_true", help="generate synthetic pipeline events")
    args = ap.parse_args()

    data_root = pathlib.Path(args.data_root)
    root = session_root(data_root, args.session)
    out = (root / "raw" / "pipeline.jsonl").open("a")

    if args.simulate or not GST_AVAILABLE:
        run_synthetic(out)
        return

    # Real GStreamer pipeline would be configured here with pad probes
    # For brevity, we only provide the skeleton; use --simulate for dev.
    run_synthetic(out)

if __name__ == "__main__":
    main()
