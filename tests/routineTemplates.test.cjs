const assert = require("node:assert/strict");
const test = require("node:test");

const {
  listRoutineTemplates,
} = require("../.build/services/routines/routineTemplateService.js");

test("routine templates provide starter packs", () => {
  const templates = listRoutineTemplates();

  assert.equal(templates.length, 4);
  assert.deepEqual(
    templates.map((template) => template.id),
    ["morning-basics", "study-focus", "fitness-light", "health-basics"],
  );
});

test("routine template items match create routine payload shape", () => {
  const templates = listRoutineTemplates();
  const allItems = templates.flatMap((template) => template.items);

  assert.ok(allItems.length > 0);

  for (const item of allItems) {
    assert.equal(typeof item.title, "string");
    assert.equal(typeof item.category, "string");
    assert.equal(typeof item.frequencyType, "string");
    assert.match(item.scheduledTime, /^([01]\d|2[0-3]):([0-5]\d)$/);
    assert.equal(typeof item.reminderEnabled, "boolean");
  }
});

test("template apply skips duplicate active routines", async () => {
  const {
    routineRepository,
  } = require("../.build/repositories/routineRepository.js");
  const {
    summaryRepository,
  } = require("../.build/repositories/summaryRepository.js");
  const {
    createMissingTemplateRoutines,
  } = require("../.build/services/routines/routineCreationService.js");
  const originalListByOwner = routineRepository.listByOwner;
  const originalCreateUnique = routineRepository.createUnique;
  const originalGetSummary = summaryRepository.getByOwnerAndDate;
  const created = [];

  routineRepository.listByOwner = async () => [
    {
      id: "routine-water",
      ownerId: "temporary-user-id",
      title: "Su iç",
      category: "water",
      frequencyType: "daily",
      scheduledTime: "08:00",
      reminderEnabled: true,
      status: "active",
      createdAt: "2026-05-10T09:00:00.000Z",
      updatedAt: "2026-05-10T09:00:00.000Z",
    },
  ];
  routineRepository.createUnique = async (routine) => {
    created.push(routine);
  };
  summaryRepository.getByOwnerAndDate = async () => null;

  try {
    const result = await createMissingTemplateRoutines({
      ownerId: "temporary-user-id",
      nowDate: new Date("2026-05-11T04:00:00.000Z"),
      items: [
        {
          title: "Su iç",
          category: "water",
          frequencyType: "daily",
          scheduledTime: "08:00",
          reminderEnabled: true,
        },
        {
          title: "Vitamin al",
          category: "vitamin",
          frequencyType: "daily",
          scheduledTime: "08:15",
          reminderEnabled: true,
        },
      ],
    });

    assert.equal(result.created.length, 1);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, "duplicate");
    assert.equal(created[0].title, "Vitamin al");
  } finally {
    routineRepository.listByOwner = originalListByOwner;
    routineRepository.createUnique = originalCreateUnique;
    summaryRepository.getByOwnerAndDate = originalGetSummary;
  }
});

test("manual routine create reports duplicate active routines", async () => {
  const {
    handler,
  } = require("../.build/handlers/createRoutine.js");
  const {
    routineRepository,
  } = require("../.build/repositories/routineRepository.js");
  const {
    summaryRepository,
  } = require("../.build/repositories/summaryRepository.js");
  const originalCreateUnique = routineRepository.createUnique;
  const originalListByOwner = routineRepository.listByOwner;
  const originalGetSummary = summaryRepository.getByOwnerAndDate;

  routineRepository.listByOwner = async () => [
    {
      id: "routine-water",
      ownerId: "temporary-user-id",
      title: "Su iç",
      category: "water",
      frequencyType: "daily",
      scheduledTime: "08:00",
      reminderEnabled: true,
      status: "active",
      createdAt: "2026-05-10T09:00:00.000Z",
      updatedAt: "2026-05-10T09:00:00.000Z",
    },
  ];
  routineRepository.createUnique = async () => {
    throw new Error("createUnique should not be called for prechecked duplicates");
  };
  summaryRepository.getByOwnerAndDate = async () => null;

  try {
    const response = await handler({
      body: JSON.stringify({
        title: "Su iç",
        category: "water",
        frequencyType: "daily",
        scheduledTime: "08:00",
        reminderEnabled: true,
      }),
    });

    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).message, "Routine already exists");
  } finally {
    routineRepository.createUnique = originalCreateUnique;
    routineRepository.listByOwner = originalListByOwner;
    summaryRepository.getByOwnerAndDate = originalGetSummary;
  }
});

test("manual routine create reports duplicates caught by conditional writes", async () => {
  const {
    handler,
  } = require("../.build/handlers/createRoutine.js");
  const {
    routineRepository,
  } = require("../.build/repositories/routineRepository.js");
  const {
    summaryRepository,
  } = require("../.build/repositories/summaryRepository.js");
  const originalCreateUnique = routineRepository.createUnique;
  const originalListByOwner = routineRepository.listByOwner;
  const originalGetSummary = summaryRepository.getByOwnerAndDate;

  routineRepository.listByOwner = async () => [];
  routineRepository.createUnique = async () => {
    throw new Error("Routine already exists");
  };
  summaryRepository.getByOwnerAndDate = async () => null;

  try {
    const response = await handler({
      body: JSON.stringify({
        title: "Su iç",
        category: "water",
        frequencyType: "daily",
        scheduledTime: "08:00",
        reminderEnabled: true,
      }),
    });

    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).message, "Routine already exists");
  } finally {
    routineRepository.createUnique = originalCreateUnique;
    routineRepository.listByOwner = originalListByOwner;
    summaryRepository.getByOwnerAndDate = originalGetSummary;
  }
});

test("template apply skips duplicates caught by conditional writes", async () => {
  const {
    routineRepository,
  } = require("../.build/repositories/routineRepository.js");
  const {
    summaryRepository,
  } = require("../.build/repositories/summaryRepository.js");
  const {
    createMissingTemplateRoutines,
  } = require("../.build/services/routines/routineCreationService.js");
  const originalListByOwner = routineRepository.listByOwner;
  const originalCreateUnique = routineRepository.createUnique;
  const originalGetSummary = summaryRepository.getByOwnerAndDate;

  routineRepository.listByOwner = async () => [];
  routineRepository.createUnique = async () => {
    throw new Error("Routine already exists");
  };
  summaryRepository.getByOwnerAndDate = async () => null;

  try {
    const result = await createMissingTemplateRoutines({
      ownerId: "temporary-user-id",
      nowDate: new Date("2026-05-11T04:00:00.000Z"),
      items: [
        {
          title: "Su iç",
          category: "water",
          frequencyType: "daily",
          scheduledTime: "08:00",
          reminderEnabled: true,
        },
      ],
    });

    assert.equal(result.created.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, "duplicate");
  } finally {
    routineRepository.listByOwner = originalListByOwner;
    routineRepository.createUnique = originalCreateUnique;
    summaryRepository.getByOwnerAndDate = originalGetSummary;
  }
});
