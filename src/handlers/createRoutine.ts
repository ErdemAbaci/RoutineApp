import { validateCreateRoutineBody } from "../services/routines/routineValidation";
import { createRoutineFromInput } from "../services/routines/routineCreationService";

type ApiEvent = {
  body?: string | null;
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
  if (!event.body) {
    return json(400, { message: "Request body is required" });
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Request body must be valid JSON" });
  }

  const validation = validateCreateRoutineBody(parsedBody);

  if (!validation.ok) {
    return json(400, { message: validation.message });
  }

  try {
    const routine = await createRoutineFromInput({
      ownerId: "temporary-user-id",
      input: validation.data,
    });

    return json(201, routine);
  } catch (error) {
    console.error("Failed to create routine", error);
    return json(500, { message: "Could not create routine" });
  }
}
