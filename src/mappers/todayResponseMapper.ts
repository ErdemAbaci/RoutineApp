import type { Routine } from "../types/routine";

export type TodayRoutineResponse = {
  routineId: string;
  title: string;
  category: string;
  scheduledTime: string;
  frequencyType: string;
  reminderEnabled: boolean;
  completionStatus: "pending";
  completedAt: null;
};

export function toTodayRoutineResponse(
  routine: Routine,
): TodayRoutineResponse {
  return {
    routineId: routine.id,
    title: routine.title,
    category: routine.category,
    scheduledTime: routine.scheduledTime,
    frequencyType: routine.frequencyType,
    reminderEnabled: routine.reminderEnabled,
    completionStatus: "pending",
    completedAt: null,
  };
}