import { routineRepository } from "../repositories/routineRepository";

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
    const items = await routineRepository.listByOwner("temporary-user-id");

    return json(200, { items });
  } catch (error) {
    console.error("Failed to list routines", error);

    return json(500, { message: "Could not load routines" });
  }
}