import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type SessionRecord } from "../../lib/tauriCommands";
import {
  buildRecentIsoDates,
  calculateAchievedDays,
  calculateCurrentStreak,
  sumMinutesByDate,
  targetForDate,
  totalMinutesForDates,
} from "../stats/analytics";

interface DashboardViewProps {
  userId: string;
}

export function DashboardView({ userId }: DashboardViewProps): React.JSX.Element {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [targetsByWeekday, setTargetsByWeekday] = useState<Record<number, number>>({});
  const [status, setStatus] = useState("Track daily minutes, weekly consistency, and active goals in one place.");

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
  const studiedMinutesByDate = useMemo(() => sumMinutesByDate(sessions), [sessions]);
  const last7Dates = useMemo(() => buildRecentIsoDates(7, today), [today]);
  const last30Dates = useMemo(() => buildRecentIsoDates(30, today), [today]);

  const todayMinutes = studiedMinutesByDate[today] || 0;
  const todayTarget = targetForDate(targetsByWeekday, today);
  const last7Minutes = totalMinutesForDates(studiedMinutesByDate, last7Dates);
  const last30Minutes = totalMinutesForDates(studiedMinutesByDate, last30Dates);
  const streak = calculateCurrentStreak(studiedMinutesByDate, today);
  const achievedDays30 = calculateAchievedDays(studiedMinutesByDate, targetsByWeekday, last30Dates);

  return (
    <section className="panel">
      <h2>Dashboard</h2>
      <p>{status}</p>
      <div className="grid-cards">
        <article className="stat-card">
          <strong>Today</strong>
          <span>{todayMinutes} min</span>
        </article>
        <article className="stat-card">
          <strong>7-day total</strong>
          <span>{last7Minutes} min</span>
        </article>
        <article className="stat-card">
          <strong>30-day total</strong>
          <span>{last30Minutes} min</span>
        </article>
        <article className="stat-card">
          <strong>Today target</strong>
          <span>
            {todayTarget} min ({todayMinutes - todayTarget >= 0 ? "+" : ""}
            {todayMinutes - todayTarget})
          </span>
        </article>
        <article className="stat-card">
          <strong>Streak</strong>
          <span>{streak} days</span>
        </article>
        <article className="stat-card">
          <strong>Achieved days (30d)</strong>
          <span>{achievedDays30}</span>
        </article>
      </div>
    </section>
  );
}
