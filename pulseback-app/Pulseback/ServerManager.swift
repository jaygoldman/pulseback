import Foundation
import os

@MainActor
class ServerManager: ObservableObject {
    @Published var isRunning = false
    @Published var status: ServerStatus?
    @Published var devices: [Device] = []
    @Published var photoCount: Int = 0
    @Published var errorMessage: String?

    private(set) var process: Process?
    private var healthTimer: Timer?
    private var restartCount = 0
    private let maxRestarts = 3
    private let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "server")

    var port: Int { PortDiscovery.discoverPort() }

    func start() {
        guard !isRunning else { return }
        errorMessage = nil
        restartCount = 0

        let nodePath = findNode()
        guard let nodePath else {
            errorMessage = "Node.js not found. Install Node.js or ensure it's in your PATH."
            logger.error("Node.js not found")
            return
        }

        let serverDir = findServerDir()
        guard let serverDir else {
            errorMessage = "Server files not found. Run 'npm run build' in the project root."
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
        proc.environment?["PULSEBACK_MANAGED"] = "1"

        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        proc.standardOutput = stdoutPipe
        proc.standardError = stderrPipe

        stdoutPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let line = String(data: data, encoding: .utf8) else { return }
            self?.logger.info("server: \(line)")
        }
        stderrPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let line = String(data: data, encoding: .utf8) else { return }
            self?.logger.warning("server(err): \(line)")
        }

        proc.terminationHandler = { [weak self] process in
            Task { @MainActor in
                self?.handleTermination(exitCode: process.terminationStatus)
            }
        }

        do {
            try proc.run()
            self.process = proc
            self.isRunning = true
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
        // Don't auto-restart after an intentional stop
        restartCount = maxRestarts

        guard let proc = process, proc.isRunning else {
            isRunning = false
            process = nil
            return
        }

        let pid = proc.processIdentifier

        // Clean up pipe handlers
        (proc.standardOutput as? Pipe)?.fileHandleForReading.readabilityHandler = nil
        (proc.standardError as? Pipe)?.fileHandleForReading.readabilityHandler = nil

        // Kill the entire process group so child processes are cleaned up too
        logger.info("Stopping server process group (PID: \(pid))")
        kill(-pid, SIGTERM)

        // Wait up to 3 seconds, then force kill
        DispatchQueue.global().async { [weak self] in
            let deadline = Date().addingTimeInterval(3)
            while proc.isRunning && Date() < deadline {
                Thread.sleep(forTimeInterval: 0.1)
            }
            if proc.isRunning {
                self?.logger.warning("Server did not stop gracefully, sending SIGKILL")
                kill(-pid, SIGKILL)
                proc.waitUntilExit()
            }
            Task { @MainActor in
                self?.isRunning = false
                self?.process = nil
                self?.logger.info("Server stopped")
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
        let fm = FileManager.default

        // 1. Dev path first: walk up from source file to find project root with node_modules
        let devPath = URL(fileURLWithPath: #filePath)  // .../pulseback-app/Pulseback/ServerManager.swift
            .deletingLastPathComponent()               // .../pulseback-app/Pulseback/
            .deletingLastPathComponent()               // .../pulseback-app/
            .deletingLastPathComponent()               // .../pulseback/ (project root)

        if fm.fileExists(atPath: devPath.appendingPathComponent("dist/server.js").path) &&
           fm.fileExists(atPath: devPath.appendingPathComponent("node_modules").path) {
            logger.info("Using dev server: \(devPath.path)")
            return devPath
        }

        // 2. App bundle (for production builds with bundled server + node_modules)
        if let serverPath = Bundle.main.resourceURL?.appendingPathComponent("server") {
            if fm.fileExists(atPath: serverPath.appendingPathComponent("dist/server.js").path) &&
               fm.fileExists(atPath: serverPath.appendingPathComponent("node_modules").path) {
                logger.info("Using bundled server: \(serverPath.path)")
                return serverPath
            }
        }

        logger.error("Could not find dist/server.js + node_modules in any expected location")
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
