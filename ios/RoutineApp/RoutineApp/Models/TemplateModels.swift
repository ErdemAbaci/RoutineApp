import Foundation

struct RoutineTemplate: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let items: [RoutineTemplateItem]
}

struct RoutineTemplateItem: Identifiable, Codable {
    let title: String
    let category: RoutineCategory
    let description: String?
    let frequencyType: RoutineFrequencyType
    let daysOfWeek: [Int]?
    let scheduledTime: String
    let reminderEnabled: Bool

    var id: String {
        "\(title)-\(category.rawValue)-\(scheduledTime)"
    }
}

struct RoutineTemplatesResponse: Codable {
    let items: [RoutineTemplate]
}
