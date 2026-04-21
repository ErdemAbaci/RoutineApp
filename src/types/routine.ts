export type RoutineCategory =
  | "water"
  | "medicine"
  | "vitamin"
  | "habit"
  | "study"
  | "walking"
  | "workout"
  | "supplement";

export type RoutineFrequencyType = "daily" | "weekly" | "selected_days";

export type RoutineStatus = "active" | "archived";

export type Routine = {
  id: string;
  ownerId: string;
  title: string;
  category: RoutineCategory;
  description?: string;
  frequencyType: RoutineFrequencyType;
  daysOfWeek?: number[];
  scheduledTime: string;
  reminderEnabled: boolean;
  status: RoutineStatus;
  createdAt: string;
  updatedAt: string;
};