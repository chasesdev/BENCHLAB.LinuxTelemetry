#!/usr/bin/env python3
import os, sys, time, json, pathlib, argparse
from datetime import datetime
import psutil

try:
    import pynvml
    NVML_AVAILABLE = True
except Exception:
    NVML_AVAILABLE = False

def clock_ns():
    return time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW)

def session_root(data_root: pathlib.Path, session: str):
    r = data_root / "sessions" / session
    (r / "raw").mkdir(parents=True, exist_ok=True)
    return r

def init_nvml(device_index: int):
    if not NVML_AVAILABLE:
        return None
    try:
        pynvml.nvmlInit()
        return pynvml.nvmlDeviceGetHandleByIndex(device_index)
    except Exception:
        return None

def sample_gpu(dev):
    d = {}
    if dev is None:
        return d
    try:
        u = pynvml.nvmlDeviceGetUtilizationRates(dev)
        m = pynvml.nvmlDeviceGetMemoryInfo(dev)
        d["gpu_util"] = float(u.gpu)
        d["mem_util"] = float(u.memory)
        d["gpu_mem_used"] = int(m.used)
        d["gpu_mem_total"] = int(m.total)
        try:
            d["power_w"] = pynvml.nvmlDeviceGetPowerUsage(dev)/1000.0
        except Exception:
            pass
        try:
            d["temp_c"] = float(pynvml.nvmlDeviceGetTemperature(dev, pynvml.NVML_TEMPERATURE_GPU))
        except Exception:
            pass
    except Exception:
        pass
    return d

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT","/var/log/benchlab"))
    ap.add_argument("--session", default=datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ"))
    ap.add_argument("--hz", type=float, default=float(os.environ.get("BENCHLAB_SAMPLE_HZ","10")))
    ap.add_argument("--device-index", type=int, default=int(os.environ.get("BENCHLAB_GPU_INDEX","0")))
    ap.add_argument("--daemon", action="store_true")
    ap.add_argument("--simulate", action="store_true", help="generate synthetic GPU power if NVML unavailable")
    args = ap.parse_args()

    data_root = pathlib.Path(args.data_root)
    root = session_root(data_root, args.session)
    out = (root / "raw" / "telemetry.jsonl").open("a")

    dev = init_nvml(args.device_index)
    period = 1.0/args.hz
    t_last = time.time()

    while True:
        ts = clock_ns()
        gpu = sample_gpu(dev)
        if not gpu and args.simulate:
            # simple synthetic signal
            import math, random
            t = time.time()
            gpu = {
                "gpu_util": abs(math.sin(t/3))*90.0,
                "mem_util": abs(math.sin(t/5))*60.0,
                "gpu_mem_used": int(16e9),
                "gpu_mem_total": int(48e9),
                "power_w": 220 + 60*abs(math.sin(t/2)) + random.random()*5.0,
                "temp_c": 55 + 10*abs(math.sin(t/4)),
            }
        cpu = {"cpu_util": psutil.cpu_percent(interval=None)}
        out.write(json.dumps({"ts_ns": ts, "source":"gpu.nvml","kv":gpu}) + "\n")
        out.write(json.dumps({"ts_ns": ts, "source":"cpu.psutil","kv":cpu}) + "\n")
        out.flush()
        # sleep
        dt = period - (time.time() - t_last)
        if dt > 0: time.sleep(dt)
        t_last = time.time()

if __name__ == "__main__":
    main()
