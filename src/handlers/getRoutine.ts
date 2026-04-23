import { routineRepository } from "../repositories/routineRepository";

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
    const routine = await routineRepository.getById(routineId);

    if (!routine) {
      return json(404, { message: "Routine not found" });
    }

    return json(200, routine);
  } catch (error) {
    console.error("Failed to load routine", error);

    return json(500, { message: "Could not load routine" });
  }
}