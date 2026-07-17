import { completionRepository } from "../../repositories/completionRepository";
import { routineRepository } from "../../repositories/routineRepository";
import { summaryRepository } from "../../repositories/summaryRepository";
import { isRoutineActiveOnDate } from "../schedule/scheduleService";
import { formatDateKey, formatTimeKey } from "../../utils/date";
import type { RoutineCompletion } from "../../types/completion";

export async function markRoutineAsCompleted(
  routineId: string,
  ownerId: string,
): Promise<RoutineCompletion> {
  const routine = await routineRepository.getById(routineId);

  if (!routine) {
    throw new Error("Routine not found");
  }

  if (routine.ownerId !== ownerId) {
    throw new Error("Routine not found");
  }

  const now = new Date();
  const date = formatDateKey(now);

  const existingSummary = await summaryRepository.getByOwnerAndDate(ownerId, date);

  if (existingSummary?.finalized) {
    throw new Error("This day has already been finalized");
  }

  const plannedRoutine = existingSummary?.routineSnapshots?.find(
    (snapshot) => snapshot.routineId === routineId,
  );

  if (!plannedRoutine && routine.status !== "active") {
    throw new Error("Routine is not active");
  }

  if (!plannedRoutine && !isRoutineActiveOnDate(routine, now)) {
    throw new Error("Routine is not scheduled for today");
  }

  if ((plannedRoutine?.scheduledTime ?? routine.scheduledTime) > formatTimeKey(now)) {
    throw new Error("Routine is not ready yet");
  }

  const completion: RoutineCompletion = {
    id: `${routineId}#${date}`,
    ownerId,
    routineId,
    date,
    status: "done",
    completedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await completionRepository.saveUserCompletionIfDayOpen(completion);

  return completion;
}

export async function markRoutineAsSkipped(
  routineId: string,
  ownerId: string,
): Promise<RoutineCompletion> {
  const routine = await routineRepository.getById(routineId);

  if (!routine) {
    throw new Error("Routine not found");
  }

  if (routine.ownerId !== ownerId) {
    throw new Error("Routine not found");
  }

  const now = new Date();
  const date = formatDateKey(now);

  const existingSummary = await summaryRepository.getByOwnerAndDate(ownerId, date);

  if (existingSummary?.finalized) {
    throw new Error("This day has already been finalized");
  }

  const plannedRoutine = existingSummary?.routineSnapshots?.find(
    (snapshot) => snapshot.routineId === routineId,
  );

  if (!plannedRoutine && routine.status !== "active") {
    throw new Error("Routine is not active");
  }

  if (!plannedRoutine && !isRoutineActiveOnDate(routine, now)) {
    throw new Error("Routine is not scheduled for today");
  }

  const completion: RoutineCompletion = {
    id: `${routineId}#${date}`,
    ownerId,
    routineId,
    date,
    status: "skipped",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await completionRepository.saveUserCompletionIfDayOpen(completion);

  return completion;
}
