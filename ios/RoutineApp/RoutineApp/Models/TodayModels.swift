import Foundation

enum CompletionStatus: String, Codable {
    case pending
    case done
    case skipped
    case missed
}

struct TodayRoutine: Identifiable, Codable {
    let routineId: String
    let title: String
    let category: RoutineCategory
    let points: Int
    let scheduledTime: String
    let frequencyType: RoutineFrequencyType
    let reminderEnabled: Bool
    let completionStatus: CompletionStatus
    let completedAt: String?

    var id: String { routineId }
}

struct TodaySummary: Codable {
    let date: String?
    let totalRoutines: Int
    let completedCount: Int
    let skippedCount: Int
    let missedCount: Int
    let totalPoints: Int
    let earnedPoints: Int
    let skippedPoints: Int
    let missedPoints: Int
    let pointCompletionRate: Int
    let completionRate: Int
    let badge: String
    let streakBeforeThisDay: Int
    let streakAfterThisDay: Int
    let freezeUsed: Bool
    let freezeEarned: Bool
    let freezeBalanceAfterThisDay: Int
    let streakProtected: Bool
    let finalized: Bool
}

struct Gamification: Codable {
    let currentStreak: Int
    let freezeBalance: Int
    let streakAtRisk: Bool
    let motivationMessage: String?
}

struct TodayResponse: Codable {
    let date: String
    let items: [TodayRoutine]
    let summary: TodaySummary
    let gamification: Gamification
}

struct CompletionResponse: Codable {
    let message: String
    let completion: RoutineCompletion
}

struct FinalizeSummaryResponse: Codable {
    let message: String
    let summary: TodaySummary
}

struct RoutineCompletion: Codable {
    let id: String
    let ownerId: String
    let routineId: String
    let date: String
    let status: CompletionStatus
    let completedAt: String?
    let createdAt: String
    let updatedAt: String
}
