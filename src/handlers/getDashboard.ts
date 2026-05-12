import { getDashboard } from "../services/dashboard/dashboardService";

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
  try {
    const dashboard = await getDashboard("temporary-user-id");

    return json(200, dashboard);
  } catch (error) {
    console.error("Failed to load dashboard", error);

    return json(500, { message: "Could not load dashboard" });
  }
}
