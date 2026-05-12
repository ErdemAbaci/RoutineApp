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
  const originalCreate = routineRepository.create;
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
  routineRepository.create = async (routine) => {
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
    routineRepository.create = originalCreate;
    summaryRepository.getByOwnerAndDate = originalGetSummary;
  }
});
