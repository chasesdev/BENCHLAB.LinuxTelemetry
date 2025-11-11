#!/usr/bin/env python3
import os, sys, time, pathlib, argparse, shutil, json
from datetime import datetime, timedelta

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT","/var/log/benchlab"))
    ap.add_argument("--days", type=int, default=int(os.environ.get("BENCHLAB_RETENTION_DAYS","90")))
    ap.add_argument("--raw-keep-days", type=int, default=int(os.environ.get("BENCHLAB_RAW_KEEP_DAYS","7")))
    ap.add_argument("--run-once", action="store_true")
    args = ap.parse_args()

    root = pathlib.Path(args.data_root)/"sessions"
    now = datetime.utcnow()

    if not root.exists():
        return

    for sess in sorted(root.iterdir()):
        if not sess.is_dir(): continue
        # parse session id as timestamp prefix if possible
        try:
            t = datetime.strptime(sess.name[:20], "%Y-%m-%dT%H-%M-%SZ")
        except Exception:
            # fallback to mtime
            t = datetime.utcfromtimestamp(sess.stat().st_mtime)
        age_days = (now - t).days

        raw = sess/"raw"
        if raw.exists() and age_days > args.raw_keep_days:
            # remove raw to save space; keep aligned and parquet
            try: shutil.rmtree(raw)
            except Exception: pass

        if age_days > args.days:
            try: shutil.rmtree(sess)
            except Exception: pass

    if not args.run-once:
        # daemonize
        while True:
            time.sleep(86400)

if __name__ == "__main__":
    main()
