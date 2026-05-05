export type DailyBadge = "gold" | "silver" | "bronze" | "missed";

export type DailySummary = {
  id: string;
  ownerId: string;
  date: string;
  totalRoutines: number;
  completedCount: number;
  skippedCount: number;
  missedCount: number;
  totalPoints: number;
  earnedPoints: number;
  skippedPoints: number;
  missedPoints: number;
  pointCompletionRate: number;
  completionRate: number;
  badge: DailyBadge;
  streakBeforeThisDay: number;
  streakAfterThisDay: number;
  freezeUsed: boolean;
  freezeEarned: boolean;
  freezeBalanceAfterThisDay: number;
  streakProtected: boolean;
  finalized: boolean;
  createdAt: string;
  updatedAt: string;
};
