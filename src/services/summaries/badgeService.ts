import type { DailyBadge } from "../../types/dailySummary";

export function calculateBadge(completionRate: number): DailyBadge {
  if (completionRate === 100) {
    return "gold";
  }

  if (completionRate >= 60) {
    return "silver";
  }

  if (completionRate > 0) {
    return "bronze";
  }

  return "missed";
}