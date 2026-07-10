const assert = require("node:assert/strict");
const test = require("node:test");

const {
  routineRepository,
} = require("../.build/repositories/routineRepository.js");
const {
  completionRepository,
} = require("../.build/repositories/completionRepository.js");
const {
  summaryRepository,
} = require("../.build/repositories/summaryRepository.js");
const {
  calculateDailySummary,
} = require("../.build/services/summaries/summaryService.js");
const {
  sortRoutinesByPriorityAndTime,
} = require("../.build/services/routines/routinePriorityService.js");

const baseRoutine = {
  ownerId: "temporary-user-id",
  category: "habit",
  frequencyType: "daily",
  scheduledTime: "09:00",
  reminderEnabled: false,
  status: "active",
  createdAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z",
};

test("routine update rejects another active routine with the same signature", async () => {
  const { handler } = require("../.build/handlers/updateRoutine.js");
  const originalGetById = routineRepository.getById;
  const originalListByOwner = routineRepository.listByOwner;
  const originalUpdateUnique = routineRepository.updateUnique;

  routineRepository.getById = async () => ({
    ...baseRoutine,
    id: "routine-1",
    title: "Morning walk",
    duplicateKey: "routine_duplicate#old",
  });
  routineRepository.listByOwner = async () => [
    {
      ...baseRoutine,
      id: "routine-1",
      title: "Morning walk",
      duplicateKey: "routine_duplicate#old",
    },
    {
      ...baseRoutine,
      id: "routine-2",
      title: "Drink water",
      category: "water",
      scheduledTime: "08:00",
      duplicateKey: "routine_duplicate#water",
    },
  ];
  routineRepository.updateUnique = async () => {
    throw new Error("updateUnique should not be called for prechecked duplicates");
  };

  try {
    const response = await handler({
      pathParameters: { id: "routine-1" },
      body: JSON.stringify({
        title: "Drink water",
        category: "water",
        frequencyType: "daily",
        scheduledTime: "08:00",
        reminderEnabled: false,
      }),
    });

    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).message, "Routine already exists");
  } finally {
    routineRepository.getById = originalGetById;
    routineRepository.listByOwner = originalListByOwner;
    routineRepository.updateUnique = originalUpdateUnique;
  }
});

test("routine update maps a conditional duplicate conflict to 409", async () => {
  const { handler } = require("../.build/handlers/updateRoutine.js");
  const originalGetById = routineRepository.getById;
  const originalListByOwner = routineRepository.listByOwner;
  const originalUpdateUnique = routineRepository.updateUnique;

  routineRepository.getById = async () => ({
    ...baseRoutine,
    id: "routine-1",
    title: "Morning walk",
    duplicateKey: "routine_duplicate#old",
  });
  routineRepository.listByOwner = async () => [];
  routineRepository.updateUnique = async () => {
    throw new Error("Routine already exists");
  };

  try {
    const response = await handler({
      pathParameters: { id: "routine-1" },
      body: JSON.stringify({
        title: "Drink water",
        category: "water",
        frequencyType: "daily",
        scheduledTime: "08:00",
        reminderEnabled: false,
      }),
    });

    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).message, "Routine already exists");
  } finally {
    routineRepository.getById = originalGetById;
    routineRepository.listByOwner = originalListByOwner;
    routineRepository.updateUnique = originalUpdateUnique;
  }
});

test("routine priority sorts high priority routines before time order", () => {
  const sorted = sortRoutinesByPriorityAndTime([
    { ...baseRoutine, id: "normal", title: "Normal", priority: "normal", scheduledTime: "08:00" },
    { ...baseRoutine, id: "low", title: "Low", priority: "low", scheduledTime: "07:00" },
    { ...baseRoutine, id: "high-late", title: "High late", priority: "high", scheduledTime: "20:00" },
    { ...baseRoutine, id: "high-early", title: "High early", priority: "high", scheduledTime: "10:00" },
  ]);

  assert.deepEqual(sorted.map((routine) => routine.id), [
    "high-early",
    "high-late",
    "normal",
    "low",
  ]);
});

test("routine history reads only the selected routine's completions", async () => {
  const { handler } = require("../.build/handlers/getRoutineHistory.js");
  const originalGetById = routineRepository.getById;
  const originalListBetweenDates = completionRepository.listByOwnerBetweenDates;

  routineRepository.getById = async () => ({
    ...baseRoutine,
    id: "routine-1",
    title: "Walk",
  });
  completionRepository.listByOwnerBetweenDates = async () => [
    { id: "other#2026-07-02", routineId: "other", date: "2026-07-02", status: "done" },
    { id: "routine-1#2026-07-03", routineId: "routine-1", date: "2026-07-03", status: "skipped" },
    { id: "routine-1#2026-07-04", routineId: "routine-1", date: "2026-07-04", status: "done" },
  ];

  try {
    const response = await handler({ pathParameters: { id: "routine-1" } });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.windowDays, 30);
    assert.deepEqual(body.items.map((item) => item.date), ["2026-07-04", "2026-07-03"]);
  } finally {
    routineRepository.getById = originalGetById;
    completionRepository.listByOwnerBetweenDates = originalListBetweenDates;
  }
});

test("today summary calculation does not write a non-finalized summary", async () => {
  const originalGetSummary = summaryRepository.getByOwnerAndDate;
  const originalUpsert = summaryRepository.upsert;

  summaryRepository.getByOwnerAndDate = async () => null;
  summaryRepository.upsert = async () => {
    throw new Error("Today reads must not write summaries");
  };

  try {
    const summary = await calculateDailySummary({
      ownerId: "temporary-user-id",
      date: "2026-07-09",
      activeRoutines: [{ ...baseRoutine, id: "routine-1", title: "Walk" }],
      completions: [],
    });

    assert.equal(summary.finalized, false);
    assert.equal(summary.totalRoutines, 1);
  } finally {
    summaryRepository.getByOwnerAndDate = originalGetSummary;
    summaryRepository.upsert = originalUpsert;
  }
});
