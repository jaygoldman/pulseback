# Pulseback Mac App — Design Spec

## Overview

A native SwiftUI macOS application that wraps the Pulseback server, providing a MAMP-like experience for managing Kodak Pulse digital picture frames. The app bundles the server, manages its lifecycle, and provides a status dashboard — users double-click to launch and the server just works.

The app is a separate Xcode project (`pulseback-app/`) that packages the existing Pulseback server.

## Constraints

- Minimum macOS 13 Ventura (SwiftUI maturity, modern APIs)
- Bundle ID: `com.jaygoldman.pulseback`
- Must work with both bundled Node.js and system-installed Node.js (prefers system)
- Server data lives in `~/Library/Application Support/Pulseback/` (survives app updates)
- pfctl port forwarding requires a one-time admin privilege grant

## Architecture

### App Components

```
pulseback-app/
├── Pulseback.xcodeproj
├── Pulseback/
│   ├── PulsebackApp.swift          # App entry, window + menu bar setup
│   ├── ServerManager.swift          # Start/stop/monitor Node process
│   ├── PfctlManager.swift           # One-time pfctl setup with admin prompt
│   ├── ThemeManager.swift           # Fetch era theme from server API
│   ├── Views/
│   │   ├── StatusView.swift         # Main dashboard window (Style B)
│   │   ├── MenuBarView.swift        # Menu bar icon + dropdown
│   │   ├── SetupWizardView.swift    # Frame configuration wizard
│   │   └── StatsRowView.swift       # Server/Frames/Photos/Uptime row
│   ├── Models/
│   │   ├── ServerStatus.swift       # Health response model
│   │   ├── Device.swift             # Connected device model
│   │   └── EraTheme.swift           # Era theme definitions (mirrors web)
│   └── Resources/
│       ├── Assets.xcassets/         # App icon, menu bar icon
│       └── frame-photos/           # Placeholder images for setup wizard
├── Resources/
│   ├── server/                     # Built Pulseback server (copied at build time)
│   └── node                        # Bundled Node.js binary (fallback)
├── PulsebackHelper/
│   ├── main.swift                    # Privileged helper for pfctl (XPC service)
│   └── Info.plist
└── scripts/
    └── bundle-server.sh            # Build script to copy server into app bundle
```

### App Bundle Structure

```
Pulseback.app/Contents/
  MacOS/Pulseback
  Library/
    LaunchServices/
      com.jaygoldman.pulseback.helper  # Privileged helper (pfctl)
  Resources/
    server/                 # dist/ + node_modules/ + package.json
    node                    # Bundled Node.js binary
    AppIcon.icns
    frame-photos/
  Info.plist
```

## Server Management

### Startup Flow

1. App launches → check for pfctl configuration (existence of `/etc/pf.anchors/com.pulseback`). If missing, show first-run pfctl setup.
2. Locate Node.js: search `$PATH` for `node`. If not found, use bundled binary at `Contents/Resources/node`.
3. Spawn child process: `node Contents/Resources/server/dist/server.js`
4. Set working directory to `Contents/Resources/server/`
5. Set environment: `KPS_DATA_DIR=~/Library/Application Support/Pulseback/`
6. Monitor via `GET http://localhost:{port}/health` every 5 seconds
7. On server crash: auto-restart up to 3 times, then show error state

### Shutdown Flow

1. User quits (Cmd+Q) → send SIGTERM to Node process
2. Wait up to 5 seconds for graceful shutdown
3. If still running, SIGKILL
4. App exits

### Port Discovery

The app reads `~/Library/Application Support/Pulseback/config.json` to discover the configured web UI port. If `config.json` does not exist (first launch), the app uses the hardcoded default port 3000. The discovered port is used for:
- Health polling
- "Open Admin" button URL
- Menu bar status display

## pfctl Setup

One-time setup on first launch:

1. App detects `/etc/pf.anchors/com.pulseback` does not exist
2. Shows a friendly explanation: "Pulseback needs to set up network routing so your Kodak Pulse frame can connect. This is a one-time setup that requires your admin password."
3. Uses `SMAppService` (macOS 13+) to register a privileged helper tool (`com.jaygoldman.pulseback.helper`). The helper is a separate executable embedded in the app bundle at `Contents/Library/LaunchServices/com.jaygoldman.pulseback.helper`. It communicates with the main app via XPC. The helper:
   - Detects the active network interface (`route -n get default`), with fallback to `en0`
   - Writes `/etc/pf.anchors/com.pulseback` with port forwarding rules (53→5354, 80→8080, 443→8443) for both `lo0` and the detected interface
   - Installs `/Library/LaunchDaemons/com.pulseback.pfctl.plist` to load rules at boot
   - Loads the rules immediately via `pfctl`
4. On success, proceeds to start server

**Network interface changes:** The pfctl rules are written for a specific interface. If the Mac switches interfaces (e.g., WiFi to Ethernet), the app detects this via `NWPathMonitor` and re-invokes the helper to update the rules. The helper is already blessed, so no additional admin prompt is needed.

## Window Design (Dashboard Style B)

### Layout

~400px wide window with era-adaptive theming. Components from top to bottom:

**Header:** Era-themed gradient with Pulseback logo. Logo treatment changes per era (script/serif/k-box/sans/lowercase). Tagline below. Film-strip perforations in 1960s–1970s eras.

**Stats Row:** Four equal cells — Server (green/red dot), Frames (count), Photos (count), Uptime (h:mm). Numbers in the era's heading font. Labels in small caps below.

**Device Cards:** One card per connected frame. Shows device name, last seen timestamp, online/offline dot. Cards use era-themed border radius and colors.

**Action Buttons:** Two buttons, equal width, vertically centered text (flexbox). "Open Admin" (primary color) opens the web UI in the default browser. "Configure Frame" opens the setup wizard sheet.

### Menu Bar

**Icon:** Monochrome "P" pulse icon, 18px, template image (adapts to light/dark menu bar).

**Dropdown:**
- "● Server Running — 1 frame connected" (or "Server Stopped", "No frames connected", "2 frames connected")
- Separator
- "Show Window"
- "Open Admin"
- Separator
- "Start Server" / "Stop Server"
- Separator
- "Quit Pulseback"

### Behavior

- Closing the window hides it — server keeps running, menu bar icon stays
- "Show Window" from menu bar (or clicking Dock icon) brings it back
- Cmd+Q quits the app and stops the server
- Window is not resizable (fixed size)

## Era Theming

The Mac app mirrors the 6 Kodak era themes from the web UI:

| Era | Background | Text | Accents | Logo Style | Corners |
|-----|-----------|------|---------|------------|---------|
| 1950s | Dark warm brown | Cream | Gold | Italic script | Tight (4px) |
| 1960s | Dark navy | Yellow | Bright yellow | Bold serif | Square (2px) |
| 1970s | Dark brown | Cream | Kodak yellow | K-box + serif | Medium (8px) |
| 1980s | Dark charcoal | Yellow | Orange | Sans bold | Tight (4px) |
| 1990s | Dark gray | Light gray | Blue/orange | Sans bold | Medium (6px) |
| 2000s | Light gray | Dark gray | Gray | Lowercase | Round (10px) |

### Syncing

- On startup, the app calls `GET /api/preferences` to fetch the current era
- Defaults to 1970s if the server isn't running yet or no preference is set
- The app polls `GET /api/preferences` alongside the health check every 5 seconds to pick up era changes
- Validates the returned era against the known list; falls back to 1970s if invalid or missing
- The Mac app does not set the era — that's done in the web UI only

## Frame Configuration Wizard

A multi-step sheet presented modally from the main window.

### Step 1 — "Let's connect your frame"
- Shows the Mac's current IP address prominently
- Brief explanation of what the setup does

### Step 2 — "Connect to WiFi"
- Instructions for getting the frame on WiFi
- Photo placeholder showing the frame's WiFi settings screen
- "Turn on your frame and navigate to WiFi settings"

### Step 3 — "Set DNS Server"
- Instructions to go to Advanced network settings
- Enter the Mac's IP address as the DNS server
- Photo placeholder showing the frame's DNS input screen

### Step 4 — "Waiting for connection..."
- Polls `GET /api/devices` every 3 seconds
- Shows a spinner/animation
- When a new device appears, auto-advances to Step 5
- "It's not connecting" expandable troubleshooting section

### Step 5 — "Connected!"
- Shows the device name and confirms communication
- "Open Admin to start adding photos" button
- "Done" button closes the wizard

Each step has Back/Next navigation. Photo placeholders are clearly marked for replacement with real frame interface photos.

## App Icon

Rounded square (macOS standard) with:
- Kodak-yellow (#FAB617) background
- White "P" lettermark in a bold serif style (echoing the 1970s K-box treatment)
- Subtle heartbeat/pulse line integrated into or below the P
- Works from 1024px down to 16px

Generated as SVG, exported to all required `.icns` sizes (16, 32, 64, 128, 256, 512, 1024 @1x and @2x).

## Server-Side Changes Required

Minor additions to the existing Pulseback server:

### 1. Preferences API (new route)

- `GET /api/preferences` — returns `{ era: "1970s" }` (no auth — Mac app reads before login)
- `PUT /api/preferences` — sets preferences (requires auth)
- Backed by a new `preferences` table: `key TEXT PRIMARY KEY, value TEXT`
- New migration `002-preferences.ts`

### 2. Data directory override (prerequisite — must be implemented before the Mac app can function)

- Support `KPS_DATA_DIR` environment variable in `config.ts`
- If set, use it as the base data directory instead of `./data/`
- Falls back to `./data/` as before (no change for existing users)
- The Mac app depends on this to store data in `~/Library/Application Support/Pulseback/`

### 3. Device count in health endpoint

- Add `connectedDevices: number` to the `/health` response
- Count devices with `lastSeen` within 2x polling period

### 4. Web UI era sync

- Migrate web UI from `localStorage` era storage to `GET/PUT /api/preferences`
- Keep localStorage as a cache for instant rendering before the API responds

## Packaging & Distribution

### Build Process

1. Xcode builds the SwiftUI app
2. A build phase script (`bundle-server.sh`) runs `npm run build` in the server repo and copies `dist/`, `node_modules/`, and `package.json` into `Contents/Resources/server/`
3. Bundled Node.js binary is copied to `Contents/Resources/node`
4. Code-signed with Developer ID for distribution outside the App Store

### Distribution

- `.dmg` disk image with drag-to-Applications layout
- Hosted on GitHub Releases
- Notarized with Apple for Gatekeeper approval

### Updates via Sparkle

- Sparkle framework bundled in the app
- Appcast XML hosted on GitHub Releases (or jaygoldman.com)
- Checks for updates on launch (configurable interval)
- Standard "An update is available" dialog with release notes
- **Pre-update:** Sparkle's `updater(_:willInstallUpdate:)` delegate stops the Node server (SIGTERM) before replacement
- Downloads `.dmg`, replaces app, restarts
- **Post-update:** App launches normally, starts server with the updated bundle
- `~/Library/Application Support/Pulseback/` data directory is preserved across updates
- The privileged helper does not need re-blessing on app update (already registered via SMAppService)

### Native Module Signing

The server's `node_modules/` includes native binaries (`better-sqlite3`, `sharp`). The Xcode build phase script must:
- Strip any existing ad-hoc signatures from `.node` binaries
- Re-sign them with the app's Developer ID certificate
- This is required for Apple notarization

### Logging

The Mac app logs to `~/Library/Logs/Pulseback/` using `os_log` (unified logging). Log categories:
- `server` — process lifecycle, crash restarts, startup/shutdown
- `pfctl` — privilege setup, interface detection, rule updates
- `theme` — era sync events

Viewable in Console.app filtered by "Pulseback".
