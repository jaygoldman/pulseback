import SwiftUI

struct MenuBarView: View {
    @EnvironmentObject var serverManager: ServerManager

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Status line with device count is handled by the Menu in PulsebackApp
        }
    }
}
