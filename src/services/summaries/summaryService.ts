import { summaryRepository } from "../../repositories/summaryRepository";
import { calculateBadge } from "./badgeService";
import { calculateNextStreak } from "./streakService";
import type { Routine } from "../../types/routine";
import type { RoutineCompletion } from "../../types/completion";
import type { DailySummary } from "../../types/dailySummary";

function getPreviousDateKey(date: string): string {
  const currentDate = new Date(`${date}T00:00:00.000Z`);
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);

  return currentDate.toISOString().slice(0, 10);
}

export async function calculateAndSaveDailySummary(params: {
  ownerId: string;
  date: string;
  activeRoutines: Routine[];
  completions: RoutineCompletion[];
}): Promise<DailySummary> {
  const { ownerId, date, activeRoutines, completions } = params;

  const totalRoutines = activeRoutines.length;

  const completedCount = completions.filter(
    (completion) => completion.status === "done",
  ).length;

  const skippedCount = completions.filter(
    (completion) => completion.status === "skipped",
  ).length;

  const missedCount = completions.filter(
    (completion) => completion.status === "missed",
  ).length;

  const completionRate =
    totalRoutines === 0
      ? 0
      : Math.round((completedCount / totalRoutines) * 100);

  const badge = calculateBadge(completionRate);

  const previousDate = getPreviousDateKey(date);
  const previousSummary = await summaryRepository.getByOwnerAndDate(
    ownerId,
    previousDate,
  );

  const previousStreak = previousSummary?.streakAfterThisDay ?? 0;
  const streakAfterThisDay = calculateNextStreak(previousStreak, badge);

  const now = new Date().toISOString();

  const existingSummary = await summaryRepository.getByOwnerAndDate(
    ownerId,
    date,
  );

  const summary: DailySummary = {
    id: `${ownerId}#${date}`,
    ownerId,
    date,
    totalRoutines,
    completedCount,
    skippedCount,
    missedCount,
    completionRate,
    badge,
    streakAfterThisDay,
    finalized: existingSummary?.finalized ?? false,
    createdAt: existingSummary?.createdAt ?? now,
    updatedAt: now,
  };

  await summaryRepository.upsert(summary);

  return summary;
}