import SwiftUI

struct InsightsView: View {
    @StateObject private var viewModel = InsightsViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.insights.isEmpty {
                    ProgressView("Öneriler yükleniyor")
                } else if viewModel.insights.isEmpty {
                    ContentUnavailableView(
                        "Henüz öneri yok",
                        systemImage: "lightbulb",
                        description: Text("Rutin geçmişin oluştukça öneriler burada görünecek.")
                    )
                } else {
                    List(viewModel.insights) { insight in
                        InsightCard(insight: insight)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Insights")
            .toolbar {
                Button {
                    Task { await viewModel.loadInsights() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
            .task {
                await viewModel.loadInsights()
            }
            .alert("Hata", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("Tamam", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}

private struct InsightCard: View {
    let insight: Insight

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(insight.title)
                    .font(.headline)
                Spacer()
                Text(insight.severity.rawValue)
                    .font(.caption.bold())
                    .foregroundStyle(severityColor)
            }

            Text(insight.message)
                .font(.body)
                .foregroundStyle(.secondary)

            Button(insight.action.label) {}
                .buttonStyle(.bordered)
        }
        .padding(.vertical, 8)
    }

    private var severityColor: Color {
        switch insight.severity {
        case .positive:
            return .green
        case .low:
            return .blue
        case .medium:
            return .orange
        case .high:
            return .red
        }
    }
}
