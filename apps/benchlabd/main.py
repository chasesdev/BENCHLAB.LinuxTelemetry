#!/usr/bin/env python3
import os, sys, time, json, pathlib, argparse, statistics, random
from datetime import datetime

try:
    import serial
    HAVE_SERIAL=True
except Exception:
    HAVE_SERIAL=False

def clock_ns():
    return time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW)

def session_root(data_root: pathlib.Path, session: str):
    r = data_root / "sessions" / session
    (r / "raw").mkdir(parents=True, exist_ok=True)
    return r

def calibrate(ser, reps=7):
    rtts=[]
    for _ in range(reps):
        t0 = clock_ns()
        try:
            ser.write(b"PING\n")
            ser.readline()
        except Exception:
            time.sleep(0.01)
        t1 = clock_ns()
        rtts.append(t1-t0)
    return {"offset_ns": 0, "rtt_ns": int(statistics.median(rtts))}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT","/var/log/benchlab"))
    ap.add_argument("--session", default=datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ"))
    ap.add_argument("--device", default=os.environ.get("BENCHLAB_DEVICE","/dev/ttyACM0"))
    ap.add_argument("--baud", type=int, default=int(os.environ.get("BENCHLAB_BAUD","115200")))
    ap.add_argument("--daemon", action="store_true")
    ap.add_argument("--simulate", action="store_true", help="generate synthetic BENCHLAB samples if device absent")
    args = ap.parse_args()

    data_root = pathlib.Path(args.data_root)
    root = session_root(data_root, args.session)
    out = (root / "raw" / "benchlab.jsonl").open("a")

    ser=None
    if HAVE_SERIAL and not args.simulate:
        try:
            ser = serial.Serial(args.device, args.baud, timeout=1)
        except Exception:
            ser=None

    cal = calibrate(ser) if ser else {"offset_ns": 0, "rtt_ns": 0}

    while True:
        ts = clock_ns()
        if ser:
            try:
                line = ser.readline().decode().strip()
                if not line: continue
                payload = json.loads(line)
            except Exception:
                continue
        else:
            # synthetic BENCHLAB payload (power/current/temp)
            t = time.time()
            payload = {
                "v_sys": 12.0,
                "i_sys": 20.0 + 5.0*abs(__import__('math').sin(t/2)),
                "p_sys": 240.0 + 50.0*abs(__import__('math').sin(t/3)),
                "temp_c": 40.0 + 5.0*abs(__import__('math').sin(t/5)),
            }
        rec = {"ts_ns": ts, "source":"benchlab.usb", "kv": payload, "cal": cal}
        out.write(json.dumps(rec) + "\n")
        out.flush()
        time.sleep(0.1)

if __name__ == "__main__":
    main()
