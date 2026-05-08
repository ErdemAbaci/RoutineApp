const assert = require("node:assert/strict");
const test = require("node:test");

const {
  formatDateKey,
  getDayOfWeek,
} = require("../.build/utils/date.js");

test("date key uses application timezone instead of raw UTC date", () => {
  const lateUtcDate = new Date("2026-05-07T22:30:00.000Z");

  assert.equal(formatDateKey(lateUtcDate), "2026-05-08");
});

test("day of week uses application timezone", () => {
  const lateUtcDate = new Date("2026-05-09T22:30:00.000Z");

  assert.equal(getDayOfWeek(lateUtcDate), 0);
});
