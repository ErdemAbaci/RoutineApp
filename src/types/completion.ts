export type CompletionStatus = "done" | "skipped" | "missed";

export type RoutineCompletion = {
  id: string;
  ownerId: string;
  routineId: string;
  date: string;
  status: CompletionStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};