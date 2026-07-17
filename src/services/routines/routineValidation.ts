import type {
  RoutineCategory,
  RoutineFrequencyType,
  RoutinePriority,
} from "../../types/routine";

export type CreateRoutineInput = {
  title: string;
  category: RoutineCategory;
  description?: string;
  frequencyType: RoutineFrequencyType;
  daysOfWeek?: number[];
  scheduledTime: string;
  priority?: RoutinePriority;
  reminderEnabled: boolean;
};

export type ValidationResult =
  | { ok: true; data: CreateRoutineInput }
  | { ok: false; message: string };

const allowedCategories: RoutineCategory[] = [
  "water",
  "medicine",
  "vitamin",
  "habit",
  "study",
  "walking",
  "workout",
  "supplement",
];

const allowedFrequencyTypes: RoutineFrequencyType[] = [
  "daily",
  "weekly",
  "selected_days",
];

const allowedPriorities: RoutinePriority[] = ["high", "normal", "low"];

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function validateCreateRoutineBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.title !== "string" || payload.title.trim() === "") {
    return { ok: false, message: "title is required" };
  }

  if (
    typeof payload.category !== "string" ||
    !allowedCategories.includes(payload.category as RoutineCategory)
  ) {
    return { ok: false, message: "category is invalid" };
  }

  if (
    typeof payload.frequencyType !== "string" ||
    !allowedFrequencyTypes.includes(payload.frequencyType as RoutineFrequencyType)
  ) {
    return { ok: false, message: "frequencyType is invalid" };
  }

  if (typeof payload.scheduledTime !== "string" || !isValidTime(payload.scheduledTime)) {
    return { ok: false, message: "scheduledTime must be in HH:mm format" };
  }

  if (typeof payload.reminderEnabled !== "boolean") {
    return { ok: false, message: "reminderEnabled must be a boolean" };
  }

  if (
    payload.priority !== undefined &&
    (typeof payload.priority !== "string" ||
      !allowedPriorities.includes(payload.priority as RoutinePriority))
  ) {
    return { ok: false, message: "priority is invalid" };
  }

  if (payload.description !== undefined && typeof payload.description !== "string") {
    return { ok: false, message: "description must be a string" };
  }

  if (
    (payload.frequencyType === "weekly" ||
      payload.frequencyType === "selected_days") &&
    (!Array.isArray(payload.daysOfWeek) || payload.daysOfWeek.length === 0)
  ) {
    return {
      ok: false,
      message: "daysOfWeek is required for weekly and selected_days",
    };
  }

  if (
    payload.frequencyType === "weekly" &&
    Array.isArray(payload.daysOfWeek) &&
    payload.daysOfWeek.length !== 1
  ) {
    return { ok: false, message: "weekly routines require exactly one day" };
  }

  if (payload.daysOfWeek !== undefined) {
    if (
      !Array.isArray(payload.daysOfWeek) ||
      !payload.daysOfWeek.every(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      )
    ) {
      return { ok: false, message: "daysOfWeek must contain integers between 0 and 6" };
    }
  }

  return {
    ok: true,
    data: {
      title: payload.title.trim(),
      category: payload.category as RoutineCategory,
      description:
        typeof payload.description === "string" ? payload.description.trim() : undefined,
      frequencyType: payload.frequencyType as RoutineFrequencyType,
      daysOfWeek: payload.daysOfWeek as number[] | undefined,
      scheduledTime: payload.scheduledTime,
      priority: (payload.priority as RoutinePriority | undefined) ?? "normal",
      reminderEnabled: payload.reminderEnabled,
    },
  };
}
