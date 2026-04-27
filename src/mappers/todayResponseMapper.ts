import type { Routine } from "../types/routine";
import type { RoutineCompletion } from "../types/completion";

export type TodayRoutineCompletionStatus = "pending" | "done" | "skipped";

export type TodayRoutineResponse = {
  routineId: string;
  title: string;
  category: string;
  scheduledTime: string;
  frequencyType: string;
  reminderEnabled: boolean;
  completionStatus: TodayRoutineCompletionStatus;
  completedAt: string | null;
};

export function toTodayRoutineResponse(
  routine: Routine,
  completion?: RoutineCompletion,
): TodayRoutineResponse {
  return {
    routineId: routine.id,
    title: routine.title,
    category: routine.category,
    scheduledTime: routine.scheduledTime,
    frequencyType: routine.frequencyType,
    reminderEnabled: routine.reminderEnabled,
    completionStatus: completion?.status === "done" || completion?.status === "skipped"
      ? completion.status
      : "pending",
    completedAt: completion?.completedAt ?? null,
  };
}