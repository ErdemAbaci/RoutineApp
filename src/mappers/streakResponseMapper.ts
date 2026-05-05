import type { DailySummary } from "../types/dailySummary";

export type StreakResponse = {
  currentStreak: number;
  lastBadge: string | null;
  lastUpdatedDate: string | null;
};

export function toStreakResponse(
  latestSummary: DailySummary | null,
): StreakResponse {
  if (!latestSummary) {
    return {
      currentStreak: 0,
      lastBadge: null,
      lastUpdatedDate: null,
    };
  }

  return {
    currentStreak: latestSummary.streakAfterThisDay,
    lastBadge: latestSummary.badge,
    lastUpdatedDate: latestSummary.date,
  };
}