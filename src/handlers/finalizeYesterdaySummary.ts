import { finalizeDailySummary } from "../services/summaries/summaryService";
import { getDateKeyDaysAgo } from "../utils/date";

export async function handler(): Promise<void> {
  const ownerId = "temporary-user-id";
  const date = getDateKeyDaysAgo(1);

  console.log(
    JSON.stringify({
      event: "daily_finalize_started",
      ownerId,
      date,
    }),
  );

  try {
    const summary = await finalizeDailySummary({
      ownerId,
      date,
    });

    console.log(
      JSON.stringify({
        event: "daily_finalize_succeeded",
        ownerId,
        date,
        badge: summary.badge,
        finalized: summary.finalized,
        totalRoutines: summary.totalRoutines,
        earnedPoints: summary.earnedPoints,
        totalPoints: summary.totalPoints,
        streakAfterThisDay: summary.streakAfterThisDay,
        freezeUsed: summary.freezeUsed,
        freezeEarned: summary.freezeEarned,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "daily_finalize_failed",
        ownerId,
        date,
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    throw error;
  }
}
