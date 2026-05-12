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

struct ApplyRoutineTemplateResponse: Codable {
    let templateId: String
    let createdCount: Int
    let skippedCount: Int
    let created: [Routine]
    let skipped: [SkippedTemplateRoutine]
}

struct SkippedTemplateRoutine: Codable {
    let title: String
    let reason: String
}
