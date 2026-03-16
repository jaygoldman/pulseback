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
        return serverManager.isRunning ? "\u{25CF} \(serverStatus) \u{2014} \(deviceText)" : "\u{25CB} \(serverStatus)"
    }
}
