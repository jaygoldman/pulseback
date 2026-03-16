import SwiftUI
import Darwin

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
                    Text("\u{2022} Make sure the frame and Mac are on the same WiFi network")
                    Text("\u{2022} Verify the DNS server is set to \(ipAddress)")
                    Text("\u{2022} Try restarting the frame")
                    Text("\u{2022} Check that the Pulseback server is running (green dot above)")
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
