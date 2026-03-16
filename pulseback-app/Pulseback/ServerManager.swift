import Foundation
import os

@MainActor
class ServerManager: ObservableObject {
    @Published var isRunning = false
    @Published var status: ServerStatus?
    @Published var devices: [Device] = []
    @Published var photoCount: Int = 0
    @Published var errorMessage: String?

    private var process: Process?
    private var healthTimer: Timer?
    private var restartCount = 0
    private let maxRestarts = 3
    private let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "server")

    var port: Int { PortDiscovery.discoverPort() }

    func start() {
        guard !isRunning else { return }
        errorMessage = nil

        let nodePath = findNode()
        guard let nodePath else {
            errorMessage = "Node.js not found. Install Node.js or ensure it's in your PATH."
            logger.error("Node.js not found")
            return
        }

        let serverDir = findServerDir()
        guard let serverDir else {
            errorMessage = "Server files not found in app bundle."
            logger.error("Server directory not found")
            return
        }

        let dataDir = ensureDataDir()

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: nodePath)
        proc.arguments = [serverDir.appendingPathComponent("dist/server.js").path]
        proc.currentDirectoryURL = serverDir
        proc.environment = ProcessInfo.processInfo.environment
        proc.environment?["KPS_DATA_DIR"] = dataDir.path

        // Pipe stdout/stderr to logs
        let pipe = Pipe()
        proc.standardOutput = pipe
        proc.standardError = pipe

        proc.terminationHandler = { [weak self] process in
            Task { @MainActor in
                self?.handleTermination(exitCode: process.terminationStatus)
            }
        }

        do {
            try proc.run()
            self.process = proc
            self.isRunning = true
            self.restartCount = 0
            logger.info("Server started (PID: \(proc.processIdentifier))")
            startHealthPolling()
        } catch {
            errorMessage = "Failed to start server: \(error.localizedDescription)"
            logger.error("Failed to start server: \(error.localizedDescription)")
        }
    }

    func stop() {
        healthTimer?.invalidate()
        healthTimer = nil

        guard let proc = process, proc.isRunning else {
            isRunning = false
            return
        }

        logger.info("Stopping server (SIGTERM)")
        proc.terminate()  // Sends SIGTERM

        // Wait up to 5 seconds, then SIGINT
        DispatchQueue.global().asyncAfter(deadline: .now() + 5) { [weak self] in
            if proc.isRunning {
                proc.interrupt()  // SIGINT as fallback
                self?.logger.warning("Server did not stop gracefully, sending SIGINT")
            }
        }
    }

    // MARK: - Private

    private func findNode() -> String? {
        // Check common paths plus PATH
        let commonPaths = [
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node",
        ]
        for path in commonPaths {
            if FileManager.default.isExecutableFile(atPath: path) {
                logger.info("Using Node.js: \(path)")
                return path
            }
        }
        let pathDirs = (ProcessInfo.processInfo.environment["PATH"] ?? "")
            .split(separator: ":").map(String.init)
        for dir in pathDirs {
            let nodePath = "\(dir)/node"
            if FileManager.default.isExecutableFile(atPath: nodePath) {
                logger.info("Using system Node.js: \(nodePath)")
                return nodePath
            }
        }
        // Fall back to bundled Node
        if let bundled = Bundle.main.path(forResource: "node", ofType: nil) {
            logger.info("Using bundled Node.js: \(bundled)")
            return bundled
        }
        return nil
    }

    private func findServerDir() -> URL? {
        if let serverPath = Bundle.main.resourceURL?.appendingPathComponent("server") {
            if FileManager.default.fileExists(atPath: serverPath.appendingPathComponent("dist/server.js").path) {
                return serverPath
            }
        }
        // Dev fallback: look for server in parent directory
        let devPath = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        if FileManager.default.fileExists(atPath: devPath.appendingPathComponent("dist/server.js").path) {
            return devPath
        }
        return nil
    }

    private func ensureDataDir() -> URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dataDir = appSupport.appendingPathComponent("Pulseback")
        try? FileManager.default.createDirectory(at: dataDir, withIntermediateDirectories: true)
        return dataDir
    }

    private func handleTermination(exitCode: Int32) {
        isRunning = false
        process = nil
        status = nil

        if exitCode != 0 && restartCount < maxRestarts {
            restartCount += 1
            logger.warning("Server crashed (exit \(exitCode)), restarting (\(self.restartCount)/\(self.maxRestarts))")
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                self?.start()
            }
        } else if exitCode != 0 {
            errorMessage = "Server crashed \(maxRestarts) times. Check logs for details."
            logger.error("Server exceeded max restarts")
        } else {
            logger.info("Server stopped normally")
        }
    }

    private func startHealthPolling() {
        healthTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.pollHealth()
            }
        }
        // Initial poll after 2 seconds (give server time to start)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            Task { @MainActor in
                await self?.pollHealth()
            }
        }
    }

    private func pollHealth() async {
        guard let url = URL(string: "http://localhost:\(port)/health") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let health = try JSONDecoder().decode(ServerStatus.self, from: data)
            self.status = health
        } catch {
            // Server may still be starting
        }

        // Also fetch device list
        await fetchDevices()
        await fetchPhotoCount()
    }

    private func fetchDevices() async {
        guard let url = URL(string: "http://localhost:\(port)/api/devices") else { return }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                self.devices = try JSONDecoder().decode([Device].self, from: data)
            }
        } catch {}
    }

    private func fetchPhotoCount() async {
        guard let url = URL(string: "http://localhost:\(port)/api/photos") else { return }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                // Decode as array of generic JSON objects to just get the count
                if let jsonArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    self.photoCount = jsonArray.count
                }
            }
        } catch {}
    }
}
