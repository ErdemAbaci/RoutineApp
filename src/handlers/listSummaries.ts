import { summaryRepository } from "../repositories/summaryRepository";
import { toDailySummaryResponse } from "../mappers/summaryResponseMapper";

type ApiEvent = {
  queryStringParameters?: {
    limit?: string;
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

function parseLimit(value?: string): number {
  if (!value) {
    return 30;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 90) {
    return 30;
  }

  return parsed;
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const ownerId = "temporary-user-id";
  const limit = parseLimit(event.queryStringParameters?.limit);

  try {
    const summaries = await summaryRepository.listByOwner(ownerId, limit);

    return json(200, {
      items: summaries.map(toDailySummaryResponse),
    });
  } catch (error) {
    console.error("Failed to list summaries", error);

    return json(500, { message: "Could not load summaries" });
  }
}