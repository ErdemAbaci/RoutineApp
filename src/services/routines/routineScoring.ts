import type { Routine, RoutineCategory } from "../../types/routine";

const categoryPoints: Record<RoutineCategory, number> = {
  water: 5,
  vitamin: 5,
  supplement: 5,
  medicine: 10,
  habit: 10,
  walking: 15,
  study: 20,
  workout: 25,
};

export function getRoutineCategoryPoints(category: RoutineCategory): number {
  return categoryPoints[category];
}

export function getRoutinePoints(routine: Routine): number {
  return getRoutineCategoryPoints(routine.category);
}
