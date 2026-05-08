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
const { listInsights } = require("../.build/services/insights/insightService.js");

test("insights include actionable response metadata", async () => {
  const originalListRoutines = routineRepository.listByOwner;
  const originalListCompletions = completionRepository.listByOwnerBetweenDates;
  const originalListSummaries = summaryRepository.listByOwner;

  routineRepository.listByOwner = async () => [
    {
      id: "routine-workout",
      ownerId: "temporary-user-id",
      title: "Workout",
      category: "workout",
      frequencyType: "daily",
      scheduledTime: "18:30",
      reminderEnabled: true,
      status: "active",
      createdAt: "2026-05-01T09:00:00.000Z",
      updatedAt: "2026-05-01T09:00:00.000Z",
    },
  ];
  completionRepository.listByOwnerBetweenDates = async () => [
    {
      id: "routine-workout#2026-05-07",
      ownerId: "temporary-user-id",
      routineId: "routine-workout",
      date: "2026-05-07",
      status: "missed",
      createdAt: "2026-05-07T21:00:00.000Z",
      updatedAt: "2026-05-07T21:00:00.000Z",
    },
    {
      id: "routine-workout#2026-05-08",
      ownerId: "temporary-user-id",
      routineId: "routine-workout",
      date: "2026-05-08",
      status: "missed",
      createdAt: "2026-05-08T21:00:00.000Z",
      updatedAt: "2026-05-08T21:00:00.000Z",
    },
  ];
  summaryRepository.listByOwner = async () => [];

  try {
    const insights = await listInsights("temporary-user-id");
    const routineRisk = insights.find(
      (insight) => insight.type === "routine_at_risk",
    );

    assert.ok(routineRisk);
    assert.deepEqual(routineRisk.action, {
      type: "review_routine",
      label: "Rutini gözden geçir",
      targetRoutineId: "routine-workout",
    });
  } finally {
    routineRepository.listByOwner = originalListRoutines;
    completionRepository.listByOwnerBetweenDates = originalListCompletions;
    summaryRepository.listByOwner = originalListSummaries;
  }
});
