import type { Routine } from "../../types/routine";

export function isRoutineActiveOnDate(routine: Routine, date: Date): boolean {
  if (routine.status !== "active") {
    return false;
  }

  if (routine.frequencyType === "daily") {
    return true;
  }

  const dayOfWeek = date.getDay();

  if (
    routine.frequencyType === "weekly" ||
    routine.frequencyType === "selected_days"
  ) {
    return routine.daysOfWeek?.includes(dayOfWeek) ?? false;
  }

  return false;
}

export function getRoutinesActiveOnDate(
  routines: Routine[],
  date: Date,
): Routine[] {
  return routines.filter((routine) => isRoutineActiveOnDate(routine, date));
}