import { markRoutineAsSkipped } from "../services/completions/completionService";

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
    const completion = await markRoutineAsSkipped(
      routineId,
      "temporary-user-id",
    );

    return json(200, {
      message: "Routine marked as skipped",
      completion,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not skip routine";

    if (message === "Routine not found") {
      return json(404, { message });
    }

    if (
      message === "Routine is not active" ||
      message === "Routine is not scheduled for today"
    ) {
      return json(400, { message });
    }

    console.error("Failed to skip routine", error);
    return json(500, { message: "Could not skip routine" });
  }
}