import type { Routine } from "../../types/routine";
import { formatDateKey, getDayOfWeek } from "../../utils/date";

export function isRoutineActiveOnDate(routine: Routine, date: Date): boolean {
  if (routine.status !== "active") {
    return false;
  }

  if (routine.startDate && formatDateKey(date) < routine.startDate) {
    return false;
  }

  if (routine.frequencyType === "daily") {
    return true;
  }

  const dayOfWeek = getDayOfWeek(date);

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
