const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isRoutineActiveOnDate,
} = require("../.build/services/schedule/scheduleService.js");

const baseRoutine = {
  id: "routine-1",
  ownerId: "temporary-user-id",
  title: "Water",
  category: "water",
  frequencyType: "daily",
  scheduledTime: "09:00",
  reminderEnabled: false,
  status: "active",
  createdAt: "2026-05-10T09:00:00.000Z",
  updatedAt: "2026-05-10T09:00:00.000Z",
};

test("routine does not become active before its start date", () => {
  const routine = {
    ...baseRoutine,
    startDate: "2026-05-12",
  };

  assert.equal(
    isRoutineActiveOnDate(routine, new Date("2026-05-11T09:00:00.000Z")),
    false,
  );
  assert.equal(
    isRoutineActiveOnDate(routine, new Date("2026-05-12T09:00:00.000Z")),
    true,
  );
});

test("legacy routines without start date remain active", () => {
  assert.equal(
    isRoutineActiveOnDate(baseRoutine, new Date("2026-05-11T09:00:00.000Z")),
    true,
  );
});
