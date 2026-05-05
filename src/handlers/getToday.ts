import { routineRepository } from "../repositories/routineRepository";
import { completionRepository } from "../repositories/completionRepository";
import { getRoutinesActiveOnDate } from "../services/schedule/scheduleService";
import { toTodayRoutineResponse } from "../mappers/todayResponseMapper";
import { calculateAndSaveDailySummary } from "../services/summaries/summaryService";
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
    const activeTodayRoutines = getRoutinesActiveOnDate(routines, today);

    const completions = await completionRepository.listByOwnerAndDate(
      ownerId,
      date,
    );

    const completionsByRoutineId = new Map(
      completions.map((completion) => [completion.routineId, completion]),
    );

    const items = activeTodayRoutines.map((routine) =>
      toTodayRoutineResponse(
        routine,
        completionsByRoutineId.get(routine.id),
      ),
    );

    const summary = await calculateAndSaveDailySummary({
      ownerId,
      date,
      activeRoutines: activeTodayRoutines,
      completions,
    });

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
        streakAfterThisDay: summary.streakAfterThisDay,
        finalized: summary.finalized,
      },
    });
  } catch (error) {
    console.error("Failed to load today view", error);

    return json(500, { message: "Could not load today view" });
  }
}
