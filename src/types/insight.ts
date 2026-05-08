export type InsightType =
  | "routine_at_risk"
  | "often_skipped"
  | "streak_risk"
  | "positive_momentum"
  | "high_value_routine_missed";

export type InsightSeverity = "positive" | "low" | "medium" | "high";

export type InsightActionType =
  | "review_routine"
  | "complete_easy_routine"
  | "prioritize_routine"
  | "keep_momentum";

export type Insight = {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  action: {
    type: InsightActionType;
    label: string;
    targetRoutineId?: string;
  };
  routineId?: string;
  category?: string;
  metric?: {
    windowDays: number;
    count: number;
    threshold: number;
  };
};
