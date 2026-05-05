import { completionRepository } from "../../repositories/completionRepository";
import { routineRepository } from "../../repositories/routineRepository";
import { summaryRepository } from "../../repositories/summaryRepository";
import { getRoutinePoints } from "../routines/routineScoring";
import { getRoutinesActiveOnDate } from "../schedule/scheduleService";
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

async function buildAndSaveDailySummary(params: {
  ownerId: string;
  date: string;
  activeRoutines: Routine[];
  completions: RoutineCompletion[];
  finalized?: boolean;
}): Promise<DailySummary> {
  const { ownerId, date, activeRoutines, completions, finalized } = params;

  const totalRoutines = activeRoutines.length;
  const activeRoutinesById = new Map(
    activeRoutines.map((routine) => [routine.id, routine]),
  );

  const completedCount = completions.filter(
    (completion) => completion.status === "done",
  ).length;

  const skippedCount = completions.filter(
    (completion) => completion.status === "skipped",
  ).length;

  const missedCount = completions.filter(
    (completion) => completion.status === "missed",
  ).length;

  const totalPoints = activeRoutines.reduce(
    (sum, routine) => sum + getRoutinePoints(routine),
    0,
  );

  const pointsByStatus = completions.reduce(
    (points, completion) => {
      const routine = activeRoutinesById.get(completion.routineId);

      if (!routine) {
        return points;
      }

      const routinePoints = getRoutinePoints(routine);

      if (completion.status === "done") {
        points.earnedPoints += routinePoints;
      }

      if (completion.status === "skipped") {
        points.skippedPoints += routinePoints;
      }

      if (completion.status === "missed") {
        points.missedPoints += routinePoints;
      }

      return points;
    },
    {
      earnedPoints: 0,
      skippedPoints: 0,
      missedPoints: 0,
    },
  );

  const completionRate =
    totalRoutines === 0
      ? 0
      : Math.round((completedCount / totalRoutines) * 100);

  const pointCompletionRate =
    totalPoints === 0
      ? 0
      : Math.round((pointsByStatus.earnedPoints / totalPoints) * 100);

  const badge = calculateBadge(pointCompletionRate);

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
    totalPoints,
    earnedPoints: pointsByStatus.earnedPoints,
    skippedPoints: pointsByStatus.skippedPoints,
    missedPoints: pointsByStatus.missedPoints,
    pointCompletionRate,
    completionRate,
    badge,
    streakAfterThisDay,
    finalized: finalized ?? existingSummary?.finalized ?? false,
    createdAt: existingSummary?.createdAt ?? now,
    updatedAt: now,
  };

  await summaryRepository.upsert(summary);

  return summary;
}

export async function calculateAndSaveDailySummary(params: {
  ownerId: string;
  date: string;
  activeRoutines: Routine[];
  completions: RoutineCompletion[];
}): Promise<DailySummary> {
  return buildAndSaveDailySummary({
    ...params,
    finalized: false,
  });
}

export async function finalizeDailySummary(params: {
  ownerId: string;
  date: string;
}): Promise<DailySummary> {
  const { ownerId, date } = params;

  const existingSummary = await summaryRepository.getByOwnerAndDate(
    ownerId,
    date,
  );

  if (existingSummary?.finalized) {
    return existingSummary;
  }

  const dateObject = new Date(`${date}T00:00:00.000Z`);

  const routines = await routineRepository.listByOwner(ownerId);
  const activeRoutines = getRoutinesActiveOnDate(routines, dateObject);

  const existingCompletions = await completionRepository.listByOwnerAndDate(
    ownerId,
    date,
  );

  const completionsByRoutineId = new Map(
    existingCompletions.map((completion) => [
      completion.routineId,
      completion,
    ]),
  );

  const now = new Date().toISOString();

  const missedCompletions: RoutineCompletion[] = activeRoutines
    .filter((routine) => !completionsByRoutineId.has(routine.id))
    .map((routine) => ({
      id: `${routine.id}#${date}`,
      ownerId,
      routineId: routine.id,
      date,
      status: "missed",
      createdAt: now,
      updatedAt: now,
    }));

  await Promise.all(
    missedCompletions.map((completion) =>
      completionRepository.upsert(completion),
    ),
  );

  const allCompletions = [...existingCompletions, ...missedCompletions];

  return buildAndSaveDailySummary({
    ownerId,
    date,
    activeRoutines,
    completions: allCompletions,
    finalized: true,
  });
}
