#!/usr/bin/env python3
import os, time, json, pathlib, argparse, socket
from datetime import datetime
from prometheus_client import start_http_server, Gauge, Counter, Info
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

    # Prometheus - Pipeline metrics
    host = socket.gethostname()
    bind_host, bind_port = args.prom_bind.split(":")
    start_http_server(int(bind_port), addr=bind_host)

    g_latency = Gauge("benchlab_pipeline_latency_ms","Latency in ms", ["pair"])
    c_dropped = Counter("benchlab_pipeline_dropped","Unpaired pipeline events")

    # Prometheus - BENCHLAB comprehensive metrics
    # Voltage channels (13)
    g_voltage = Gauge("benchlab_voltage_v", "Voltage measurement", ["channel"])

    # Power channels (11 rails)
    g_power_voltage = Gauge("benchlab_power_voltage_v", "Power rail voltage", ["rail"])
    g_power_current = Gauge("benchlab_power_current_a", "Power rail current", ["rail"])
    g_power_watts = Gauge("benchlab_power_w", "Power rail watts", ["rail"])

    # Fan channels (9)
    g_fan_enabled = Gauge("benchlab_fan_enabled", "Fan enabled status", ["fan"])
    g_fan_duty = Gauge("benchlab_fan_duty", "Fan duty cycle (0-255)", ["fan"])
    g_fan_rpm = Gauge("benchlab_fan_rpm", "Fan speed in RPM", ["fan"])

    # Temperature sensors (6)
    g_temp = Gauge("benchlab_temp_c", "Temperature in Celsius", ["sensor"])

    # Environmental
    g_humidity = Gauge("benchlab_humidity_pct", "Relative humidity percentage")

    # System voltages
    g_vdd = Gauge("benchlab_vdd_v", "Digital supply voltage")
    g_vref = Gauge("benchlab_vref_v", "Reference voltage")

    # Device info
    i_device = Info("benchlab_device", "BENCHLAB device information")
    g_calibration_status = Gauge("benchlab_calibration_valid", "Calibration status (1=valid, 0=invalid)")

    # Total system power (sum of all rails)
    g_total_power = Gauge("benchlab_total_power_w", "Total system power (all rails)")

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
    device_info_set = False

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
                kv = rec.get("kv", {})

                # Handle legacy single power value
                p = kv.get("p_sys") or kv.get("power_w")
                if p is not None:
                    last_power = float(p)

                # Export voltage channels
                if "voltages" in kv and isinstance(kv["voltages"], list):
                    for i, v in enumerate(kv["voltages"]):
                        g_voltage.labels(channel=str(i)).set(float(v))

                # Export power channels (11 rails)
                total_power = 0.0
                if "power" in kv and isinstance(kv["power"], list):
                    for rail_data in kv["power"]:
                        rail = str(rail_data.get("rail", 0))
                        g_power_voltage.labels(rail=rail).set(float(rail_data.get("voltage", 0)))
                        g_power_current.labels(rail=rail).set(float(rail_data.get("current", 0)))

                        power_w = float(rail_data.get("power", 0))
                        g_power_watts.labels(rail=rail).set(power_w)
                        total_power += power_w

                    g_total_power.set(total_power)
                    last_power = total_power  # Use total power for latency correlation

                # Export fan data (9 channels)
                if "fans" in kv and isinstance(kv["fans"], list):
                    for fan_data in kv["fans"]:
                        fan = str(fan_data.get("fan", 0))
                        g_fan_enabled.labels(fan=fan).set(1 if fan_data.get("enabled") else 0)
                        g_fan_duty.labels(fan=fan).set(float(fan_data.get("duty", 0)))
                        g_fan_rpm.labels(fan=fan).set(float(fan_data.get("rpm", 0)))

                # Export temperature sensors
                if "temps" in kv and isinstance(kv["temps"], dict):
                    for sensor_name, temp_val in kv["temps"].items():
                        g_temp.labels(sensor=sensor_name).set(float(temp_val))

                # Export humidity
                if "humidity" in kv:
                    g_humidity.set(float(kv["humidity"]))

                # Export system voltages
                if "vdd" in kv:
                    g_vdd.set(float(kv["vdd"]))
                if "vref" in kv:
                    g_vref.set(float(kv["vref"]))

                # Export device info (once)
                if not device_info_set and "device_info" in rec:
                    dev_info = rec["device_info"]
                    i_device.info({
                        "uid": str(dev_info.get("uid", "unknown")),
                        "name": str(dev_info.get("name", "unknown")),
                        "firmware": str(dev_info.get("firmware", "unknown")),
                        "vendor_id": str(dev_info.get("vendor_id", 0)),
                        "product_id": str(dev_info.get("product_id", 0)),
                    })
                    device_info_set = True

                # Export calibration status
                if "calibration" in rec:
                    cal = rec["calibration"]
                    g_calibration_status.set(1 if cal.get("status") == "valid" else 0)

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
