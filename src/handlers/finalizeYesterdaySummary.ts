import { finalizeDailySummary } from "../services/summaries/summaryService";
import { getDateKeyDaysAgo } from "../utils/date";

export async function handler(): Promise<void> {
  const ownerId = "temporary-user-id";
  const date = getDateKeyDaysAgo(1);

  try {
    await finalizeDailySummary({
      ownerId,
      date,
    });
  } catch (error) {
    console.error("Failed to finalize yesterday summary", { date, error });
    throw error;
  }
}
