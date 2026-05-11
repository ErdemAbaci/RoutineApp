import Foundation

@MainActor
final class TemplatesViewModel: ObservableObject {
    @Published var templates: [RoutineTemplate] = []
    @Published var isLoading = false
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

        do {
            for item in template.items {
                let draft = RoutineDraft(templateItem: item)
                let _: Routine = try await apiClient.post("routines", body: draft)
            }

            successMessage = "\(template.title) rutinlere eklendi."
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
