import Foundation

struct DashboardResponse: Codable {
    let windowDays: Int
    let activeRoutineCount: Int
    let currentStreak: Int
    let freezeBalance: Int
    let latestFinalizedDate: String?
    let totals: DashboardTotals
    let badgeCounts: BadgeCounts
    let weeklySummaries: [TodaySummary]
}

struct DashboardTotals: Codable {
    let totalPoints: Int
    let earnedPoints: Int
    let completedCount: Int
    let skippedCount: Int
    let missedCount: Int
    let averagePointCompletionRate: Int
}

struct BadgeCounts: Codable {
    let gold: Int
    let silver: Int
    let bronze: Int
    let missed: Int
}
