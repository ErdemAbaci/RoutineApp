import Foundation

enum InsightSeverity: String, Codable {
    case positive
    case low
    case medium
    case high
}

enum InsightActionType: String, Codable {
    case reviewRoutine = "review_routine"
    case completeEasyRoutine = "complete_easy_routine"
    case prioritizeRoutine = "prioritize_routine"
    case keepMomentum = "keep_momentum"
}

struct Insight: Identifiable, Codable {
    let type: String
    let severity: InsightSeverity
    let title: String
    let message: String
    let action: InsightAction
    let routineId: String?
    let category: String?
    let metric: InsightMetric?

    var id: String {
        [
            type,
            routineId ?? "global",
            action.type.rawValue
        ].joined(separator: "-")
    }
}

struct InsightAction: Codable {
    let type: InsightActionType
    let label: String
    let targetRoutineId: String?
}

struct InsightMetric: Codable {
    let windowDays: Int
    let count: Int
    let threshold: Int
}

struct InsightsResponse: Codable {
    let items: [Insight]
}
