import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { tauriCommands, type GoalRecord, type SessionRecord, type SubjectRecord } from "../../lib/tauriCommands";
import {
  buildRecentIsoDates,
  isoDateFromTimestamp,
  sumMinutesByDate,
  targetForDate,
  totalMinutesForDates,
} from "../stats/analytics";

interface DashboardViewProps {
  userId: string;
}

type RangeFilter = "this-week" | "this-month" | "last-3-months";

function startDateForRange(range: RangeFilter, endIsoDate: string): string {
  const cursor = new Date(`${endIsoDate}T00:00:00.000Z`);

  if (range === "this-week") {
    const weekday = cursor.getUTCDay();
    const daysToMonday = weekday === 0 ? 6 : weekday - 1;
    cursor.setUTCDate(cursor.getUTCDate() - daysToMonday);
    return cursor.toISOString().slice(0, 10);
  }

  if (range === "this-month") {
    cursor.setUTCDate(1);
    return cursor.toISOString().slice(0, 10);
  }

  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() - 2);
  return cursor.toISOString().slice(0, 10);
}

function rangeLabel(range: RangeFilter): string {
  if (range === "this-week") {
    return "This week";
  }

  if (range === "this-month") {
    return "This month";
  }

  return "Last 3 months";
}

function formatMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function DashboardView({ userId }: DashboardViewProps): React.JSX.Element {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [range, setRange] = useState<RangeFilter>("this-week");
  const [targetsByWeekday, setTargetsByWeekday] = useState<Record<number, number>>({});
  const [status, setStatus] = useState("Track daily minutes, weekly consistency, and active goals in one place.");

  async function loadData(): Promise<void> {
    const [sessionsResponse, goalsResponse, subjectsResponse] = await Promise.all([
      tauriCommands.listSessions(userId),
      tauriCommands.listGoals(userId),
      tauriCommands.listSubjects(userId),
    ]);

    if (!sessionsResponse.success || !sessionsResponse.data) {
      setStatus(sessionsResponse.error || "Unable to load sessions.");
      return;
    }

    setSessions(sessionsResponse.data);

    if (goalsResponse.success && goalsResponse.data) {
      const goalsData = goalsResponse.data;

      setGoals(goalsData);
      const preferredGoal = goalsData.find((goal) => goal.is_active) || goalsData[0] || null;
      setSelectedGoalId((current) => {
        if (current !== "all" && goalsData.some((goal) => goal.id === current)) {
          return current;
        }
        return preferredGoal ? preferredGoal.id : "all";
      });
    } else {
      setGoals([]);
      setSelectedGoalId("all");
    }

    if (subjectsResponse.success && subjectsResponse.data) {
      setSubjects(subjectsResponse.data);
    } else {
      setSubjects([]);
    }
  }

  async function loadTargets(goalId: string): Promise<void> {
    const targetsResponse = await tauriCommands.listWeeklyTargets(goalId);
    if (!targetsResponse.success || !targetsResponse.data) {
      setTargetsByWeekday({});
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

  useEffect(() => {
    const selectedGoal = selectedGoalId === "all"
      ? goals.find((goal) => goal.is_active) || goals[0] || null
      : goals.find((goal) => goal.id === selectedGoalId) || null;

    if (!selectedGoal) {
      setTargetsByWeekday({});
      return;
    }

    void loadTargets(selectedGoal.id);
  }, [goals, selectedGoalId]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const selectedGoal = useMemo(() => {
    if (selectedGoalId === "all") {
      return goals.find((goal) => goal.is_active) || goals[0] || null;
    }

    return goals.find((goal) => goal.id === selectedGoalId) || null;
  }, [goals, selectedGoalId]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) || null,
    [selectedSubjectId, subjects]
  );

  const filteredSessions = useMemo(() => {
    const startDate = startDateForRange(range, today);

    return sessions.filter((session) => {
      const dateKey = isoDateFromTimestamp(session.start_time);

      if (dateKey < startDate || dateKey > today) {
        return false;
      }

      if (selectedGoalId !== "all" && (session.goal_id || "") !== selectedGoalId) {
        return false;
      }

      if (selectedSubjectId !== "all" && (session.subject_id || "") !== selectedSubjectId) {
        return false;
      }

      return true;
    });
  }, [range, selectedGoalId, selectedSubjectId, sessions, today]);

  const studiedMinutesByDate = useMemo(() => sumMinutesByDate(filteredSessions), [filteredSessions]);
  const last7Dates = useMemo(() => buildRecentIsoDates(7, today), [today]);

  const todayMinutes = studiedMinutesByDate[today] || 0;
  const todayTarget = selectedGoal ? targetForDate(targetsByWeekday, today) : 0;
  const last7Minutes = totalMinutesForDates(studiedMinutesByDate, last7Dates);
  const sessionsThisWeek = filteredSessions.filter((session) => {
    const dateKey = isoDateFromTimestamp(session.start_time);
    return last7Dates.includes(dateKey);
  }).length;

  const progressRatio = todayTarget <= 0 ? 0 : Math.min(1, todayMinutes / todayTarget);

  const trendBars = useMemo(() => {
    const values = last7Dates.map((date) => studiedMinutesByDate[date] || 0);
    const maxValue = Math.max(1, ...values);

    return last7Dates.map((date) => {
      const value = studiedMinutesByDate[date] || 0;
      return {
        date,
        value,
        heightPercent: Math.max(6, Math.round((value / maxValue) * 100)),
      };
    });
  }, [last7Dates, studiedMinutesByDate]);

  const filterSummary = useMemo(() => {
    const goalLabel = selectedGoal ? selectedGoal.title : "All goals";
    const subjectLabel = selectedSubject ? selectedSubject.name : "All subjects";
    return `Goal: ${goalLabel} · Range: ${rangeLabel(range)} · Subject: ${subjectLabel}`;
  }, [range, selectedGoal, selectedSubject]);

  return (
    <section>
      <div className="panel" style={{ marginBottom: "12px" }}>
        <h2>Dashboard</h2>
        <h3>Dashboard filters</h3>
        <div className="filter-grid">
          <label className="field">
            Goal
            <select value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)}>
              <option value="all">All goals</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Time range
            <select value={range} onChange={(event) => setRange(event.target.value as RangeFilter)}>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="last-3-months">Last 3 months</option>
            </select>
          </label>

          <label className="field">
            Subject
            <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
              <option value="all">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">{filterSummary}</p>
      </div>

      <div className="grid-3">
        <article className="kpi-card">
          <div className="kpi-label">Today progress</div>
          <div className="kpi-value">
            {todayMinutes} / {todayTarget} min
          </div>
          <div className="progress">
            <i style={{ width: `${Math.round(progressRatio * 100)}%` }} />
          </div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">7-day total</div>
          <div className="kpi-value">{formatMinutes(last7Minutes)}</div>
        </article>

        <article className="kpi-card">
          <div className="kpi-label">Sessions this week</div>
          <div className="kpi-value">{sessionsThisWeek}</div>
        </article>
      </div>

      <div className="panel" style={{ marginTop: "12px" }}>
        <h3>Study trend - last 7 days</h3>
        <div className="bars" id="dashboard-trend-bars">
          {trendBars.map((bar) => (
            <i
              key={bar.date}
              style={{ height: `${bar.heightPercent}%` }}
              title={`${bar.date}: ${bar.value} minutes`}
            />
          ))}
        </div>

        <div className="btn-row" style={{ marginTop: "12px" }}>
          <button className="btn primary" type="button" onClick={() => navigate("/timer")}>
            Start study session
          </button>
        </div>
      </div>

      <p className="status-line">{status}</p>
    </section>
  );
}
