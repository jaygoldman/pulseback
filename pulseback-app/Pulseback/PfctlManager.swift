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
