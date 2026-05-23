import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type SessionRecord } from "../../lib/tauriCommands";

import {
  averageMinutesPerSession,
  buildRecentIsoDates,
  calculateAchievedDays,
  calculateCurrentStreak,
  filterSessionsByDates,
  sumMinutesByDate,
  targetForDate,
  totalMinutesForDates,
  weekdayFromIsoDate,
} from "./analytics";

interface StatsViewProps {
  userId: string;
}

const weekdayLabels: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export function StatsView({ userId }: StatsViewProps): React.JSX.Element {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [targetsByWeekday, setTargetsByWeekday] = useState<Record<number, number>>({});
  const [status, setStatus] = useState("Measure your progress with trend and streak breakdowns.");

  async function loadData(): Promise<void> {
    const sessionsResponse = await tauriCommands.listSessions(userId);
    if (!sessionsResponse.success || !sessionsResponse.data) {
      setStatus(sessionsResponse.error || "Unable to load sessions.");
      return;
    }

    setSessions(sessionsResponse.data);

    const goalsResponse = await tauriCommands.listGoals(userId);
    if (!goalsResponse.success || !goalsResponse.data || goalsResponse.data.length === 0) {
      setTargetsByWeekday({});
      return;
    }

    const activeGoal = goalsResponse.data.find((goal) => goal.is_active) || goalsResponse.data[0];
    const targetsResponse = await tauriCommands.listWeeklyTargets(activeGoal.id);
    if (!targetsResponse.success || !targetsResponse.data) {
      return;
    }

    const mappedTargets: Record<number, number> = {};
    targetsResponse.data.forEach((target) => {
      mappedTargets[target.weekday] = target.target_minutes;
    });
    setTargetsByWeekday(mappedTargets);
  }

  useEffect(() => {
    void loadData();
  }, [userId]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const last30Dates = useMemo(() => buildRecentIsoDates(30, today), [today]);
  const studiedMinutesByDate = useMemo(() => sumMinutesByDate(sessions), [sessions]);
  const recentSessions = useMemo(() => filterSessionsByDates(sessions, last30Dates), [sessions, last30Dates]);

  const averageSessionMinutes = averageMinutesPerSession(recentSessions);
  const achievedDays = calculateAchievedDays(studiedMinutesByDate, targetsByWeekday, last30Dates);
  const streak = calculateCurrentStreak(studiedMinutesByDate, today);
  const studied30 = totalMinutesForDates(studiedMinutesByDate, last30Dates);
  const target30 = last30Dates.reduce(
    (sum, date) => sum + targetForDate(targetsByWeekday, date),
    0
  );

  const weekdayBreakdown = useMemo(() => {
    const totals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

    last30Dates.forEach((isoDate) => {
      const weekday = weekdayFromIsoDate(isoDate);
      totals[weekday] += studiedMinutesByDate[isoDate] || 0;
      counts[weekday] += 1;
    });

    return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
      const average = counts[weekday] > 0 ? totals[weekday] / counts[weekday] : 0;
      const target = targetsByWeekday[weekday] || 0;
      return {
        weekday,
        label: weekdayLabels[weekday],
        average: Math.round(average),
        target,
        delta: Math.round(average - target),
      };
    });
  }, [last30Dates, studiedMinutesByDate, targetsByWeekday]);

  return (
    <section className="panel">
      <h2>Statistics</h2>
      <p>{status}</p>
      <div className="grid-cards">
        <article className="stat-card">
          <strong>Average / session (30d)</strong>
          <span>{averageSessionMinutes.toFixed(1)} min</span>
        </article>
        <article className="stat-card">
          <strong>Achieved days (30d)</strong>
          <span>{achievedDays}</span>
        </article>
        <article className="stat-card">
          <strong>Streak</strong>
          <span>{streak} days</span>
        </article>
        <article className="stat-card">
          <strong>Target vs studied (30d)</strong>
          <span>
            {studied30}/{target30} min
          </span>
        </article>
      </div>

      <h3>Weekday target comparison</h3>
      <ul className="history-list" data-testid="weekday-breakdown">
        {weekdayBreakdown.map((row) => (
          <li key={row.weekday}>
            <strong>{row.label}</strong>
            <span>
              Avg {row.average} min vs target {row.target} ({row.delta >= 0 ? "+" : ""}
              {row.delta})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
