import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type GoalRecord, type SubjectRecord } from "../../lib/tauriCommands";

import { useTimerStateMachine } from "./useTimerStateMachine";

interface TimerViewProps {
  userId: string;
}

function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

export function TimerView({ userId }: TimerViewProps): React.JSX.Element {
  const timer = useTimerStateMachine();
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState("none");
  const [selectedSubjectId, setSelectedSubjectId] = useState("none");
  const [tomatoMinutes, setTomatoMinutes] = useState(25);
  const [title, setTitle] = useState("Deep work block");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("Timer is ready.");

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) || null,
    [goals, selectedGoalId]
  );

  const quickStartStateClass = useMemo(() => {
    if (timer.state.mode === "pomodoro" && timer.state.displaySeconds === 0 && timer.state.status === "running") {
      return "quick-start-achieved";
    }

    if (timer.state.status === "paused") {
      return "quick-start-pending";
    }

    if (timer.state.status === "running") {
      return "quick-start-running";
    }

    return "";
  }, [timer.state.displaySeconds, timer.state.mode, timer.state.status]);

  const timerModeValue = timer.state.mode === "pomodoro" ? "tomato" : "focus_clock";

  useEffect(() => {
    let active = true;

    Promise.all([tauriCommands.listGoals(userId), tauriCommands.listSubjects(userId)])
      .then(([goalsResponse, subjectsResponse]) => {
        if (!active) {
          return;
        }

        if (goalsResponse.success && goalsResponse.data) {
          setGoals(goalsResponse.data);
          const activeGoal = goalsResponse.data.find((goal) => goal.is_active) || goalsResponse.data[0] || null;
          setSelectedGoalId(activeGoal?.id || "none");
        } else {
          setGoals([]);
          setSelectedGoalId("none");
        }

        if (subjectsResponse.success && subjectsResponse.data) {
          setSubjects(subjectsResponse.data);
          setSelectedSubjectId(subjectsResponse.data[0]?.id || "none");
        } else {
          setSubjects([]);
          setSelectedSubjectId("none");
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setGoals([]);
        setSubjects([]);
        setSelectedGoalId("none");
        setSelectedSubjectId("none");
      });

    return () => {
      active = false;
    };
  }, [userId]);

  function handleModeChange(nextModeValue: string): void {
    const nextMode = nextModeValue === "tomato" ? "pomodoro" : "focus_clock";
    timer.setMode(nextMode);
    if (nextMode === "pomodoro") {
      timer.setPomodoroMinutes(tomatoMinutes);
    }
  }

  async function handleStop(): Promise<void> {
    const window = timer.stopAndCollectWindow();
    if (!window) {
      setStatus("No active duration to save.");
      return;
    }

    const response = await tauriCommands.saveStoppedTimer({
      userId,
      goalId: selectedGoalId === "none" ? undefined : selectedGoalId,
      subjectId: selectedSubjectId === "none" ? undefined : selectedSubjectId,
      title: title.trim() || "Study session",
      note,
      startTime: new Date(window.startedAtUnixSeconds * 1000).toISOString(),
      endTime: new Date(window.stoppedAtUnixSeconds * 1000).toISOString(),
      startedAtUnixSeconds: window.startedAtUnixSeconds,
      stoppedAtUnixSeconds: window.stoppedAtUnixSeconds,
      workMode: timer.state.mode === "pomodoro" ? "pomodoro" : "focus_clock",
    });

    if (!response.success) {
      setStatus(response.error || "Failed to save timer session.");
      return;
    }

    setStatus(`Saved session (${window.activeSeconds} seconds).`);
  }

  return (
    <section className={["panel", "timer-panel", quickStartStateClass].filter(Boolean).join(" ")} id="timer-panel">
      <h2>Timer</h2>
      <p className="muted">Pick a work mode, then run a focused session.</p>

      <div className="grid-2">
        <label className="field">
          Subject
          <select
            id="timer-subject"
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            disabled={timer.state.status !== "idle"}
          >
            <option value="none">General</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Session title
          <input
            id="timer-session-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            type="text"
            disabled={timer.state.status !== "idle"}
          />
        </label>

        <label className="field">
          Work mode
          <select
            id="timer-mode"
            value={timerModeValue}
            onChange={(event) => handleModeChange(event.target.value)}
            disabled={timer.state.status !== "idle"}
          >
            <option value="tomato">Tomato Sprint (Pomodoro)</option>
            <option value="focus_clock">Focus Clock (Count up)</option>
          </select>
        </label>

        {timerModeValue === "tomato" ? (
          <label className="field" id="tomato-length-field">
            Tomato length (minutes)
            <input
              id="tomato-minutes"
              type="number"
              value={tomatoMinutes}
              min={1}
              max={180}
              step={1}
              disabled={timer.state.status !== "idle"}
              onChange={(event) => {
                const parsed = Number(event.target.value || 25);
                const normalized = Math.max(1, Math.min(180, Math.floor(parsed)));
                setTomatoMinutes(normalized);
                timer.setPomodoroMinutes(normalized);
              }}
            />
          </label>
        ) : null}
      </div>

      <div className={["timer", "timer-face", quickStartStateClass].filter(Boolean).join(" ")} id="timer-display" data-testid="timer-display">
        {formatClock(timer.state.displaySeconds)}
      </div>

      <p className="helper" id="timer-mode-hint">
        {timerModeValue === "tomato"
          ? "Tomato Sprint counts down from selected minutes."
          : "Focus Clock counts up from zero while you study."}
      </p>

      <p className="status-text quick-start-note" data-testid="timer-active-seconds">
        Active seconds: {timer.state.activeSeconds}
      </p>

      {selectedGoal ? (
        <p className="status-line">Saving sessions under active goal: {selectedGoal.title}</p>
      ) : (
        <p className="status-line">No active goal selected. Sessions will be saved without goal binding.</p>
      )}

      <div className="button-row">
        <button
          className="btn primary"
          type="button"
          onClick={timer.start}
          disabled={timer.state.status !== "idle"}
        >
          Start
        </button>

        <button
          className="btn secondary"
          type="button"
          onClick={timer.state.status === "paused" ? timer.resume : timer.pause}
          disabled={timer.state.status === "idle"}
        >
          {timer.state.status === "paused" ? "Resume" : "Pause"}
        </button>

        <button
          className="btn danger"
          type="button"
          onClick={() => void handleStop()}
          disabled={timer.state.status === "idle"}
        >
          Stop
        </button>
      </div>

      <label className="field">
        Quick notes
        <textarea
          id="timer-quick-note"
          rows={4}
          placeholder="What did you finish in this session?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <p className="status-line" data-testid="timer-status">
        {status}
      </p>
    </section>
  );
}
