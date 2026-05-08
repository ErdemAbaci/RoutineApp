const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getRoutineCategoryPoints,
} = require("../.build/services/routines/routineScoring.js");
const { calculateBadge } = require("../.build/services/summaries/badgeService.js");
const {
  calculateNextStreak,
} = require("../.build/services/summaries/streakService.js");
const {
  createInitialGamificationState,
  resolveFinalizedGamification,
} = require("../.build/services/summaries/gamificationService.js");

test("routine categories have expected point values", () => {
  assert.equal(getRoutineCategoryPoints("water"), 5);
  assert.equal(getRoutineCategoryPoints("vitamin"), 5);
  assert.equal(getRoutineCategoryPoints("medicine"), 10);
  assert.equal(getRoutineCategoryPoints("walking"), 15);
  assert.equal(getRoutineCategoryPoints("study"), 20);
  assert.equal(getRoutineCategoryPoints("workout"), 25);
});

test("badge thresholds are calculated from completion rate", () => {
  assert.equal(calculateBadge(100), "gold");
  assert.equal(calculateBadge(60), "silver");
  assert.equal(calculateBadge(1), "bronze");
  assert.equal(calculateBadge(0), "missed");
});

test("streak rules increment, preserve, or reset streak", () => {
  assert.equal(calculateNextStreak(3, "gold"), 4);
  assert.equal(calculateNextStreak(3, "silver"), 4);
  assert.equal(calculateNextStreak(3, "bronze"), 3);
  assert.equal(calculateNextStreak(3, "missed"), 0);
});

test("missed day consumes freeze and protects streak", () => {
  const result = resolveFinalizedGamification({
    state: {
      ownerId: "temporary-user-id",
      currentStreak: 5,
      freezeBalance: 1,
      createdAt: "2026-05-08T09:00:00.000Z",
      updatedAt: "2026-05-08T09:00:00.000Z",
    },
    badge: "missed",
    date: "2026-05-08",
    recentSummaries: [],
    now: "2026-05-08T21:00:00.000Z",
  });

  assert.equal(result.streakBeforeThisDay, 5);
  assert.equal(result.streakAfterThisDay, 5);
  assert.equal(result.freezeUsed, true);
  assert.equal(result.streakProtected, true);
  assert.equal(result.freezeBalanceAfterThisDay, 0);
  assert.equal(result.state.currentStreak, 5);
  assert.equal(result.state.freezeBalance, 0);
});

test("gold momentum earns one weekly freeze up to cap", () => {
  const state = createInitialGamificationState(
    "temporary-user-id",
    "2026-05-08T09:00:00.000Z",
  );
  const result = resolveFinalizedGamification({
    state,
    badge: "gold",
    date: "2026-05-08",
    recentSummaries: [
      { badge: "gold", finalized: true, date: "2026-05-07" },
      { badge: "gold", finalized: true, date: "2026-05-06" },
    ],
    now: "2026-05-08T21:00:00.000Z",
  });

  assert.equal(result.freezeEarned, true);
  assert.equal(result.freezeBalanceAfterThisDay, 1);
  assert.equal(result.state.currentStreak, 1);
});

test("freeze is not earned twice in the same week", () => {
  const result = resolveFinalizedGamification({
    state: {
      ownerId: "temporary-user-id",
      currentStreak: 4,
      freezeBalance: 1,
      lastFreezeAwardedWeek: "2026-W19",
      createdAt: "2026-05-08T09:00:00.000Z",
      updatedAt: "2026-05-08T09:00:00.000Z",
    },
    badge: "gold",
    date: "2026-05-08",
    recentSummaries: [
      { badge: "gold", finalized: true, date: "2026-05-07" },
      { badge: "gold", finalized: true, date: "2026-05-06" },
    ],
    now: "2026-05-08T21:00:00.000Z",
  });

  assert.equal(result.freezeEarned, false);
  assert.equal(result.freezeBalanceAfterThisDay, 1);
  assert.equal(result.state.currentStreak, 5);
});
