import Foundation

enum RoutineCategory: String, Codable, CaseIterable, Identifiable {
    case water
    case medicine
    case vitamin
    case habit
    case study
    case walking
    case workout
    case supplement

    var id: String { rawValue }
}

enum RoutineFrequencyType: String, Codable, CaseIterable, Identifiable {
    case daily
    case weekly
    case selectedDays = "selected_days"

    var id: String { rawValue }
}

enum RoutineStatus: String, Codable {
    case active
    case archived
}

struct Routine: Identifiable, Codable {
    let id: String
    let ownerId: String
    let title: String
    let category: RoutineCategory
    let description: String?
    let frequencyType: RoutineFrequencyType
    let daysOfWeek: [Int]?
    let scheduledTime: String
    let startDate: String?
    let reminderEnabled: Bool
    let status: RoutineStatus
    let createdAt: String
    let updatedAt: String
}

struct RoutineDraft: Codable {
    var title: String
    var category: RoutineCategory
    var description: String?
    var frequencyType: RoutineFrequencyType
    var daysOfWeek: [Int]?
    var scheduledTime: String
    var reminderEnabled: Bool

    init(
        title: String = "",
        category: RoutineCategory = .habit,
        description: String? = nil,
        frequencyType: RoutineFrequencyType = .daily,
        daysOfWeek: [Int]? = nil,
        scheduledTime: String = "09:00",
        reminderEnabled: Bool = false
    ) {
        self.title = title
        self.category = category
        self.description = description
        self.frequencyType = frequencyType
        self.daysOfWeek = daysOfWeek
        self.scheduledTime = scheduledTime
        self.reminderEnabled = reminderEnabled
    }

    init(routine: Routine) {
        self.title = routine.title
        self.category = routine.category
        self.description = routine.description
        self.frequencyType = routine.frequencyType
        self.daysOfWeek = routine.daysOfWeek
        self.scheduledTime = routine.scheduledTime
        self.reminderEnabled = routine.reminderEnabled
    }

    init(templateItem: RoutineTemplateItem) {
        self.title = templateItem.title
        self.category = templateItem.category
        self.description = templateItem.description
        self.frequencyType = templateItem.frequencyType
        self.daysOfWeek = templateItem.daysOfWeek
        self.scheduledTime = templateItem.scheduledTime
        self.reminderEnabled = templateItem.reminderEnabled
    }
}

struct RoutineListResponse: Codable {
    let items: [Routine]
}

struct ArchiveRoutineResponse: Codable {
    let message: String
    let id: String
    let status: RoutineStatus
    let updatedAt: String
}
