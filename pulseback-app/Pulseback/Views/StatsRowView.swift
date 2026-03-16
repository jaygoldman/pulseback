import SwiftUI

struct StatsRowView: View {
    let theme: EraTheme
    let isRunning: Bool
    let connectedDevices: Int
    let photoCount: Int
    let uptime: String

    var body: some View {
        HStack(spacing: 0) {
            StatCell(theme: theme, value: isRunning ? "\u{25CF}" : "\u{25CF}",
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
