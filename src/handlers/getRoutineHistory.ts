import { completionRepository } from "../repositories/completionRepository";
import { routineRepository } from "../repositories/routineRepository";
import { getDateKeyDaysAgo } from "../utils/date";

type ApiEvent = {
  pathParameters?: {
    id?: string;
  } | null;
  queryStringParameters?: {
    days?: string;
  } | null;
};

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

function parseDays(value?: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 7 || parsed > 90) {
    return 30;
  }

  return parsed;
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const routineId = event.pathParameters?.id;
  const ownerId = "temporary-user-id";

  if (!routineId) {
    return json(400, { message: "Routine id is required" });
  }

  try {
    const routine = await routineRepository.getById(routineId);

    if (!routine || routine.ownerId !== ownerId) {
      return json(404, { message: "Routine not found" });
    }

    const windowDays = parseDays(event.queryStringParameters?.days);
    const completions = await completionRepository.listByOwnerBetweenDates(
      ownerId,
      getDateKeyDaysAgo(windowDays - 1),
      getDateKeyDaysAgo(0),
    );
    const items = completions
      .filter((completion) => completion.routineId === routineId)
      .sort((left, right) => right.date.localeCompare(left.date));

    return json(200, {
      routineId: routine.id,
      title: routine.title,
      windowDays,
      items,
    });
  } catch (error) {
    console.error("Failed to load routine history", error);

    return json(500, { message: "Could not load routine history" });
  }
}
