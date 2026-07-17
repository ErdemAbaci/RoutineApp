import { completionRepository } from "../../repositories/completionRepository";
import { gamificationStateRepository } from "../../repositories/gamificationStateRepository";
import { routineRepository } from "../../repositories/routineRepository";
import { summaryRepository } from "../../repositories/summaryRepository";
import { getRoutinesActiveOnDate } from "../schedule/scheduleService";
import { calculateBadge } from "./badgeService";
import {
  createInitialGamificationState,
  resolveFinalizedGamification,
} from "./gamificationService";
import { calculateNextStreak } from "./streakService";
import { createDailyRoutineSnapshots } from "./dailyPlanService";
import type { Routine } from "../../types/routine";
import type { RoutineCompletion } from "../../types/completion";
import type {
  DailyRoutineSnapshot,
  DailySummary,
} from "../../types/dailySummary";

function getPreviousDateKey(date: string): string {
  const currentDate = new Date(`${date}T00:00:00.000Z`);
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);

  return currentDate.toISOString().slice(0, 10);
}

function getDaysBetween(date: string, previousDate: string): number {
  const dateTime = new Date(`${date}T00:00:00.000Z`).getTime();
  const previousDateTime = new Date(`${previousDate}T00:00:00.000Z`).getTime();

  return Math.round((dateTime - previousDateTime) / 86400000);
}

function hasSameSummaryValues(
  existingSummary: DailySummary,
  nextSummary: DailySummary,
): boolean {
  return (
    existingSummary.totalRoutines === nextSummary.totalRoutines &&
    existingSummary.completedCount === nextSummary.completedCount &&
    existingSummary.skippedCount === nextSummary.skippedCount &&
    existingSummary.missedCount === nextSummary.missedCount &&
    existingSummary.totalPoints === nextSummary.totalPoints &&
    existingSummary.earnedPoints === nextSummary.earnedPoints &&
    existingSummary.skippedPoints === nextSummary.skippedPoints &&
    existingSummary.missedPoints === nextSummary.missedPoints &&
    existingSummary.pointCompletionRate === nextSummary.pointCompletionRate &&
    existingSummary.completionRate === nextSummary.completionRate &&
    existingSummary.badge === nextSummary.badge &&
    existingSummary.streakBeforeThisDay === nextSummary.streakBeforeThisDay &&
    existingSummary.streakAfterThisDay === nextSummary.streakAfterThisDay &&
    existingSummary.freezeUsed === nextSummary.freezeUsed &&
    existingSummary.freezeEarned === nextSummary.freezeEarned &&
    existingSummary.freezeBalanceAfterThisDay ===
      nextSummary.freezeBalanceAfterThisDay &&
    existingSummary.streakProtected === nextSummary.streakProtected &&
    JSON.stringify(existingSummary.routineSnapshots ?? []) ===
      JSON.stringify(nextSummary.routineSnapshots ?? []) &&
    existingSummary.finalized === nextSummary.finalized
  );
}

async function buildAndSaveDailySummary(params: {
  ownerId: string;
  date: string;
  activeRoutines: Routine[];
  completions: RoutineCompletion[];
  routineSnapshots?: DailyRoutineSnapshot[];
  persist?: boolean;
  finalized?: boolean;
  gamification?: {
    streakBeforeThisDay: number;
    streakAfterThisDay: number;
    freezeUsed: boolean;
    freezeEarned: boolean;
    freezeBalanceAfterThisDay: number;
    streakProtected: boolean;
  };
}): Promise<DailySummary> {
  const {
    ownerId,
    date,
    activeRoutines,
    completions,
    routineSnapshots: requestedRoutineSnapshots,
    persist = true,
    finalized,
    gamification,
  } = params;

  const existingSummary = await summaryRepository.getByOwnerAndDate(
    ownerId,
    date,
  );
  const routineSnapshots =
    requestedRoutineSnapshots ??
    existingSummary?.routineSnapshots ??
    createDailyRoutineSnapshots(activeRoutines);
  const snapshotsByRoutineId = new Map(
    routineSnapshots.map((snapshot) => [snapshot.routineId, snapshot]),
  );
  const plannedCompletions = completions.filter((completion) =>
    snapshotsByRoutineId.has(completion.routineId),
  );
  const totalRoutines = routineSnapshots.length;

  const completedCount = plannedCompletions.filter(
    (completion) => completion.status === "done",
  ).length;

  const skippedCount = plannedCompletions.filter(
    (completion) => completion.status === "skipped",
  ).length;

  const missedCount = plannedCompletions.filter(
    (completion) => completion.status === "missed",
  ).length;

  const totalPoints = routineSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.points,
    0,
  );

  const pointsByStatus = plannedCompletions.reduce(
    (points, completion) => {
      const snapshot = snapshotsByRoutineId.get(completion.routineId);

      if (!snapshot) {
        return points;
      }

      const routinePoints = snapshot.points;

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
  const projectedStreakAfterThisDay = calculateNextStreak(previousStreak, badge);

  const now = new Date().toISOString();

  const shouldFinalize = finalized === true || existingSummary?.finalized === true;

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
    streakBeforeThisDay:
      gamification?.streakBeforeThisDay ??
      existingSummary?.streakBeforeThisDay ??
      previousStreak,
    streakAfterThisDay:
      gamification?.streakAfterThisDay ??
      existingSummary?.streakAfterThisDay ??
      projectedStreakAfterThisDay,
    freezeUsed:
      gamification?.freezeUsed ?? existingSummary?.freezeUsed ?? false,
    freezeEarned:
      gamification?.freezeEarned ?? existingSummary?.freezeEarned ?? false,
    freezeBalanceAfterThisDay:
      gamification?.freezeBalanceAfterThisDay ??
      existingSummary?.freezeBalanceAfterThisDay ??
      0,
    streakProtected:
      gamification?.streakProtected ??
      existingSummary?.streakProtected ??
      false,
    routineSnapshots,
    finalized: shouldFinalize,
    createdAt: existingSummary?.createdAt ?? now,
    updatedAt: now,
  };

  if (!persist) {
    return summary;
  }

  if (existingSummary && hasSameSummaryValues(existingSummary, summary)) {
    return existingSummary;
  }

  await summaryRepository.upsert(summary);

  return summary;
}

export async function ensureDailyPlan(params: {
  ownerId: string;
  date: string;
  activeRoutines: Routine[];
  completions: RoutineCompletion[];
}): Promise<DailySummary> {
  const existingSummary = await summaryRepository.getByOwnerAndDate(
    params.ownerId,
    params.date,
  );

  if (existingSummary?.finalized || existingSummary?.routineSnapshots) {
    return existingSummary;
  }

  const preview = await buildAndSaveDailySummary({
    ...params,
    routineSnapshots: createDailyRoutineSnapshots(params.activeRoutines),
    persist: false,
    finalized: false,
  });
  const saved = await summaryRepository.saveOpenPlanIfUnplanned(preview);

  if (saved) {
    return preview;
  }

  return (
    (await summaryRepository.getByOwnerAndDate(params.ownerId, params.date)) ??
    preview
  );
}

export async function calculateAndSaveDailySummary(params: {
  ownerId: string;
  date: string;
  activeRoutines: Routine[];
  completions: RoutineCompletion[];
}): Promise<DailySummary> {
  const existingSummary = await summaryRepository.getByOwnerAndDate(
    params.ownerId,
    params.date,
  );

  if (existingSummary?.finalized) {
    return existingSummary;
  }

  return buildAndSaveDailySummary({
    ...params,
    finalized: false,
  });
}

export async function calculateDailySummary(params: {
  ownerId: string;
  date: string;
  activeRoutines: Routine[];
  completions: RoutineCompletion[];
}): Promise<DailySummary> {
  const existingSummary = await summaryRepository.getByOwnerAndDate(
    params.ownerId,
    params.date,
  );

  if (existingSummary?.finalized) {
    return existingSummary;
  }

  return buildAndSaveDailySummary({
    ...params,
    persist: false,
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
  const routineSnapshots =
    existingSummary?.routineSnapshots ??
    createDailyRoutineSnapshots(activeRoutines);

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

  const missedCompletions: RoutineCompletion[] = routineSnapshots
    .filter((snapshot) => !completionsByRoutineId.has(snapshot.routineId))
    .map((snapshot) => ({
      id: `${snapshot.routineId}#${date}`,
      ownerId,
      routineId: snapshot.routineId,
      date,
      status: "missed",
      createdAt: now,
      updatedAt: now,
    }));

  await Promise.all(
    missedCompletions.map((completion) =>
      completionRepository.createMissedIfNotExists(completion),
    ),
  );

  const allCompletions = await completionRepository.listByOwnerAndDate(
    ownerId,
    date,
  );
  const summaryPreview = await buildAndSaveDailySummary({
    ownerId,
    date,
    activeRoutines,
    completions: allCompletions,
    routineSnapshots,
    persist: false,
    finalized: false,
  });

  const existingState = await gamificationStateRepository.getByOwner(ownerId);
  const currentState =
    existingState ?? createInitialGamificationState(ownerId, now);
  const recentSummaries = (await summaryRepository.listByOwner(ownerId, 14))
    .filter((summary) => summary.finalized)
    .filter((summary) => summary.date !== date)
    .filter((summary) => {
      const daysBetween = getDaysBetween(date, summary.date);

      return daysBetween >= 1 && daysBetween <= 6;
    });
  const gamification = resolveFinalizedGamification({
    state: currentState,
    badge: summaryPreview.badge,
    date,
    recentSummaries,
    now,
  });

  await gamificationStateRepository.upsert(gamification.state);

  return buildAndSaveDailySummary({
    ownerId,
    date,
    activeRoutines,
    completions: allCompletions,
    routineSnapshots,
    finalized: true,
    gamification,
  });
}
