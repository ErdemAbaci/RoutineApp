import type {
  RoutineCategory,
  RoutineFrequencyType,
  RoutinePriority,
} from "./routine";

export type DailyBadge = "gold" | "silver" | "bronze" | "missed";

export type DailyRoutineSnapshot = {
  routineId: string;
  title: string;
  category: RoutineCategory;
  frequencyType: RoutineFrequencyType;
  scheduledTime: string;
  priority: RoutinePriority;
  reminderEnabled: boolean;
  points: number;
};

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
  routineSnapshots?: DailyRoutineSnapshot[];
  finalized: boolean;
  createdAt: string;
  updatedAt: string;
};
