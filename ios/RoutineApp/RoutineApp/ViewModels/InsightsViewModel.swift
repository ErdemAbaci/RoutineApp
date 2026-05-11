import Foundation

@MainActor
final class InsightsViewModel: ObservableObject {
    @Published var insights: [Insight] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func loadInsights() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: InsightsResponse = try await apiClient.get("insights")
            insights = response.items
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
