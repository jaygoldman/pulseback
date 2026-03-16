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
