import Foundation

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var dashboard: DashboardResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func loadDashboard() async {
        isLoading = true
        errorMessage = nil

        do {
            dashboard = try await apiClient.get("dashboard")
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
