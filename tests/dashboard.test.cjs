const assert = require("node:assert/strict");
const test = require("node:test");

const {
  gamificationStateRepository,
} = require("../.build/repositories/gamificationStateRepository.js");
const {
  routineRepository,
} = require("../.build/repositories/routineRepository.js");
const {
  summaryRepository,
} = require("../.build/repositories/summaryRepository.js");
const { getDashboard } = require("../.build/services/dashboard/dashboardService.js");

test("dashboard aggregates weekly routine progress", async () => {
  const originalListRoutines = routineRepository.listByOwner;
  const originalListSummaries = summaryRepository.listByOwner;
  const originalGetState = gamificationStateRepository.getByOwner;

  routineRepository.listByOwner = async () => [
    { id: "r1", status: "active" },
    { id: "r2", status: "archived" },
    { id: "r3", status: "active" },
  ];
  summaryRepository.listByOwner = async () => [
    {
      date: "2026-05-11",
      badge: "gold",
      totalPoints: 30,
      earnedPoints: 30,
      completedCount: 2,
      skippedCount: 0,
      missedCount: 0,
      pointCompletionRate: 100,
      completionRate: 100,
      streakAfterThisDay: 4,
      freezeBalanceAfterThisDay: 1,
      finalized: true,
    },
    {
      date: "2026-05-10",
      badge: "silver",
      totalPoints: 20,
      earnedPoints: 12,
      completedCount: 1,
      skippedCount: 1,
      missedCount: 0,
      pointCompletionRate: 60,
      completionRate: 50,
      streakAfterThisDay: 3,
      freezeBalanceAfterThisDay: 0,
      finalized: true,
    },
  ];
  gamificationStateRepository.getByOwner = async () => ({
    ownerId: "temporary-user-id",
    currentStreak: 4,
    freezeBalance: 1,
    createdAt: "2026-05-10T21:00:00.000Z",
    updatedAt: "2026-05-11T21:00:00.000Z",
  });

  try {
    const dashboard = await getDashboard("temporary-user-id");

    assert.equal(dashboard.activeRoutineCount, 2);
    assert.equal(dashboard.currentStreak, 4);
    assert.equal(dashboard.freezeBalance, 1);
    assert.equal(dashboard.latestFinalizedDate, "2026-05-11");
    assert.equal(dashboard.totals.totalPoints, 50);
    assert.equal(dashboard.totals.earnedPoints, 42);
    assert.equal(dashboard.totals.averagePointCompletionRate, 80);
    assert.deepEqual(dashboard.badgeCounts, {
      gold: 1,
      silver: 1,
      bronze: 0,
      missed: 0,
    });
    assert.deepEqual(
      dashboard.weeklySummaries.map((summary) => summary.date),
      ["2026-05-10", "2026-05-11"],
    );
  } finally {
    routineRepository.listByOwner = originalListRoutines;
    summaryRepository.listByOwner = originalListSummaries;
    gamificationStateRepository.getByOwner = originalGetState;
  }
});
