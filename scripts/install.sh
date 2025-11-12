#!/usr/bin/env bash
set -euo pipefail

# Create user and dirs
id -u benchlab &>/dev/null || sudo useradd -r -s /usr/sbin/nologin -m -d /var/lib/benchlab benchlab
sudo mkdir -p /opt/benchlab /etc/benchlab /var/log/benchlab
sudo chown -R benchlab:benchlab /opt/benchlab /var/log/benchlab
sudo cp -r . /opt/benchlab
sudo cp configs/default.toml /etc/benchlab/config.toml
sudo cp configs/udev/99-benchlab.rules /etc/udev/rules.d/

# Python deps
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip
sudo -u benchlab python3 -m venv /opt/benchlab/.venv
sudo -u benchlab /opt/benchlab/.venv/bin/pip install -r /opt/benchlab/requirements.txt

# Copy LinuxSupportKit SDK if present
if [ -d "$HOME/github/BENCHLAB.LinuxSupportKit/python/benchlab_sdk" ]; then
  echo "Installing BenchLab SDK from LinuxSupportKit..."
  sudo mkdir -p /opt/benchlab/libs
  sudo cp -r "$HOME/github/BENCHLAB.LinuxSupportKit/python/benchlab_sdk" /opt/benchlab/libs/
  sudo chown -R benchlab:benchlab /opt/benchlab/libs
else
  echo "Warning: LinuxSupportKit SDK not found, will use simulation mode"
fi

# Install LinuxSupportKit HTTP daemon (benchlabd binary) if available
if [ -f "$HOME/github/BENCHLAB.LinuxSupportKit/target/release/benchlabd" ]; then
  echo "Installing benchlabd HTTP API daemon..."
  sudo cp "$HOME/github/BENCHLAB.LinuxSupportKit/target/release/benchlabd" /opt/benchlab/bin/benchlabd
  sudo chown benchlab:benchlab /opt/benchlab/bin/benchlabd
  sudo chmod +x /opt/benchlab/bin/benchlabd
fi

# Systemd units - install HTTP service first
if [ -f "configs/systemd/benchlab-http.service" ]; then
  sudo cp configs/systemd/benchlab-http.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now benchlab-http.service
  echo "Started benchlab-http.service (LinuxSupportKit HTTP API)"
fi

# Install telemetry services
for s in benchlab-telemetry benchlab-usb benchlab-pipeline benchlab-mux benchlab-cx-export; do
  sudo cp configs/systemd/$s.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now $s.service
done
sudo cp configs/systemd/benchlab-retention.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now benchlab-retention.timer

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

echo "Install complete."
echo ""
echo "To configure API key, edit /etc/benchlab/config.toml and update:"
echo "  [benchlab_sdk]"
echo "  api_key = \"your-api-key-here\""
echo ""
echo "Then restart services:"
echo "  sudo systemctl restart benchlab-http.service benchlab-usb.service"
