import { completionRepository } from "../../repositories/completionRepository";
import { routineRepository } from "../../repositories/routineRepository";
import { summaryRepository } from "../../repositories/summaryRepository";
import { formatDateKey } from "../../utils/date";
import { sortRoutinesByPriorityAndTime } from "../routines/routinePriorityService";
import {
  getRoutinesActiveOnDate,
  isRoutineActiveOnDate,
} from "../schedule/scheduleService";
import type { Routine } from "../../types/routine";
import { toDailyRoutineSnapshot } from "./dailyPlanService";
import { ensureDailyPlan } from "./summaryService";

export async function ensureTodayPlanForOwner(params: {
  ownerId: string;
  routines?: Routine[];
  nowDate?: Date;
}): Promise<void> {
  const { ownerId, nowDate = new Date() } = params;
  const date = formatDateKey(nowDate);
  const [routines, completions] = await Promise.all([
    params.routines ?? routineRepository.listByOwner(ownerId),
    completionRepository.listByOwnerAndDate(ownerId, date),
  ]);

  await ensureDailyPlan({
    ownerId,
    date,
    activeRoutines: sortRoutinesByPriorityAndTime(
      getRoutinesActiveOnDate(routines, nowDate),
    ),
    completions,
  });
}

export async function appendRoutineToTodayPlanIfOpen(
  routine: Routine,
  nowDate = new Date(),
): Promise<void> {
  const date = formatDateKey(nowDate);

  if (!isRoutineActiveOnDate(routine, nowDate)) {
    return;
  }

  const summary = await summaryRepository.getByOwnerAndDate(
    routine.ownerId,
    date,
  );

  if (
    summary?.finalized ||
    !summary?.routineSnapshots ||
    summary.routineSnapshots.some(
      (snapshot) => snapshot.routineId === routine.id,
    )
  ) {
    return;
  }

  await summaryRepository.appendRoutineSnapshotIfOpen(
    routine.ownerId,
    date,
    toDailyRoutineSnapshot(routine),
    new Date().toISOString(),
  );
}
