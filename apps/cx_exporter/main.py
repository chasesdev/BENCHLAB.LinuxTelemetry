#!/usr/bin/env python3
import os, time, csv, json, pathlib, argparse
from datetime import datetime

def session_root(data_root: pathlib.Path, session: str):
    r = data_root / "sessions" / session
    (r / "aligned").mkdir(parents=True, exist_ok=True)
    (r / "cx-export").mkdir(parents=True, exist_ok=True)
    return r

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT","/var/log/benchlab"))
    ap.add_argument("--session", default=datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ"))
    ap.add_argument("--stage-a", default=os.environ.get("CX_STAGE_A","ingress"))
    ap.add_argument("--stage-b", default=os.environ.get("CX_STAGE_B","encoded"))
    ap.add_argument("--application", default=os.environ.get("CX_APP","Vantage:Pipeline"))
    ap.add_argument("--out", default=None)
    ap.add_argument("--daemon", action="store_true")
    args = ap.parse_args()

    data_root = pathlib.Path(args.data_root)
    root = session_root(data_root, args.session)
    lat_file = root / "aligned" / "latency.jsonl"
    out_csv = pathlib.Path(args.out) if args.out else (root / "cx-export" / f"{args.stage_a}_to_{args.stage_b}.csv")

    # Compute t0
    t0 = None
    rows = []
    if lat_file.exists():
        for line in open(lat_file, "r"):
            rec = json.loads(line)
            kv = rec.get("kv",{})
            pair = tuple(kv.get("pair") or [])
            if pair != (args.stage_a, args.stage_b):
                continue
            ts = rec["ts_aligned_ns"]
            if t0 is None: t0 = ts
            tsec = (ts - t0)/1e9
            rows.append((tsec, kv.get("lat_ms"), kv.get("power_w")))
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(out_csv, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["TimeInSeconds","MsBetweenPresents","Dropped","Application","Note_Power_W"])
        for t,lat,pwr in rows:
            dropped = 1 if lat is None else 0
            w.writerow([f"{t:.6f}", f"{(lat or 0):.3f}", dropped, args.application, "" if pwr is None else f"{pwr:.2f}"])

    print(f"wrote {out_csv} with {len(rows)} rows")

if __name__ == "__main__":
    main()
