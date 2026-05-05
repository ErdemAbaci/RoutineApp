import { calculateNextStreak } from "./streakService";
import type { DailyBadge, DailySummary } from "../../types/dailySummary";
import type { GamificationState } from "../../types/gamificationState";

const MAX_FREEZE_BALANCE = 2;
const GOLD_DAYS_REQUIRED_FOR_FREEZE = 3;

function getWeekKey(date: string): string {
  const dateObject = new Date(`${date}T00:00:00.000Z`);
  const day = dateObject.getUTCDay() || 7;

  dateObject.setUTCDate(dateObject.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(dateObject.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((dateObject.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return `${dateObject.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function createInitialGamificationState(
  ownerId: string,
  now: string,
): GamificationState {
  return {
    ownerId,
    currentStreak: 0,
    freezeBalance: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveFinalizedGamification(params: {
  state: GamificationState;
  badge: DailyBadge;
  date: string;
  recentSummaries: DailySummary[];
  now: string;
}): {
  state: GamificationState;
  streakBeforeThisDay: number;
  streakAfterThisDay: number;
  freezeUsed: boolean;
  freezeEarned: boolean;
  freezeBalanceAfterThisDay: number;
  streakProtected: boolean;
} {
  const { state, badge, date, recentSummaries, now } = params;
  const streakBeforeThisDay = state.currentStreak;
  const shouldUseFreeze = badge === "missed" && state.freezeBalance > 0;
  const streakAfterBadge = shouldUseFreeze
    ? streakBeforeThisDay
    : calculateNextStreak(streakBeforeThisDay, badge);

  const weekKey = getWeekKey(date);
  const goldDaysInLastWeek =
    recentSummaries.filter((summary) => summary.badge === "gold").length +
    (badge === "gold" ? 1 : 0);

  const canEarnFreeze =
    goldDaysInLastWeek >= GOLD_DAYS_REQUIRED_FOR_FREEZE &&
    state.freezeBalance < MAX_FREEZE_BALANCE &&
    state.lastFreezeAwardedWeek !== weekKey;

  const freezeBalanceAfterUse = shouldUseFreeze
    ? state.freezeBalance - 1
    : state.freezeBalance;
  const freezeBalanceAfterThisDay = canEarnFreeze
    ? Math.min(freezeBalanceAfterUse + 1, MAX_FREEZE_BALANCE)
    : freezeBalanceAfterUse;

  return {
    state: {
      ...state,
      currentStreak: streakAfterBadge,
      freezeBalance: freezeBalanceAfterThisDay,
      lastFreezeAwardedWeek: canEarnFreeze
        ? weekKey
        : state.lastFreezeAwardedWeek,
      updatedAt: now,
    },
    streakBeforeThisDay,
    streakAfterThisDay: streakAfterBadge,
    freezeUsed: shouldUseFreeze,
    freezeEarned: canEarnFreeze,
    freezeBalanceAfterThisDay,
    streakProtected: shouldUseFreeze,
  };
}
