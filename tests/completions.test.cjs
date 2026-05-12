const assert = require("node:assert/strict");
const test = require("node:test");

const {
  completionRepository,
} = require("../.build/repositories/completionRepository.js");
const {
  routineRepository,
} = require("../.build/repositories/routineRepository.js");
const {
  summaryRepository,
} = require("../.build/repositories/summaryRepository.js");
const {
  markRoutineAsCompleted,
} = require("../.build/services/completions/completionService.js");

test("routine cannot be completed before its scheduled time", async () => {
  const originalGetRoutine = routineRepository.getById;
  const originalGetSummary = summaryRepository.getByOwnerAndDate;
  const originalSaveCompletion = completionRepository.saveUserCompletionIfDayOpen;

  routineRepository.getById = async () => ({
    id: "routine-study",
    ownerId: "temporary-user-id",
    title: "Study",
    category: "study",
    frequencyType: "daily",
    scheduledTime: "23:59",
    reminderEnabled: false,
    status: "active",
    createdAt: "2026-05-12T09:00:00.000Z",
    updatedAt: "2026-05-12T09:00:00.000Z",
  });
  summaryRepository.getByOwnerAndDate = async () => null;
  completionRepository.saveUserCompletionIfDayOpen = async () => {
    throw new Error("save should not be called");
  };

  try {
    await assert.rejects(
      markRoutineAsCompleted("routine-study", "temporary-user-id"),
      /Routine is not ready yet/,
    );
  } finally {
    routineRepository.getById = originalGetRoutine;
    summaryRepository.getByOwnerAndDate = originalGetSummary;
    completionRepository.saveUserCompletionIfDayOpen = originalSaveCompletion;
  }
});
