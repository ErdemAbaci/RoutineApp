import { completionRepository } from "../../repositories/completionRepository";
import { routineRepository } from "../../repositories/routineRepository";
import { summaryRepository } from "../../repositories/summaryRepository";
import { getRoutinePoints } from "../routines/routineScoring";
import { getDateKeyDaysAgo } from "../../utils/date";
import type { RoutineCompletion } from "../../types/completion";
import type { Insight } from "../../types/insight";
import type { Routine } from "../../types/routine";

const WINDOW_DAYS = 7;
const MAX_INSIGHTS = 5;
const HIGH_VALUE_POINT_THRESHOLD = 15;
const severityOrder = {
  high: 0,
  medium: 1,
  low: 2,
  positive: 3,
};

function groupCompletionsByRoutineId(
  completions: RoutineCompletion[],
): Map<string, RoutineCompletion[]> {
  return completions.reduce((groups, completion) => {
    const existing = groups.get(completion.routineId) ?? [];

    existing.push(completion);
    groups.set(completion.routineId, existing);

    return groups;
  }, new Map<string, RoutineCompletion[]>());
}

function getRoutineTitle(routine: Routine | undefined): string {
  return routine?.title ?? "Bu rutin";
}

export async function listInsights(ownerId: string): Promise<Insight[]> {
  const startDate = getDateKeyDaysAgo(WINDOW_DAYS - 1);
  const endDate = getDateKeyDaysAgo(0);

  const [routines, completions, summaries] = await Promise.all([
    routineRepository.listByOwner(ownerId),
    completionRepository.listByOwnerBetweenDates(ownerId, startDate, endDate),
    summaryRepository.listByOwner(ownerId, WINDOW_DAYS),
  ]);

  const activeRoutines = routines.filter((routine) => routine.status === "active");
  const routinesById = new Map(
    activeRoutines.map((routine) => [routine.id, routine]),
  );
  const activeRoutineCompletions = completions.filter((completion) =>
    routinesById.has(completion.routineId),
  );
  const completionsByRoutineId = groupCompletionsByRoutineId(
    activeRoutineCompletions,
  );
  const finalizedSummaries = summaries.filter(
    (summary) =>
      summary.finalized &&
      summary.date >= startDate &&
      summary.date <= endDate,
  );
  const insights: Insight[] = [];

  for (const [routineId, routineCompletions] of completionsByRoutineId) {
    const routine = routinesById.get(routineId);
    const routineTitle = getRoutineTitle(routine);
    const missedCount = routineCompletions.filter(
      (completion) => completion.status === "missed",
    ).length;
    const skippedCount = routineCompletions.filter(
      (completion) => completion.status === "skipped",
    ).length;
    const points = routine ? getRoutinePoints(routine) : 0;

    if (missedCount >= 2) {
      insights.push({
        type: "routine_at_risk",
        severity: points >= HIGH_VALUE_POINT_THRESHOLD ? "high" : "medium",
        title: "Riskteki rutin",
        message: `${routineTitle} son günlerde sık kaçıyor. Daha küçük bir hedefe bölmeyi veya saatini değiştirmeyi deneyebilirsin.`,
        routineId,
        category: routine?.category,
        metric: {
          windowDays: WINDOW_DAYS,
          count: missedCount,
          threshold: 2,
        },
      });
    }

    if (skippedCount >= 3) {
      insights.push({
        type: "often_skipped",
        severity: "medium",
        title: "Sık skiplenen rutin",
        message: `${routineTitle} sık skipleniyor. Sıklığını, saatini veya hedefini biraz daha gerçekçi hale getirmek iyi olabilir.`,
        routineId,
        category: routine?.category,
        metric: {
          windowDays: WINDOW_DAYS,
          count: skippedCount,
          threshold: 3,
        },
      });
    }

    if (missedCount === 1 && points >= HIGH_VALUE_POINT_THRESHOLD) {
      insights.push({
        type: "high_value_routine_missed",
        severity: points >= 20 ? "high" : "medium",
        title: "Yüksek puanlı rutin kaçıyor",
        message: `${routineTitle} ${points} puanlık bir rutin. Kaçması günlük badge'i belirgin etkiliyor.`,
        routineId,
        category: routine?.category,
        metric: {
          windowDays: WINDOW_DAYS,
          count: missedCount,
          threshold: 1,
        },
      });
    }
  }

  const missedBadgeCount = finalizedSummaries.filter(
    (summary) => summary.badge === "missed",
  ).length;
  const goldBadgeCount = finalizedSummaries.filter(
    (summary) => summary.badge === "gold",
  ).length;

  if (missedBadgeCount >= 2) {
    insights.push({
      type: "streak_risk",
      severity: "high",
      title: "Streak riskte",
      message:
        "Bu hafta birkaç gün tamamen kaçmış. Bugün düşük puanlı bir rutinle ritme dönmek iyi bir başlangıç olabilir.",
      metric: {
        windowDays: WINDOW_DAYS,
        count: missedBadgeCount,
        threshold: 2,
      },
    });
  }

  if (goldBadgeCount >= 3) {
    insights.push({
      type: "positive_momentum",
      severity: "positive",
      title: "Güçlü tempo",
      message:
        "Bu hafta güçlü gidiyorsun. Bu tempo freeze hakkı kazanma ritmini destekliyor.",
      metric: {
        windowDays: WINDOW_DAYS,
        count: goldBadgeCount,
        threshold: 3,
      },
    });
  }

  return insights
    .sort(
      (firstInsight, secondInsight) =>
        severityOrder[firstInsight.severity] -
        severityOrder[secondInsight.severity],
    )
    .slice(0, MAX_INSIGHTS);
}
