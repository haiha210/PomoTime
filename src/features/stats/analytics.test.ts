import { describe, expect, it } from "vitest";

import type { SessionRecord } from "../../lib/tauriCommands";

import {
  filterSessionsByDates,
  isoDateFromTimestamp,
  averageMinutesPerSession,
  buildRecentIsoDates,
  calculateAchievedDays,
  calculateCurrentStreak,
  targetForDate,
  totalMinutesForDates,
  weekdayFromIsoDate,
  sumMinutesByDate,
} from "./analytics";

const sessions: SessionRecord[] = [
  {
    id: "s1",
    user_id: "u1",
    goal_id: "g1",
    subject_id: "sub1",
    title: "Session 1",
    note: "",
    start_time: "2026-05-20T08:00:00.000Z",
    end_time: "2026-05-20T08:30:00.000Z",
    duration_minutes: 30,
    work_mode: "focus_clock",
  },
  {
    id: "s2",
    user_id: "u1",
    goal_id: "g1",
    subject_id: "sub1",
    title: "Session 2",
    note: "",
    start_time: "2026-05-21T08:00:00.000Z",
    end_time: "2026-05-21T09:00:00.000Z",
    duration_minutes: 60,
    work_mode: "focus_clock",
  },
  {
    id: "s3",
    user_id: "u1",
    goal_id: "g1",
    subject_id: "sub1",
    title: "Session 3",
    note: "",
    start_time: "2026-05-22T08:00:00.000Z",
    end_time: "2026-05-22T08:45:00.000Z",
    duration_minutes: 45,
    work_mode: "pomodoro",
  },
];

describe("stats analytics", () => {
  it("aggregates studied minutes by date and computes streak", () => {
    const studiedByDate = sumMinutesByDate(sessions);

    expect(studiedByDate["2026-05-20"]).toBe(30);
    expect(studiedByDate["2026-05-21"]).toBe(60);
    expect(studiedByDate["2026-05-22"]).toBe(45);

    const streak = calculateCurrentStreak(studiedByDate, "2026-05-22");
    expect(streak).toBe(3);
  });

  it("computes achieved days and average session minutes", () => {
    const studiedByDate = sumMinutesByDate(sessions);
    const dateRange = buildRecentIsoDates(3, "2026-05-22");
    const targetsByWeekday = {
      1: 0,
      2: 0,
      3: 30,
      4: 60,
      5: 45,
      6: 0,
      7: 0,
    };

    const achievedDays = calculateAchievedDays(studiedByDate, targetsByWeekday, dateRange);
    expect(achievedDays).toBe(3);

    expect(averageMinutesPerSession(sessions)).toBeCloseTo(45, 5);
  });

  it("covers analytics fallback branches for invalid and empty inputs", () => {
    expect(isoDateFromTimestamp("invalid-timestamp")).toBe("invalid-ti");
    expect(weekdayFromIsoDate("2026-05-24")).toBe(7);

    const oneDateRange = buildRecentIsoDates(0, "2026-05-24");
    expect(oneDateRange).toEqual(["2026-05-24"]);

    const withNegativeDuration: SessionRecord[] = [
      {
        ...sessions[0],
        id: "s-neg",
        duration_minutes: -15,
      },
    ];
    const studiedByDate = sumMinutesByDate(withNegativeDuration);
    expect(studiedByDate["2026-05-20"]).toBe(0);

    expect(totalMinutesForDates(studiedByDate, ["2026-05-24"])).toBe(0);
    expect(targetForDate({}, "2026-05-24")).toBe(0);
    expect(calculateCurrentStreak({}, "2026-05-24")).toBe(0);
    expect(calculateAchievedDays(studiedByDate, {}, ["2026-05-20"])).toBe(0);
    expect(averageMinutesPerSession(withNegativeDuration)).toBe(0);

    expect(filterSessionsByDates(sessions, ["2026-05-21"])).toHaveLength(1);
  });
});
