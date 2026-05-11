const DEFAULT_TIME_ZONE = process.env.APP_TIME_ZONE ?? "Europe/Istanbul";
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEFAULT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeKeyFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DEFAULT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

export function getDateKeyDaysAgo(daysAgo: number, now = new Date()): string {
  return getDateKeyDaysFromDate(-daysAgo, now);
}

export function getDateKeyDaysFromDate(daysFromDate: number, now = new Date()): string {
  const date = new Date(now);

  date.setUTCDate(date.getUTCDate() + daysFromDate);

  return formatDateKey(date);
}

export function formatTimeKey(date: Date): string {
  return timeKeyFormatter.format(date);
}

export function getDayOfWeek(date: Date): number {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIME_ZONE,
    weekday: "short",
  }).format(date);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return dayMap[day];
}
