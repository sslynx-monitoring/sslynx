#!/bin/bash

# Stop Node.js services (if running with pm2 or forever)
echo "Stopping all SSLynx services..."

# Check if pm2 or forever is installed and stop services
if command -v pm2 &> /dev/null; then
    pm2 stop all
    pm2 delete all
    echo "Stopped all pm2 services."
elif command -v forever &> /dev/null; then
    forever stopall
    echo "Stopped all forever services."
else
    echo "No pm2 or forever found. Skipping service stop."
fi

# Stop any other running processes related to SSLynx if necessary
echo "Stopping other related processes..."
killall node

# Remove the SSLynx directory
echo "Removing SSLynx directory..."
cd ..
rm -rf ssllynx/

# Confirm the removal
if [ ! -d "ssllynx/" ]; then
    echo "SSLynx directory removed successfully."
else
    echo "Failed to remove the SSLynx directory."
fi
