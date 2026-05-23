import { useEffect, useMemo, useState } from "react";

import { tauriCommands } from "../../lib/tauriCommands";

interface GoalsViewProps {
  userId: string;
}

const weekdays = [1, 2, 3, 4, 5, 6, 7];

export function GoalsView({ userId }: GoalsViewProps): React.JSX.Element {
  const [goals, setGoals] = useState<Array<{ id: string; title: string; is_active: boolean }>>([]);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [targetsByDay, setTargetsByDay] = useState<Record<number, number>>({});
  const [status, setStatus] = useState("Manage active goal and weekly targets.");

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) || null,
    [goals, selectedGoalId]
  );

  async function loadGoals(): Promise<void> {
    const response = await tauriCommands.listGoals(userId);
    if (!response.success || !response.data) {
      return;
    }

    const nextGoals = response.data.map((goal) => ({
      id: goal.id,
      title: goal.title,
      is_active: goal.is_active,
    }));

    setGoals(nextGoals);
    const activeGoal = nextGoals.find((goal) => goal.is_active) || nextGoals[0];
    if (activeGoal) {
      setSelectedGoalId((current) => current || activeGoal.id);
    }
  }

  async function loadWeeklyTargets(goalId: string): Promise<void> {
    const response = await tauriCommands.listWeeklyTargets(goalId);
    if (!response.success || !response.data) {
      return;
    }

    const map: Record<number, number> = {};
    response.data.forEach((target) => {
      map[target.weekday] = target.target_minutes;
    });
    setTargetsByDay(map);
  }

  useEffect(() => {
    void loadGoals();
  }, [userId]);

  useEffect(() => {
    if (!selectedGoalId) {
      return;
    }

    void loadWeeklyTargets(selectedGoalId);
  }, [selectedGoalId]);

  async function handleSetActive(goalId: string): Promise<void> {
    const response = await tauriCommands.setActiveGoal(goalId);
    if (!response.success) {
      setStatus(response.error || "Unable to set active goal");
      return;
    }

    setStatus("Active goal updated.");
    await loadGoals();
    setSelectedGoalId(goalId);
  }

  async function handleSaveTarget(weekday: number): Promise<void> {
    if (!selectedGoalId) {
      return;
    }

    const targetMinutes = Math.max(0, Number(targetsByDay[weekday] || 0));
    const response = await tauriCommands.upsertWeeklyTarget(
      selectedGoalId,
      weekday,
      targetMinutes
    );

    if (!response.success) {
      setStatus(response.error || "Unable to save weekly target");
      return;
    }

    setStatus(`Saved target for weekday ${weekday}.`);
    await loadWeeklyTargets(selectedGoalId);
  }

  return (
    <section className="panel">
      <h2>Goals</h2>
      <p>Manage active goals, weekly targets, and quick-study defaults.</p>

      {goals.length === 0 ? (
        <p data-testid="goals-empty">No goals yet. Create your first goal from Onboarding.</p>
      ) : (
        <>
          <ul className="history-list">
            {goals.map((goal) => (
              <li key={goal.id}>
                <strong>{goal.title}</strong>
                <span>{goal.is_active ? "Active goal" : "Inactive"}</span>
                <div className="button-row">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setSelectedGoalId(goal.id)}
                  >
                    Detail
                  </button>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => handleSetActive(goal.id)}
                  >
                    Set active
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {selectedGoal ? (
            <div className="panel" data-testid="goal-detail-panel">
              <h3>{selectedGoal.title}</h3>
              <p>Weekly targets (minutes per day)</p>
              {weekdays.map((weekday) => (
                <div key={weekday} className="button-row">
                  <label>
                    Day {weekday}
                    <input
                      type="number"
                      min={0}
                      value={targetsByDay[weekday] ?? 0}
                      onChange={(event) =>
                        setTargetsByDay((current) => ({
                          ...current,
                          [weekday]: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </label>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => handleSaveTarget(weekday)}
                  >
                    Save day {weekday}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      <p className="status-line" data-testid="goals-status">
        {status}
      </p>
    </section>
  );
}
