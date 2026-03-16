#!/bin/bash
# Bundle the Pulseback server into the Mac app
set -e

APP_PATH="$1"
RESOURCES_DIR="$APP_PATH/Contents/Resources"
SERVER_DIR="$RESOURCES_DIR/server"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SERVER_ROOT="$PROJECT_ROOT"

echo "Bundling Pulseback server into $APP_PATH"

# Build the server if needed
if [ ! -d "$SERVER_ROOT/dist" ]; then
  echo "Building server..."
  cd "$SERVER_ROOT"
  npm run build
fi

# Copy server files
mkdir -p "$SERVER_DIR"
cp -R "$SERVER_ROOT/dist" "$SERVER_DIR/"
cp -R "$SERVER_ROOT/node_modules" "$SERVER_DIR/"
cp "$SERVER_ROOT/package.json" "$SERVER_DIR/"

# Copy web UI build
if [ -d "$SERVER_ROOT/web-ui/dist" ]; then
  mkdir -p "$SERVER_DIR/web-ui"
  cp -R "$SERVER_ROOT/web-ui/dist" "$SERVER_DIR/web-ui/"
fi

echo "Server bundled successfully"
