#!/usr/bin/env python3
import os, sys, time, json, pathlib, argparse, statistics, random
from datetime import datetime
from typing import Optional, Dict, Any

# Add libs to path for SDK import
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent / "libs"))

try:
    from benchlab_sdk.benchlab_client import BenchLabClient
    HAVE_SDK = True
except Exception as e:
    print(f"Warning: BenchLab SDK not available: {e}", file=sys.stderr)
    HAVE_SDK = False

def clock_ns():
    return time.clock_gettime_ns(time.CLOCK_MONOTONIC_RAW)

def session_root(data_root: pathlib.Path, session: str):
    r = data_root / "sessions" / session
    (r / "raw").mkdir(parents=True, exist_ok=True)
    return r

def generate_synthetic_data() -> Dict[str, Any]:
    """Generate comprehensive synthetic sensor data for development/simulation"""
    t = time.time()
    import math

    return {
        # 13 voltage channels
        "voltages": [
            12.0 + 0.5 * math.sin(t / 5 + i) for i in range(13)
        ],
        # 11 power channels (v, i, w per rail)
        "power": [
            {
                "rail": i,
                "voltage": 12.0 + 0.3 * math.sin(t / 3 + i),
                "current": 2.0 + 0.5 * abs(math.sin(t / 2 + i)),
                "power": (12.0 + 0.3 * math.sin(t / 3 + i)) * (2.0 + 0.5 * abs(math.sin(t / 2 + i)))
            }
            for i in range(11)
        ],
        # 9 fan channels
        "fans": [
            {
                "fan": i,
                "enabled": True,
                "duty": int(128 + 64 * abs(math.sin(t / 7 + i))),
                "rpm": int(1500 + 500 * abs(math.sin(t / 6 + i)))
            }
            for i in range(9)
        ],
        # Temperature sensors
        "temps": {
            "chip": 45.0 + 5.0 * abs(math.sin(t / 4)),
            "ambient": 25.0 + 3.0 * abs(math.sin(t / 8)),
            "ext1": 55.0 + 8.0 * abs(math.sin(t / 5)),
            "ext2": 50.0 + 6.0 * abs(math.sin(t / 6)),
            "ext3": 48.0 + 4.0 * abs(math.sin(t / 7)),
            "ext4": 52.0 + 5.0 * abs(math.sin(t / 9)),
        },
        # Humidity
        "humidity": 45.0 + 10.0 * abs(math.sin(t / 10)),
        # System voltages
        "vdd": 3.3,
        "vref": 1.25,
    }

def fetch_device_info(client: 'BenchLabClient', device_path: str) -> Dict[str, Any]:
    """Fetch device identification and firmware info"""
    try:
        info = client.get_device_info(device_path)
        return {
            "uid": info.get("uid", "unknown"),
            "name": info.get("name", "benchlab-device"),
            "firmware": info.get("firmware", "unknown"),
            "vendor_id": info.get("vendor_id", 0),
            "product_id": info.get("product_id", 0),
        }
    except Exception as e:
        print(f"Warning: Could not fetch device info: {e}", file=sys.stderr)
        return {
            "uid": "simulated",
            "name": "benchlab-sim",
            "firmware": "v0.0.0",
            "vendor_id": 0,
            "product_id": 0,
        }

def fetch_calibration_status(client: 'BenchLabClient', device_path: str) -> Dict[str, Any]:
    """Fetch calibration data from device"""
    try:
        cal_data = client.get_calibration(device_path)
        return {
            "status": "valid" if cal_data else "unknown",
            "loaded": True,
            "data": cal_data if cal_data else {}
        }
    except Exception as e:
        print(f"Warning: Could not fetch calibration: {e}", file=sys.stderr)
        return {
            "status": "unknown",
            "loaded": False,
            "data": {}
        }

def parse_sensor_reading(reading: Dict[str, Any]) -> Dict[str, Any]:
    """Parse comprehensive sensor data from SDK stream"""
    parsed = {}

    # Extract voltage channels (13 channels)
    if "voltages" in reading:
        parsed["voltages"] = reading["voltages"]

    # Extract power channels (11 rails with v/i/w)
    if "power" in reading:
        parsed["power"] = reading["power"]

    # Extract fan data (9 fans)
    if "fans" in reading:
        parsed["fans"] = reading["fans"]

    # Extract temperatures (6 sensors)
    parsed["temps"] = {}
    if "chipTemp" in reading:
        parsed["temps"]["chip"] = reading["chipTemp"]
    if "ambientTemp" in reading:
        parsed["temps"]["ambient"] = reading["ambientTemp"]
    for i in range(1, 5):
        key = f"extTemp{i}"
        if key in reading:
            parsed["temps"][f"ext{i}"] = reading[key]

    # Extract humidity
    if "humidity" in reading:
        parsed["humidity"] = reading["humidity"]

    # Extract system voltages
    if "vdd" in reading:
        parsed["vdd"] = reading["vdd"]
    if "vref" in reading:
        parsed["vref"] = reading["vref"]

    return parsed

def control_rgb_status(client: 'BenchLabClient', device_path: str,
                       latency_ms: float, enable_rgb: bool = False):
    """Control RGB LEDs based on pipeline latency"""
    if not enable_rgb:
        return

    try:
        if latency_ms < 10:
            # Green: Good performance
            client.set_rgb(device_path, mode="solid", red=0, green=255, blue=0, brightness=128)
        elif latency_ms < 20:
            # Yellow: Warning
            client.set_rgb(device_path, mode="solid", red=255, green=255, blue=0, brightness=128)
        else:
            # Red: Critical
            client.set_rgb(device_path, mode="solid", red=255, green=0, blue=0, brightness=192)
    except Exception as e:
        print(f"Warning: RGB control failed: {e}", file=sys.stderr)

def control_fan_thermal(client: 'BenchLabClient', device_path: str,
                       temp_c: float, fan_index: int = 0,
                       enable_auto_fan: bool = False):
    """Auto-adjust fan speed based on temperature"""
    if not enable_auto_fan:
        return

    try:
        # Set fan to auto mode with temperature threshold
        # Threshold at 60°C, ramp from 25% to 100% duty
        client.set_fan_auto(
            device_path,
            fan_index=fan_index,
            temp_threshold=60.0,
            min_duty=64,  # 25%
            max_duty=255,  # 100%
            sensor_index=0  # Use chip temp
        )
    except Exception as e:
        print(f"Warning: Fan control failed: {e}", file=sys.stderr)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT","/var/log/benchlab"))
    ap.add_argument("--session", default=datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ"))
    ap.add_argument("--device", default=os.environ.get("BENCHLAB_DEVICE","/dev/ttyACM0"))
    ap.add_argument("--api-endpoint", default=os.environ.get("BENCHLAB_API_ENDPOINT","http://localhost:8080"))
    ap.add_argument("--api-key", default=os.environ.get("BENCHLAB_API_KEY",""))
    ap.add_argument("--daemon", action="store_true")
    ap.add_argument("--simulate", action="store_true", help="generate synthetic BENCHLAB samples")
    ap.add_argument("--enable-rgb", action="store_true", help="enable RGB LED status feedback")
    ap.add_argument("--enable-auto-fan", action="store_true", help="enable automatic fan control")
    ap.add_argument("--multi-device", action="store_true", help="auto-discover all devices")
    args = ap.parse_args()

    data_root = pathlib.Path(args.data_root)
    root = session_root(data_root, args.session)

    # Initialize SDK client
    client = None
    device_info = None
    calibration = None

    if HAVE_SDK and not args.simulate:
        try:
            client = BenchLabClient(args.api_endpoint, api_key=args.api_key)
            print(f"Connected to BENCHLAB HTTP API at {args.api_endpoint}")

            # Fetch device information
            device_info = fetch_device_info(client, args.device)
            print(f"Device UID: {device_info['uid']}, Name: {device_info['name']}, FW: {device_info['firmware']}")

            # Fetch calibration status
            calibration = fetch_calibration_status(client, args.device)
            print(f"Calibration status: {calibration['status']}")

            # Initialize fan control if enabled
            if args.enable_auto_fan:
                control_fan_thermal(client, args.device, 60.0, enable_auto_fan=True)
                print("Auto fan control enabled")

        except Exception as e:
            print(f"Warning: SDK initialization failed: {e}, falling back to simulation", file=sys.stderr)
            client = None

    # Open output file (per-device if multi-device mode)
    if device_info and device_info['uid'] != "simulated":
        out_file = root / "raw" / f"benchlab-{device_info['uid']}.jsonl"
    else:
        out_file = root / "raw" / "benchlab.jsonl"

    out = out_file.open("a")
    print(f"Writing telemetry to {out_file}")

    # Main telemetry loop
    sample_count = 0
    last_fan_control = time.time()

    while True:
        ts = clock_ns()

        if client and not args.simulate:
            try:
                # Stream data from SDK
                reading = client.get_sensors(args.device)
                payload = parse_sensor_reading(reading)

                # Control RGB based on latest latency (if available)
                # This would need muxd feedback in production
                if args.enable_rgb and "temps" in payload and "chip" in payload["temps"]:
                    # Use temperature as proxy for now
                    temp = payload["temps"]["chip"]
                    control_rgb_status(client, args.device, temp, enable_rgb=True)

                # Periodic fan control adjustment
                if args.enable_auto_fan and time.time() - last_fan_control > 10:
                    if "temps" in payload and "chip" in payload["temps"]:
                        control_fan_thermal(
                            client, args.device,
                            payload["temps"]["chip"],
                            enable_auto_fan=True
                        )
                        last_fan_control = time.time()

            except Exception as e:
                print(f"Error reading from device: {e}", file=sys.stderr)
                payload = generate_synthetic_data()
        else:
            # Simulation mode - generate synthetic data
            payload = generate_synthetic_data()

        # Build telemetry record
        rec = {
            "ts_ns": ts,
            "source": "benchlab.usb",
            "kv": payload
        }

        # Add device info if available
        if device_info:
            rec["device_info"] = device_info

        # Add calibration info if available
        if calibration:
            rec["calibration"] = calibration

        # Write to JSONL
        out.write(json.dumps(rec) + "\n")
        out.flush()

        sample_count += 1
        if sample_count % 100 == 0:
            print(f"Collected {sample_count} samples...")

        time.sleep(0.1)  # 10 Hz sampling

if __name__ == "__main__":
    main()
