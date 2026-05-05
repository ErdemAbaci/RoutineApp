import { summaryRepository } from "../repositories/summaryRepository";
import { toDailySummaryResponse } from "../mappers/summaryResponseMapper";

type ApiEvent = {
  pathParameters?: {
    date?: string;
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

function isValidDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function handler(event: ApiEvent): Promise<ApiResponse> {
  const ownerId = "temporary-user-id";
  const date = event.pathParameters?.date;

  if (!date) {
    return json(400, { message: "Date is required" });
  }

  if (!isValidDateKey(date)) {
    return json(400, { message: "Date must be in YYYY-MM-DD format" });
  }

  try {
    const summary = await summaryRepository.getByOwnerAndDate(ownerId, date);

    if (!summary) {
      return json(404, { message: "Summary not found" });
    }

    return json(200, toDailySummaryResponse(summary));
  } catch (error) {
    console.error("Failed to load summary", error);

    return json(500, { message: "Could not load summary" });
  }
}