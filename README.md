# BenchLab Linux Telemetry

Pipeline-centric Linux telemetry agent with BENCHLAB power/thermal correlation and CapFrameX-compatible exporter.

## Table of Contents
- [Overview](#overview)
- [Architecture & Data Flow](#architecture--data-flow)
- [Components](#components)
- [Hardware Requirements](#hardware-requirements)
- [Quickstart (Developer)](#quickstart-developer)
- [Configuration Reference](#configuration-reference)
- [Production Deployment](#production-deployment)
- [API & Endpoints](#api--endpoints)
- [Examples & Use Cases](#examples--use-cases)

## Overview

**BenchLab Linux Telemetry** is a comprehensive telemetry system designed to correlate pipeline latency metrics with system power consumption and thermal characteristics. It combines:

- **BENCHLAB USB hardware** for high-precision power/current/temperature measurements
- **System telemetry** (GPU, CPU, NIC, Disk) via NVML and psutil
- **Pipeline probes** for capturing latency stages in video processing workflows
- **Time alignment** across multiple data sources
- **CapFrameX-compatible export** for integration with existing analysis tools
- **Real-time Prometheus metrics** for monitoring and alerting
- **Web UI** for operational visibility and member narrative tracking

## Architecture & Data Flow

```
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  BENCHLAB USB   │  │  GPU/CPU/NIC     │  │  Pipeline       │
│  /dev/ttyACM0   │  │  Telemetry       │  │  Probes         │
│  (power/thermal)│  │  (NVML/psutil)   │  │  (GStreamer)    │
└────────┬────────┘  └────────┬─────────┘  └────────┬────────┘
         │                    │                      │
         │ benchlabd          │ telemetryd           │ pipeline_probes
         │ (calibrated)       │ (10Hz polling)       │ (event-driven)
         │                    │                      │
         ▼                    ▼                      ▼
    ┌────────────────────────────────────────────────────┐
    │         raw/*.jsonl (timestamped events)           │
    │   benchlab.jsonl  telemetry.jsonl  pipeline.jsonl  │
    └────────────────────┬───────────────────────────────┘
                         │
                         │ muxd (alignment + pairing)
                         │ - Time correlation
                         │ - Latency pair matching
                         │ - Power annotation
                         ▼
    ┌────────────────────────────────────────────────────┐
    │           aligned/latency.jsonl                     │
    │   (paired events with power correlation)            │
    └───────┬──────────────────────┬─────────────────────┘
            │                      │
            │                      │
    ┌───────▼────────┐   ┌─────────▼──────────┐
    │  Prometheus    │   │   cx_exporter      │
    │  :9109/metrics │   │   PresentMon CSV   │
    │  (real-time)   │   │   (for CapFrameX)  │
    └────────────────┘   └────────────────────┘
            │                      │
            │                      │
    ┌───────▼──────────────────────▼─────────┐
    │         Web UI (Next.js)                │
    │   /api/live  -  ops dashboard           │
    └─────────────────────────────────────────┘
```

### Data Flow Summary

1. **Collection**: Three independent data sources collect timestamped events into `raw/*.jsonl` files
2. **Alignment**: `muxd` tails all raw files, aligns timestamps, and pairs pipeline events
3. **Correlation**: Power/thermal data from BENCHLAB is correlated with latency pairs
4. **Export**: Multiple outputs serve different use cases (monitoring, analysis, visualization)
5. **Retention**: `retentiond` manages data lifecycle (raw data kept 7 days, aligned data 90 days)

## Components

### benchlabd
**BENCHLAB USB Reader with Offset Calibration**

Reads high-precision power, current, voltage, and temperature measurements from BENCHLAB hardware via USB serial.

**Features:**
- RTT-based calibration for timestamp accuracy
- Serial communication with configurable baud rate
- Simulation mode for development without hardware
- JSON Lines output format

**Key Arguments:**
```bash
--device /dev/ttyACM0    # BENCHLAB USB device
--baud 115200            # Serial baud rate
--session <name>         # Session identifier
--simulate               # Generate synthetic data
```

**Output Format:**
```json
{"ts_ns": 1234567890, "source": "benchlab.usb", "kv": {"v_sys": 12.0, "i_sys": 20.5, "p_sys": 246.0, "temp_c": 42.3}, "cal": {"offset_ns": 0, "rtt_ns": 1500000}}
```

### telemetryd
**GPU/CPU/NIC/Disk Poller**

Samples system telemetry at configurable frequency using NVML (NVIDIA GPU) and psutil (CPU/system).

**Features:**
- NVIDIA GPU metrics (utilization, memory, power, temperature)
- CPU utilization tracking
- Configurable sampling frequency (default: 10 Hz)
- Graceful fallback with simulation mode

**Key Arguments:**
```bash
--hz 10.0                # Sampling frequency
--device-index 0         # GPU device index
--simulate               # Generate synthetic GPU data
```

**Output Format:**
```json
{"ts_ns": 1234567890, "source": "gpu.nvml", "kv": {"gpu_util": 85.2, "mem_util": 45.0, "gpu_mem_used": 16000000000, "gpu_mem_total": 48000000000, "power_w": 285.5, "temp_c": 68.0}}
{"ts_ns": 1234567890, "source": "cpu.psutil", "kv": {"cpu_util": 32.5}}
```

### muxd
**Alignment + Prometheus + Parquet/JSONL Store**

Core multiplexer that tails all raw data sources, aligns timestamps, pairs pipeline events, and exports metrics.

**Features:**
- Multi-source file tailing (pipeline, telemetry, benchlab)
- Time-window-based event pairing (2-second window)
- Prometheus exporter (Gauge and Counter metrics)
- Power annotation of latency pairs
- Real-time aligned output

**Key Arguments:**
```bash
--pair ingress encoded   # Pipeline stages to pair
--prom-bind 0.0.0.0:9109 # Prometheus endpoint
--session <name>         # Session identifier
```

**Metrics Exported:**
- `benchlab_pipeline_latency_ms{pair="(...)"}` - Pipeline latency gauge
- `benchlab_power_w` - System power gauge
- `benchlab_pipeline_dropped` - Unpaired event counter

### pipeline_probes
**GStreamer/SDK Probes for Latency Stages**

Captures pipeline timing events from GStreamer pad probes or SDK callbacks. Falls back to synthetic probe generation.

**Features:**
- GStreamer pad probe integration (when available)
- Configurable pipeline stages (ingress, encoded, inference_done, etc.)
- Simulation mode with realistic timing jitter

**Key Arguments:**
```bash
--device /dev/video0     # Video capture device
--simulate               # Generate synthetic probe events
```

**Output Format:**
```json
{"ts_ns": 1234567890, "source": "pipeline", "kv": {"stage": "ingress"}}
{"ts_ns": 1245567890, "source": "pipeline", "kv": {"stage": "encoded"}}
```

### cx_exporter
**PresentMon/OCAT-Style CSV Exporter**

Converts aligned latency data into CapFrameX-compatible CSV format, mapping pipeline latency to `MsBetweenPresents`.

**Features:**
- CapFrameX-compatible CSV output
- Configurable stage pairs
- Power annotation in custom field
- Dropped frame detection

**Key Arguments:**
```bash
--stage-a ingress        # Start stage
--stage-b encoded        # End stage
--application "App:Name" # Application identifier
--out /path/to/file.csv  # Output path
```

**Output Format:**
```csv
TimeInSeconds,MsBetweenPresents,Dropped,Application,Note_Power_W
0.000000,10.500,0,Vantage:Pipeline,246.20
0.016667,11.200,0,Vantage:Pipeline,248.50
```

### retentiond
**90-Day Retention/Compaction**

Manages data lifecycle by removing old raw data and sessions based on configurable retention policies.

**Features:**
- Separate retention for raw vs. aligned data
- Session timestamp parsing
- Safe removal with error handling
- Timer-based execution (systemd)

**Key Arguments:**
```bash
--days 90                # Total retention period
--raw-keep-days 7        # Raw data retention (space saving)
--run-once               # Execute once and exit
```

### web
**Advanced Monitoring Dashboard (Next.js + Recharts)**

Professional real-time telemetry dashboard with comprehensive visualization and analytics.

**Core Features:**
- **Real-time dual-axis line chart** - Latency and power with gradient fills
- **8 statistics cards** - Min/max/avg/p95/p99 with trend indicators
- **Correlation scatter plot** - Latency vs power efficiency analysis
- **Latency distribution histogram** - Performance consistency visualization
- **Dark mode** - Toggle with localStorage persistence
- **Interactive controls** - Pause/resume, time window selection (30s/1m/5m/15m)
- **Export functionality** - Download data as CSV
- **Responsive layout** - Optimized for desktop and mobile
- **Glass morphism design** - Modern UI with smooth animations

**Technology Stack:**
- Recharts 2.12 (charting library)
- Tailwind CSS 3.4 (styling with dark mode)
- Zustand 4.5 (state management)
- Lucide React (modern icons)
- TypeScript (type safety)

**Development:**
```bash
cd web
npm install
npm run dev
# Open http://localhost:3010
```

**Production Build:**
```bash
cd web
npm run build
npm start
```

**Dashboard Features:**
- **Live Updates**: Polls `/api/live` every 1 second
- **Time Windows**: 30s, 1min, 5min, 15min views
- **Statistics**: Real-time calculation of min/max/avg/p95/p99
- **Color Coding**: Green (<10ms), yellow (10-20ms), red (>20ms) for latency
- **Export**: One-click CSV download with timestamps

## Hardware Requirements

### Required

- **Operating System**: Ubuntu 20.04 LTS or later (recommended), Debian 11+
- **Python**: 3.8 or later
- **CPU**: x86_64, 2+ cores recommended
- **Memory**: 4GB+ RAM
- **Storage**: 50GB+ for 90-day retention (depends on sampling frequency)

### Optional Hardware

- **NVIDIA GPU**: Any GPU with NVML support (for GPU telemetry)
  - Tested: RTX 3080, RTX 4090, A6000, H100
- **BENCHLAB USB Device**: `/dev/ttyACM0`, 115200 baud
  - Provides high-precision power/current/thermal measurements
  - Can operate without (simulation mode available)
- **Video Capture Cards**: For pipeline probes
  - R5C capture card
  - YUAN capture card
  - Any `/dev/video*` V4L2 device

### Software Dependencies

- **Python packages**: See `requirements.txt`
  - `pynvml` - NVIDIA GPU monitoring
  - `pyserial` - BENCHLAB USB communication
  - `prometheus_client` - Metrics export
  - `psutil` - System telemetry
  - `pyarrow` - Parquet storage
- **Node.js**: 18+ (for web UI)
- **GStreamer**: 1.0+ (optional, for pipeline probes)

## Quickstart (Developer)

### 1. Set Up Python Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Simulators (No Hardware Required)

Start telemetry daemon with synthetic GPU data:
```bash
python apps/telemetryd/main.py --session dev --simulate
```

Start BENCHLAB daemon with synthetic power data:
```bash
python apps/benchlabd/main.py --session dev --simulate
```

Start pipeline probes with synthetic latency events:
```bash
python apps/pipeline_probes/r5c_capture.py --session dev --simulate
```

### 3. Run Alignment & Prometheus Exporter

```bash
python apps/muxd/main.py --session dev --pair ingress encoded
```

This will:
- Tail all raw data files
- Pair `ingress` and `encoded` events
- Start Prometheus exporter on `:9109`
- Write aligned data to `aligned/latency.jsonl`

### 4. Export CapFrameX CSV

```bash
python apps/cx_exporter/main.py \
  --session dev \
  --stage-a ingress \
  --stage-b encoded \
  --out /tmp/presentmon.csv
```

### 5. Start Web UI

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

### Quick Demo Script

Use the provided dev script for a complete demo:
```bash
./scripts/dev_run.sh
```

## Configuration Reference

Configuration is managed via TOML file at `/etc/benchlab/config.toml` (production) or environment variables.

### config.toml Structure

```toml
[general]
data_root = "/var/log/benchlab"  # Root directory for all session data
sample_hz = 10                   # Telemetry sampling frequency (Hz)
node_name = "vantage-ws-01"      # Node identifier for multi-node deployments

[gpu]
provider = "nvml"                # GPU provider (nvml for NVIDIA)
device_index = 0                 # GPU device index (0-based)

[cpu]
enable_rapl = true               # Enable RAPL power readings (Intel/AMD)

[benchlab]
device = "/dev/ttyACM0"          # BENCHLAB USB serial device
baud = 115200                    # Serial baud rate
calibration_interval_sec = 60    # RTT calibration frequency

[pipeline]
stage_a = "ingress"              # Default start stage for latency
stage_b = "encoded"              # Default end stage for latency

[cx_export]
enabled = true                   # Auto-export to CapFrameX format
watch_dir = "/mnt/cx-import"     # Directory for CX CSV files
application_name = "Vantage:Pipeline"  # Application label in CSV

[prometheus]
bind = "0.0.0.0:9109"            # Prometheus exporter bind address

[retention]
days = 90                        # Total data retention period
raw_keep_days = 7                # Raw data retention (aligned kept longer)
```

### Environment Variables

All configuration options can be overridden via environment variables:

```bash
export BENCHLAB_DATA_ROOT=/var/log/benchlab
export BENCHLAB_SAMPLE_HZ=10
export BENCHLAB_DEVICE=/dev/ttyACM0
export BENCHLAB_BAUD=115200
export BENCHLAB_PROM=0.0.0.0:9109
export BENCHLAB_RETENTION_DAYS=90
export BENCHLAB_RAW_KEEP_DAYS=7
export CX_STAGE_A=ingress
export CX_STAGE_B=encoded
export CX_APP="Vantage:Pipeline"
```

### Session Directory Structure

```
/var/log/benchlab/
└── sessions/
    └── 2025-11-11T14-30-00Z/          # Session ID (timestamp)
        ├── raw/                        # Raw data streams
        │   ├── benchlab.jsonl
        │   ├── telemetry.jsonl
        │   └── pipeline.jsonl
        ├── aligned/                    # Aligned/paired data
        │   └── latency.jsonl
        └── cx-export/                  # CapFrameX CSV files
            └── ingress_to_encoded.csv
```

## Production Deployment

### Prerequisites

- Ubuntu 20.04 LTS or later
- Root or sudo access
- Python 3.8+
- Node.js 18+ (for web UI)

### Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/BENCHLAB.LinuxTelemetry.git
   cd BENCHLAB.LinuxTelemetry
   ```

2. **Run Install Script**
   ```bash
   sudo ./scripts/install.sh
   ```

   This will:
   - Create `benchlab` system user
   - Install Python dependencies in `/opt/benchlab/.venv`
   - Copy configuration to `/etc/benchlab/config.toml`
   - Install udev rules for USB/video device access
   - Install and enable systemd services

3. **Configure**
   Edit `/etc/benchlab/config.toml` to match your hardware:
   ```bash
   sudo nano /etc/benchlab/config.toml
   ```

4. **Verify Services**
   ```bash
   sudo systemctl status benchlab-telemetry
   sudo systemctl status benchlab-usb
   sudo systemctl status benchlab-pipeline
   sudo systemctl status benchlab-mux
   ```

### Systemd Services

| Service | Description | Restart Policy |
|---------|-------------|----------------|
| `benchlab-telemetry.service` | GPU/CPU telemetry polling | Always |
| `benchlab-usb.service` | BENCHLAB USB reader | Always |
| `benchlab-pipeline.service` | Pipeline probes | Always |
| `benchlab-mux.service` | Alignment + Prometheus | Always |
| `benchlab-cx-export.service` | CapFrameX CSV exporter | On-failure |
| `benchlab-retention.timer` | Daily retention job | N/A (timer) |

### Security Hardening

All systemd services include:
- `NoNewPrivileges=true` - Prevent privilege escalation
- `PrivateTmp=true` - Isolated /tmp directory
- `ProtectSystem=strict` - Read-only system directories
- `ProtectHome=true` - No access to user home directories
- Dedicated `benchlab` user with minimal permissions

### Device Permissions

Udev rules at `/etc/udev/rules.d/99-benchlab.rules`:
```
KERNEL=="ttyACM*", MODE="0660", GROUP="benchlab", TAG+="uaccess"
KERNEL=="video[0-9]*", GROUP="benchlab", MODE="0660"
```

Add users to `benchlab` group for device access:
```bash
sudo usermod -aG benchlab $USER
```

### Monitoring

**Prometheus Metrics:**
```bash
curl http://localhost:9109/metrics
```

**Service Logs:**
```bash
sudo journalctl -u benchlab-mux -f
sudo journalctl -u benchlab-telemetry -f
```

### Troubleshooting

**No GPU metrics:**
- Verify NVIDIA drivers: `nvidia-smi`
- Check NVML library: `python3 -c "import pynvml; pynvml.nvmlInit()"`
- Use `--simulate` flag for testing

**BENCHLAB USB not detected:**
- Check device: `ls -l /dev/ttyACM*`
- Verify permissions: `groups` (should include `benchlab`)
- Check udev rules: `sudo udevadm control --reload-rules`

**Prometheus not accessible:**
- Verify bind address in config: `0.0.0.0:9109` (all interfaces) vs `127.0.0.1:9109` (localhost only)
- Check firewall: `sudo ufw status`

**Missing data in aligned output:**
- Check raw data exists: `ls -lh /var/log/benchlab/sessions/*/raw/`
- Verify muxd is running: `systemctl status benchlab-mux`
- Check pairing window (default: 2 seconds) - events must be close in time

## API & Endpoints

### Prometheus Metrics

**Endpoint:** `http://localhost:9109/metrics`

**Available Metrics:**

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `benchlab_pipeline_latency_ms` | Gauge | Pipeline stage latency in milliseconds | `pair` (e.g., `('ingress', 'encoded')`) |
| `benchlab_power_w` | Gauge | System power consumption in watts | None |
| `benchlab_pipeline_dropped` | Counter | Count of unpaired pipeline events | None |

**Example Query:**
```promql
# Average latency over 5 minutes
rate(benchlab_pipeline_latency_ms[5m])

# Power consumption percentile
histogram_quantile(0.95, benchlab_power_w)
```

### Web API

**Endpoint:** `GET /api/live`

Returns recent latency and power data for visualization.

**Response Format:**
```json
{
  "rows": [
    {
      "t": 0.0,
      "lat_ms": 10.5,
      "power_w": 246.2
    },
    {
      "t": 0.016667,
      "lat_ms": 11.2,
      "power_w": 248.5
    }
  ]
}
```

**Parameters:**
- Uses `BENCHLAB_DATA_ROOT` and `BENCHLAB_SESSION` env vars
- Returns last 300 samples from `aligned/latency.jsonl`

### Data Schemas

**Raw Pipeline Event:**
```json
{
  "ts_ns": 1234567890000000,
  "source": "pipeline",
  "kv": {
    "stage": "ingress"
  }
}
```

**Raw Telemetry Event:**
```json
{
  "ts_ns": 1234567890000000,
  "source": "gpu.nvml",
  "kv": {
    "gpu_util": 85.2,
    "power_w": 285.5,
    "temp_c": 68.0
  }
}
```

**Aligned Latency Event:**
```json
{
  "ts_aligned_ns": 1234567890000000,
  "source": "metric.latency",
  "kv": {
    "lat_ms": 10.5,
    "pair": ["ingress", "encoded"],
    "power_w": 246.2
  }
}
```

## Examples & Use Cases

### 1. Using the Web Dashboard

Start the monitoring dashboard to visualize telemetry data in real-time:

```bash
# Terminal 1: Start telemetry daemons (or use --simulate for demo)
python apps/telemetryd/main.py --session dev --simulate &
python apps/benchlabd/main.py --session dev --simulate &
python apps/pipeline_probes/r5c_capture.py --session dev --simulate &

# Terminal 2: Start muxd (alignment + Prometheus)
python apps/muxd/main.py --session dev --pair ingress encoded

# Terminal 3: Start web dashboard
cd web
npm install
npm run dev
```

Open **http://localhost:3010** to access the dashboard:

**Dashboard Overview:**
- Top row: 8 real-time statistics cards showing current/min/max/avg/p95/p99
- Main chart: Dual-axis line chart with latency (blue) and power (pink)
- Side panel: Correlation scatter plot + latency distribution histogram
- Header controls: Dark mode, pause/resume, time window selector, CSV export

**Interactive Features:**
- **Dark Mode**: Click moon/sun icon to toggle (persists in localStorage)
- **Pause**: Freeze updates to inspect specific data points
- **Time Window**: Switch between 30s, 1min, 5min, 15min views
- **Export**: Download current data as CSV file
- **Color Coding**: Latency values auto-color (green/yellow/red)

**Dashboard Tips:**
- Watch for correlation between power spikes and latency increases
- Use histogram to identify performance consistency
- Monitor p95/p99 for tail latency issues
- Export CSV for external analysis in Excel/CapFrameX

### 2. Running with Sample Data

Use provided sample data for testing:

```bash
export BENCHLAB_DATA_ROOT="$PWD/.benchlab"
mkdir -p "$BENCHLAB_DATA_ROOT/sessions/dev/raw"
cp data/sample/*.jsonl "$BENCHLAB_DATA_ROOT/sessions/dev/raw/"

# Run muxd to process sample data
python apps/muxd/main.py --data-root "$BENCHLAB_DATA_ROOT" --session dev

# Export to CSV
python apps/cx_exporter/main.py \
  --data-root "$BENCHLAB_DATA_ROOT" \
  --session dev \
  --out presentmon_demo.csv
```

Or use the convenience script:
```bash
./scripts/dev_run.sh
```

### 3. Viewing in CapFrameX

1. Export data to CSV:
   ```bash
   python apps/cx_exporter/main.py --session prod --out /tmp/capture.csv
   ```

2. Open CapFrameX (Windows)

3. Import CSV via **File → Import PresentMon CSV**

4. Analyze latency metrics as frametime data

5. Check `Note_Power_W` column for correlated power readings

### 4. Grafana Integration

**Add Prometheus Data Source:**
1. Configuration → Data Sources → Add Prometheus
2. URL: `http://localhost:9109`
3. Save & Test

**Example Dashboard Queries:**

- **Pipeline Latency Over Time:**
  ```promql
  benchlab_pipeline_latency_ms{pair="('ingress', 'encoded')"}
  ```

- **Power Consumption:**
  ```promql
  benchlab_power_w
  ```

- **Dropped Frame Rate:**
  ```promql
  rate(benchlab_pipeline_dropped[1m])
  ```

### 5. Member Biomarker Journey Workflow

The `configs/flows/clinic.yaml` example demonstrates using pipeline telemetry for medical imaging workflows:

```yaml
flow: "member_biomarker_journey"
steps:
  - id: retina_capture
    copy: "Look into the viewer; blink twice, hold steady."
    ops: ["device:retina:capture", "bookmark:retina_start"]
    latency_target_ms: 120  # Target latency for quality feedback
```

**Use Case:**
- Track latency for each biomarker capture step
- Correlate with power consumption for device health monitoring
- Generate member-facing narrative with performance metrics
- Export to CapFrameX for quality assurance analysis

### 6. Multi-Stage Pipeline Analysis

Monitor complex pipelines with multiple stages:

```bash
# Pair ingress → encoded
python apps/muxd/main.py --pair ingress encoded &

# Also track encoded → inference_done
python apps/muxd/main.py --pair encoded inference_done --prom-bind 0.0.0.0:9110 &
```

Export multiple stage pairs:
```bash
python apps/cx_exporter/main.py --stage-a ingress --stage-b encoded --out encode_latency.csv
python apps/cx_exporter/main.py --stage-a encoded --stage-b inference_done --out inference_latency.csv
```

### 7. Long-Term Performance Tracking

Use retention policy for historical analysis:

```bash
# Keep raw data for 14 days (vs default 7)
export BENCHLAB_RAW_KEEP_DAYS=14

# Keep aligned data for 180 days (vs default 90)
export BENCHLAB_RETENTION_DAYS=180

# Run retention job manually
python apps/retentiond/main.py --run-once
```

Query historical data:
```bash
# List all sessions
ls -lh /var/log/benchlab/sessions/

# Process old session
python apps/cx_exporter/main.py --session 2025-10-15T10-00-00Z --out historical.csv
```

---

## License

[Add your license here]

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/yourusername/BENCHLAB.LinuxTelemetry/issues).
