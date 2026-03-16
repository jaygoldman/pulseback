import SwiftUI

enum KodakEra: String, CaseIterable, Identifiable {
    case era1950s = "1950s"
    case era1960s = "1960s"
    case era1970s = "1970s"
    case era1980s = "1980s"
    case era1990s = "1990s"
    case era2000s = "2000s"

    var id: String { rawValue }
}

enum LogoStyle {
    case script, serifBold, kBox, sansBold, lowercase
}

struct EraTheme {
    let era: KodakEra
    let label: String
    let tagline: String
    let primary: Color
    let secondary: Color
    let accent: Color
    let background: Color
    let cardBg: Color
    let sidebarBg: Color
    let sidebarText: Color
    let text: Color
    let textMuted: Color
    let gradientStart: Color
    let gradientEnd: Color
    let success: Color
    let danger: Color
    let headingFont: Font
    let bodyFont: Font
    let cornerRadius: CGFloat
    let logoStyle: LogoStyle

    static let defaultEra: KodakEra = .era1970s

    static func theme(for era: KodakEra) -> EraTheme {
        switch era {
        case .era1950s: return Self.fifties
        case .era1960s: return Self.sixties
        case .era1970s: return Self.seventies
        case .era1980s: return Self.eighties
        case .era1990s: return Self.nineties
        case .era2000s: return Self.twoThousands
        }
    }

    static let fifties = EraTheme(
        era: .era1950s, label: "1950s — Mid-Century Warmth", tagline: "Open Me First",
        primary: Color(hex: "C41E1E"), secondary: Color(hex: "E8B629"), accent: Color(hex: "D4913A"),
        background: Color(hex: "FDF6E3"), cardBg: Color(hex: "FFFEF7"),
        sidebarBg: Color(hex: "2C1810"), sidebarText: Color(hex: "FDF6E3"),
        text: Color(hex: "2C1810"), textMuted: Color(hex: "6B4226"),
        gradientStart: Color(hex: "C41E1E"), gradientEnd: Color(hex: "E8B629"),
        success: Color(hex: "4A7C59"), danger: Color(hex: "C41E1E"),
        headingFont: .custom("Palatino", size: 20), bodyFont: .custom("Georgia", size: 13),
        cornerRadius: 4, logoStyle: .script
    )

    static let sixties = EraTheme(
        era: .era1960s, label: "1960s — The Corner Curl", tagline: "For Colorful Memories",
        primary: Color(hex: "D32011"), secondary: Color(hex: "F5C518"), accent: Color(hex: "FF6B00"),
        background: Color(hex: "FFF9ED"), cardBg: .white,
        sidebarBg: Color(hex: "1A1A2E"), sidebarText: Color(hex: "F5C518"),
        text: Color(hex: "1A1A2E"), textMuted: Color(hex: "555577"),
        gradientStart: Color(hex: "D32011"), gradientEnd: Color(hex: "F5C518"),
        success: Color(hex: "2E8B57"), danger: Color(hex: "D32011"),
        headingFont: .system(size: 20, weight: .bold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 2, logoStyle: .serifBold
    )

    static let seventies = EraTheme(
        era: .era1970s, label: "1970s — The Iconic K", tagline: "For the Times of Your Life",
        primary: Color(hex: "E31837"), secondary: Color(hex: "FAB617"), accent: Color(hex: "DAA520"),
        background: Color(hex: "FFF8E7"), cardBg: Color(hex: "FFFEF9"),
        sidebarBg: Color(hex: "3D2B1F"), sidebarText: Color(hex: "FFF8E7"),
        text: Color(hex: "3D2B1F"), textMuted: Color(hex: "6B4226"),
        gradientStart: Color(hex: "E31837"), gradientEnd: Color(hex: "FAB617"),
        success: Color(hex: "4A7C59"), danger: Color(hex: "C0392B"),
        headingFont: .custom("Georgia", size: 20), bodyFont: .system(size: 13),
        cornerRadius: 8, logoStyle: .kBox
    )

    static let eighties = EraTheme(
        era: .era1980s, label: "1980s — True Colors", tagline: "America's Storyteller",
        primary: Color(hex: "E30613"), secondary: Color(hex: "FAB617"), accent: Color(hex: "ED8B00"),
        background: Color(hex: "F5F3EE"), cardBg: .white,
        sidebarBg: Color(hex: "1C1C1C"), sidebarText: Color(hex: "FAB617"),
        text: Color(hex: "1C1C1C"), textMuted: Color(hex: "666666"),
        gradientStart: Color(hex: "E30613"), gradientEnd: Color(hex: "FAB617"),
        success: Color(hex: "228B22"), danger: Color(hex: "E30613"),
        headingFont: .system(size: 20, weight: .bold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 4, logoStyle: .sansBold
    )

    static let nineties = EraTheme(
        era: .era1990s, label: "1990s — Take Pictures. Further.", tagline: "Take Pictures. Further.",
        primary: Color(hex: "E30613"), secondary: Color(hex: "FAB617"), accent: Color(hex: "0066CC"),
        background: Color(hex: "F0EDE6"), cardBg: .white,
        sidebarBg: Color(hex: "222222"), sidebarText: Color(hex: "EEEEEE"),
        text: Color(hex: "222222"), textMuted: Color(hex: "777777"),
        gradientStart: Color(hex: "E30613"), gradientEnd: Color(hex: "ED8B00"),
        success: Color(hex: "339966"), danger: Color(hex: "CC3333"),
        headingFont: .system(size: 20, weight: .bold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 6, logoStyle: .sansBold
    )

    static let twoThousands = EraTheme(
        era: .era2000s, label: "2000s — Share Moments. Share Life.", tagline: "Share Moments. Share Life.",
        primary: Color(hex: "E30613"), secondary: Color(hex: "A0A0A0"), accent: Color(hex: "3388CC"),
        background: Color(hex: "FAFAFA"), cardBg: .white,
        sidebarBg: Color(hex: "2C2C2C"), sidebarText: Color(hex: "E0E0E0"),
        text: Color(hex: "333333"), textMuted: Color(hex: "999999"),
        gradientStart: Color(hex: "E30613"), gradientEnd: Color(hex: "888888"),
        success: Color(hex: "33AA66"), danger: Color(hex: "DD3333"),
        headingFont: .system(size: 20, weight: .semibold, design: .default), bodyFont: .system(size: 13, design: .default),
        cornerRadius: 10, logoStyle: .lowercase
    )
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        r = Double((int >> 16) & 0xFF) / 255.0
        g = Double((int >> 8) & 0xFF) / 255.0
        b = Double(int & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
