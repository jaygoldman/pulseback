import SwiftUI
import os

@main
struct PulsebackApp: App {
    @StateObject private var serverManager = ServerManager()
    @StateObject private var themeManager = ThemeManager()

    private let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "app")

    var body: some Scene {
        // Main window
        Window("Pulseback", id: "main") {
            StatusView()
                .environmentObject(serverManager)
                .environmentObject(themeManager)
                .task {
                    // Auto-start server on first appearance
                    if !serverManager.isRunning && serverManager.errorMessage == nil {
                        serverManager.start()
                    }
                    // Era sync polling
                    while !Task.isCancelled {
                        try? await Task.sleep(nanoseconds: 5_000_000_000)
                        if serverManager.isRunning {
                            await themeManager.fetchEra(port: serverManager.port)
                        }
                    }
                }
        }
        .windowResizability(.contentSize)
        .defaultPosition(.center)

        // Menu bar extra
        MenuBarExtra {
            Text(menuBarStatusText)
                .font(.system(size: 12))

            Divider()

            Button("Show Window") {
                showMainWindow()
            }

            Button("Open Admin") {
                if let url = URL(string: "http://localhost:\(serverManager.port)") {
                    NSWorkspace.shared.open(url)
                }
            }

            Divider()

            Button(serverManager.isRunning ? "Stop Server" : "Start Server") {
                if serverManager.isRunning {
                    serverManager.stop()
                } else {
                    serverManager.start()
                }
            }

            Divider()

            Button("Quit Pulseback") {
                serverManager.stop()
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    NSApplication.shared.terminate(nil)
                }
            }
        } label: {
            Image("MenuBarIcon")
                .renderingMode(.template)
        }
    }

    private func showMainWindow() {
        NSApp.activate(ignoringOtherApps: true)
        for window in NSApp.windows {
            if window.title == "Pulseback" || window.identifier?.rawValue == "main" {
                window.makeKeyAndOrderFront(nil)
                return
            }
        }
    }

    private var menuBarStatusText: String {
        let deviceCount = serverManager.devices.count
        if serverManager.isRunning {
            let deviceText: String
            switch deviceCount {
            case 0: deviceText = "No frames connected"
            case 1: deviceText = "1 frame connected"
            default: deviceText = "\(deviceCount) frames connected"
            }
            return "\u{25CF} Server Running \u{2014} \(deviceText)"
        } else {
            return "\u{25CB} Server Stopped"
        }
    }
}
