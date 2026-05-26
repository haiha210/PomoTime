import { NavLink } from "react-router-dom";
import { Timer as TimerIcon } from "lucide-react";

import { useTimerContext } from "./TimerProvider";

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

function phaseLabel(mode: string, phase: string, status: string): string {
  if (status === "idle") {
    return "Idle";
  }
  if (status === "paused") {
    return "Paused";
  }
  if (mode === "pomodoro") {
    return phase === "break" ? "Break" : "Tomato";
  }
  return "Focus";
}

export function TimerBadge(): React.JSX.Element {
  const { timer } = useTimerContext();
  const { status, mode, phase, displaySeconds } = timer.state;

  const stateClass =
    status === "running"
      ? phase === "break"
        ? "timer-badge-break"
        : "timer-badge-running"
      : status === "paused"
        ? "timer-badge-paused"
        : "timer-badge-idle";

  return (
    <NavLink
      to="/timer"
      className={`timer-badge ${stateClass}`}
      title={`Timer ${phaseLabel(mode, phase, status)}`}
      data-testid="timer-badge"
    >
      <span className="timer-badge-icon" aria-hidden="true">
        <TimerIcon size={16} strokeWidth={2} />
      </span>
      <span className="timer-badge-clock">{formatClock(displaySeconds)}</span>
      <span className="timer-badge-phase">{phaseLabel(mode, phase, status)}</span>
    </NavLink>
  );
}
