#!/usr/bin/env python3
import os, time, json, pathlib, argparse, socket
from datetime import datetime
from prometheus_client import start_http_server, Gauge, Counter
from .latency import Pairer

def clock_ns():
    return time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW)

def session_root(data_root: pathlib.Path, session: str):
    r = data_root / "sessions" / session
    (r / "raw").mkdir(parents=True, exist_ok=True)
    (r / "aligned").mkdir(parents=True, exist_ok=True)
    return r

def tail_file(path):
    with open(path, "r") as f:
        f.seek(0, os.SEEK_END)
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.05); continue
            yield line

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT","/var/log/benchlab"))
    ap.add_argument("--session", default=datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ"))
    ap.add_argument("--pair", nargs=2, default=("ingress","encoded"))
    ap.add_argument("--prom-bind", default=os.environ.get("BENCHLAB_PROM","0.0.0.0:9109"))
    ap.add_argument("--daemon", action="store_true")
    ap.add_argument("--simulate", action="store_true", help="if true, create synthetic raw files if missing")
    args = ap.parse_args()

    data_root = pathlib.Path(args.data_root)
    root = session_root(data_root, args.session)
    raw_pipeline = root / "raw" / "pipeline.jsonl"
    raw_telemetry = root / "raw" / "telemetry.jsonl"
    raw_benchlab = root / "raw" / "benchlab.jsonl"
    aligned_latency = (root / "aligned" / "latency.jsonl").open("a")

    # Prometheus
    host = socket.gethostname()
    bind_host, bind_port = args.prom_bind.split(":")
    start_http_server(int(bind_port), addr=bind_host)
    g_latency = Gauge("benchlab_pipeline_latency_ms","Latency in ms", ["pair"])
    g_power = Gauge("benchlab_power_w","System power (W)")
    c_dropped = Counter("benchlab_pipeline_dropped","Unpaired pipeline events")

    pairer = Pairer(a=args.pair[0], b=args.pair[1])

    # Ensure raw files exist
    for p in [raw_pipeline, raw_telemetry, raw_benchlab]:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.touch(exist_ok=True)

    # Tailing
    tails = {
        "pipeline": tail_file(raw_pipeline),
        "telemetry": tail_file(raw_telemetry),
        "benchlab": tail_file(raw_benchlab)
    }

    last_power = None
    while True:
        # multiplex read (simple round-robin)
        for key, gen in list(tails.items()):
            try:
                line = next(gen)
            except StopIteration:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            rec["ts_aligned_ns"] = rec["ts_ns"]  # placeholder; extend with drift correction
            if key == "benchlab":
                kv = rec.get("kv",{})
                p = kv.get("p_sys") or kv.get("power_w")
                if p is not None:
                    last_power = float(p)
                    g_power.set(last_power)
            elif key == "pipeline":
                pairer.add(rec)
                for pr in pairer.pairs():
                    pr["ts_aligned_ns"] = pr.pop("t_ns")
                    pr["source"] = "metric.latency"
                    pr["kv"] = {"lat_ms": pr.pop("lat_ms"), "pair": pr.pop("pair"), "power_w": last_power}
                    aligned_latency.write(json.dumps(pr) + "\n")
                    aligned_latency.flush()
                    g_latency.labels(str(pr["kv"]["pair"])).set(pr["kv"]["lat_ms"])
        time.sleep(0.01)

if __name__ == "__main__":
    main()
