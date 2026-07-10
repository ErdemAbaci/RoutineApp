import type { Routine } from "../types/routine";
import type { RoutineCompletion } from "../types/completion";
import { getRoutinePoints } from "../services/routines/routineScoring";
import { getRoutinePriority } from "../services/routines/routinePriorityService";

export type TodayRoutineCompletionStatus =
  | "pending"
  | "done"
  | "skipped"
  | "missed";

export type TodayRoutineResponse = {
  routineId: string;
  title: string;
  category: string;
  points: number;
  scheduledTime: string;
  frequencyType: string;
  priority: string;
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
    points: getRoutinePoints(routine),
    scheduledTime: routine.scheduledTime,
    frequencyType: routine.frequencyType,
    priority: getRoutinePriority(routine),
    reminderEnabled: routine.reminderEnabled,
    completionStatus: completion?.status ?? "pending",
    completedAt: completion?.completedAt ?? null,
  };
}
