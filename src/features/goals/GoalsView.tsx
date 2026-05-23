import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type GoalRecord, type SubjectRecord } from "../../lib/tauriCommands";

interface GoalsViewProps {
  userId: string;
}

type GoalType = "daily" | "weekly" | "custom";

const weekdayRows = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIsoDate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function GoalsView({ userId }: GoalsViewProps): React.JSX.Element {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);

  const [goalTitle, setGoalTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("weekly");
  const [goalStartDate, setGoalStartDate] = useState(todayIsoDate());
  const [goalEndDate, setGoalEndDate] = useState(plusDaysIsoDate(30));

  const [subjectName, setSubjectName] = useState("");

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");

  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [targetsByWeekday, setTargetsByWeekday] = useState<Record<number, number>>({});
  const [enabledByWeekday, setEnabledByWeekday] = useState<Record<number, boolean>>({});

  const [goalStatus, setGoalStatus] = useState("Create and manage your goals by week and subject.");
  const [subjectStatus, setSubjectStatus] = useState("");
  const [weeklyStatus, setWeeklyStatus] = useState("");

  async function loadData(): Promise<void> {
    const [goalsResponse, subjectsResponse] = await Promise.all([
      tauriCommands.listGoals(userId),
      tauriCommands.listSubjects(userId),
    ]);

    if (goalsResponse.success && goalsResponse.data) {
      setGoals(goalsResponse.data);
      if (!selectedGoalId) {
        const activeGoal = goalsResponse.data.find((goal) => goal.is_active) || goalsResponse.data[0];
        setSelectedGoalId(activeGoal?.id || "");
      }
    } else {
      setGoals([]);
      setGoalStatus(goalsResponse.error || "Unable to load goals.");
    }

    if (subjectsResponse.success && subjectsResponse.data) {
      setSubjects(subjectsResponse.data);
    } else {
      setSubjects([]);
      setSubjectStatus(subjectsResponse.error || "Unable to load subjects.");
    }
  }

  async function loadTargets(goalId: string): Promise<void> {
    const response = await tauriCommands.listWeeklyTargets(goalId);
    if (!response.success || !response.data) {
      setTargetsByWeekday({});
      setEnabledByWeekday({});
      return;
    }

    const values: Record<number, number> = {};
    const enabled: Record<number, boolean> = {};

    response.data.forEach((target) => {
      values[target.weekday] = target.target_minutes;
      enabled[target.weekday] = target.target_minutes > 0;
    });

    setTargetsByWeekday(values);
    setEnabledByWeekday(enabled);
  }

  useEffect(() => {
    void loadData();
  }, [userId]);

  useEffect(() => {
    if (!selectedGoalId) {
      setTargetsByWeekday({});
      setEnabledByWeekday({});
      return;
    }

    void loadTargets(selectedGoalId);
  }, [selectedGoalId]);

  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === selectedGoalId) || null, [goals, selectedGoalId]);

  async function handleCreateGoal(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedTitle = goalTitle.trim();

    if (!trimmedTitle) {
      setGoalStatus("Please enter a goal title.");
      return;
    }

    const response = await tauriCommands.createGoal({
      userId,
      title: trimmedTitle,
      goalType,
      startDate: goalStartDate,
      endDate: goalEndDate,
      isActive: goals.length === 0,
    });

    if (!response.success || !response.data) {
      setGoalStatus(response.error || "Unable to create goal.");
      return;
    }

    setGoalTitle("");
    setGoalType("weekly");
    setGoalStartDate(todayIsoDate());
    setGoalEndDate(plusDaysIsoDate(30));
    setGoalStatus("Goal created successfully.");

    await loadData();
    setSelectedGoalId(response.data.id);
  }

  async function handleCreateSubject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = subjectName.trim();

    if (!trimmedName) {
      setSubjectStatus("Please enter a subject name.");
      return;
    }

    const response = await tauriCommands.createSubject({
      userId,
      name: trimmedName,
    });
    if (!response.success) {
      setSubjectStatus(response.error || "Unable to create subject.");
      return;
    }

    setSubjectName("");
    setSubjectStatus("Subject created successfully.");
    await loadData();
  }

  async function handleSetActiveGoal(goalId: string): Promise<void> {
    const response = await tauriCommands.setActiveGoal(goalId);
    if (!response.success) {
      setGoalStatus(response.error || "Unable to activate goal.");
      return;
    }

    setGoalStatus("Active goal updated.");
    await loadData();
    setSelectedGoalId(goalId);
  }

  async function handleSaveWeeklyTargets(): Promise<void> {
    if (!selectedGoalId) {
      setWeeklyStatus("Select a goal first.");
      return;
    }

    const operations = weekdayRows.map(({ value }) => {
      const enabled = Boolean(enabledByWeekday[value]);
      const target = Math.max(0, targetsByWeekday[value] || 0);
      return tauriCommands.upsertWeeklyTarget(selectedGoalId, value, enabled ? target : 0);
    });

    const responses = await Promise.all(operations);
    const failed = responses.find((response) => !response.success);

    if (failed) {
      setWeeklyStatus(failed.error || "Unable to save weekly targets.");
      return;
    }

    setWeeklyStatus("Weekly targets saved.");
    await loadTargets(selectedGoalId);
  }

  return (
    <section className="panel">
      <h2>Goals</h2>
      <p className="muted">Set up goals, subjects and weekly targets to match your study plan.</p>

      <div className="settings-grid">
        <article className="panel">
          <h3>Create goal</h3>
          <form className="form-grid" onSubmit={(event) => void handleCreateGoal(event)}>
            <label htmlFor="goal-title-input">Title</label>
            <input
              id="goal-title-input"
              value={goalTitle}
              onChange={(event) => setGoalTitle(event.target.value)}
              placeholder="Prepare for final exam"
              required
            />

            <label htmlFor="goal-type-select">Type</label>
            <select
              id="goal-type-select"
              value={goalType}
              onChange={(event) => setGoalType(event.target.value as GoalType)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>

            <label htmlFor="goal-start-date-input">Start date</label>
            <input
              id="goal-start-date-input"
              type="date"
              value={goalStartDate}
              onChange={(event) => setGoalStartDate(event.target.value)}
            />

            <label htmlFor="goal-end-date-input">End date</label>
            <input
              id="goal-end-date-input"
              type="date"
              value={goalEndDate}
              onChange={(event) => setGoalEndDate(event.target.value)}
            />

            <button className="btn" type="submit">
              Create goal
            </button>
          </form>
        </article>

        <article className="panel">
          <h3>Subjects</h3>
          <form className="form-grid" onSubmit={(event) => void handleCreateSubject(event)}>
            <label htmlFor="subject-name-input">Subject name</label>
            <input
              id="subject-name-input"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              placeholder="Mathematics"
              required
            />

            <button className="btn" type="submit">
              Add subject
            </button>
          </form>

          <div className="goal-subject-list">
            {subjects.length === 0 ? (
              <p className="muted">No subjects yet.</p>
            ) : (
              subjects.map((subject) => (
                <div className="goal-subject-item" key={subject.id}>
                  {subject.name}
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel">
          <h3>Reminders</h3>
          <div className="form-grid">
            <label htmlFor="reminder-enabled-input">Enable reminder</label>
            <input
              id="reminder-enabled-input"
              type="checkbox"
              checked={reminderEnabled}
              onChange={(event) => setReminderEnabled(event.target.checked)}
            />

            <label htmlFor="reminder-time-input">Reminder time</label>
            <input
              id="reminder-time-input"
              type="time"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
            />

            <p className="muted">Reminder settings are UI-only in this phase.</p>
          </div>
        </article>
      </div>

      <div className="panel" style={{ marginTop: "12px" }}>
        <h3>Goal list</h3>
        <div className="goal-list">
          {goals.length === 0 ? (
            <p className="muted" data-testid="goals-empty">
              No goals yet. Create your first goal above.
            </p>
          ) : (
            goals.map((goal) => (
              <article className={`goal-item ${goal.is_active ? "goal-item-active" : ""}`} key={goal.id}>
                <div>
                  <p className="goal-title">{goal.title}</p>
                  <p className="goal-meta">
                    {goal.goal_type} · {goal.start_date} to {goal.end_date} · {goal.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="btn-row">
                  <button className="btn secondary" type="button" onClick={() => setSelectedGoalId(goal.id)}>
                    Detail
                  </button>
                  {!goal.is_active ? (
                    <button className="btn ghost" type="button" onClick={() => void handleSetActiveGoal(goal.id)}>
                      Set active
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {selectedGoal ? (
        <div className="panel goal-detail-panel" data-testid="goal-detail-panel" style={{ marginTop: "12px" }}>
          <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{selectedGoal.title}</h3>
            <button className="btn ghost" type="button" onClick={() => setSelectedGoalId("")}>
              Back to list
            </button>
          </div>

          <p className="muted" style={{ marginTop: "8px" }}>
            Configure daily target minutes by weekday for this goal.
          </p>

          <div className="weekly-grid" id="weekly-target-grid">
            {weekdayRows.map(({ value, label }) => {
              const enabled = Boolean(enabledByWeekday[value]);
              const minutes = targetsByWeekday[value] || 0;

              return (
                <div className="weekday" key={value}>
                  <span>{label}</span>
                  <label>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setEnabledByWeekday((previous) => ({
                          ...previous,
                          [value]: checked,
                        }));

                        if (checked && !targetsByWeekday[value]) {
                          setTargetsByWeekday((previous) => ({
                            ...previous,
                            [value]: 60,
                          }));
                        }
                      }}
                    />
                    {enabled ? "Active" : "Rest"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={minutes}
                    disabled={!enabled}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setTargetsByWeekday((previous) => ({
                        ...previous,
                        [value]: Number.isFinite(nextValue) ? nextValue : 0,
                      }));
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="btn-row" style={{ marginTop: "12px" }}>
            {!selectedGoal.is_active ? (
              <button className="btn secondary" type="button" onClick={() => void handleSetActiveGoal(selectedGoal.id)}>
                Set as active goal
              </button>
            ) : null}
            <button className="btn" type="button" onClick={() => void handleSaveWeeklyTargets()}>
              Save weekly targets
            </button>
          </div>

          <p className="status-line">{weeklyStatus || "Edit target values then save."}</p>
        </div>
      ) : null}

      <p className="status-line" data-testid="goals-status">
        {goalStatus || subjectStatus || weeklyStatus}
      </p>
      {subjectStatus ? <p className="status-line">{subjectStatus}</p> : null}
    </section>
  );
}
