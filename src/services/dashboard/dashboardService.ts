import { gamificationStateRepository } from "../../repositories/gamificationStateRepository";
import { routineRepository } from "../../repositories/routineRepository";
import { summaryRepository } from "../../repositories/summaryRepository";
import {
  toDailySummaryResponse,
  type DailySummaryResponse,
} from "../../mappers/summaryResponseMapper";
import type { DailyBadge, DailySummary } from "../../types/dailySummary";

export type DashboardResponse = {
  windowDays: number;
  activeRoutineCount: number;
  currentStreak: number;
  freezeBalance: number;
  latestFinalizedDate: string | null;
  totals: {
    totalPoints: number;
    earnedPoints: number;
    completedCount: number;
    skippedCount: number;
    missedCount: number;
    averagePointCompletionRate: number;
  };
  badgeCounts: Record<DailyBadge, number>;
  weeklySummaries: DailySummaryResponse[];
};

function getEmptyBadgeCounts(): Record<DailyBadge, number> {
  return {
    gold: 0,
    silver: 0,
    bronze: 0,
    missed: 0,
  };
}

function calculateAveragePointCompletionRate(summaries: DailySummary[]): number {
  if (summaries.length === 0) {
    return 0;
  }

  const totalRate = summaries.reduce(
    (sum, summary) => sum + (summary.pointCompletionRate ?? 0),
    0,
  );

  return Math.round(totalRate / summaries.length);
}

export async function getDashboard(ownerId: string): Promise<DashboardResponse> {
  const windowDays = 7;
  const [routines, summaries, gamificationState] = await Promise.all([
    routineRepository.listByOwner(ownerId),
    summaryRepository.listByOwner(ownerId, windowDays * 2),
    gamificationStateRepository.getByOwner(ownerId),
  ]);
  const finalizedSummaries = summaries
    .filter((summary) => summary.finalized)
    .slice(0, windowDays);
  const chronologicalSummaries = [...finalizedSummaries].reverse();
  const latestFinalizedSummary = finalizedSummaries[0] ?? null;
  const badgeCounts = getEmptyBadgeCounts();

  for (const summary of chronologicalSummaries) {
    badgeCounts[summary.badge] += 1;
  }

  return {
    windowDays,
    activeRoutineCount: routines.filter((routine) => routine.status === "active")
      .length,
    currentStreak:
      gamificationState?.currentStreak ??
      latestFinalizedSummary?.streakAfterThisDay ??
      0,
    freezeBalance:
      gamificationState?.freezeBalance ??
      latestFinalizedSummary?.freezeBalanceAfterThisDay ??
      0,
    latestFinalizedDate: latestFinalizedSummary?.date ?? null,
    totals: {
      totalPoints: chronologicalSummaries.reduce(
        (sum, summary) => sum + (summary.totalPoints ?? 0),
        0,
      ),
      earnedPoints: chronologicalSummaries.reduce(
        (sum, summary) => sum + (summary.earnedPoints ?? 0),
        0,
      ),
      completedCount: chronologicalSummaries.reduce(
        (sum, summary) => sum + summary.completedCount,
        0,
      ),
      skippedCount: chronologicalSummaries.reduce(
        (sum, summary) => sum + summary.skippedCount,
        0,
      ),
      missedCount: chronologicalSummaries.reduce(
        (sum, summary) => sum + summary.missedCount,
        0,
      ),
      averagePointCompletionRate:
        calculateAveragePointCompletionRate(chronologicalSummaries),
    },
    badgeCounts,
    weeklySummaries: chronologicalSummaries.map(toDailySummaryResponse),
  };
}
