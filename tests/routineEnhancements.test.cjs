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
const {
  appendRoutineToTodayPlanIfOpen,
} = require("../.build/services/summaries/dailyPlanCoordinator.js");

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
  const originalListByOwnerAndDate = completionRepository.listByOwnerAndDate;
  const originalGetSummary = summaryRepository.getByOwnerAndDate;
  const originalSaveOpenPlan = summaryRepository.saveOpenPlanIfUnplanned;

  routineRepository.getById = async () => ({
    ...baseRoutine,
    id: "routine-1",
    title: "Morning walk",
    duplicateKey: "routine_duplicate#old",
  });
  routineRepository.listByOwner = async () => [];
  completionRepository.listByOwnerAndDate = async () => [];
  summaryRepository.getByOwnerAndDate = async () => null;
  summaryRepository.saveOpenPlanIfUnplanned = async () => true;
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
    completionRepository.listByOwnerAndDate = originalListByOwnerAndDate;
    summaryRepository.getByOwnerAndDate = originalGetSummary;
    summaryRepository.saveOpenPlanIfUnplanned = originalSaveOpenPlan;
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

test("daily snapshot preserves points after the routine is archived or edited", async () => {
  const originalGetSummary = summaryRepository.getByOwnerAndDate;
  const originalUpsert = summaryRepository.upsert;
  const date = "2026-07-17";

  summaryRepository.getByOwnerAndDate = async (_ownerId, requestedDate) =>
    requestedDate === date
      ? {
          id: `temporary-user-id#${date}`,
          ownerId: "temporary-user-id",
          date,
          routineSnapshots: [
            {
              routineId: "routine-1",
              title: "Workout",
              category: "workout",
              frequencyType: "daily",
              scheduledTime: "09:00",
              priority: "normal",
              reminderEnabled: false,
              points: 25,
            },
          ],
          finalized: false,
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z",
        }
      : null;
  summaryRepository.upsert = async () => {
    throw new Error("Read-only calculation should not write");
  };

  try {
    const summary = await calculateDailySummary({
      ownerId: "temporary-user-id",
      date,
      activeRoutines: [],
      completions: [
        {
          id: `routine-1#${date}`,
          ownerId: "temporary-user-id",
          routineId: "routine-1",
          date,
          status: "done",
          createdAt: "2026-07-17T09:00:00.000Z",
          updatedAt: "2026-07-17T09:00:00.000Z",
        },
      ],
    });

    assert.equal(summary.totalRoutines, 1);
    assert.equal(summary.completedCount, 1);
    assert.equal(summary.totalPoints, 25);
    assert.equal(summary.earnedPoints, 25);
    assert.equal(summary.badge, "gold");
  } finally {
    summaryRepository.getByOwnerAndDate = originalGetSummary;
    summaryRepository.upsert = originalUpsert;
  }
});

test("weekly routine validation requires exactly one selected day", () => {
  const {
    validateCreateRoutineBody,
  } = require("../.build/services/routines/routineValidation.js");
  const baseInput = {
    title: "Weekly review",
    category: "study",
    frequencyType: "weekly",
    scheduledTime: "19:00",
    reminderEnabled: false,
  };

  assert.equal(validateCreateRoutineBody(baseInput).ok, false);
  assert.equal(
    validateCreateRoutineBody({ ...baseInput, daysOfWeek: [1, 3] }).ok,
    false,
  );
  assert.equal(
    validateCreateRoutineBody({ ...baseInput, daysOfWeek: [1] }).ok,
    true,
  );
});

test("a newly created weekly routine is appended only on its scheduled day", async () => {
  const originalGetSummary = summaryRepository.getByOwnerAndDate;
  const originalAppendSnapshot = summaryRepository.appendRoutineSnapshotIfOpen;
  let appendCount = 0;

  summaryRepository.getByOwnerAndDate = async () => ({
    id: "temporary-user-id#2026-07-14",
    ownerId: "temporary-user-id",
    date: "2026-07-14",
    routineSnapshots: [],
    finalized: false,
  });
  summaryRepository.appendRoutineSnapshotIfOpen = async () => {
    appendCount += 1;
    return true;
  };

  try {
    await appendRoutineToTodayPlanIfOpen(
      {
        ...baseRoutine,
        id: "weekly-monday",
        title: "Weekly review",
        frequencyType: "weekly",
        daysOfWeek: [1],
        startDate: "2026-07-14",
      },
      new Date("2026-07-14T09:00:00.000Z"),
    );

    assert.equal(appendCount, 0);
  } finally {
    summaryRepository.getByOwnerAndDate = originalGetSummary;
    summaryRepository.appendRoutineSnapshotIfOpen = originalAppendSnapshot;
  }
});

test("dev request authorizer requires both token and allowed source IP", async () => {
  const { handler } = require("../.build/handlers/authorizeDevRequest.js");
  const originalToken = process.env.DEV_API_TOKEN;
  const originalSourceIp = process.env.DEV_ALLOWED_SOURCE_IP;

  process.env.DEV_API_TOKEN = "test-token";
  process.env.DEV_ALLOWED_SOURCE_IP = "203.0.113.10";

  try {
    const allowed = await handler({
      headers: { "x-routine-dev-key": "test-token" },
      requestContext: { http: { sourceIp: "203.0.113.10" } },
    });
    const deniedToken = await handler({
      headers: { "x-routine-dev-key": "wrong-token" },
      requestContext: { http: { sourceIp: "203.0.113.10" } },
    });
    const deniedIp = await handler({
      headers: { "x-routine-dev-key": "test-token" },
      requestContext: { http: { sourceIp: "203.0.113.11" } },
    });

    assert.equal(allowed.isAuthorized, true);
    assert.equal(deniedToken.isAuthorized, false);
    assert.equal(deniedIp.isAuthorized, false);
  } finally {
    if (originalToken === undefined) delete process.env.DEV_API_TOKEN;
    else process.env.DEV_API_TOKEN = originalToken;

    if (originalSourceIp === undefined) delete process.env.DEV_ALLOWED_SOURCE_IP;
    else process.env.DEV_ALLOWED_SOURCE_IP = originalSourceIp;
  }
});
