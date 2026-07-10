import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var animateContent = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.dashboard == nil {
                    ProgressView("Dashboard yükleniyor")
                } else if let dashboard = viewModel.dashboard {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            DashboardHero(dashboard: dashboard)
                                .opacity(animateContent ? 1 : 0.72)
                                .offset(y: animateContent ? 0 : 10)

                            HStack(spacing: 12) {
                                MetricTile(title: "Aktif", value: "\(dashboard.activeRoutineCount)", systemImage: "list.bullet.clipboard")
                                MetricTile(title: "Streak", value: "\(dashboard.currentStreak)", systemImage: "flame.fill")
                                MetricTile(title: "Freeze", value: "\(dashboard.freezeBalance)", systemImage: "snowflake")
                            }
                            .opacity(animateContent ? 1 : 0)
                            .offset(y: animateContent ? 0 : 16)

                            BadgeDistribution(counts: dashboard.badgeCounts)
                                .opacity(animateContent ? 1 : 0)
                                .offset(y: animateContent ? 0 : 20)

                            WeeklyProgressChart(summaries: dashboard.weeklySummaries)
                                .opacity(animateContent ? 1 : 0)
                                .offset(y: animateContent ? 0 : 20)

                            VStack(alignment: .leading, spacing: 10) {
                                Text("Gün Gün Özet")
                                    .font(.headline)

                                if dashboard.weeklySummaries.isEmpty {
                                    ContentUnavailableView(
                                        "Henüz geçmiş yok",
                                        systemImage: "chart.bar",
                                        description: Text("Günler finalize edildikçe haftalık görünüm burada oluşacak.")
                                    )
                                } else {
                                    ForEach(Array(dashboard.weeklySummaries.enumerated()), id: \.offset) { index, summary in
                                        WeeklySummaryRow(summary: summary)
                                            .opacity(animateContent ? 1 : 0)
                                            .offset(y: animateContent ? 0 : 22)
                                            .animation(.smooth(duration: 0.42).delay(Double(index) * 0.04), value: animateContent)
                                    }
                                }
                            }
                        }
                        .padding()
                    }
                    .background(Color(.systemGroupedBackground))
                } else {
                    ContentUnavailableView(
                        "Dashboard hazır değil",
                        systemImage: "chart.line.uptrend.xyaxis",
                        description: Text("Backend URL'ini ayarladıktan sonra haftalık durum burada görünecek.")
                    )
                }
            }
            .navigationTitle("Haftalık Özet")
            .toolbar {
                Button {
                    Task { await viewModel.loadDashboard() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
            .task {
                await viewModel.loadDashboard()
                withAnimation(.smooth(duration: 0.45)) {
                    animateContent = true
                }
            }
            .onChange(of: viewModel.dashboard?.latestFinalizedDate) { _, _ in
                withAnimation(.smooth(duration: 0.45)) {
                    animateContent = true
                }
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

private struct DashboardHero: View {
    let dashboard: DashboardResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Son \(dashboard.windowDays) gün")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.78))
                    Text("%\(dashboard.totals.averagePointCompletionRate)")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .contentTransition(.numericText())
                    Text("ortalama puan tamamlama")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.82))
                }

                Spacer()

                Image(systemName: "sparkles")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(12)
                    .background(.white.opacity(0.18))
                    .clipShape(Circle())
            }

            ProgressView(
                value: Double(dashboard.totals.earnedPoints),
                total: Double(max(dashboard.totals.totalPoints, 1))
            )
            .tint(.white)

            Text("\(dashboard.totals.earnedPoints)/\(dashboard.totals.totalPoints) puan")
                .font(.callout.weight(.semibold))
                .foregroundStyle(.white.opacity(0.9))
                .contentTransition(.numericText())
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.indigo, Color.teal],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

private struct MetricTile: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: systemImage)
                .font(.headline)
                .foregroundStyle(.teal)

            Text(value)
                .font(.title3.bold())

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 6)
        .contentTransition(.numericText())
    }
}

private struct BadgeDistribution: View {
    let counts: BadgeCounts

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Badge Dağılımı")
                .font(.headline)

            HStack(spacing: 10) {
                BadgePill(title: "Gold", count: counts.gold, color: .yellow)
                BadgePill(title: "Silver", count: counts.silver, color: .gray)
                BadgePill(title: "Bronze", count: counts.bronze, color: .orange)
                BadgePill(title: "Missed", count: counts.missed, color: .red)
            }
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct BadgePill: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.headline)
            Text(title)
                .font(.caption2)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(color.opacity(0.16))
        .foregroundStyle(color)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct WeeklySummaryRow: View {
    let summary: TodaySummary

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(badgeColor)
                .frame(width: 12, height: 12)

            VStack(alignment: .leading, spacing: 4) {
                Text(summary.date ?? "-")
                    .font(.subheadline.weight(.semibold))
                Text(summary.badge.capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text("\(summary.earnedPoints)/\(summary.totalPoints)")
                .font(.subheadline.weight(.semibold))
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var badgeColor: Color {
        switch summary.badge {
        case "gold":
            return .yellow
        case "silver":
            return .gray
        case "bronze":
            return .orange
        default:
            return .red
        }
    }
}

private struct WeeklyProgressChart: View {
    let summaries: [TodaySummary]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Haftalık İlerleme")
                .font(.headline)

            if summaries.isEmpty {
                Text("Finalize edilen günler burada sütun olarak görünür.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                HStack(alignment: .bottom, spacing: 10) {
                    ForEach(Array(summaries.suffix(7).enumerated()), id: \.offset) { _, summary in
                        VStack(spacing: 6) {
                            Text("%\(summary.pointCompletionRate)")
                                .font(.caption2.weight(.semibold))

                            Capsule()
                                .fill(barColor(summary.badge))
                                .frame(height: max(CGFloat(summary.pointCompletionRate) * 0.76, 6))

                            Text(dayLabel(summary.date))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .bottom)
                    }
                }
                .frame(height: 126, alignment: .bottom)
            }
        }
        .padding()
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func dayLabel(_ date: String?) -> String {
        guard let date else { return "-" }
        return String(date.suffix(2))
    }

    private func barColor(_ badge: String) -> Color {
        switch badge {
        case "gold": return .yellow
        case "silver": return .gray
        case "bronze": return .orange
        default: return .red
        }
    }
}
