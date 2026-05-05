import type { DailySummary } from "../types/dailySummary";

export type DailySummaryResponse = {
  date: string;
  totalRoutines: number;
  completedCount: number;
  skippedCount: number;
  missedCount: number;
  totalPoints: number;
  earnedPoints: number;
  skippedPoints: number;
  missedPoints: number;
  pointCompletionRate: number;
  completionRate: number;
  badge: string;
  streakBeforeThisDay: number;
  streakAfterThisDay: number;
  freezeUsed: boolean;
  freezeEarned: boolean;
  freezeBalanceAfterThisDay: number;
  streakProtected: boolean;
  finalized: boolean;
};

export function toDailySummaryResponse(
  summary: DailySummary,
): DailySummaryResponse {
  return {
    date: summary.date,
    totalRoutines: summary.totalRoutines,
    completedCount: summary.completedCount,
    skippedCount: summary.skippedCount,
    missedCount: summary.missedCount,
    totalPoints: summary.totalPoints ?? 0,
    earnedPoints: summary.earnedPoints ?? 0,
    skippedPoints: summary.skippedPoints ?? 0,
    missedPoints: summary.missedPoints ?? 0,
    pointCompletionRate: summary.pointCompletionRate ?? 0,
    completionRate: summary.completionRate,
    badge: summary.badge,
    streakBeforeThisDay: summary.streakBeforeThisDay ?? 0,
    streakAfterThisDay: summary.streakAfterThisDay,
    freezeUsed: summary.freezeUsed ?? false,
    freezeEarned: summary.freezeEarned ?? false,
    freezeBalanceAfterThisDay: summary.freezeBalanceAfterThisDay ?? 0,
    streakProtected: summary.streakProtected ?? false,
    finalized: summary.finalized,
  };
}
