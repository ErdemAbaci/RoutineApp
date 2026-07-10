import { randomUUID } from "crypto";
import { routineRepository } from "../../repositories/routineRepository";
import { summaryRepository } from "../../repositories/summaryRepository";
import {
  formatDateKey,
  formatTimeKey,
  getDateKeyDaysFromDate,
} from "../../utils/date";
import type { Routine } from "../../types/routine";
import type { CreateRoutineInput } from "./routineValidation";

export type ApplyRoutineTemplateResult = {
  created: Routine[];
  skipped: {
    title: string;
    reason: "duplicate";
  }[];
};

export class DuplicateRoutineError extends Error {
  constructor() {
    super("Routine already exists");
    this.name = "DuplicateRoutineError";
  }
}

export function getRoutineSignature(input: CreateRoutineInput): string {
  return [
    input.title.trim().toLocaleLowerCase("tr"),
    input.category,
    input.frequencyType,
    input.scheduledTime,
    [...(input.daysOfWeek ?? [])].sort().join(","),
  ].join("|");
}

export function getRoutineDuplicateKey(
  ownerId: string,
  input: CreateRoutineInput,
): string {
  return `routine_duplicate#${ownerId}#${encodeURIComponent(getRoutineSignature(input))}`;
}

async function resolveStartDate(
  ownerId: string,
  scheduledTime: string,
  nowDate: Date,
): Promise<string> {
  const today = formatDateKey(nowDate);
  const currentTime = formatTimeKey(nowDate);
  const existingSummary = await summaryRepository.getByOwnerAndDate(
    ownerId,
    today,
  );

  if (existingSummary?.finalized || scheduledTime < currentTime) {
    return getDateKeyDaysFromDate(1, nowDate);
  }

  return today;
}

export async function createRoutineFromInput(params: {
  ownerId: string;
  input: CreateRoutineInput;
  nowDate?: Date;
  skipExistingDuplicateCheck?: boolean;
}): Promise<Routine> {
  const {
    ownerId,
    input,
    nowDate = new Date(),
    skipExistingDuplicateCheck = false,
  } = params;
  const now = nowDate.toISOString();
  const signature = getRoutineSignature(input);
  const duplicateKey = getRoutineDuplicateKey(ownerId, input);

  if (!skipExistingDuplicateCheck) {
    const existingRoutines = await routineRepository.listByOwner(ownerId);
    const hasActiveDuplicate = existingRoutines
      .filter((routine) => routine.status === "active")
      .some((routine) => getRoutineSignature(routine) === signature);

    if (hasActiveDuplicate) {
      throw new DuplicateRoutineError();
    }
  }

  const startDate = await resolveStartDate(
    ownerId,
    input.scheduledTime,
    nowDate,
  );

  const routine: Routine = {
    id: randomUUID(),
    ownerId,
    title: input.title,
    category: input.category,
    description: input.description,
    frequencyType: input.frequencyType,
    daysOfWeek: input.daysOfWeek,
    scheduledTime: input.scheduledTime,
    startDate,
    duplicateKey,
    priority: input.priority ?? "normal",
    reminderEnabled: input.reminderEnabled,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await routineRepository.createUnique(routine);
  } catch (error) {
    if (error instanceof Error && error.message === "Routine already exists") {
      throw new DuplicateRoutineError();
    }

    throw error;
  }

  return routine;
}

export async function createMissingTemplateRoutines(params: {
  ownerId: string;
  items: CreateRoutineInput[];
  nowDate?: Date;
}): Promise<ApplyRoutineTemplateResult> {
  const { ownerId, items, nowDate = new Date() } = params;
  const existingRoutines = await routineRepository.listByOwner(ownerId);
  const existingSignatures = new Set(
    existingRoutines
      .filter((routine) => routine.status === "active")
      .map(getRoutineSignature),
  );
  const created: Routine[] = [];
  const skipped: ApplyRoutineTemplateResult["skipped"] = [];

  for (const item of items) {
    const signature = getRoutineSignature(item);

    if (existingSignatures.has(signature)) {
      skipped.push({
        title: item.title,
        reason: "duplicate",
      });
      continue;
    }

    const routine = await createRoutineFromInput({
      ownerId,
      input: item,
      nowDate,
      skipExistingDuplicateCheck: true,
    }).catch((error) => {
      if (error instanceof DuplicateRoutineError) {
        return null;
      }

      throw error;
    });

    if (!routine) {
      skipped.push({
        title: item.title,
        reason: "duplicate",
      });
      existingSignatures.add(signature);
      continue;
    }

    existingSignatures.add(signature);
    created.push(routine);
  }

  return {
    created,
    skipped,
  };
}
