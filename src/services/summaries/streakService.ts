import type { DailyBadge } from "../../types/dailySummary";

export function calculateNextStreak(
  previousStreak: number,
  badge: DailyBadge,
): number {
  if (badge === "gold" || badge === "silver") {
    return previousStreak + 1;
  }

  if (badge === "bronze") {
    return previousStreak;
  }

  return 0;
}