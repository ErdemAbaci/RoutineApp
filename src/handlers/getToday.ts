import { routineRepository } from "../repositories/routineRepository";
import { completionRepository } from "../repositories/completionRepository";
import { gamificationStateRepository } from "../repositories/gamificationStateRepository";
import { getRoutinesActiveOnDate } from "../services/schedule/scheduleService";
import { sortRoutinesByPriorityAndTime } from "../services/routines/routinePriorityService";
import {
  toTodayRoutineResponse,
  toTodayRoutineResponseFromSnapshot,
} from "../mappers/todayResponseMapper";
import {
  calculateDailySummary,
  ensureDailyPlan,
} from "../services/summaries/summaryService";
import { formatDateKey } from "../utils/date";

type ApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

function json(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(): Promise<ApiResponse> {
  const ownerId = "temporary-user-id";
  const today = new Date();
  const date = formatDateKey(today);

  try {
    const routines = await routineRepository.listByOwner(ownerId);
    const activeTodayRoutines = sortRoutinesByPriorityAndTime(
      getRoutinesActiveOnDate(routines, today),
    );

    const completions = await completionRepository.listByOwnerAndDate(
      ownerId,
      date,
    );

    const completionsByRoutineId = new Map(
      completions.map((completion) => [completion.routineId, completion]),
    );

    await ensureDailyPlan({
      ownerId,
      date,
      activeRoutines: activeTodayRoutines,
      completions,
    });
    const summary = await calculateDailySummary({
      ownerId,
      date,
      activeRoutines: activeTodayRoutines,
      completions,
    });
    const items = summary.routineSnapshots
      ? summary.routineSnapshots.map((snapshot) =>
          toTodayRoutineResponseFromSnapshot(
            snapshot,
            completionsByRoutineId.get(snapshot.routineId),
          ),
        )
      : getLegacyTodayItems({
          routines,
          activeTodayRoutines,
          completions,
          completionsByRoutineId,
          finalized: summary.finalized,
        });
    const gamificationState = await gamificationStateRepository.getByOwner(
      ownerId,
    );
    const freezeBalance = gamificationState?.freezeBalance ?? 0;
    const streakAtRisk =
      !summary.finalized &&
      summary.totalPoints > 0 &&
      summary.earnedPoints === 0 &&
      freezeBalance === 0;

    return json(200, {
      date,
      items,
      summary: {
        totalRoutines: summary.totalRoutines,
        completedCount: summary.completedCount,
        skippedCount: summary.skippedCount,
        missedCount: summary.missedCount,
        totalPoints: summary.totalPoints,
        earnedPoints: summary.earnedPoints,
        skippedPoints: summary.skippedPoints,
        missedPoints: summary.missedPoints,
        pointCompletionRate: summary.pointCompletionRate,
        completionRate: summary.completionRate,
        badge: summary.badge,
        streakBeforeThisDay: summary.streakBeforeThisDay,
        streakAfterThisDay: summary.streakAfterThisDay,
        freezeUsed: summary.freezeUsed,
        freezeEarned: summary.freezeEarned,
        freezeBalanceAfterThisDay: summary.freezeBalanceAfterThisDay,
        streakProtected: summary.streakProtected,
        finalized: summary.finalized,
      },
      gamification: {
        currentStreak:
          gamificationState?.currentStreak ?? summary.streakBeforeThisDay,
        freezeBalance,
        streakAtRisk,
        motivationMessage: streakAtRisk
          ? "Streak'in riskte. Bugün en az bir rutin tamamla ve haftalık freeze hedefini yeniden yakala."
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to load today view", error);

    return json(500, { message: "Could not load today view" });
  }
}

function getLegacyTodayItems(params: {
  routines: Awaited<ReturnType<typeof routineRepository.listByOwner>>;
  activeTodayRoutines: Awaited<ReturnType<typeof routineRepository.listByOwner>>;
  completions: Awaited<
    ReturnType<typeof completionRepository.listByOwnerAndDate>
  >;
  completionsByRoutineId: Map<
    string,
    Awaited<ReturnType<typeof completionRepository.listByOwnerAndDate>>[number]
  >;
  finalized: boolean;
}) {
  const routinesById = new Map(
    params.routines.map((routine) => [routine.id, routine]),
  );
  const itemRoutines = params.finalized
    ? params.completions
        .map((completion) => routinesById.get(completion.routineId))
        .filter((routine): routine is NonNullable<typeof routine> =>
          routine !== undefined,
        )
    : params.activeTodayRoutines;

  return itemRoutines.map((routine) =>
    toTodayRoutineResponse(
      routine,
      params.completionsByRoutineId.get(routine.id),
    ),
  );
}
