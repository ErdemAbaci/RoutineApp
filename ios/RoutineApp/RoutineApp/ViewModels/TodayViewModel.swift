import Foundation

@MainActor
final class TodayViewModel: ObservableObject {
    @Published var today: TodayResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func loadToday() async {
        isLoading = true
        errorMessage = nil

        do {
            today = try await apiClient.get("today")
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
}
