import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type GoalRecord, type SessionRecord, type SubjectRecord } from "../../lib/tauriCommands";

import {
  buildRecentIsoDates,
  calculateAchievedDays,
  isoDateFromTimestamp,
  sumMinutesByDate,
  targetForDate,
  totalMinutesForDates,
} from "./analytics";

interface StatsViewProps {
  userId: string;
}

type RangeFilter = "this-week" | "this-month" | "last-3-months";

const subjectPalette = ["#0f766e", "#5aa79f", "#8fd9d1", "#b7e8e2", "#d7ece9", "#88b6cc"];

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

function buildDateWindow(startIsoDate: string, endIsoDate: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${startIsoDate}T00:00:00.000Z`);
  const end = new Date(`${endIsoDate}T00:00:00.000Z`);

  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

function formatMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function longestStreakFromDates(dateSet: Set<string>): number {
  if (dateSet.size === 0) {
    return 0;
  }

  const sorted = [...dateSet].sort();
  let longest = 1;
  let current = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(`${sorted[index - 1]}T00:00:00.000Z`);
    previous.setUTCDate(previous.getUTCDate() + 1);

    if (previous.toISOString().slice(0, 10) === sorted[index]) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 1;
  }

  return longest;
}

function currentStreakFromDates(dateSet: Set<string>, endIsoDate: string): number {
  let streak = 0;
  let cursor = endIsoDate;

  while (dateSet.has(cursor)) {
    streak += 1;
    const previous = new Date(`${cursor}T00:00:00.000Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    cursor = previous.toISOString().slice(0, 10);
  }

  return streak;
}

export function StatsView({ userId }: StatsViewProps): React.JSX.Element {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [targetsByWeekday, setTargetsByWeekday] = useState<Record<number, number>>({});
  const [range, setRange] = useState<RangeFilter>("this-month");
  const [status, setStatus] = useState("Measure your progress with trend and streak breakdowns.");

  async function loadData(): Promise<void> {
    const [sessionsResponse, goalsResponse, subjectsResponse] = await Promise.all([
      tauriCommands.listSessions(userId),
      tauriCommands.listGoals(userId),
      tauriCommands.listSubjects(userId),
    ]);

    if (!sessionsResponse.success || !sessionsResponse.data) {
      setStatus(sessionsResponse.error || "Unable to load sessions.");
      setSessions([]);
      return;
    }

    setSessions(sessionsResponse.data);

    if (goalsResponse.success && goalsResponse.data) {
      setGoals(goalsResponse.data);
    } else {
      setGoals([]);
    }

    if (subjectsResponse.success && subjectsResponse.data) {
      setSubjects(subjectsResponse.data);
    } else {
      setSubjects([]);
    }
  }

  async function loadTargets(goalId: string): Promise<void> {
    const response = await tauriCommands.listWeeklyTargets(goalId);
    if (!response.success || !response.data) {
      setTargetsByWeekday({});
      return;
    }

    const mapped: Record<number, number> = {};
    response.data.forEach((target) => {
      mapped[target.weekday] = target.target_minutes;
    });
    setTargetsByWeekday(mapped);
  }

  useEffect(() => {
    void loadData();
  }, [userId]);

  const today = new Date().toISOString().slice(0, 10);

  const activeGoal = useMemo(() => goals.find((goal) => goal.is_active) || goals[0] || null, [goals]);

  useEffect(() => {
    if (!activeGoal?.id) {
      setTargetsByWeekday({});
      return;
    }

    void loadTargets(activeGoal.id);
  }, [activeGoal?.id]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject) => {
      map.set(subject.id, subject.name);
    });
    return map;
  }, [subjects]);

  const selectedDates = useMemo(() => {
    const startDate = startDateForRange(range, today);
    return buildDateWindow(startDate, today);
  }, [range, today]);

  const selectedDateSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const goalScopedSessions = useMemo(() => {
    if (!activeGoal) {
      return sessions;
    }

    return sessions.filter((session) => (session.goal_id || "") === activeGoal.id);
  }, [activeGoal, sessions]);

  const sessionsInRange = useMemo(
    () => goalScopedSessions.filter((session) => selectedDateSet.has(isoDateFromTimestamp(session.start_time))),
    [goalScopedSessions, selectedDateSet]
  );

  const studiedMinutesByDate = useMemo(() => sumMinutesByDate(sessionsInRange), [sessionsInRange]);
  const totalStudyMinutes = totalMinutesForDates(studiedMinutesByDate, selectedDates);
  const achievedDays = calculateAchievedDays(studiedMinutesByDate, targetsByWeekday, selectedDates);
  const averagePerDay = selectedDates.length > 0 ? Math.round(totalStudyMinutes / selectedDates.length) : 0;

  const weeklyDates = useMemo(() => buildRecentIsoDates(7, today), [today]);
  const weeklyBars = useMemo(() => {
    const values = weeklyDates.map((date) => studiedMinutesByDate[date] || 0);
    const maxValue = Math.max(1, ...values);

    return weeklyDates.map((date) => {
      const value = studiedMinutesByDate[date] || 0;
      return {
        date,
        value,
        heightPercent: Math.max(6, Math.round((value / maxValue) * 100)),
      };
    });
  }, [studiedMinutesByDate, weeklyDates]);

  const subjectSplit = useMemo(() => {
    const bySubject: Record<string, number> = {};

    sessionsInRange.forEach((session) => {
      const key = session.subject_id ? subjectNameById.get(session.subject_id) || session.subject_id : "General";
      bySubject[key] = (bySubject[key] || 0) + Math.max(0, session.duration_minutes);
    });

    return Object.entries(bySubject)
      .map(([subject, minutes]) => ({ subject, minutes }))
      .sort((left, right) => right.minutes - left.minutes);
  }, [sessionsInRange, subjectNameById]);

  const donutStyle = useMemo(() => {
    const totalMinutes = subjectSplit.reduce((sum, item) => sum + item.minutes, 0);
    if (totalMinutes <= 0) {
      return { background: "conic-gradient(#d7ece9 0deg 360deg)" };
    }

    let cursor = 0;
    const segments = subjectSplit
      .map((item, index) => {
        const angle = (item.minutes / totalMinutes) * 360;
        const start = cursor;
        const end = cursor + angle;
        cursor = end;
        const color = subjectPalette[index % subjectPalette.length];
        return `${color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
      })
      .join(", ");

    return { background: `conic-gradient(${segments})` };
  }, [subjectSplit]);

  const achievementSubjects = useMemo(() => {
    const names = new Set<string>(subjects.map((subject) => subject.name));
    subjectSplit.forEach((entry) => names.add(entry.subject));

    if (names.size === 0) {
      names.add("General");
    }

    return [...names];
  }, [subjectSplit, subjects]);

  const subjectDateMinutes = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};

    achievementSubjects.forEach((subjectName) => {
      matrix[subjectName] = {};
    });

    sessionsInRange.forEach((session) => {
      const subjectName = session.subject_id ? subjectNameById.get(session.subject_id) || session.subject_id : "General";
      const date = isoDateFromTimestamp(session.start_time);
      matrix[subjectName] = matrix[subjectName] || {};
      matrix[subjectName][date] = (matrix[subjectName][date] || 0) + Math.max(0, session.duration_minutes);
    });

    return matrix;
  }, [achievementSubjects, sessionsInRange, subjectNameById]);

  const allSessionDateSet = useMemo(() => {
    return new Set(sessions.map((session) => isoDateFromTimestamp(session.start_time)));
  }, [sessions]);

  const highestOverallStreak = longestStreakFromDates(allSessionDateSet);
  const currentGoalStreak = currentStreakFromDates(
    new Set(goalScopedSessions.map((session) => isoDateFromTimestamp(session.start_time))),
    today
  );

  const subjectStreakRows = useMemo(() => {
    return achievementSubjects.map((subjectName) => {
      const subjectDates = new Set(
        sessions
          .filter((session) => {
            const sessionSubject = session.subject_id ? subjectNameById.get(session.subject_id) || session.subject_id : "General";
            return sessionSubject === subjectName;
          })
          .map((session) => isoDateFromTimestamp(session.start_time))
      );

      return {
        subject: subjectName,
        current: currentStreakFromDates(subjectDates, today),
        highest: longestStreakFromDates(subjectDates),
      };
    });
  }, [achievementSubjects, sessions, subjectNameById, today]);

  const goalStreakRows = useMemo(() => {
    return goals.map((goal) => {
      const goalDates = new Set(
        sessions
          .filter((session) => (session.goal_id || "") === goal.id)
          .map((session) => isoDateFromTimestamp(session.start_time))
      );

      return {
        goal: goal.title,
        current: currentStreakFromDates(goalDates, today),
        highest: longestStreakFromDates(goalDates),
      };
    });
  }, [goals, sessions, today]);

  const maxSubjectStreak = Math.max(1, ...subjectStreakRows.map((row) => row.current));
  const maxGoalStreak = Math.max(1, ...goalStreakRows.map((row) => row.current));

  return (
    <section className="panel">
      <h2>Statistics</h2>
      <p className="muted" id="stats-active-goal-label">
        Active goal: {activeGoal ? activeGoal.title : "No active goal"}
      </p>

      <div className="btn-row" style={{ marginBottom: "12px" }}>
        <button
          className={range === "this-week" ? "btn secondary filter-active" : "btn secondary"}
          type="button"
          onClick={() => setRange("this-week")}
        >
          This week
        </button>
        <button
          className={range === "this-month" ? "btn secondary filter-active" : "btn secondary"}
          type="button"
          onClick={() => setRange("this-month")}
        >
          This month
        </button>
        <button
          className={range === "last-3-months" ? "btn secondary filter-active" : "btn secondary"}
          type="button"
          onClick={() => setRange("last-3-months")}
        >
          Last 3 months
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: "12px" }}>
        <article className="kpi-card">
          <div className="kpi-label">Total study time</div>
          <div className="kpi-value" id="stats-total-time">
            {formatMinutes(totalStudyMinutes)}
          </div>
        </article>
        <article className="kpi-card">
          <div className="kpi-label">Goal achieved days</div>
          <div className="kpi-value" id="stats-achieved-days">
            {achievedDays} days
          </div>
        </article>
        <article className="kpi-card">
          <div className="kpi-label">Average per day</div>
          <div className="kpi-value" id="stats-average-time">
            {averagePerDay}m
          </div>
        </article>
      </div>

      <div className="stats-layout">
        <div className="panel">
          <h3>Weekly trend</h3>
          <div className="bars" style={{ height: "130px" }}>
            {weeklyBars.map((bar) => (
              <i key={bar.date} style={{ height: `${bar.heightPercent}%` }} title={`${bar.date}: ${bar.value} minutes`} />
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Subject split</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="donut" style={donutStyle} />
            <div className="muted">
              {subjectSplit.length === 0 ? (
                <span>No subject data.</span>
              ) : (
                subjectSplit.map((item) => {
                  const totalMinutes = Math.max(1, subjectSplit.reduce((sum, row) => sum + row.minutes, 0));
                  const ratio = Math.round((item.minutes / totalMinutes) * 100);
                  return (
                    <div key={item.subject}>
                      {item.subject}: {ratio}%
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "12px" }}>
        <h3>Daily goal achievement by subject</h3>
        <p className="muted">Green means achieved, orange means below target, gray means no study log.</p>
        <div className="achievement-chart" style={{ marginTop: "10px" }}>
          <div className="achievement-header">
            <div className="achievement-subject">Subject</div>
            {weeklyDates.map((date) => (
              <div key={`head-${date}`} className="achievement-cell">
                {date.slice(5)}
              </div>
            ))}
          </div>
          {achievementSubjects.map((subjectName) => (
            <div key={subjectName} className="achievement-row">
              <div className="achievement-subject">{subjectName}</div>
              {weeklyDates.map((date) => {
                const subjectMinutes = subjectDateMinutes[subjectName]?.[date] || 0;
                const dayTarget = targetForDate(targetsByWeekday, date);
                const dayTotal = studiedMinutesByDate[date] || 0;

                let dotClass = "none";
                if (subjectMinutes > 0) {
                  dotClass = dayTarget > 0 && dayTotal >= dayTarget ? "achieved" : "missed";
                }

                return (
                  <div key={`${subjectName}-${date}`} className="achievement-cell">
                    <div className={`day-dot ${dotClass}`} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="stats-layout" style={{ marginTop: "12px" }}>
        <div className="panel">
          <h3>Streak analytics</h3>
          <div className="grid-2" style={{ marginTop: "8px" }}>
            <article className="kpi-card">
              <div className="kpi-label">Highest streak overall</div>
              <div className="kpi-value" id="stats-highest-streak">
                {highestOverallStreak} days
              </div>
            </article>
            <article className="kpi-card">
              <div className="kpi-label">Current active goal streak</div>
              <div className="kpi-value" id="stats-current-goal-streak">
                {currentGoalStreak} days
              </div>
            </article>
          </div>
        </div>

        <div className="panel">
          <h3>Streak by subject</h3>
          <div className="compare-list" id="stats-subject-streak-list">
            {subjectStreakRows.map((row) => {
              const width = Math.round((row.current / maxSubjectStreak) * 100);

              return (
                <div key={row.subject} className="compare-item">
                  <div className="compare-head">
                    <strong>{row.subject}</strong>
                    <span>
                      {row.current}d current · {row.highest}d best
                    </span>
                  </div>
                  <div className="compare-bar">
                    <i style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "12px" }}>
        <h3>Streak by goal</h3>
        <div className="compare-list" id="stats-goal-streak-list">
          {goalStreakRows.map((row) => {
            const width = Math.round((row.current / maxGoalStreak) * 100);

            return (
              <div key={row.goal} className="compare-item">
                <div className="compare-head">
                  <strong>{row.goal}</strong>
                  <span>
                    {row.current}d current · {row.highest}d best
                  </span>
                </div>
                <div className="compare-bar">
                  <i style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="status-line">{status}</p>
    </section>
  );
}
