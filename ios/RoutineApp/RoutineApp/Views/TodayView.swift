import SwiftUI

struct TodayView: View {
    @StateObject private var viewModel = TodayViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.today == nil {
                    ProgressView("Bugün yükleniyor")
                } else if let today = viewModel.today {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            SummaryCard(today: today)

                            if let message = today.gamification.motivationMessage {
                                Text(message)
                                    .font(.callout)
                                    .foregroundStyle(.orange)
                                    .padding()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(.orange.opacity(0.12))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            }

                            VStack(alignment: .leading, spacing: 12) {
                                Text("Bugünkü Rutinler")
                                    .font(.headline)

                                if today.items.isEmpty {
                                    ContentUnavailableView(
                                        "Bugün rutin yok",
                                        systemImage: "checklist",
                                        description: Text("Routines veya Templates ekranından yeni rutin ekleyebilirsin.")
                                    )
                                } else {
                                    ForEach(today.items) { routine in
                                        RoutineRowView(
                                            routine: routine,
                                            isFinalized: today.summary.finalized,
                                            onComplete: {
                                                Task { await viewModel.complete(routine) }
                                            },
                                            onSkip: {
                                                Task { await viewModel.skip(routine) }
                                            }
                                        )
                                    }
                                }
                            }
                        }
                        .padding()
                    }
                } else {
                    ContentUnavailableView(
                        "Bugün ekranı hazır değil",
                        systemImage: "calendar",
                        description: Text("Backend URL'ini ayarladıktan sonra veriler burada görünecek.")
                    )
                }
            }
            .navigationTitle("Routine App")
            .toolbar {
                Button {
                    Task { await viewModel.loadToday() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
            .task {
                await viewModel.loadToday()
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

private struct SummaryCard: View {
    let today: TodayResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading) {
                    Text(today.date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(today.summary.badge.capitalized)
                        .font(.title2.bold())
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("\(today.summary.earnedPoints)/\(today.summary.totalPoints) puan")
                        .font(.headline)
                    Text("%\(today.summary.pointCompletionRate)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            HStack {
                Label("\(today.gamification.currentStreak)", systemImage: "flame")
                Spacer()
                Label("\(today.gamification.freezeBalance)", systemImage: "snowflake")
                Spacer()
                Label(today.summary.finalized ? "Kapalı" : "Açık", systemImage: "lock")
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct RoutineRowView: View {
    let routine: TodayRoutine
    let isFinalized: Bool
    let onComplete: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(routine.title)
                        .font(.headline)
                    Text("\(routine.category.rawValue) • \(routine.points) puan • \(routine.scheduledTime)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Text(routine.completionStatus.rawValue)
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(statusColor.opacity(0.16))
                    .foregroundStyle(statusColor)
                    .clipShape(Capsule())
            }

            HStack {
                Button("Complete", action: onComplete)
                    .buttonStyle(.borderedProminent)
                    .disabled(isFinalized || routine.completionStatus == .done)

                Button("Skip", action: onSkip)
                    .buttonStyle(.bordered)
                    .disabled(isFinalized || routine.completionStatus == .skipped)
            }
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 2)
    }

    private var statusColor: Color {
        switch routine.completionStatus {
        case .done:
            return .green
        case .skipped:
            return .orange
        case .missed:
            return .red
        case .pending:
            return .blue
        }
    }
}
