#!/bin/bash
# Remove Kodak Pulse Server services
set -e

echo "=== Kodak Pulse Server Uninstaller ==="

# Unload services
launchctl unload "$HOME/Library/LaunchAgents/com.kodak-pulse.server.plist" 2>/dev/null || true
sudo launchctl unload "/Library/LaunchDaemons/com.kodak-pulse.pfctl.plist" 2>/dev/null || true

# Remove plists
rm -f "$HOME/Library/LaunchAgents/com.kodak-pulse.server.plist"
sudo rm -f "/Library/LaunchDaemons/com.kodak-pulse.pfctl.plist"

# Remove pfctl anchor
sudo pfctl -a com.kodak-pulse -F all 2>/dev/null || true
sudo rm -f /etc/pf.anchors/com.kodak-pulse

echo ""
echo "Services removed."
echo "Data directory preserved — delete ./data/ manually if you want to remove all data."
