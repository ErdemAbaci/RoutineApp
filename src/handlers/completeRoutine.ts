import { markRoutineAsCompleted } from "../services/completions/completionService";

type ApiEvent = {
  pathParameters?: {
    id?: string;
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

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const routineId = event.pathParameters?.id;

  if (!routineId) {
    return json(400, { message: "Routine id is required" });
  }

  try {
    const completion = await markRoutineAsCompleted(
      routineId,
      "temporary-user-id",
    );

    return json(200, {
      message: "Routine marked as completed",
      completion,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete routine";

    if (message === "Routine not found") {
      return json(404, { message });
    }

    if (message === "This day has already been finalized") {
      return json(409, { message });
    }

    if (
      message === "Routine is not active" ||
      message === "Routine is not scheduled for today" ||
      message === "Routine is not ready yet"
    ) {
      return json(400, { message });
    }

    console.error("Failed to complete routine", error);
    return json(500, { message: "Could not complete routine" });
  }
}
