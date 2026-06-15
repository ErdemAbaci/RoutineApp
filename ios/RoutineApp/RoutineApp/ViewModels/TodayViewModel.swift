import Foundation

@MainActor
final class TodayViewModel: ObservableObject {
    @Published var today: TodayResponse?
    @Published var celebration: BadgeCelebration?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: APIClient
    private let celebrationDefaultsKey = "lastShownCelebrationDate"

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func loadToday() async {
        isLoading = true
        errorMessage = nil

        do {
            today = try await apiClient.get("today")
            await loadCelebrationIfNeeded()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func complete(_ routine: TodayRoutine) async {
        await performRoutineAction(path: "routines/\(routine.routineId)/complete")
    }

    func skip(_ routine: TodayRoutine) async {
        await performRoutineAction(path: "routines/\(routine.routineId)/skip")
    }

    private func performRoutineAction(path: String) async {
        errorMessage = nil

        do {
            let _: CompletionResponse = try await apiClient.post(path)
            await loadToday()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func dismissCelebration() {
        guard let celebration else { return }
        UserDefaults.standard.set(celebration.date, forKey: celebrationDefaultsKey)
        self.celebration = nil
    }

    private func loadCelebrationIfNeeded() async {
        do {
            let dashboard: DashboardResponse = try await apiClient.get("dashboard")

            guard
                let latestFinalizedDate = dashboard.latestFinalizedDate,
                latestFinalizedDate == yesterdayDateString,
                latestFinalizedDate != UserDefaults.standard.string(forKey: celebrationDefaultsKey),
                let summary = dashboard.weeklySummaries.first(where: { $0.date == latestFinalizedDate }),
                ["gold", "silver", "bronze"].contains(summary.badge)
            else {
                return
            }

            celebration = BadgeCelebration(
                date: latestFinalizedDate,
                badge: summary.badge,
                earnedPoints: summary.earnedPoints,
                totalPoints: summary.totalPoints
            )
        } catch {
            // Celebration is a nice-to-have layer; it should never block Today.
        }
    }

    private var yesterdayDateString: String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Istanbul")
        formatter.dateFormat = "yyyy-MM-dd"

        let yesterday = Calendar(identifier: .gregorian).date(byAdding: .day, value: -1, to: Date()) ?? Date()
        return formatter.string(from: yesterday)
    }
}
