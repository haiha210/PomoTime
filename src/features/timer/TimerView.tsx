import { useState } from "react";

import { tauriCommands } from "../../lib/tauriCommands";

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
  const [title, setTitle] = useState("Deep work block");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("Timer is ready.");

  async function handleStop(): Promise<void> {
    const window = timer.stopAndCollectWindow();
    if (!window) {
      setStatus("No active duration to save.");
      return;
    }

    const response = await tauriCommands.saveStoppedTimer({
      userId,
      title: title.trim() || "Study session",
      note,
      startTime: new Date(window.startedAtUnixSeconds * 1000).toISOString(),
      endTime: new Date(window.stoppedAtUnixSeconds * 1000).toISOString(),
      startedAtUnixSeconds: window.startedAtUnixSeconds,
      stoppedAtUnixSeconds: window.stoppedAtUnixSeconds,
      workMode: timer.state.mode,
    });

    if (!response.success) {
      setStatus(response.error || "Failed to save timer session.");
      return;
    }

    setStatus(`Saved session (${window.activeSeconds} seconds).`);
  }

  return (
    <section className="panel">
      <h2>Timer</h2>
      <p>Start a focus clock or pomodoro session and save progress at stop.</p>

      <label>
        Mode
        <select
          value={timer.state.mode}
          onChange={(event) =>
            timer.setMode(event.target.value === "pomodoro" ? "pomodoro" : "focus_clock")
          }
          disabled={timer.state.status !== "idle"}
        >
          <option value="focus_clock">Focus clock (count up)</option>
          <option value="pomodoro">Pomodoro 25:00 (count down)</option>
        </select>
      </label>

      <label>
        Session title
        <input value={title} onChange={(event) => setTitle(event.target.value)} type="text" />
      </label>

      <label>
        Note
        <input value={note} onChange={(event) => setNote(event.target.value)} type="text" />
      </label>

      <div className="timer-face" data-testid="timer-display">
        {formatClock(timer.state.displaySeconds)}
      </div>

      <p data-testid="timer-active-seconds">Active seconds: {timer.state.activeSeconds}</p>

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
          onClick={timer.pause}
          disabled={timer.state.status !== "running"}
        >
          Pause
        </button>

        <button
          className="btn secondary"
          type="button"
          onClick={timer.resume}
          disabled={timer.state.status !== "paused"}
        >
          Resume
        </button>

        <button className="btn danger" type="button" onClick={() => void handleStop()}>
          Stop
        </button>
      </div>

      <p className="status-line" data-testid="timer-status">
        {status}
      </p>
    </section>
  );
}
