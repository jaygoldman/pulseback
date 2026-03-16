import SwiftUI

struct LogoView: View {
    let theme: EraTheme

    var body: some View {
        switch theme.logoStyle {
        case .script:
            Text("Pulseback")
                .font(.custom("Georgia", size: 18))
                .italic()
                .foregroundColor(.white)
                .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .serifBold:
            Text("PULSEBACK")
                .font(.custom("Georgia", size: 17).bold())
                .foregroundColor(.white)
                .tracking(1)
                .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .kBox:
            HStack(spacing: 8) {
                Text("P")
                    .font(.system(size: 16, weight: .black))
                    .foregroundColor(theme.primary)
                    .frame(width: 26, height: 26)
                    .background(Color.white.opacity(0.9))
                    .cornerRadius(3)

                Text("PULSEBACK")
                    .font(.custom("Georgia", size: 16).bold())
                    .foregroundColor(.white)
                    .tracking(1)
            }
            .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .sansBold:
            Text("PULSEBACK")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .tracking(2)
                .shadow(color: .black.opacity(0.3), radius: 2, y: 2)

        case .lowercase:
            Text("pulseback")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.white)
                .tracking(1)
        }
    }
}
