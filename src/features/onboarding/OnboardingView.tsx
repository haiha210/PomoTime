import { FormEvent, useEffect, useMemo, useState } from "react";
import Select, { type SingleValue } from "react-select";
import { useNavigate } from "react-router-dom";

import { tauriCommands, type GoalRecord, type SessionRecord, type SubjectRecord } from "../../lib/tauriCommands";
import { NativePickerInput } from "../../shared/components/NativePickerInput";
import { isValidIsoDate, toLocalIsoDate } from "../../shared/utils/dateTime";

interface OnboardingViewProps {
  userId: string;
}

interface QuickSelectOption {
  value: string;
  label: string;
}

function todayIsoDate(): string {
  return toLocalIsoDate(new Date());
}

function plusDaysIsoDate(days: number): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return toLocalIsoDate(next);
}

function isoDateFromTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp.slice(0, 10);
  }

  return toLocalIsoDate(parsed);
}

function formatMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function buildRecentIsoDates(days: number, endIsoDate: string): string[] {
  const [endYear, endMonth, endDay] = endIsoDate.split("-").map((part) => Number(part));
  const end = new Date(endYear, endMonth - 1, endDay);
  const result: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const cursor = new Date(end);
    cursor.setDate(end.getDate() - index);
    result.push(toLocalIsoDate(cursor));
  }

  return result;
}

function dayShortLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  const parsed = new Date(year, month - 1, day);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parsed.getDay()];
}

function workModeLabel(mode: string): string {
  return mode === "pomodoro" ? "Tomato Sprint (Pomodoro)" : "Focus Clock (Count up)";
}

export function OnboardingView({ userId }: OnboardingViewProps): React.JSX.Element {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [targetsByWeekday, setTargetsByWeekday] = useState<Record<number, number>>({});
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState("custom");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState(plusDaysIsoDate(90));

  const [quickStudySubject, setQuickStudySubject] = useState("General");
  const [quickStudyMode, setQuickStudyMode] = useState("focus_clock");

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isWorkModeModalOpen, setIsWorkModeModalOpen] = useState(false);
  const [draftQuickSubject, setDraftQuickSubject] = useState("General");
  const [draftQuickWorkMode, setDraftQuickWorkMode] = useState("focus_clock");

  const [status, setStatus] = useState("Create your first goal to unlock quick study.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = useMemo(() => todayIsoDate(), []);
  const weekDates = useMemo(() => buildRecentIsoDates(7, today), [today]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject) => {
      map.set(subject.id, subject.name);
    });
    return map;
  }, [subjects]);

  const activeGoal = useMemo(() => goals.find((goal) => goal.is_active) || goals[0] || null, [goals]);

  const studiedMinutesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((session) => {
      const isoDate = isoDateFromTimestamp(session.start_time);
      map[isoDate] = (map[isoDate] || 0) + Math.max(0, session.duration_minutes);
    });
    return map;
  }, [sessions]);

  const weekTotalMinutes = useMemo(
    () => weekDates.reduce((total, date) => total + (studiedMinutesByDate[date] || 0), 0),
    [studiedMinutesByDate, weekDates]
  );

  const weekSessions = useMemo(
    () => sessions.filter((session) => weekDates.includes(isoDateFromTimestamp(session.start_time))).length,
    [sessions, weekDates]
  );

  const weekAverageMinutes = weekSessions > 0 ? Math.round(weekTotalMinutes / weekSessions) : 0;

  const weekColumns = useMemo(() => {
    const rawValues = weekDates.map((date) => {
      const [year, month, day] = date.split("-").map((part) => Number(part));
      const weekday = new Date(year, month - 1, day).getDay();
      const normalizedWeekday = weekday === 0 ? 7 : weekday;
      const studied = studiedMinutesByDate[date] || 0;
      const target = targetsByWeekday[normalizedWeekday] || 0;

      return {
        date,
        studied,
        target,
        achieved: target > 0 && studied >= target,
      };
    });

    const maxValue = Math.max(
      1,
      ...rawValues.map((item) => Math.max(item.studied, item.target))
    );

    return rawValues.map((item) => ({
      ...item,
      heightPercent: Math.max(6, Math.round((item.studied / maxValue) * 100)),
    }));
  }, [studiedMinutesByDate, targetsByWeekday, weekDates]);

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => b.end_time.localeCompare(a.end_time))
      .slice(0, 5)
      .map((session) => ({
        ...session,
        subjectName: session.subject_id
          ? subjectNameById.get(session.subject_id) || session.subject_id
          : "General",
      }));
  }, [sessions, subjectNameById]);

  const availableQuickSubjects = useMemo(() => {
    if (subjects.length === 0) {
      return ["General"];
    }

    return subjects.map((subject) => subject.name);
  }, [subjects]);

  const subjectSelectOptions = useMemo<QuickSelectOption[]>(() => {
    return availableQuickSubjects.map((subjectName) => ({
      value: subjectName,
      label: subjectName,
    }));
  }, [availableQuickSubjects]);

  const workModeSelectOptions = useMemo<QuickSelectOption[]>(
    () => [
      { value: "pomodoro", label: "Tomato Sprint (Pomodoro)" },
      { value: "focus_clock", label: "Focus Clock (Count up)" },
    ],
    []
  );

  const draftSubjectOption = useMemo(() => {
    return subjectSelectOptions.find((option) => option.value === draftQuickSubject) || subjectSelectOptions[0] || null;
  }, [draftQuickSubject, subjectSelectOptions]);

  const draftWorkModeOption = useMemo(() => {
    return workModeSelectOptions.find((option) => option.value === draftQuickWorkMode) || workModeSelectOptions[0] || null;
  }, [draftQuickWorkMode, workModeSelectOptions]);

  const selectPortalTarget = typeof document !== "undefined" ? document.body : undefined;

  function handleSubjectSelectChange(option: SingleValue<QuickSelectOption>): void {
    if (!option) {
      return;
    }

    setDraftQuickSubject(option.value);
  }

  function handleWorkModeSelectChange(option: SingleValue<QuickSelectOption>): void {
    if (!option) {
      return;
    }

    setDraftQuickWorkMode(option.value);
  }

  async function loadGoals(): Promise<void> {
    const [goalsResponse, sessionsResponse, subjectsResponse] = await Promise.all([
      tauriCommands.listGoals(userId),
      tauriCommands.listSessions(userId),
      tauriCommands.listSubjects(userId),
    ]);

    if (!goalsResponse.success || !goalsResponse.data) {
      setGoals([]);
      return;
    }

    setGoals(goalsResponse.data);

    if (sessionsResponse.success && sessionsResponse.data) {
      const sessionData = sessionsResponse.data;

      setSessions(sessionData);

      const latest = [...sessionData].sort((a, b) => b.end_time.localeCompare(a.end_time))[0];
      if (latest) {
        setQuickStudyMode(latest.work_mode || "focus_clock");
      }
    }

    if (subjectsResponse.success && subjectsResponse.data) {
      setSubjects(subjectsResponse.data);

      const fallbackSubject = subjectsResponse.data[0]?.name || "General";

      if (sessionsResponse.success && sessionsResponse.data && sessionsResponse.data.length > 0) {
        const latest = [...sessionsResponse.data].sort((a, b) => b.end_time.localeCompare(a.end_time))[0];
        if (latest?.subject_id) {
          const matchedSubject = subjectsResponse.data.find((subject) => subject.id === latest.subject_id);
          setQuickStudySubject(matchedSubject?.name || fallbackSubject);
        } else {
          setQuickStudySubject(fallbackSubject);
        }
      } else {
        setQuickStudySubject(fallbackSubject);
      }

      return;
    }

    setSubjects([]);
    setQuickStudySubject("General");
  }

  async function loadWeeklyTargets(goalId: string): Promise<void> {
    const response = await tauriCommands.listWeeklyTargets(goalId);
    if (!response.success || !response.data) {
      setTargetsByWeekday({});
      return;
    }

    const next: Record<number, number> = {};
    response.data.forEach((target) => {
      next[target.weekday] = target.target_minutes;
    });

    setTargetsByWeekday(next);
  }

  useEffect(() => {
    void loadGoals();
  }, [userId]);

  useEffect(() => {
    if (!activeGoal?.id) {
      setTargetsByWeekday({});
      return;
    }

    void loadWeeklyTargets(activeGoal.id);
  }, [activeGoal?.id]);

  useEffect(() => {
    setDraftQuickSubject(quickStudySubject);
  }, [quickStudySubject]);

  useEffect(() => {
    setDraftQuickWorkMode(quickStudyMode);
  }, [quickStudyMode]);

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setStatus("Goal title is required.");
      return;
    }

    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      setStatus("Dates must use YYYY-MM-DD format.");
      return;
    }

    if (startDate > endDate) {
      setStatus("End date must be after start date.");
      return;
    }

    setIsSubmitting(true);

    const createResponse = await tauriCommands.createGoal({
      userId,
      title: cleanTitle,
      goalType: goalType.trim() || "custom",
      startDate,
      endDate,
      isActive: true,
    });

    setIsSubmitting(false);

    if (!createResponse.success) {
      setStatus(createResponse.error || "Unable to create goal.");
      return;
    }

    setTitle("");
    setStatus("Goal created. You can start quick study now.");
    await loadGoals();
  }

  function handleStartStudy(): void {
    setStatus(`Quick study ready: ${quickStudySubject} · ${workModeLabel(quickStudyMode)}.`);
    navigate("/timer");
  }

  return (
    <>
      <section className="onboarding-grid">
        <div className="panel">
          <h2>Onboarding</h2>
          <h3>Quick Study</h3>
          <p className="muted">Choose your goal and start studying immediately.</p>

          {!activeGoal ? (
            <div className="onboarding-create-goal" id="onboarding-create-goal-panel">
              <h3>Create your first goal</h3>
              <p className="muted">You have no goals yet. Create one to start tracking study time.</p>

              <form className="auth-form" onSubmit={handleCreateGoal}>
                <label className="field">
                  Goal title
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Example: TOEIC 800"
                    type="text"
                  />
                </label>

                <label className="field">
                  Goal type
                  <input
                    value={goalType}
                    onChange={(event) => setGoalType(event.target.value)}
                    placeholder="Certificate, project, custom"
                    type="text"
                  />
                </label>

                <div className="grid-2">
                  <label className="field">
                    Start date
                    <NativePickerInput value={startDate} onChange={(event) => setStartDate(event.target.value)} type="date" />
                  </label>

                  <label className="field">
                    End date
                    <NativePickerInput value={endDate} onChange={(event) => setEndDate(event.target.value)} type="date" />
                  </label>
                </div>

                <div className="btn-row">
                  <button className="btn primary" type="submit" disabled={isSubmitting}>
                    Create first goal
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div id="onboarding-quick-start-panel">
              <p className="status-line" data-testid="active-goal-status">
                Active goal: <strong>{activeGoal.title}</strong>
              </p>
              <p className="status-line" style={{ marginTop: "8px" }}>
                Subject to start:{" "}
                <button
                  className="text-action-btn"
                  type="button"
                  onClick={() => setIsSubjectModalOpen(true)}
                >
                  {quickStudySubject}
                </button>
              </p>
              <p className="status-line" style={{ marginTop: "6px" }}>
                Work mode:{" "}
                <button
                  className="text-action-btn"
                  type="button"
                  onClick={() => setIsWorkModeModalOpen(true)}
                >
                  {workModeLabel(quickStudyMode)}
                </button>
              </p>
              <p className="status-line" id="onboarding-goal-meta" style={{ marginTop: "8px" }}>
                Goal window: {activeGoal.start_date} to {activeGoal.end_date}
              </p>
              <div className="btn-row" style={{ marginTop: "12px" }}>
                <button className="btn primary" id="onboarding-start-study" type="button" onClick={handleStartStudy}>
                  Study now
                </button>
              </div>
            </div>
          )}

          <p className="status-line" data-testid="onboarding-status">
            {status}
          </p>
        </div>

        <div className="panel onboarding-summary-panel">
          <h3>Study summary this week</h3>

          <div className="grid-3">
            <article className="kpi-card">
              <div className="kpi-label">Total time</div>
              <div className="kpi-value">{formatMinutes(weekTotalMinutes)}</div>
            </article>
            <article className="kpi-card">
              <div className="kpi-label">Sessions</div>
              <div className="kpi-value">{weekSessions}</div>
            </article>
            <article className="kpi-card">
              <div className="kpi-label">Average</div>
              <div className="kpi-value">{weekAverageMinutes}m</div>
            </article>
          </div>

          <h3>Study time - last 7 days</h3>
          <div className="onboarding-week-chart">
            {weekColumns.map((column) => (
              <div key={column.date} className="onboarding-day-column">
                <span className="onboarding-day-value">{column.studied}m</span>
                <div className="onboarding-day-bar-shell">
                  <i
                    className={column.achieved ? "onboarding-day-bar achieved" : "onboarding-day-bar"}
                    style={{ height: `${column.heightPercent}%` }}
                  />
                </div>
                <span className="onboarding-day-label">{dayShortLabel(column.date)}</span>
              </div>
            ))}
          </div>

          <h3>Recent study hours</h3>
          <div className="recent-list">
            {recentSessions.length === 0 ? (
              <p className="muted">No sessions yet.</p>
            ) : (
              recentSessions.map((session) => (
                <article className="recent-item" key={session.id}>
                  <div className="recent-head">
                    <strong>{session.title}</strong>
                    <span className="recent-duration">{session.duration_minutes}m</span>
                  </div>
                  <p className="meta">
                    {isoDateFromTimestamp(session.start_time)} · {session.subjectName}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {isSubjectModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit quick subject">
          <div className="modal-card">
            <h3>Edit Quick Study Subject</h3>
            <p className="muted">Choose the subject that will be started by Quick Study.</p>
            <label className="field" style={{ marginTop: "10px" }}>
              Subject
              <Select<QuickSelectOption, false>
                inputId="quick-study-subject-select"
                className="quick-study-select-container"
                classNamePrefix="quick-study-select"
                options={subjectSelectOptions}
                value={draftSubjectOption}
                onChange={handleSubjectSelectChange}
                menuPortalTarget={selectPortalTarget}
                menuPosition="fixed"
                isSearchable={false}
                isClearable={false}
              />
            </label>
            <div className="btn-row" style={{ marginTop: "12px" }}>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  setQuickStudySubject(draftQuickSubject);
                  setIsSubjectModalOpen(false);
                }}
              >
                Save
              </button>
              <button className="btn secondary" type="button" onClick={() => setIsSubjectModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isWorkModeModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit quick work mode">
          <div className="modal-card">
            <h3>Edit Quick Study Work Mode</h3>
            <p className="muted">Choose the work mode used by Quick Study.</p>
            <label className="field" style={{ marginTop: "10px" }}>
              Work mode
              <Select<QuickSelectOption, false>
                inputId="quick-study-workmode-select"
                className="quick-study-select-container"
                classNamePrefix="quick-study-select"
                options={workModeSelectOptions}
                value={draftWorkModeOption}
                onChange={handleWorkModeSelectChange}
                menuPortalTarget={selectPortalTarget}
                menuPosition="fixed"
                isSearchable={false}
                isClearable={false}
              />
            </label>
            <div className="btn-row" style={{ marginTop: "12px" }}>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  setQuickStudyMode(draftQuickWorkMode);
                  setIsWorkModeModalOpen(false);
                }}
              >
                Save
              </button>
              <button className="btn secondary" type="button" onClick={() => setIsWorkModeModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
