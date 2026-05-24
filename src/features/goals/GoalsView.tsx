import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type GoalRecord, type SubjectRecord } from "../../lib/tauriCommands";
import { NativePickerInput } from "../../shared/components/NativePickerInput";
import { isValidIsoDate, toLocalIsoDate } from "../../shared/utils/dateTime";

interface GoalsViewProps {
  userId: string;
}

type GoalType = "daily" | "weekly" | "custom";
type FlashTone = "success" | "error";

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
  return toLocalIsoDate(new Date());
}

function plusDaysIsoDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function clampMinutePart(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(59, Math.floor(value)));
}

export function GoalsView({ userId }: GoalsViewProps): React.JSX.Element {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);

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
  const [detailDateFrom, setDetailDateFrom] = useState("");
  const [detailDateTo, setDetailDateTo] = useState("");

  const [flashMessage, setFlashMessage] = useState("");
  const [flashTone, setFlashTone] = useState<FlashTone>("success");

  function showFlash(message: string, tone: FlashTone): void {
    setFlashMessage(message);
    setFlashTone(tone);
  }

  useEffect(() => {
    if (!flashMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFlashMessage("");
    }, 2800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [flashMessage]);

  async function loadData(): Promise<void> {
    const [goalsResponse, subjectsResponse] = await Promise.all([
      tauriCommands.listGoals(userId),
      tauriCommands.listSubjects(userId),
    ]);

    if (goalsResponse.success && goalsResponse.data) {
      const goalsData = goalsResponse.data;
      setGoals(goalsData);
      setSelectedGoalId((current) => (current && goalsData.some((goal) => goal.id === current) ? current : ""));
    } else {
      setGoals([]);
      showFlash(goalsResponse.error || "Unable to load goals.", "error");
      setSelectedGoalId("");
    }

    if (subjectsResponse.success && subjectsResponse.data) {
      setSubjects(subjectsResponse.data);
    } else {
      setSubjects([]);
      showFlash(subjectsResponse.error || "Unable to load subjects.", "error");
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

  useEffect(() => {
    if (!selectedGoal) {
      setDetailDateFrom("");
      setDetailDateTo("");
      return;
    }

    setDetailDateFrom(selectedGoal.start_date);
    setDetailDateTo(selectedGoal.end_date);
  }, [selectedGoal]);

  async function handleCreateGoal(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedTitle = goalTitle.trim();

    if (!trimmedTitle) {
      showFlash("Please enter a goal title.", "error");
      return;
    }

    if (!isValidIsoDate(goalStartDate) || !isValidIsoDate(goalEndDate)) {
      showFlash("Dates must use YYYY-MM-DD format.", "error");
      return;
    }

    if (goalStartDate > goalEndDate) {
      showFlash("End date must be after start date.", "error");
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
      showFlash(response.error || "Unable to create goal.", "error");
      return;
    }

    setGoalTitle("");
    setGoalType("weekly");
    setGoalStartDate(todayIsoDate());
    setGoalEndDate(plusDaysIsoDate(30));
    showFlash("Goal created successfully.", "success");
    setIsCreateGoalOpen(false);

    await loadData();
    setSelectedGoalId("");
  }

  async function handleCreateSubject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = subjectName.trim();

    if (!trimmedName) {
      showFlash("Please enter a subject name.", "error");
      return;
    }

    const response = await tauriCommands.createSubject({
      userId,
      name: trimmedName,
    });
    if (!response.success) {
      showFlash(response.error || "Unable to create subject.", "error");
      return;
    }

    setSubjectName("");
    showFlash("Subject created successfully.", "success");
    await loadData();
  }

  async function handleSetActiveGoal(goalId: string): Promise<void> {
    const response = await tauriCommands.setActiveGoal(goalId);
    if (!response.success) {
      showFlash(response.error || "Unable to activate goal.", "error");
      return;
    }

    showFlash("Active goal updated.", "success");
    await loadData();
    setSelectedGoalId(goalId);
  }

  async function handleSaveWeeklyTargets(): Promise<void> {
    if (!selectedGoalId) {
      showFlash("Select a goal first.", "error");
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
      showFlash(failed.error || "Unable to save weekly targets.", "error");
      return;
    }

    showFlash("Weekly targets saved.", "success");
    await loadTargets(selectedGoalId);
    setSelectedGoalId("");
  }

  async function handleSaveGoalDateRange(): Promise<void> {
    if (!selectedGoal) {
      showFlash("Select a goal first.", "error");
      return;
    }

    if (!isValidIsoDate(detailDateFrom) || !isValidIsoDate(detailDateTo)) {
      showFlash("Dates must use YYYY-MM-DD format.", "error");
      return;
    }

    if (detailDateFrom > detailDateTo) {
      showFlash("Date to must be after date from.", "error");
      return;
    }

    const response = await tauriCommands.updateGoal({
      id: selectedGoal.id,
      userId: selectedGoal.user_id,
      title: selectedGoal.title,
      description: selectedGoal.description || undefined,
      goalType: selectedGoal.goal_type,
      startDate: detailDateFrom,
      endDate: detailDateTo,
      isActive: selectedGoal.is_active,
    });

    if (!response.success || !response.data) {
      showFlash(response.error || "Unable to update goal dates.", "error");
      return;
    }

    showFlash("Goal timeline updated.", "success");
    await loadData();
    setSelectedGoalId(response.data.id);
  }

  return (
    <section className="panel goals-page">
      <div className="goals-header">
        <div>
          <h2>Goals</h2>
          <p className="muted">Set up goals, subjects and weekly targets to match your study plan.</p>
        </div>
        <button
          className="btn primary create-goal-btn"
          type="button"
          onClick={() => setIsCreateGoalOpen((current) => !current)}
        >
          <span className="create-goal-plus" aria-hidden="true">
            +
          </span>
          <span>{isCreateGoalOpen ? "Close create" : "Create goal"}</span>
        </button>
      </div>

      {flashMessage ? (
        <div
          className={`flash-toast ${flashTone === "error" ? "error" : "success"}`}
          data-testid="goals-flash-message"
          role="status"
          aria-live="polite"
        >
          <span className="flash-toast-icon" aria-hidden="true">
            {flashTone === "error" ? "!" : "✓"}
          </span>
          <span className="flash-toast-text">{flashMessage}</span>
          <button className="flash-toast-close" type="button" aria-label="Dismiss notification" onClick={() => setFlashMessage("")}>
            ×
          </button>
        </div>
      ) : null}

      <div className="goal-list">
        {goals.length === 0 ? (
          <p className="muted" data-testid="goals-empty">
            No goals yet. Click Create goal to add your first one.
          </p>
        ) : (
          <div className="goal-table">
            <div className="goal-table-head" aria-hidden="true">
              <span>Goal</span>
              <span>Timeline</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {goals.map((goal) => (
              <article
                className={`goal-row ${goal.is_active ? "goal-row-active" : ""} ${selectedGoalId === goal.id ? "goal-row-selected" : ""}`}
                key={goal.id}
              >
                <div>
                  <p className="goal-title">{goal.title}</p>
                  <p className="goal-meta">{goal.goal_type}</p>
                </div>

                <p className="goal-date">{goal.start_date} to {goal.end_date}</p>

                <span className={goal.is_active ? "goal-status-pill active" : "goal-status-pill inactive"}>
                  {goal.is_active ? "Active" : "Inactive"}
                </span>

                <div className="goal-actions">
                  {!goal.is_active ? (
                    <button className="btn ghost" type="button" onClick={() => void handleSetActiveGoal(goal.id)}>
                      Set active
                    </button>
                  ) : null}
                  <button className="btn secondary goal-edit-btn" type="button" onClick={() => setSelectedGoalId(goal.id)}>
                    <svg className="goal-action-icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M4 20h4l10-10-4-4L4 16v4z" />
                      <path d="M13 6l4 4" />
                    </svg>
                    <span>Edit</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isCreateGoalOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => setIsCreateGoalOpen(false)}>
          <article className="modal-card create-goal-modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Create goal</h3>
            <form className="form-grid" onSubmit={(event) => void handleCreateGoal(event)}>
              <div className="create-goal-modal-grid">
                <label htmlFor="goal-title-input">
                  Title
                  <input
                    id="goal-title-input"
                    value={goalTitle}
                    onChange={(event) => setGoalTitle(event.target.value)}
                    placeholder="Prepare for final exam"
                    required
                  />
                </label>

                <label htmlFor="goal-type-select">
                  Type
                  <select
                    id="goal-type-select"
                    value={goalType}
                    onChange={(event) => setGoalType(event.target.value as GoalType)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <label htmlFor="goal-start-date-input">
                  Start date
                  <NativePickerInput
                    id="goal-start-date-input"
                    type="date"
                    value={goalStartDate}
                    onChange={(event) => setGoalStartDate(event.target.value)}
                  />
                </label>

                <label htmlFor="goal-end-date-input">
                  End date
                  <NativePickerInput
                    id="goal-end-date-input"
                    type="date"
                    value={goalEndDate}
                    onChange={(event) => setGoalEndDate(event.target.value)}
                  />
                </label>
              </div>

              <div className="btn-row" style={{ marginTop: "4px" }}>
                <button className="btn primary" type="submit">
                  Create goal
                </button>
                <button className="btn secondary" type="button" onClick={() => setIsCreateGoalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}

      {selectedGoal ? (
        <div className="modal-overlay goals-detail-overlay" role="presentation" onClick={() => setSelectedGoalId("")}>
          <div
            className="modal-card goals-detail-modal"
            data-testid="goal-detail-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="goal-detail-head">
              <div>
                <h3 style={{ margin: 0 }}>{selectedGoal.title}</h3>
                <p className="muted">
                  {selectedGoal.goal_type} · {selectedGoal.start_date} to {selectedGoal.end_date}
                </p>
              </div>
              <button className="btn ghost" type="button" onClick={() => setSelectedGoalId("")}>
                Close
              </button>
            </div>

            <div className="goal-detail-toolbar">
              {!selectedGoal.is_active ? (
                <button className="btn secondary" type="button" onClick={() => void handleSetActiveGoal(selectedGoal.id)}>
                  Set as active goal
                </button>
              ) : (
                <span className="goals-chip">Active goal</span>
              )}
              <button className="btn primary" type="button" onClick={() => void handleSaveWeeklyTargets()}>
                Save weekly targets
              </button>
            </div>

            <div className="goal-detail-date-row">
              <label className="field goal-detail-date-field">
                Date from
                <NativePickerInput
                  type="date"
                  value={detailDateFrom}
                  onChange={(event) => setDetailDateFrom(event.target.value)}
                />
              </label>

              <label className="field goal-detail-date-field">
                Date to
                <NativePickerInput
                  type="date"
                  value={detailDateTo}
                  onChange={(event) => setDetailDateTo(event.target.value)}
                />
              </label>

              <button className="btn secondary goal-detail-save-date-btn" type="button" onClick={() => void handleSaveGoalDateRange()}>
                Save timeline
              </button>
            </div>

            <div className="goal-detail-grid">
              <article className="goal-detail-card">
                <h3>Subjects</h3>
                <form className="form-grid" onSubmit={(event) => void handleCreateSubject(event)}>
                  <label htmlFor="subject-name-input">
                    Subject name
                    <input
                      id="subject-name-input"
                      value={subjectName}
                      onChange={(event) => setSubjectName(event.target.value)}
                      placeholder="Mathematics"
                      required
                    />
                  </label>

                  <button className="btn secondary subject-add-btn" type="submit">
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

              <article className="goal-detail-card">
                <h3>Reminders</h3>
                <div className="form-grid">
                  <div className="toggle-row">
                    <label htmlFor="reminder-enabled-input">Enable reminder</label>
                    <input
                      id="reminder-enabled-input"
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(event) => setReminderEnabled(event.target.checked)}
                    />
                  </div>

                  <label htmlFor="reminder-time-input">
                    Reminder time
                    <NativePickerInput
                      id="reminder-time-input"
                      type="time"
                      value={reminderTime}
                      onChange={(event) => setReminderTime(event.target.value)}
                    />
                  </label>

                  <p className="muted">Reminder settings are UI-only in this phase.</p>
                </div>
              </article>
            </div>

            <div className="goal-weekly-section">
              <p className="muted">Configure daily target duration by weekday for this goal.</p>

              <div className="weekly-target-table" id="weekly-target-grid">
                <div className="weekly-target-table-head" aria-hidden="true">
                  <span className="weekly-target-head-day">Day</span>
                  <span className="weekly-target-head-status">Status</span>
                  <span className="weekly-target-head-minutes">Target time</span>
                </div>

                {weekdayRows.map(({ value, label }) => {
                  const enabled = Boolean(enabledByWeekday[value]);
                  const totalMinutes = targetsByWeekday[value] || 0;
                  const hoursPart = Math.floor(totalMinutes / 60);
                  const minutesPart = totalMinutes % 60;

                  return (
                    <div className="weekly-target-table-row" key={value}>
                      <span className="weekly-target-day">{label}</span>

                      <div className={`weekly-target-state ${enabled ? "active" : "rest"}`}>
                        <input
                          className="weekly-target-checkbox"
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
                        <span>{enabled ? "Active" : "Rest"}</span>
                      </div>

                      <div className="weekly-target-duration-wrap">
                        <div className="weekly-target-duration-field">
                          <input
                            className="weekly-target-hours"
                            type="number"
                            min={0}
                            step={1}
                            value={hoursPart}
                            aria-label={`${label} target hours`}
                            disabled={!enabled}
                            onChange={(event) => {
                              const nextHours = clampNonNegativeInt(Number(event.target.value));

                              setTargetsByWeekday((previous) => {
                                const currentValue = Math.max(0, previous[value] || 0);
                                const currentMinutesPart = currentValue % 60;

                                return {
                                  ...previous,
                                  [value]: nextHours * 60 + currentMinutesPart,
                                };
                              });
                            }}
                          />
                          <span>h</span>
                        </div>

                        <div className="weekly-target-duration-field">
                          <input
                            className="weekly-target-minute-part"
                            type="number"
                            min={0}
                            max={59}
                            step={5}
                            value={minutesPart}
                            aria-label={`${label} target minutes`}
                            disabled={!enabled}
                            onChange={(event) => {
                              const nextMinutesPart = clampMinutePart(Number(event.target.value));

                              setTargetsByWeekday((previous) => {
                                const currentValue = Math.max(0, previous[value] || 0);
                                const currentHoursPart = Math.floor(currentValue / 60);

                                return {
                                  ...previous,
                                  [value]: currentHoursPart * 60 + nextMinutesPart,
                                };
                              });
                            }}
                          />
                          <span>m</span>
                        </div>

                        <span className="weekly-target-total">{totalMinutes} min</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="muted">Edit target values then save.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
