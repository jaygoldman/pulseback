#!/bin/bash
# Remove Pulseback services
set -e

echo "=== Pulseback Uninstaller ==="

# Unload services
launchctl unload "$HOME/Library/LaunchAgents/com.pulseback.server.plist" 2>/dev/null || true
sudo launchctl unload "/Library/LaunchDaemons/com.pulseback.pfctl.plist" 2>/dev/null || true

# Remove plists
rm -f "$HOME/Library/LaunchAgents/com.pulseback.server.plist"
sudo rm -f "/Library/LaunchDaemons/com.pulseback.pfctl.plist"

# Remove pfctl anchor
sudo pfctl -a com.pulseback -F all 2>/dev/null || true
sudo rm -f /etc/pf.anchors/com.pulseback

echo ""
echo "Services removed."
echo "Data directory preserved — delete ./data/ manually if you want to remove all data."
