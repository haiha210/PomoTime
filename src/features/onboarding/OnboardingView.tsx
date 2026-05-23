import { FormEvent, useEffect, useMemo, useState } from "react";

import { tauriCommands } from "../../lib/tauriCommands";

interface OnboardingViewProps {
  userId: string;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIsoDate(days: number): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function OnboardingView({ userId }: OnboardingViewProps): React.JSX.Element {
  const [goals, setGoals] = useState<Array<{ id: string; title: string; is_active: boolean }>>([]);
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState("custom");
  const [quickStudyMode, setQuickStudyMode] = useState("focus_clock");
  const [status, setStatus] = useState("Create your first goal to unlock quick study.");

  const activeGoal = useMemo(
    () => goals.find((goal) => goal.is_active) || goals[0] || null,
    [goals]
  );

  async function loadGoals(): Promise<void> {
    const response = await tauriCommands.listGoals(userId);
    if (!response.success || !response.data) {
      return;
    }

    setGoals(response.data.map((goal) => ({ id: goal.id, title: goal.title, is_active: goal.is_active })));
  }

  async function loadLatestSessionMode(): Promise<void> {
    const response = await tauriCommands.listSessions(userId);
    if (!response.success || !response.data || response.data.length === 0) {
      return;
    }

    const latest = [...response.data].sort((a, b) => b.end_time.localeCompare(a.end_time))[0];
    setQuickStudyMode(latest.work_mode || "focus_clock");
  }

  useEffect(() => {
    void loadGoals();
    void loadLatestSessionMode();
  }, [userId]);

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setStatus("Goal title is required.");
      return;
    }

    const createResponse = await tauriCommands.createGoal({
      userId,
      title: cleanTitle,
      goalType: goalType.trim() || "custom",
      startDate: todayIsoDate(),
      endDate: plusDaysIsoDate(30),
      isActive: true,
    });

    if (!createResponse.success) {
      setStatus(createResponse.error || "Unable to create goal.");
      return;
    }

    setTitle("");
    setStatus("Goal created. You can start quick study now.");
    await loadGoals();
  }

  return (
    <section className="panel">
      <h2>Onboarding</h2>

      {activeGoal ? (
        <>
          <p data-testid="active-goal-status">
            Active goal: <strong>{activeGoal.title}</strong>
          </p>
          <p>Quick study mode: {quickStudyMode}</p>
          <button className="btn primary" type="button">
            Start quick study
          </button>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleCreateGoal}>
          <label>
            Goal title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: IELTS 6.5"
              type="text"
            />
          </label>

          <label>
            Goal type
            <input
              value={goalType}
              onChange={(event) => setGoalType(event.target.value)}
              placeholder="certificate, project, custom"
              type="text"
            />
          </label>

          <button className="btn primary" type="submit">
            Create first goal
          </button>
        </form>
      )}

      <p className="status-line" data-testid="onboarding-status">
        {status}
      </p>
    </section>
  );
}
