import SwiftUI

struct DeviceCardView: View {
    let device: Device
    let theme: EraTheme

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(device.name)
                    .font(.system(size: 13, weight: .semibold))
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
