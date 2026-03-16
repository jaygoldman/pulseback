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
