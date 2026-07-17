import { getRoutinePoints } from "../routines/routineScoring";
import { getRoutinePriority } from "../routines/routinePriorityService";
import type { DailyRoutineSnapshot } from "../../types/dailySummary";
import type { Routine } from "../../types/routine";

export function toDailyRoutineSnapshot(
  routine: Routine,
): DailyRoutineSnapshot {
  return {
    routineId: routine.id,
    title: routine.title,
    category: routine.category,
    frequencyType: routine.frequencyType,
    scheduledTime: routine.scheduledTime,
    priority: getRoutinePriority(routine),
    reminderEnabled: routine.reminderEnabled,
    points: getRoutinePoints(routine),
  };
}

export function createDailyRoutineSnapshots(
  routines: Routine[],
): DailyRoutineSnapshot[] {
  return routines.map(toDailyRoutineSnapshot);
}
