import Foundation
import os

@MainActor
class ThemeManager: ObservableObject {
    @Published var currentEra: KodakEra = .era1970s

    var theme: EraTheme { EraTheme.theme(for: currentEra) }

    private let logger = Logger(subsystem: "com.jaygoldman.pulseback", category: "theme")

    func fetchEra(port: Int) async {
        guard let url = URL(string: "http://localhost:\(port)/api/preferences") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let prefs = try JSONDecoder().decode(PreferencesResponse.self, from: data)
            if let eraString = prefs.era,
               let era = KodakEra(rawValue: eraString) {
                if era != currentEra {
                    currentEra = era
                    logger.info("Era synced from server: \(eraString)")
                }
            }
        } catch {
            // Server may not be running yet — keep default
        }
    }
}
