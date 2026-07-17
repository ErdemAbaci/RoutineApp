import { routineRepository } from "../repositories/routineRepository";
import { validateCreateRoutineBody } from "../services/routines/routineValidation";
import {
  DuplicateRoutineError,
  getRoutineDuplicateKey,
  getRoutineSignature,
} from "../services/routines/routineCreationService";
import type { Routine } from "../types/routine";
import { ensureTodayPlanForOwner } from "../services/summaries/dailyPlanCoordinator";

type ApiEvent = {
  body?: string | null;
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
    const existingRoutine = await routineRepository.getById(routineId);

    if (!existingRoutine || existingRoutine.ownerId !== "temporary-user-id") {
      return json(404, { message: "Routine not found" });
    }

    if (existingRoutine.status !== "active") {
      return json(409, { message: "Routine is not active" });
    }

    const routines = await routineRepository.listByOwner(existingRoutine.ownerId);
    const signature = getRoutineSignature(validation.data);
    const hasOtherActiveDuplicate = routines
      .filter((routine) => routine.status === "active" && routine.id !== routineId)
      .some((routine) => getRoutineSignature(routine) === signature);

    if (hasOtherActiveDuplicate) {
      throw new DuplicateRoutineError();
    }

    await ensureTodayPlanForOwner({
      ownerId: existingRoutine.ownerId,
      routines,
    });

    const updatedRoutine: Routine = {
      ...existingRoutine,
      title: validation.data.title,
      category: validation.data.category,
      description: validation.data.description,
      frequencyType: validation.data.frequencyType,
      daysOfWeek: validation.data.daysOfWeek,
      scheduledTime: validation.data.scheduledTime,
      priority: validation.data.priority,
      duplicateKey: getRoutineDuplicateKey(existingRoutine.ownerId, validation.data),
      reminderEnabled: validation.data.reminderEnabled,
      updatedAt: new Date().toISOString(),
    };

    await routineRepository.updateUnique(existingRoutine, updatedRoutine);

    return json(200, updatedRoutine);
  } catch (error) {
    if (error instanceof DuplicateRoutineError) {
      return json(409, { message: "Routine already exists" });
    }

    if (error instanceof Error && error.message === "Routine already exists") {
      return json(409, { message: "Routine already exists" });
    }

    console.error("Failed to update routine", error);

    return json(500, { message: "Could not update routine" });
  }
}
