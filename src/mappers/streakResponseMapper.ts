import type { DailySummary } from "../types/dailySummary";
import type { GamificationState } from "../types/gamificationState";

export type StreakResponse = {
  currentStreak: number;
  freezeBalance: number;
  lastBadge: string | null;
  lastUpdatedDate: string | null;
};

export function toStreakResponse(
  latestSummary: DailySummary | null,
  state?: GamificationState | null,
): StreakResponse {
  if (!latestSummary) {
    return {
      currentStreak: state?.currentStreak ?? 0,
      freezeBalance: state?.freezeBalance ?? 0,
      lastBadge: null,
      lastUpdatedDate: null,
    };
  }

  return {
    currentStreak: state?.currentStreak ?? latestSummary.streakAfterThisDay,
    freezeBalance:
      state?.freezeBalance ?? latestSummary.freezeBalanceAfterThisDay ?? 0,
    lastBadge: latestSummary.badge,
    lastUpdatedDate: latestSummary.date,
  };
}
