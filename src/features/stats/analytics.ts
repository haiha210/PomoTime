import type { SessionRecord } from "../../lib/tauriCommands";
import { toLocalIsoDate } from "../../shared/utils/dateTime";

function parseIsoDateLocal(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function addLocalDays(isoDate: string, days: number): string {
  const date = parseIsoDateLocal(isoDate);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

export function isoDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 10);
  }

  return toLocalIsoDate(date);
}

export function weekdayFromIsoDate(isoDate: string): number {
  const date = parseIsoDateLocal(isoDate);
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
}

export function buildRecentIsoDates(days: number, endIsoDate: string): string[] {
  const normalizedDays = Math.max(1, days);
  const result: string[] = [];

  for (let index = normalizedDays - 1; index >= 0; index -= 1) {
    result.push(addLocalDays(endIsoDate, -index));
  }

  return result;
}

export function sumMinutesByDate(sessions: SessionRecord[]): Record<string, number> {
  const map: Record<string, number> = {};

  sessions.forEach((session) => {
    const isoDate = isoDateFromTimestamp(session.start_time);
    map[isoDate] = (map[isoDate] || 0) + Math.max(0, session.duration_minutes);
  });

  return map;
}

export function totalMinutesForDates(
  studiedMinutesByDate: Record<string, number>,
  dates: string[]
): number {
  return dates.reduce((sum, isoDate) => sum + (studiedMinutesByDate[isoDate] || 0), 0);
}

export function targetForDate(targetsByWeekday: Record<number, number>, isoDate: string): number {
  return targetsByWeekday[weekdayFromIsoDate(isoDate)] || 0;
}

export function calculateCurrentStreak(
  studiedMinutesByDate: Record<string, number>,
  endIsoDate: string
): number {
  let streak = 0;
  let cursor = endIsoDate;

  while ((studiedMinutesByDate[cursor] || 0) > 0) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
}

export function calculateAchievedDays(
  studiedMinutesByDate: Record<string, number>,
  targetsByWeekday: Record<number, number>,
  dates: string[]
): number {
  return dates.filter((isoDate) => {
    const target = targetForDate(targetsByWeekday, isoDate);
    const studied = studiedMinutesByDate[isoDate] || 0;
    return target > 0 && studied >= target;
  }).length;
}

export function averageMinutesPerSession(sessions: SessionRecord[]): number {
  const durations = sessions
    .map((session) => Math.max(0, session.duration_minutes))
    .filter((minutes) => minutes > 0);

  if (durations.length === 0) {
    return 0;
  }

  const total = durations.reduce((sum, value) => sum + value, 0);
  return total / durations.length;
}

export function filterSessionsByDates(sessions: SessionRecord[], dates: string[]): SessionRecord[] {
  const allowed = new Set(dates);

  return sessions.filter((session) => allowed.has(isoDateFromTimestamp(session.start_time)));
}
