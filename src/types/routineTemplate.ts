import type { RoutineCategory, RoutineFrequencyType } from "./routine";

export type RoutineTemplateItem = {
  title: string;
  category: RoutineCategory;
  description?: string;
  frequencyType: RoutineFrequencyType;
  daysOfWeek?: number[];
  scheduledTime: string;
  reminderEnabled: boolean;
};

export type RoutineTemplate = {
  id: string;
  title: string;
  description: string;
  items: RoutineTemplateItem[];
};
