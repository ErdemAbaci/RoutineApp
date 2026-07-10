import type { Routine, RoutinePriority } from "../../types/routine";

const priorityRank: Record<RoutinePriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export function getRoutinePriority(routine: Routine): RoutinePriority {
  return routine.priority ?? "normal";
}

export function sortRoutinesByPriorityAndTime(routines: Routine[]): Routine[] {
  return [...routines].sort((left, right) => {
    const priorityDifference =
      priorityRank[getRoutinePriority(left)] - priorityRank[getRoutinePriority(right)];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.scheduledTime.localeCompare(right.scheduledTime);
  });
}
