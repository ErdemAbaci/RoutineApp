import { routineRepository } from "../repositories/routineRepository";
import { getRoutinesActiveOnDate } from "../services/schedule/scheduleService";
import { toTodayRoutineResponse } from "../mappers/todayResponseMapper";
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
  const today = new Date();
  const date = formatDateKey(today);

  try {
    const routines = await routineRepository.listByOwner("temporary-user-id");
    const activeTodayRoutines = getRoutinesActiveOnDate(routines, today);

    const items = activeTodayRoutines.map((routine) =>
      toTodayRoutineResponse(routine),
    );

    return json(200, {
      date,
      items,
      summary: {
        totalRoutines: items.length,
        completedCount: 0,
        skippedCount: 0,
        missedCount: 0,
        completionRate: 0,
        badge: "missed",
        streakAfterThisDay: 0,
        finalized: false,
      },
    });
  } catch (error) {
    console.error("Failed to load today view", error);

    return json(500, { message: "Could not load today view" });
  }
}