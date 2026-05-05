export type GamificationState = {
  ownerId: string;
  currentStreak: number;
  freezeBalance: number;
  lastFreezeAwardedWeek?: string;
  createdAt: string;
  updatedAt: string;
};
