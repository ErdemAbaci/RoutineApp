import SwiftUI

@main
struct RoutineAppApp: App {
    @AppStorage("appTheme") private var appTheme = AppTheme.system.rawValue

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .preferredColorScheme(AppTheme(rawValue: appTheme)?.colorScheme)
        }
    }
}
