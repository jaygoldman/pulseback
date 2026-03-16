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
