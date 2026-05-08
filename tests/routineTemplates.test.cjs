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
