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

# Systemd units
for s in benchlab-telemetry benchlab-usb benchlab-pipeline benchlab-mux benchlab-cx-export; do
  sudo cp configs/systemd/$s.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now $s.service
done
sudo cp configs/systemd/benchlab-retention.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now benchlab-retention.timer

echo "Install complete."
