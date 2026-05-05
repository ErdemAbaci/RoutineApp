import { listInsights } from "../services/insights/insightService";

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
    const insights = await listInsights(ownerId);

    return json(200, {
      items: insights,
    });
  } catch (error) {
    console.error("Failed to load insights", error);

    return json(500, { message: "Could not load insights" });
  }
}
