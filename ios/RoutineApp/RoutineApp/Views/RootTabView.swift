import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.line.uptrend.xyaxis")
                }

            TodayView()
                .tabItem {
                    Label("Today", systemImage: "checklist")
                }

            InsightsView()
                .tabItem {
                    Label("Insights", systemImage: "lightbulb")
                }

            TemplatesView()
                .tabItem {
                    Label("Templates", systemImage: "square.grid.2x2")
                }

            RoutinesView()
                .tabItem {
                    Label("Routines", systemImage: "list.bullet")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .tint(.teal)
    }
}
