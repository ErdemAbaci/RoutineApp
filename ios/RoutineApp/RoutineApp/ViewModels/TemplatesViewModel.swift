import Foundation

@MainActor
final class TemplatesViewModel: ObservableObject {
    @Published var templates: [RoutineTemplate] = []
    @Published var isLoading = false
    @Published var isApplyingTemplate = false
    @Published var errorMessage: String?
    @Published var successMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func loadTemplates() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: RoutineTemplatesResponse = try await apiClient.get("routine-templates")
            templates = response.items
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func createRoutines(from template: RoutineTemplate) async {
        errorMessage = nil
        successMessage = nil
        isApplyingTemplate = true

        do {
            let response: ApplyRoutineTemplateResponse = try await apiClient.post("routine-templates/\(template.id)/apply")
            successMessage = "\(response.createdCount) yeni rutin eklendi, \(response.skippedCount) tekrar atlandı."
        } catch {
            errorMessage = error.localizedDescription
        }

        isApplyingTemplate = false
    }
}
