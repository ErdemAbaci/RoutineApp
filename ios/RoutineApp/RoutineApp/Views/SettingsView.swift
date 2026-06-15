import SwiftUI

struct SettingsView: View {
    @AppStorage("appTheme") private var appTheme = AppTheme.system.rawValue

    var body: some View {
        NavigationStack {
            Form {
                Section("Görünüm") {
                    Picker("Tema", selection: $appTheme) {
                        ForEach(AppTheme.allCases) { theme in
                            Label(theme.title, systemImage: theme.iconName)
                                .tag(theme.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)

                    Text("Sistem seçiliyse uygulama telefonun açık/koyu mod ayarını otomatik takip eder.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Hareket") {
                    HStack {
                        Image(systemName: "sparkles")
                            .foregroundStyle(.teal)
                        Text("Badge kutlamaları ve yumuşak geçişler açık.")
                    }

                    Text("Tema sistem modunda kalırsa açık ve koyu görünüm telefon ayarını otomatik takip eder.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
        }
    }
}
