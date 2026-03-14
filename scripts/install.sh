#!/bin/bash
# Install Pulseback as a macOS service
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_PATH=$(which node)

echo "=== Pulseback Installer ==="
echo "Project directory: $PROJECT_DIR"
echo "Node.js: $NODE_PATH"

# Detect active network interface
NET_IF=$(route -n get default 2>/dev/null | awk '/interface:/ {print $2}')
NET_IF=${NET_IF:-en0}
echo "Network interface: $NET_IF"

# Build the project
echo ""
echo "Building..."
cd "$PROJECT_DIR"
npm run build

# Create data directories
mkdir -p "$PROJECT_DIR/data"/{photos/originals,photos/display,watch/imported,certs,logs,uploads-tmp}

# Generate pfctl anchor file with detected interface
echo ""
echo "Installing pfctl port forwarding (requires sudo)..."
sudo tee /etc/pf.anchors/com.pulseback > /dev/null <<PFEOF
rdr pass on lo0 proto udp from any to any port 53 -> 127.0.0.1 port 5354
rdr pass on lo0 proto tcp from any to any port 80 -> 127.0.0.1 port 8080
rdr pass on lo0 proto tcp from any to any port 443 -> 127.0.0.1 port 8443
rdr pass on $NET_IF proto udp from any to any port 53 -> 127.0.0.1 port 5354
rdr pass on $NET_IF proto tcp from any to any port 80 -> 127.0.0.1 port 8080
rdr pass on $NET_IF proto tcp from any to any port 443 -> 127.0.0.1 port 8443
PFEOF

# Install pfctl plist
PFCTL_SRC="$PROJECT_DIR/deploy/com.pulseback.pfctl.plist"
PFCTL_DEST="/Library/LaunchDaemons/com.pulseback.pfctl.plist"
sudo cp "$PFCTL_SRC" "$PFCTL_DEST"
sudo chown root:wheel "$PFCTL_DEST"

# Install server plist (with placeholder replacement)
echo "Installing launchd service..."
PLIST_DEST="$HOME/Library/LaunchAgents/com.pulseback.server.plist"
sed "s|__INSTALL_DIR__|$PROJECT_DIR|g; s|__NODE_PATH__|$NODE_PATH|g" \
  "$PROJECT_DIR/deploy/com.pulseback.server.plist" > "$PLIST_DEST"

# Load services
echo ""
echo "Starting services..."
sudo launchctl load "$PFCTL_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST" 2>/dev/null || true

echo ""
echo "=== Pulseback installation complete! ==="
echo ""
echo "Web UI: http://localhost:3000"
echo "Open the URL above to complete setup."
echo ""
echo "Frame setup:"
echo "  1. In TP-Link Tether app: assign a static IP to this Mac"
echo "  2. On the frame: WiFi > Advanced > set DNS to this Mac's IP"
