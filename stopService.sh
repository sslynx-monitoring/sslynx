#!/bin/bash

# Ensure script is run as root
if [ "$(id -u)" -ne 0 ]; then
    echo "Error: This script must be run as root."
    exit 1
fi

SERVICE_NAME="ssl_monitor"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

echo "Stopping and disabling the service..."
systemctl stop "$SERVICE_NAME"
systemctl disable "$SERVICE_NAME"

echo "Removing systemd service file..."
rm -f "$SERVICE_PATH"

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Removing logs..."
rm -f /var/log/${SERVICE_NAME}.log

echo "SSLynx service has been completely removed from the system."
