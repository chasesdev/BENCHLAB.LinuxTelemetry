#!/usr/bin/env python3
"""
Power Efficiency Analysis

Analyzes latency-per-watt metrics from aligned telemetry data to identify
optimal power/performance trade-offs and generate efficiency reports.
"""
import os, json, argparse, pathlib, statistics
from datetime import datetime
from typing import List, Tuple, Dict, Any

def parse_aligned_data(latency_file: pathlib.Path) -> List[Dict[str, Any]]:
    """Parse aligned latency data with power measurements"""
    data = []
    if not latency_file.exists():
        return data

    for line in open(latency_file, "r"):
        try:
            rec = json.loads(line)
            kv = rec.get("kv", {})
            if kv.get("lat_ms") is not None and kv.get("power_w") is not None:
                data.append({
                    "timestamp": rec["ts_aligned_ns"] / 1e9,
                    "latency_ms": kv["lat_ms"],
                    "power_w": kv["power_w"],
                    "pair": kv.get("pair", ["unknown", "unknown"])
                })
        except Exception:
            continue

    return data

def calculate_efficiency(latency_ms: float, power_w: float) -> float:
    """Calculate efficiency score (lower is better: ms/W)"""
    if power_w == 0:
        return float('inf')
    return latency_ms / power_w

def calculate_performance_score(latency_ms: float, power_w: float, target_latency: float = 16.67) -> float:
    """
    Calculate performance score (higher is better)
    Balances latency target achievement with power consumption
    """
    latency_score = max(0, 1 - (latency_ms / target_latency))
    power_efficiency = 1 / (power_w + 1)  # Avoid division by zero
    return latency_score * power_efficiency * 100

def identify_optimal_points(data: List[Dict[str, Any]], percentile: float = 5) -> List[Dict[str, Any]]:
    """Identify optimal power/performance operating points"""
    # Calculate efficiency for each point
    for point in data:
        point["efficiency"] = calculate_efficiency(point["latency_ms"], point["power_w"])
        point["performance_score"] = calculate_performance_score(point["latency_ms"], point["power_w"])

    # Sort by efficiency (lower is better)
    sorted_by_efficiency = sorted(data, key=lambda x: x["efficiency"] if x["efficiency"] != float('inf') else float('inf'))

    # Take top percentile
    optimal_count = max(1, int(len(sorted_by_efficiency) * (percentile / 100)))
    return sorted_by_efficiency[:optimal_count]

def generate_report(data: List[Dict[str, Any]], output_path: pathlib.Path):
    """Generate comprehensive efficiency report"""
    if len(data) == 0:
        print("No data available for analysis")
        return

    # Calculate overall statistics
    latencies = [d["latency_ms"] for d in data]
    powers = [d["power_w"] for d in data]
    efficiencies = [calculate_efficiency(d["latency_ms"], d["power_w"]) for d in data if d["power_w"] > 0]

    report = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "sample_count": len(data),
        "duration_sec": data[-1]["timestamp"] - data[0]["timestamp"] if len(data) > 1 else 0,

        "latency_stats": {
            "min_ms": min(latencies),
            "max_ms": max(latencies),
            "mean_ms": statistics.mean(latencies),
            "median_ms": statistics.median(latencies),
            "stdev_ms": statistics.stdev(latencies) if len(latencies) > 1 else 0,
            "p95_ms": statistics.quantiles(latencies, n=20)[18] if len(latencies) > 20 else max(latencies),
            "p99_ms": statistics.quantiles(latencies, n=100)[98] if len(latencies) > 100 else max(latencies),
        },

        "power_stats": {
            "min_w": min(powers),
            "max_w": max(powers),
            "mean_w": statistics.mean(powers),
            "median_w": statistics.median(powers),
            "stdev_w": statistics.stdev(powers) if len(powers) > 1 else 0,
        },

        "efficiency_stats": {
            "best_ms_per_w": min(efficiencies) if efficiencies else 0,
            "worst_ms_per_w": max(efficiencies) if efficiencies else 0,
            "mean_ms_per_w": statistics.mean(efficiencies) if efficiencies else 0,
            "median_ms_per_w": statistics.median(efficiencies) if efficiencies else 0,
        },

        "optimal_points": [],
    }

    # Identify top 5% most efficient operating points
    optimal = identify_optimal_points(data, percentile=5)
    report["optimal_points"] = [{
        "timestamp": p["timestamp"],
        "latency_ms": p["latency_ms"],
        "power_w": p["power_w"],
        "efficiency_ms_per_w": p["efficiency"],
        "performance_score": p["performance_score"],
    } for p in optimal[:10]]  # Top 10 points

    # Power efficiency buckets
    power_buckets = {
        "low": [d for d in data if d["power_w"] < report["power_stats"]["mean_w"] * 0.8],
        "medium": [d for d in data if report["power_stats"]["mean_w"] * 0.8 <= d["power_w"] <= report["power_stats"]["mean_w"] * 1.2],
        "high": [d for d in data if d["power_w"] > report["power_stats"]["mean_w"] * 1.2],
    }

    report["power_buckets"] = {}
    for bucket_name, bucket_data in power_buckets.items():
        if len(bucket_data) > 0:
            bucket_latencies = [d["latency_ms"] for d in bucket_data]
            report["power_buckets"][bucket_name] = {
                "count": len(bucket_data),
                "mean_latency_ms": statistics.mean(bucket_latencies),
                "mean_power_w": statistics.mean([d["power_w"] for d in bucket_data]),
            }

    # Write JSON report
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n=== Power Efficiency Report ===")
    print(f"Samples: {report['sample_count']}")
    print(f"Duration: {report['duration_sec']:.1f}s")
    print(f"\nLatency: {report['latency_stats']['mean_ms']:.2f} ms (±{report['latency_stats']['stdev_ms']:.2f})")
    print(f"  P95: {report['latency_stats']['p95_ms']:.2f} ms")
    print(f"  P99: {report['latency_stats']['p99_ms']:.2f} ms")
    print(f"\nPower: {report['power_stats']['mean_w']:.2f} W (±{report['power_stats']['stdev_w']:.2f})")
    print(f"  Range: {report['power_stats']['min_w']:.2f} - {report['power_stats']['max_w']:.2f} W")
    print(f"\nEfficiency: {report['efficiency_stats']['mean_ms_per_w']:.4f} ms/W")
    print(f"  Best: {report['efficiency_stats']['best_ms_per_w']:.4f} ms/W")
    print(f"\nOptimal Operating Points (Top 10):")
    for i, point in enumerate(report["optimal_points"][:10], 1):
        print(f"  {i}. Latency: {point['latency_ms']:.2f} ms, Power: {point['power_w']:.2f} W, Efficiency: {point['efficiency_ms_per_w']:.4f} ms/W")

    print(f"\nReport written to: {output_path}")

def main():
    ap = argparse.ArgumentParser(description="Power efficiency analysis")
    ap.add_argument("--data-root", default=os.environ.get("BENCHLAB_DATA_ROOT", "/var/log/benchlab"))
    ap.add_argument("--session", default=datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ"))
    ap.add_argument("--output", default=None, help="Output path for JSON report")
    args = ap.parse_args()

    data_root = pathlib.Path(args.data_root)
    session_dir = data_root / "sessions" / args.session
    latency_file = session_dir / "aligned" / "latency.jsonl"

    if not latency_file.exists():
        print(f"Error: Latency file not found: {latency_file}")
        return 1

    # Parse data
    print(f"Loading data from {latency_file}...")
    data = parse_aligned_data(latency_file)

    if len(data) == 0:
        print("No valid data found")
        return 1

    # Generate report
    output_path = pathlib.Path(args.output) if args.output else (session_dir / "analytics" / "power_efficiency.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    generate_report(data, output_path)

if __name__ == "__main__":
    main()
