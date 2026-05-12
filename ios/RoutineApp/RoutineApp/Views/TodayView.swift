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
                                HStack {
                                    Text("Bugünkü Rutinler")
                                        .font(.title3.bold())

                                    Spacer()

                                    Text("\(today.items.count) adet")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(.secondary.opacity(0.12))
                                        .clipShape(Capsule())
                                }

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
                    .background(Color(.systemGroupedBackground))
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
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text(today.date)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.76))
                    Text(today.summary.badge.capitalized)
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 8) {
                    Text("\(today.summary.earnedPoints)/\(today.summary.totalPoints) puan")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("%\(today.summary.pointCompletionRate)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.78))
                }
            }

            ProgressView(
                value: Double(today.summary.earnedPoints),
                total: Double(max(today.summary.totalPoints, 1))
            )
            .tint(.white)

            HStack(spacing: 10) {
                HeroBadge(title: "Streak", value: "\(today.gamification.currentStreak)", systemImage: "flame.fill")
                Spacer()
                HeroBadge(title: "Freeze", value: "\(today.gamification.freezeBalance)", systemImage: "snowflake")
                Spacer()
                HeroBadge(title: "Gün", value: today.summary.finalized ? "Kapalı" : "Açık", systemImage: today.summary.finalized ? "lock.fill" : "lock.open")
            }
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.green, Color.blue],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .blue.opacity(0.22), radius: 18, x: 0, y: 10)
    }
}

private struct HeroBadge: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: systemImage)
            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.subheadline.weight(.bold))
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(.white.opacity(0.16))
        .clipShape(Capsule())
    }
}

private struct RoutineRowView: View {
    let routine: TodayRoutine
    let isFinalized: Bool
    let onComplete: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(routine.title)
                        .font(.headline)
                        .lineLimit(2)
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

            HStack(spacing: 10) {
                Button(action: onComplete) {
                    Label("Complete", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                    .buttonStyle(.borderedProminent)
                    .disabled(isFinalized || routine.completionStatus == .done)

                Button(action: onSkip) {
                    Label("Skip", systemImage: "forward.circle")
                        .frame(maxWidth: .infinity)
                }
                    .buttonStyle(.bordered)
                    .disabled(isFinalized || routine.completionStatus == .skipped)
            }
        }
        .padding(16)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 6)
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
