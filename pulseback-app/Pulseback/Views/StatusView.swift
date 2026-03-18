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
                uptime: serverManager.status?.formattedUptime ?? "\u{2014}"
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
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Button(action: toggleServer) {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(serverManager.isRunning ? Color(hex: "4ADE80") : theme.danger)
                                .frame(width: 8, height: 8)
                            Text(serverManager.isRunning ? "Stop Server" : "Start Server")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity, minHeight: 38)
                    }
                    .buttonStyle(.plain)
                    .background(serverManager.isRunning ? theme.sidebarText.opacity(0.08) : theme.primary)
                    .foregroundColor(serverManager.isRunning ? theme.sidebarText : .white)
                    .cornerRadius(theme.cornerRadius)
                    .overlay(
                        RoundedRectangle(cornerRadius: theme.cornerRadius)
                            .stroke(theme.sidebarText.opacity(0.1), lineWidth: serverManager.isRunning ? 1 : 0)
                    )

                    Button(action: openAdmin) {
                        Text("Open Admin")
                            .font(.system(size: 13, weight: .semibold))
                            .frame(maxWidth: .infinity, minHeight: 38)
                    }
                    .buttonStyle(.plain)
                    .background(theme.primary)
                    .foregroundColor(.white)
                    .cornerRadius(theme.cornerRadius)
                    .opacity(serverManager.isRunning ? 1 : 0.5)
                    .disabled(!serverManager.isRunning)
                }

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
        .frame(width: 400)
        .frame(minHeight: 350)
        .sheet(isPresented: $showingWizard) {
            SetupWizardView()
                .environmentObject(serverManager)
                .environmentObject(themeManager)
        }
    }

    private func toggleServer() {
        if serverManager.isRunning {
            serverManager.stop()
        } else {
            serverManager.start()
        }
    }

    private func openAdmin() {
        let port = serverManager.port
        if let url = URL(string: "http://localhost:\(port)") {
            NSWorkspace.shared.open(url)
        }
    }
}
