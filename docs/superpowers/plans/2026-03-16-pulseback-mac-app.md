# Pulseback Mac App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native SwiftUI macOS app that wraps the Pulseback server for a MAMP-like experience managing Kodak Pulse digital picture frames.

**Architecture:** SwiftUI app with Dock + menu bar presence. Manages Node.js server as a child process. Dashboard window with era-adaptive Kodak theming. Frame configuration wizard. Uses xcodegen for project generation.

**Tech Stack:** Swift 6, SwiftUI, macOS 13+, xcodegen, os_log, NWPathMonitor

**Spec:** `docs/superpowers/specs/2026-03-16-pulseback-mac-app-design.md`

**Note:** The privileged helper (SMAppService + XPC) for pfctl setup is complex and tightly coupled to Xcode signing configuration. This plan implements pfctl setup via a simpler `osascript` approach (AppleScript-based admin prompt) that works without a privileged helper target. The SMAppService approach can be added later when the app is ready for notarized distribution.

---

## File Structure

```
pulseback-app/
├── project.yml                          # xcodegen project spec
├── Pulseback/
│   ├── PulsebackApp.swift               # App entry, window + menu bar
│   ├── ServerManager.swift              # Start/stop/monitor Node process
│   ├── PfctlManager.swift               # pfctl setup with admin prompt
│   ├── ThemeManager.swift               # Fetch era theme from server API
│   ├── PortDiscovery.swift              # Read port from config.json
│   ├── Views/
│   │   ├── StatusView.swift             # Main dashboard window
│   │   ├── MenuBarView.swift            # Menu bar extra
│   │   ├── SetupWizardView.swift        # Frame config wizard (5 steps)
│   │   ├── StatsRowView.swift           # Server/Frames/Photos/Uptime
│   │   ├── DeviceCardView.swift         # Individual device card
│   │   └── LogoView.swift              # Era-adaptive logo treatment
│   ├── Models/
│   │   ├── ServerStatus.swift           # Health API response
│   │   ├── Device.swift                 # Device model
│   │   └── EraTheme.swift               # 6 era theme definitions
│   ├── Resources/
│   │   └── Assets.xcassets/             # App icon
│   └── Info.plist
├── scripts/
│   └── bundle-server.sh                 # Build phase: bundle server into app
└── Pulseback.entitlements               # App sandbox entitlements
```

---

## Chunk 1: Project Setup & Core Infrastructure

### Task 1: Create Project Structure & xcodegen Config

**Files:**
- Create: `pulseback-app/project.yml`
- Create: `pulseback-app/Pulseback/Info.plist`
- Create: `pulseback-app/Pulseback.entitlements`
- Create: `pulseback-app/scripts/bundle-server.sh`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p pulseback-app/Pulseback/{Views,Models,Resources/Assets.xcassets}
mkdir -p pulseback-app/scripts
```

- [ ] **Step 2: Create project.yml for xcodegen**

```yaml
name: Pulseback
options:
  bundleIdPrefix: com.jaygoldman
  deploymentTarget:
    macOS: "13.0"
  xcodeVersion: "16.0"
  generateEmptyDirectories: true

settings:
  base:
    SWIFT_VERSION: "6.0"
    MACOSX_DEPLOYMENT_TARGET: "13.0"
    PRODUCT_BUNDLE_IDENTIFIER: com.jaygoldman.pulseback
    MARKETING_VERSION: "1.0.0"
    CURRENT_PROJECT_VERSION: "1"
    CODE_SIGN_ENTITLEMENTS: Pulseback.entitlements
    INFOPLIST_FILE: Pulseback/Info.plist

targets:
  Pulseback:
    type: application
    platform: macOS
    sources:
      - path: Pulseback
    resources:
      - path: Pulseback/Resources
    settings:
      base:
        PRODUCT_NAME: Pulseback
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        COMBINE_HIDPI_IMAGES: YES
    postBuildScripts:
      - script: |
          "${PROJECT_DIR}/scripts/bundle-server.sh" "${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app"
        name: Bundle Pulseback Server
        basedOnDependencyAnalysis: false
```

- [ ] **Step 3: Create Info.plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Pulseback</string>
    <key>CFBundleDisplayName</key>
    <string>Pulseback</string>
    <key>CFBundleIdentifier</key>
    <string>com.jaygoldman.pulseback</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>Pulseback</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>LSUIElement</key>
    <false/>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026 Jay Goldman</string>
</dict>
</plist>
```

- [ ] **Step 4: Create entitlements**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```

Note: Sandbox is disabled because we need to spawn child processes (Node.js) and manage system-level pfctl. For notarized distribution, a hardened runtime with specific exceptions would be used instead.

- [ ] **Step 5: Create bundle-server.sh**

```bash
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
```

- [ ] **Step 6: Make script executable and commit**

```bash
chmod +x pulseback-app/scripts/bundle-server.sh
git add pulseback-app/
git commit -m "feat: create Mac app project structure with xcodegen config"
```

---

### Task 2: Models & Theme Definitions

**Files:**
- Create: `pulseback-app/Pulseback/Models/EraTheme.swift`
- Create: `pulseback-app/Pulseback/Models/ServerStatus.swift`
- Create: `pulseback-app/Pulseback/Models/Device.swift`

- [ ] **Step 1: Create EraTheme.swift**

Define all 6 era themes mirroring the web UI's theme.ts. Each era has colors, fonts, border radius, logo style, and tagline.

```swift
import SwiftUI

enum KodakEra: String, CaseIterable, Identifiable {
    case era1950s = "1950s"
    case era1960s = "1960s"
    case era1970s = "1970s"
    case era1980s = "1980s"
    case era1990s = "1990s"
    case era2000s = "2000s"

    var id: String { rawValue }
}

enum LogoStyle {
    case script, serifBold, kBox, sansBold, lowercase
}

struct EraTheme {
    let era: KodakEra
    let label: String
    let tagline: String
    let primary: Color
    let secondary: Color
    let accent: Color
    let background: Color
    let cardBg: Color
    let sidebarBg: Color
    let sidebarText: Color
    let text: Color
    let textMuted: Color
    let gradientStart: Color
    let gradientEnd: Color
    let success: Color
    let danger: Color
    let headingFont: Font
    let bodyFont: Font
    let cornerRadius: CGFloat
    let logoStyle: LogoStyle

    static let defaultEra: KodakEra = .era1970s

    static func theme(for era: KodakEra) -> EraTheme {
        switch era {
        case .era1950s: return Self.fifties
        case .era1960s: return Self.sixties
        case .era1970s: return Self.seventies
        case .era1980s: return Self.eighties
        case .era1990s: return Self.nineties
        case .era2000s: return Self.twoThousands
        }
    }

    static let fifties = EraTheme(
        era: .era1950s, label: "1950s — Mid-Century Warmth", tagline: "Open Me First",
        primary: Color(hex: "C41E1E"), secondary: Color(hex: "E8B629"), accent: Color(hex: "D4913A"),
        background: Color(hex: "FDF6E3"), cardBg: Color(hex: "FFFEF7"),
        sidebarBg: Color(hex: "2C1810"), sidebarText: Color(hex: "FDF6E3"),
        text: Color(hex: "2C1810"), textMuted: Color(hex: "6B4226"),
        gradientStart: Color(hex: "C41E1E"), gradientEnd: Color(hex: "E8B629"),
        success: Color(hex: "4A7C59"), danger: Color(hex: "C41E1E"),
        headingFont: .custom("Palatino", size: 20), bodyFont: .custom("Georgia", size: 13),
        cornerRadius: 4, logoStyle: .script
    )

    static let sixties = EraTheme(
        era: .era1960s, label: "1960s — The Corner Curl", tagline: "For Colorful Memories",
        primary: Color(hex: "D32011"), secondary: Color(hex: "F5C518"), accent: Color(hex: "FF6B00"),
        background: Color(hex: "FFF9ED"), cardBg: .white,
        sidebarBg: Color(hex: "1A1A2E"), sidebarText: Color(hex: "F5C518"),
        text: Color(hex: "1A1A2E"), textMuted: Color(hex: "555577"),
        gradientStart: Color(hex: "D32011"), gradientEnd: Color(hex: "F5C518"),
        success: Color(hex: "2E8B57"), danger: Color(hex: "D32011"),
        headingFont: .system(size: 20, weight: .bold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 2, logoStyle: .serifBold
    )

    static let seventies = EraTheme(
        era: .era1970s, label: "1970s — The Iconic K", tagline: "For the Times of Your Life",
        primary: Color(hex: "E31837"), secondary: Color(hex: "FAB617"), accent: Color(hex: "DAA520"),
        background: Color(hex: "FFF8E7"), cardBg: Color(hex: "FFFEF9"),
        sidebarBg: Color(hex: "3D2B1F"), sidebarText: Color(hex: "FFF8E7"),
        text: Color(hex: "3D2B1F"), textMuted: Color(hex: "6B4226"),
        gradientStart: Color(hex: "E31837"), gradientEnd: Color(hex: "FAB617"),
        success: Color(hex: "4A7C59"), danger: Color(hex: "C0392B"),
        headingFont: .custom("Georgia", size: 20), bodyFont: .system(size: 13),
        cornerRadius: 8, logoStyle: .kBox
    )

    static let eighties = EraTheme(
        era: .era1980s, label: "1980s — True Colors", tagline: "America's Storyteller",
        primary: Color(hex: "E30613"), secondary: Color(hex: "FAB617"), accent: Color(hex: "ED8B00"),
        background: Color(hex: "F5F3EE"), cardBg: .white,
        sidebarBg: Color(hex: "1C1C1C"), sidebarText: Color(hex: "FAB617"),
        text: Color(hex: "1C1C1C"), textMuted: Color(hex: "666666"),
        gradientStart: Color(hex: "E30613"), gradientEnd: Color(hex: "FAB617"),
        success: Color(hex: "228B22"), danger: Color(hex: "E30613"),
        headingFont: .system(size: 20, weight: .bold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 4, logoStyle: .sansBold
    )

    static let nineties = EraTheme(
        era: .era1990s, label: "1990s — Take Pictures. Further.", tagline: "Take Pictures. Further.",
        primary: Color(hex: "E30613"), secondary: Color(hex: "FAB617"), accent: Color(hex: "0066CC"),
        background: Color(hex: "F0EDE6"), cardBg: .white,
        sidebarBg: Color(hex: "222222"), sidebarText: Color(hex: "EEEEEE"),
        text: Color(hex: "222222"), textMuted: Color(hex: "777777"),
        gradientStart: Color(hex: "E30613"), gradientEnd: Color(hex: "ED8B00"),
        success: Color(hex: "339966"), danger: Color(hex: "CC3333"),
        headingFont: .system(size: 20, weight: .bold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 6, logoStyle: .sansBold
    )

    static let twoThousands = EraTheme(
        era: .era2000s, label: "2000s — Share Moments. Share Life.", tagline: "Share Moments. Share Life.",
        primary: Color(hex: "E30613"), secondary: Color(hex: "A0A0A0"), accent: Color(hex: "3388CC"),
        background: Color(hex: "FAFAFA"), cardBg: .white,
        sidebarBg: Color(hex: "2C2C2C"), sidebarText: Color(hex: "E0E0E0"),
        text: Color(hex: "333333"), textMuted: Color(hex: "999999"),
        gradientStart: Color(hex: "E30613"), gradientEnd: Color(hex: "888888"),
        success: Color(hex: "33AA66"), danger: Color(hex: "DD3333"),
        headingFont: .system(size: 20, weight: .semibold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 10, logoStyle: .lowercase
    )
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        r = Double((int >> 16) & 0xFF) / 255.0
        g = Double((int >> 8) & 0xFF) / 255.0
        b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
```

- [ ] **Step 2: Create ServerStatus.swift**

```swift
import Foundation

struct ServerStatus: Codable {
    let status: String
    let uptime: Int
    let checks: [String: String]
    let connectedDevices: Int

    var isHealthy: Bool { status == "healthy" }

    var formattedUptime: String {
        let hours = uptime / 3600
        let minutes = (uptime % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }
}

struct PreferencesResponse: Codable {
    let era: String?
}
```

- [ ] **Step 3: Create Device.swift**

```swift
import Foundation

struct Device: Codable, Identifiable {
    let id: String
    let deviceID: String
    let name: String
    let activationDate: String?
    let lastSeen: String?
    let storageInfo: StorageInfo?

    var isOnline: Bool {
        guard let lastSeen = lastSeen,
              let date = ISO8601DateFormatter().date(from: lastSeen) else {
            return false
        }
        return Date().timeIntervalSince(date) < 120
    }

    var lastSeenFormatted: String {
        guard let lastSeen = lastSeen,
              let date = ISO8601DateFormatter().date(from: lastSeen) else {
            return "Never"
        }
        let seconds = Int(Date().timeIntervalSince(date))
        if seconds < 60 { return "\(seconds)s ago" }
        if seconds < 3600 { return "\(seconds / 60)m ago" }
        return "\(seconds / 3600)h ago"
    }
}

struct StorageInfo: Codable {
    let bytesAvailable: String?
    let bytesTotal: String?
    let picturesAvailable: String?
    let picturesTotal: String?
}
```

- [ ] **Step 4: Commit**

```bash
git add pulseback-app/Pulseback/Models/
git commit -m "feat: add era theme, server status, and device models"
```

---

### Task 3: Core Managers (ServerManager, ThemeManager, PfctlManager, PortDiscovery)

**Files:**
- Create: `pulseback-app/Pulseback/ServerManager.swift`
- Create: `pulseback-app/Pulseback/ThemeManager.swift`
- Create: `pulseback-app/Pulseback/PfctlManager.swift`
- Create: `pulseback-app/Pulseback/PortDiscovery.swift`

- [ ] **Step 1: Create PortDiscovery.swift**

```swift
import Foundation

enum PortDiscovery {
    static let defaultPort = 3000

    static func discoverPort() -> Int {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let configPath = appSupport.appendingPathComponent("Pulseback/config.json")

        guard FileManager.default.fileExists(atPath: configPath.path),
              let data = try? Data(contentsOf: configPath),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let ports = json["ports"] as? [String: Any],
              let webUi = ports["webUi"] as? Int else {
            return defaultPort
        }
        return webUi
    }
}
```

- [ ] **Step 2: Create ServerManager.swift**

```swift
import Foundation
import os

@MainActor
class ServerManager: ObservableObject {
    @Published var isRunning = false
    @Published var status: ServerStatus?
    @Published var devices: [Device] = []
    @Published var photoCount: Int = 0
    @Published var errorMessage: String?

    private var process: Process?
    private var healthTimer: Timer?
    private var restartCount = 0
    private let maxRestarts = 3
    private let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "server")

    var port: Int { PortDiscovery.discoverPort() }

    func start() {
        guard !isRunning else { return }
        errorMessage = nil

        let nodePath = findNode()
        guard let nodePath else {
            errorMessage = "Node.js not found. Install Node.js or ensure it's in your PATH."
            logger.error("Node.js not found")
            return
        }

        let serverDir = findServerDir()
        guard let serverDir else {
            errorMessage = "Server files not found in app bundle."
            logger.error("Server directory not found")
            return
        }

        let dataDir = ensureDataDir()

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: nodePath)
        proc.arguments = [serverDir.appendingPathComponent("dist/server.js").path]
        proc.currentDirectoryURL = serverDir
        proc.environment = ProcessInfo.processInfo.environment
        proc.environment?["KPS_DATA_DIR"] = dataDir.path

        // Pipe stdout/stderr to logs
        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = pipe

        proc.terminationHandler = { [weak self] process in
            Task { @MainActor in
                self?.handleTermination(exitCode: process.terminationStatus)
            }
        }

        do {
            try proc.run()
            self.process = proc
            self.isRunning = true
            self.restartCount = 0
            logger.info("Server started (PID: \(proc.processIdentifier))")
            startHealthPolling()
        } catch {
            errorMessage = "Failed to start server: \(error.localizedDescription)"
            logger.error("Failed to start server: \(error.localizedDescription)")
        }
    }

    func stop() {
        healthTimer?.invalidate()
        healthTimer = nil

        guard let proc = process, proc.isRunning else {
            isRunning = false
            return
        }

        logger.info("Stopping server (SIGTERM)")
        proc.terminate()  // Sends SIGTERM

        // Wait up to 5 seconds, then SIGKILL
        DispatchQueue.global().asyncAfter(deadline: .now() + 5) { [weak self] in
            if proc.isRunning {
                proc.interrupt()  // SIGINT as fallback
                self?.logger.warning("Server did not stop gracefully, sending SIGINT")
            }
        }
    }

    // MARK: - Private

    private func findNode() -> String? {
        // Check PATH first
        let pathDirs = (ProcessInfo.processInfo.environment["PATH"] ?? "")
            .split(separator: ":").map(String.init)
        for dir in pathDirs {
            let nodePath = "\(dir)/node"
            if FileManager.default.isExecutableFile(atPath: nodePath) {
                logger.info("Using system Node.js: \(nodePath)")
                return nodePath
            }
        }
        // Fall back to bundled Node
        if let bundled = Bundle.main.path(forResource: "node", ofType: nil) {
            logger.info("Using bundled Node.js: \(bundled)")
            return bundled
        }
        return nil
    }

    private func findServerDir() -> URL? {
        if let serverPath = Bundle.main.resourceURL?.appendingPathComponent("server") {
            if FileManager.default.fileExists(atPath: serverPath.appendingPathComponent("dist/server.js").path) {
                return serverPath
            }
        }
        // Dev fallback: look for server in parent directory
        let devPath = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        if FileManager.default.fileExists(atPath: devPath.appendingPathComponent("dist/server.js").path) {
            return devPath
        }
        return nil
    }

    private func ensureDataDir() -> URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dataDir = appSupport.appendingPathComponent("Pulseback")
        try? FileManager.default.createDirectory(at: dataDir, withIntermediateDirectories: true)
        return dataDir
    }

    private func handleTermination(exitCode: Int32) {
        isRunning = false
        process = nil
        status = nil

        if exitCode != 0 && restartCount < maxRestarts {
            restartCount += 1
            logger.warning("Server crashed (exit \(exitCode)), restarting (\(self.restartCount)/\(self.maxRestarts))")
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                self?.start()
            }
        } else if exitCode != 0 {
            errorMessage = "Server crashed \(maxRestarts) times. Check logs for details."
            logger.error("Server exceeded max restarts")
        } else {
            logger.info("Server stopped normally")
        }
    }

    private func startHealthPolling() {
        healthTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.pollHealth()
            }
        }
        // Initial poll after 2 seconds (give server time to start)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            Task { @MainActor in
                await self?.pollHealth()
            }
        }
    }

    private func pollHealth() async {
        guard let url = URL(string: "http://localhost:\(port)/health") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let health = try JSONDecoder().decode(ServerStatus.self, from: data)
            self.status = health
        } catch {
            // Server may still be starting
        }

        // Also fetch device list
        await fetchDevices()
        await fetchPhotoCount()
    }

    private func fetchDevices() async {
        guard let url = URL(string: "http://localhost:\(port)/api/devices") else { return }
        do {
            var request = URLRequest(url: url)
            // Devices endpoint requires auth — try without, will get 401
            // For the Mac app dashboard, we use the health endpoint's connectedDevices count
            // and fetch full device list only if we have a token
            let (data, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                self.devices = try JSONDecoder().decode([Device].self, from: data)
            }
        } catch {}
    }

    private func fetchPhotoCount() async {
        guard let url = URL(string: "http://localhost:\(port)/api/photos") else { return }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                let photos = try JSONDecoder().decode([[String: AnyCodable]].self, from: data)
                self.photoCount = photos.count
            }
        } catch {}
    }
}

// Helper for decoding mixed-type JSON arrays
struct AnyCodable: Codable {
    init(from decoder: Decoder) throws {
        let _ = try decoder.singleValueContainer()
    }
    func encode(to encoder: Encoder) throws {}
}
```

- [ ] **Step 3: Create ThemeManager.swift**

```swift
import Foundation
import os

@MainActor
class ThemeManager: ObservableObject {
    @Published var currentEra: KodakEra = .era1970s

    var theme: EraTheme { EraTheme.theme(for: currentEra) }

    private let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "theme")

    func fetchEra(port: Int) async {
        guard let url = URL(string: "http://localhost:\(port)/api/preferences") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let prefs = try JSONDecoder().decode(PreferencesResponse.self, from: data)
            if let eraString = prefs.era,
               let era = KodakEra(rawValue: eraString) {
                if era != currentEra {
                    currentEra = era
                    logger.info("Era synced from server: \(eraString)")
                }
            }
        } catch {
            // Server may not be running yet — keep default
        }
    }
}
```

- [ ] **Step 4: Create PfctlManager.swift**

```swift
import Foundation
import os

enum PfctlManager {
    private static let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "pfctl")
    private static let anchorPath = "/etc/pf.anchors/com.pulseback"

    static var isConfigured: Bool {
        FileManager.default.fileExists(atPath: anchorPath)
    }

    static func setup() async -> Bool {
        let netInterface = detectInterface()
        logger.info("Detected network interface: \(netInterface)")

        let rules = """
        rdr pass on lo0 proto udp from any to any port 53 -> 127.0.0.1 port 5354
        rdr pass on lo0 proto tcp from any to any port 80 -> 127.0.0.1 port 8080
        rdr pass on lo0 proto tcp from any to any port 443 -> 127.0.0.1 port 8443
        rdr pass on \(netInterface) proto udp from any to any port 53 -> 127.0.0.1 port 5354
        rdr pass on \(netInterface) proto tcp from any to any port 80 -> 127.0.0.1 port 8080
        rdr pass on \(netInterface) proto tcp from any to any port 443 -> 127.0.0.1 port 8443
        """

        // Use osascript to run with admin privileges
        let script = """
        do shell script "echo '\(rules)' > \(anchorPath) && pfctl -a com.pulseback -f \(anchorPath) -e 2>/dev/null; true" with administrator privileges
        """

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        proc.arguments = ["-e", script]

        do {
            try proc.run()
            proc.waitUntilExit()
            if proc.terminationStatus == 0 {
                logger.info("pfctl setup complete")
                return true
            } else {
                logger.error("pfctl setup failed with exit code \(proc.terminationStatus)")
                return false
            }
        } catch {
            logger.error("pfctl setup error: \(error.localizedDescription)")
            return false
        }
    }

    private static func detectInterface() -> String {
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: "/usr/sbin/route")
        proc.arguments = ["-n", "get", "default"]
        let pipe = Pipe()
        proc.standardOutput = pipe

        do {
            try proc.run()
            proc.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            for line in output.components(separatedBy: "\n") {
                if line.contains("interface:") {
                    return line.components(separatedBy: ":").last?.trimmingCharacters(in: .whitespaces) ?? "en0"
                }
            }
        } catch {}
        return "en0"
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add pulseback-app/Pulseback/ServerManager.swift pulseback-app/Pulseback/ThemeManager.swift pulseback-app/Pulseback/PfctlManager.swift pulseback-app/Pulseback/PortDiscovery.swift
git commit -m "feat: add server, theme, pfctl managers and port discovery"
```

---

## Chunk 2: Views & App Entry Point

### Task 4: View Components

**Files:**
- Create: `pulseback-app/Pulseback/Views/LogoView.swift`
- Create: `pulseback-app/Pulseback/Views/StatsRowView.swift`
- Create: `pulseback-app/Pulseback/Views/DeviceCardView.swift`

- [ ] **Step 1: Create LogoView.swift**

Era-adaptive logo that changes treatment based on the current theme's logoStyle.

```swift
import SwiftUI

struct LogoView: View {
    let theme: EraTheme

    var body: some View {
        switch theme.logoStyle {
        case .script:
            Text("Pulseback")
                .font(.custom("Georgia", size: 18))
                .italic()
                .foregroundColor(.white)
                .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .serifBold:
            Text("PULSEBACK")
                .font(.custom("Georgia", size: 17).bold())
                .foregroundColor(.white)
                .tracking(1)
                .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .kBox:
            HStack(spacing: 8) {
                Text("P")
                    .font(.system(size: 16, weight: .black))
                    .foregroundColor(theme.primary)
                    .frame(width: 26, height: 26)
                    .background(Color.white.opacity(0.9))
                    .cornerRadius(3)

                Text("PULSEBACK")
                    .font(.custom("Georgia", size: 16).bold())
                    .foregroundColor(.white)
                    .tracking(1)
            }
            .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .sansBold:
            Text("PULSEBACK")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .tracking(2)
                .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .lowercase:
            Text("pulseback")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.white)
                .tracking(1)
        }
    }
}
```

- [ ] **Step 2: Create StatsRowView.swift**

```swift
import SwiftUI

struct StatsRowView: View {
    let theme: EraTheme
    let isRunning: Bool
    let connectedDevices: Int
    let photoCount: Int
    let uptime: String

    var body: some View {
        HStack(spacing: 0) {
            StatCell(theme: theme, value: isRunning ? "●" : "●",
                     valueColor: isRunning ? Color(hex: "4ADE80") : theme.danger,
                     label: "SERVER")
            Divider().background(theme.sidebarText.opacity(0.1))
            StatCell(theme: theme, value: "\(connectedDevices)",
                     valueColor: theme.secondary, label: "FRAMES")
            Divider().background(theme.sidebarText.opacity(0.1))
            StatCell(theme: theme, value: "\(photoCount)",
                     valueColor: theme.secondary, label: "PHOTOS")
            Divider().background(theme.sidebarText.opacity(0.1))
            StatCell(theme: theme, value: uptime,
                     valueColor: theme.secondary, label: "UPTIME")
        }
        .frame(height: 56)
        .background(theme.sidebarBg.opacity(0.8))
    }
}

private struct StatCell: View {
    let theme: EraTheme
    let value: String
    let valueColor: Color
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(theme.headingFont)
                .foregroundColor(valueColor)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .tracking(0.5)
                .foregroundColor(theme.sidebarText.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
    }
}
```

- [ ] **Step 3: Create DeviceCardView.swift**

```swift
import SwiftUI

struct DeviceCardView: View {
    let device: Device
    let theme: EraTheme

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(device.name)
                    .font(theme.headingFont.weight(.semibold))
                    .font(.system(size: 13))
                    .foregroundColor(theme.sidebarText)
                Text("Last seen: \(device.lastSeenFormatted)")
                    .font(.system(size: 11))
                    .foregroundColor(theme.sidebarText.opacity(0.4))
            }
            Spacer()
            Circle()
                .fill(device.isOnline ? Color(hex: "4ADE80") : Color.gray)
                .frame(width: 8, height: 8)
                .shadow(color: device.isOnline ? Color(hex: "4ADE80").opacity(0.4) : .clear, radius: 4)
        }
        .padding(12)
        .background(theme.sidebarText.opacity(0.06))
        .cornerRadius(theme.cornerRadius)
        .overlay(
            RoundedRectangle(cornerRadius: theme.cornerRadius)
                .stroke(theme.sidebarText.opacity(0.05), lineWidth: 1)
        )
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add pulseback-app/Pulseback/Views/LogoView.swift pulseback-app/Pulseback/Views/StatsRowView.swift pulseback-app/Pulseback/Views/DeviceCardView.swift
git commit -m "feat: add logo, stats row, and device card view components"
```

---

### Task 5: StatusView (Main Dashboard Window)

**Files:**
- Create: `pulseback-app/Pulseback/Views/StatusView.swift`

- [ ] **Step 1: Create StatusView.swift**

The main dashboard window — Style B from the mockups. Era-themed gradient header, stats row, device cards, action buttons.

```swift
import SwiftUI

struct StatusView: View {
    @EnvironmentObject var serverManager: ServerManager
    @EnvironmentObject var themeManager: ThemeManager
    @State private var showingWizard = false

    var theme: EraTheme { themeManager.theme }

    var body: some View {
        VStack(spacing: 0) {
            // Header with gradient and logo
            VStack(alignment: .leading, spacing: 4) {
                LogoView(theme: theme)
                Text(theme.tagline)
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.7))
                    .italic()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
            .padding(.vertical, 18)
            .background(
                LinearGradient(
                    colors: [theme.gradientStart, theme.accent, theme.gradientEnd],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )

            // Stats row
            StatsRowView(
                theme: theme,
                isRunning: serverManager.isRunning,
                connectedDevices: serverManager.status?.connectedDevices ?? 0,
                photoCount: serverManager.photoCount,
                uptime: serverManager.status?.formattedUptime ?? "—"
            )

            // Device cards
            VStack(spacing: 8) {
                if serverManager.devices.isEmpty {
                    Text("No frames connected")
                        .font(.system(size: 12))
                        .foregroundColor(theme.sidebarText.opacity(0.4))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                } else {
                    ForEach(serverManager.devices) { device in
                        DeviceCardView(device: device, theme: theme)
                    }
                }
            }
            .padding(16)

            // Error message
            if let error = serverManager.errorMessage {
                Text(error)
                    .font(.system(size: 11))
                    .foregroundColor(theme.danger)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
            }

            Spacer(minLength: 0)

            // Action buttons
            HStack(spacing: 8) {
                Button(action: openAdmin) {
                    Text("Open Admin")
                        .font(.system(size: 13, weight: .semibold))
                        .frame(maxWidth: .infinity, minHeight: 38)
                }
                .buttonStyle(.plain)
                .background(theme.primary)
                .foregroundColor(.white)
                .cornerRadius(theme.cornerRadius)

                Button(action: { showingWizard = true }) {
                    Text("Configure Frame")
                        .font(.system(size: 13))
                        .frame(maxWidth: .infinity, minHeight: 38)
                }
                .buttonStyle(.plain)
                .background(theme.sidebarText.opacity(0.08))
                .foregroundColor(theme.sidebarText)
                .cornerRadius(theme.cornerRadius)
                .overlay(
                    RoundedRectangle(cornerRadius: theme.cornerRadius)
                        .stroke(theme.sidebarText.opacity(0.1), lineWidth: 1)
                )
            }
            .padding(16)
        }
        .background(theme.sidebarBg)
        .frame(width: 400, minHeight: 350)
        .sheet(isPresented: $showingWizard) {
            SetupWizardView()
                .environmentObject(serverManager)
                .environmentObject(themeManager)
        }
    }

    private func openAdmin() {
        let port = serverManager.port
        if let url = URL(string: "http://localhost:\(port)") {
            NSWorkspace.shared.open(url)
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add pulseback-app/Pulseback/Views/StatusView.swift
git commit -m "feat: add main dashboard status view"
```

---

### Task 6: SetupWizardView

**Files:**
- Create: `pulseback-app/Pulseback/Views/SetupWizardView.swift`

- [ ] **Step 1: Create SetupWizardView.swift**

5-step frame configuration wizard presented as a sheet.

```swift
import SwiftUI

struct SetupWizardView: View {
    @EnvironmentObject var serverManager: ServerManager
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.dismiss) private var dismiss
    @State private var step = 1
    @State private var detectedDevice: Device?
    @State private var pollTimer: Timer?

    private var theme: EraTheme { themeManager.theme }

    private var ipAddress: String {
        // Get local IP
        var address = "Unknown"
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let firstAddr = ifaddr else { return address }
        defer { freeifaddrs(ifaddr) }
        for ptr in sequence(first: firstAddr, next: { $0.pointee.ifa_next }) {
            let interface = ptr.pointee
            let addrFamily = interface.ifa_addr.pointee.sa_family
            if addrFamily == UInt8(AF_INET) {
                let name = String(cString: interface.ifa_name)
                if name == "en0" || name == "en1" {
                    var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                    getnameinfo(interface.ifa_addr, socklen_t(interface.ifa_addr.pointee.sa_len),
                               &hostname, socklen_t(hostname.count), nil, 0, NI_NUMERICHOST)
                    address = String(cString: hostname)
                    break
                }
            }
        }
        return address
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Configure Your Frame")
                    .font(theme.headingFont)
                    .foregroundColor(theme.text)
                Spacer()
                Text("Step \(step) of 5")
                    .font(.system(size: 12))
                    .foregroundColor(theme.textMuted)
            }
            .padding(20)
            .background(theme.cardBg)

            Divider()

            // Content
            Group {
                switch step {
                case 1: step1View
                case 2: step2View
                case 3: step3View
                case 4: step4View
                case 5: step5View
                default: EmptyView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(theme.background)

            Divider()

            // Navigation
            HStack {
                if step > 1 && step < 5 {
                    Button("Back") { step -= 1 }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                }
                Spacer()
                if step < 4 {
                    Button("Next") { step += 1 }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(theme.primary)
                        .foregroundColor(.white)
                        .cornerRadius(theme.cornerRadius)
                }
                if step == 5 {
                    Button("Done") { dismiss() }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(theme.primary)
                        .foregroundColor(.white)
                        .cornerRadius(theme.cornerRadius)
                }
            }
            .padding(16)
            .background(theme.cardBg)
        }
        .frame(width: 500, height: 400)
        .onDisappear { pollTimer?.invalidate() }
    }

    private var step1View: some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.router")
                .font(.system(size: 48))
                .foregroundColor(theme.primary)

            Text("Let's connect your frame")
                .font(theme.headingFont)
                .foregroundColor(theme.text)

            Text("Your Mac's IP address is:")
                .font(theme.bodyFont)
                .foregroundColor(theme.textMuted)

            Text(ipAddress)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundColor(theme.primary)
                .padding(12)
                .background(theme.cardBg)
                .cornerRadius(theme.cornerRadius)

            Text("You'll enter this on your Kodak Pulse frame in the next steps.")
                .font(.system(size: 12))
                .foregroundColor(theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(32)
    }

    private var step2View: some View {
        VStack(spacing: 16) {
            // Placeholder for frame photo
            RoundedRectangle(cornerRadius: 8)
                .fill(theme.textMuted.opacity(0.1))
                .frame(height: 160)
                .overlay(
                    VStack {
                        Image(systemName: "photo")
                            .font(.system(size: 32))
                            .foregroundColor(theme.textMuted.opacity(0.3))
                        Text("Frame WiFi settings photo")
                            .font(.system(size: 11))
                            .foregroundColor(theme.textMuted.opacity(0.3))
                    }
                )

            Text("Connect to WiFi")
                .font(theme.headingFont)
                .foregroundColor(theme.text)

            Text("Turn on your Kodak Pulse frame and navigate to the WiFi settings. Connect to the same WiFi network as this Mac.")
                .font(theme.bodyFont)
                .foregroundColor(theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .padding(32)
    }

    private var step3View: some View {
        VStack(spacing: 16) {
            // Placeholder for DNS settings photo
            RoundedRectangle(cornerRadius: 8)
                .fill(theme.textMuted.opacity(0.1))
                .frame(height: 160)
                .overlay(
                    VStack {
                        Image(systemName: "photo")
                            .font(.system(size: 32))
                            .foregroundColor(theme.textMuted.opacity(0.3))
                        Text("Frame DNS settings photo")
                            .font(.system(size: 11))
                            .foregroundColor(theme.textMuted.opacity(0.3))
                    }
                )

            Text("Set DNS Server")
                .font(theme.headingFont)
                .foregroundColor(theme.text)

            Text("In the WiFi settings, tap 'Advanced'. Set the DNS server to:")
                .font(theme.bodyFont)
                .foregroundColor(theme.textMuted)
                .multilineTextAlignment(.center)

            Text(ipAddress)
                .font(.system(size: 22, weight: .bold, design: .monospaced))
                .foregroundColor(theme.primary)
        }
        .padding(32)
    }

    private var step4View: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
                .padding()

            Text("Waiting for connection...")
                .font(theme.headingFont)
                .foregroundColor(theme.text)

            Text("Your frame should connect automatically. This may take up to a minute.")
                .font(theme.bodyFont)
                .foregroundColor(theme.textMuted)
                .multilineTextAlignment(.center)

            if detectedDevice != nil {
                // Auto-advance handled in onAppear
            }

            DisclosureGroup("It's not connecting") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("• Make sure the frame and Mac are on the same WiFi network")
                    Text("• Verify the DNS server is set to \(ipAddress)")
                    Text("• Try restarting the frame")
                    Text("• Check that the Pulseback server is running (green dot above)")
                }
                .font(.system(size: 11))
                .foregroundColor(theme.textMuted)
            }
            .padding(.top, 16)
        }
        .padding(32)
        .onAppear { startPolling() }
        .onDisappear { pollTimer?.invalidate() }
    }

    private var step5View: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(Color(hex: "4ADE80"))

            Text("Connected!")
                .font(theme.headingFont)
                .foregroundColor(theme.text)

            if let device = detectedDevice {
                Text(device.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(theme.text)
                Text("Device ID: \(device.deviceID)")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(theme.textMuted)
            }

            Button("Open Admin to Add Photos") {
                let port = serverManager.port
                if let url = URL(string: "http://localhost:\(port)") {
                    NSWorkspace.shared.open(url)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(theme.primary)
            .foregroundColor(.white)
            .cornerRadius(theme.cornerRadius)
        }
        .padding(32)
    }

    private func startPolling() {
        let initialCount = serverManager.devices.count
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
            Task { @MainActor in
                if serverManager.devices.count > initialCount {
                    detectedDevice = serverManager.devices.last
                    pollTimer?.invalidate()
                    step = 5
                }
            }
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add pulseback-app/Pulseback/Views/SetupWizardView.swift
git commit -m "feat: add frame configuration wizard (5-step)"
```

---

### Task 7: MenuBarView & App Entry Point

**Files:**
- Create: `pulseback-app/Pulseback/Views/MenuBarView.swift`
- Create: `pulseback-app/Pulseback/PulsebackApp.swift`

- [ ] **Step 1: Create MenuBarView.swift**

```swift
import SwiftUI

struct MenuBarView: View {
    @EnvironmentObject var serverManager: ServerManager

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Status line with device count is handled by the Menu in PulsebackApp
        }
    }
}
```

- [ ] **Step 2: Create PulsebackApp.swift**

```swift
import SwiftUI
import os

@main
struct PulsebackApp: App {
    @StateObject private var serverManager = ServerManager()
    @StateObject private var themeManager = ThemeManager()
    @State private var showingPfctlSetup = false
    @State private var pfctlSetupComplete = false

    private let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "app")

    var body: some Scene {
        // Main window
        Window("Pulseback", id: "main") {
            StatusView()
                .environmentObject(serverManager)
                .environmentObject(themeManager)
                .onAppear {
                    startApp()
                }
                .alert("Network Setup Required", isPresented: $showingPfctlSetup) {
                    Button("Set Up") {
                        Task {
                            let success = await PfctlManager.setup()
                            pfctlSetupComplete = success
                            if success {
                                serverManager.start()
                            }
                        }
                    }
                    Button("Skip", role: .cancel) {
                        serverManager.start()
                    }
                } message: {
                    Text("Pulseback needs to set up network routing so your Kodak Pulse frame can connect. This is a one-time setup that requires your admin password.")
                }
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
        .defaultPosition(.center)

        // Menu bar extra
        MenuBarExtra {
            let deviceCount = serverManager.status?.connectedDevices ?? 0

            Text(menuBarStatusText(deviceCount: deviceCount))
                .font(.system(size: 12))

            Divider()

            Button("Show Window") {
                NSApp.activate(ignoringOtherApps: true)
                if let window = NSApp.windows.first(where: { $0.title == "Pulseback" || $0.identifier?.rawValue == "main" }) {
                    window.makeKeyAndOrderFront(nil)
                } else {
                    NSApp.sendAction(#selector(NSApplication.showWindow(_:)), to: nil, from: nil)
                }
            }

            Button("Open Admin") {
                if let url = URL(string: "http://localhost:\(serverManager.port)") {
                    NSWorkspace.shared.open(url)
                }
            }

            Divider()

            if serverManager.isRunning {
                Button("Stop Server") { serverManager.stop() }
            } else {
                Button("Start Server") { serverManager.start() }
            }

            Divider()

            Button("Quit Pulseback") {
                serverManager.stop()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    NSApplication.shared.terminate(nil)
                }
            }
        } label: {
            Image(systemName: "p.circle.fill")
                .symbolRenderingMode(.hierarchical)
        }
    }

    private func startApp() {
        logger.info("Pulseback launching")

        // Check pfctl
        if !PfctlManager.isConfigured {
            showingPfctlSetup = true
        } else {
            serverManager.start()
        }

        // Start era sync polling
        Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            Task { @MainActor in
                await themeManager.fetchEra(port: serverManager.port)
            }
        }
    }

    private func menuBarStatusText(deviceCount: Int) -> String {
        let serverStatus = serverManager.isRunning ? "Server Running" : "Server Stopped"
        let deviceText: String
        switch deviceCount {
        case 0: deviceText = "No frames connected"
        case 1: deviceText = "1 frame connected"
        default: deviceText = "\(deviceCount) frames connected"
        }
        return serverManager.isRunning ? "● \(serverStatus) — \(deviceText)" : "○ \(serverStatus)"
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add pulseback-app/Pulseback/Views/MenuBarView.swift pulseback-app/Pulseback/PulsebackApp.swift
git commit -m "feat: add app entry point with menu bar extra and pfctl setup"
```

---

### Task 8: App Icon & Asset Catalog

**Files:**
- Create: `pulseback-app/Pulseback/Resources/Assets.xcassets/Contents.json`
- Create: `pulseback-app/Pulseback/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json`
- Create: SVG icon and generate PNG sizes

- [ ] **Step 1: Create asset catalog structure**

```bash
mkdir -p pulseback-app/Pulseback/Resources/Assets.xcassets/AppIcon.appiconset
```

- [ ] **Step 2: Create Assets.xcassets/Contents.json**

```json
{
  "info": {
    "version": 1,
    "author": "xcode"
  }
}
```

- [ ] **Step 3: Create AppIcon.appiconset/Contents.json**

For macOS, we need 16, 32, 64, 128, 256, 512, 1024 at 1x and 2x:

```json
{
  "images": [
    { "size": "16x16", "scale": "1x", "idiom": "mac", "filename": "icon_16.png" },
    { "size": "16x16", "scale": "2x", "idiom": "mac", "filename": "icon_32.png" },
    { "size": "32x32", "scale": "1x", "idiom": "mac", "filename": "icon_32.png" },
    { "size": "32x32", "scale": "2x", "idiom": "mac", "filename": "icon_64.png" },
    { "size": "128x128", "scale": "1x", "idiom": "mac", "filename": "icon_128.png" },
    { "size": "128x128", "scale": "2x", "idiom": "mac", "filename": "icon_256.png" },
    { "size": "256x256", "scale": "1x", "idiom": "mac", "filename": "icon_256.png" },
    { "size": "256x256", "scale": "2x", "idiom": "mac", "filename": "icon_512.png" },
    { "size": "512x512", "scale": "1x", "idiom": "mac", "filename": "icon_512.png" },
    { "size": "512x512", "scale": "2x", "idiom": "mac", "filename": "icon_1024.png" }
  ],
  "info": {
    "version": 1,
    "author": "xcode"
  }
}
```

- [ ] **Step 4: Generate icon PNGs using sharp (from the server project)**

Create a script that generates the Pulseback icon — yellow (#FAB617) rounded square with a white "P" and a subtle pulse line. Use the server project's sharp dependency to generate PNGs at all required sizes.

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server
node -e "
const sharp = require('sharp');
const sizes = [16, 32, 64, 128, 256, 512, 1024];

async function generateIcon(size) {
  const padding = Math.round(size * 0.1);
  const fontSize = Math.round(size * 0.55);
  const pulseY = Math.round(size * 0.72);
  const pulseHeight = Math.round(size * 0.04);

  const svg = \`<svg xmlns='http://www.w3.org/2000/svg' width='\${size}' height='\${size}'>
    <rect width='\${size}' height='\${size}' rx='\${Math.round(size * 0.22)}' fill='#FAB617'/>
    <text x='50%' y='58%' text-anchor='middle' dominant-baseline='central'
          font-family='Georgia, serif' font-weight='bold' font-size='\${fontSize}'
          fill='white' opacity='0.95'>P</text>
    <path d='M \${padding} \${pulseY}
             L \${size*0.35} \${pulseY}
             L \${size*0.42} \${pulseY - size*0.12}
             L \${size*0.50} \${pulseY + size*0.08}
             L \${size*0.58} \${pulseY - size*0.06}
             L \${size*0.65} \${pulseY}
             L \${size-padding} \${pulseY}'
          stroke='white' stroke-width='\${Math.max(1, Math.round(size*0.02))}' fill='none' opacity='0.6'
          stroke-linecap='round' stroke-linejoin='round'/>
  </svg>\`;

  await sharp(Buffer.from(svg)).png().toFile(
    'pulseback-app/Pulseback/Resources/Assets.xcassets/AppIcon.appiconset/icon_' + size + '.png'
  );
  console.log('Generated icon_' + size + '.png');
}

Promise.all(sizes.map(generateIcon)).then(() => console.log('Done'));
"
```

- [ ] **Step 5: Commit**

```bash
git add pulseback-app/Pulseback/Resources/
git commit -m "feat: add app icon with Kodak-yellow P + pulse motif"
```

---

### Task 9: Generate Xcode Project & Verify Build

- [ ] **Step 1: Generate Xcode project**

```bash
cd pulseback-app && xcodegen generate
```

- [ ] **Step 2: Build the project**

```bash
xcodebuild -project Pulseback.xcodeproj -scheme Pulseback -configuration Debug build 2>&1 | tail -20
```

Fix any compilation errors.

- [ ] **Step 3: Add generated project to gitignore or commit**

The `.xcodeproj` is generated by xcodegen, so it can be regenerated. Add to `.gitignore`:

```
pulseback-app/Pulseback.xcodeproj/
```

Or commit it for convenience. User preference — commit it so people don't need xcodegen installed.

- [ ] **Step 4: Final commit**

```bash
git add pulseback-app/
git commit -m "feat: Pulseback Mac app v1.0 — complete SwiftUI wrapper"
```
