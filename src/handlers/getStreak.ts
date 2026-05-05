import { summaryRepository } from "../repositories/summaryRepository";
import { toStreakResponse } from "../mappers/streakResponseMapper";

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

export async function handler(): Promise<ApiResponse> {
  const ownerId = "temporary-user-id";

  try {
    const latestSummary = await summaryRepository.getLatestByOwner(ownerId);

    return json(200, toStreakResponse(latestSummary));
  } catch (error) {
    console.error("Failed to load streak", error);

    return json(500, { message: "Could not load streak" });
  }
}