#!/bin/bash

# SSLynx Setup Script
# This script installs dependencies, configures the database, and sets up environment variables.
echo "Setting up SSLynx..."

set -e

# Update and install dependencies
echo "Updating system and installing dependencies..."
sudo apt update && sudo apt install -y nodejs npm sqlite3

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env file if it doesn't exist
env_file=".env"
if [ ! -f "$env_file" ]; then
    echo "Creating .env file..."
    cat <<EOL > .env
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-password"
ALERT_RECIPIENT="recipient-email@example.com"
EOL
    echo "Please update .env with your actual credentials."
fi


# Create database file if it doesn't exist
# Run initial database setup
echo "Initializing database..."
db_file="ssl_monitor.db"
if [ ! -f "$db_file" ]; then
    echo "Creating database file..."
    touch ssl_monitor.db
fi

# Create a systemd service for auto-running SSLynx
echo "Setting up systemd service..."
service_file="/etc/systemd/system/ssl_monitor.service"
echo "[Unit]
Description=SSL Monitoring Service
After=network.target

[Service]
ExecStart=$(which node) $(pwd)/ssl_monitor.js
WorkingDirectory=$(pwd)
Restart=always
User=$(whoami)
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target" | sudo tee $service_file > /dev/null

# Enable and start the service
echo "Enabling and starting SSL monitoring service..."
sudo systemctl daemon-reload
sudo systemctl enable ssl_monitor
sudo systemctl start ssl_monitor

echo "Setup complete! SSLynx is now running and will check SSL certificates automatically."