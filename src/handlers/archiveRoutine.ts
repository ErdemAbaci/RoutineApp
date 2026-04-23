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
    const existingRoutine = await routineRepository.getById(routineId);

    if (!existingRoutine) {
      return json(404, { message: "Routine not found" });
    }

    if (existingRoutine.status === "archived") {
      return json(409, { message: "Routine is already archived" });
    }

    const updatedAt = new Date().toISOString();

    await routineRepository.archive(routineId, updatedAt);

    return json(200, {
      message: "Routine archived successfully",
      id: routineId,
      status: "archived",
      updatedAt,
    });
  } catch (error) {
    console.error("Failed to archive routine", error);

    return json(500, { message: "Could not archive routine" });
  }
}