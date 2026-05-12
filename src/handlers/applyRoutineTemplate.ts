import { getRoutineTemplateById } from "../services/routines/routineTemplateService";
import { createMissingTemplateRoutines } from "../services/routines/routineCreationService";

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
  const templateId = event.pathParameters?.id;

  if (!templateId) {
    return json(400, { message: "Template id is required" });
  }

  const template = getRoutineTemplateById(templateId);

  if (!template) {
    return json(404, { message: "Routine template not found" });
  }

  try {
    const result = await createMissingTemplateRoutines({
      ownerId: "temporary-user-id",
      items: template.items,
    });

    return json(200, {
      templateId: template.id,
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
      created: result.created,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error("Failed to apply routine template", {
      templateId,
      error,
    });

    return json(500, { message: "Could not apply routine template" });
  }
}
