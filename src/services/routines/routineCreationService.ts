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

function getRoutineSignature(input: CreateRoutineInput): string {
  return [
    input.title.trim().toLocaleLowerCase("tr"),
    input.category,
    input.frequencyType,
    input.scheduledTime,
    [...(input.daysOfWeek ?? [])].sort().join(","),
  ].join("|");
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
}): Promise<Routine> {
  const { ownerId, input, nowDate = new Date() } = params;
  const now = nowDate.toISOString();
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
    reminderEnabled: input.reminderEnabled,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await routineRepository.create(routine);

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
    });

    existingSignatures.add(signature);
    created.push(routine);
  }

  return {
    created,
    skipped,
  };
}
