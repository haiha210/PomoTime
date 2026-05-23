import {
  createInitialTimerState,
  currentActiveSeconds,
  currentRemainingSeconds,
  pauseTimer,
  resumeTimer,
  selectTimerMode,
  startTimer,
  stopTimer,
} from "./timerMachine";

describe("timerMachine", () => {
  it("keeps duration accurate across pause/resume", () => {
    const t0 = 1_000_000;
    const started = startTimer(createInitialTimerState("focus_clock"), t0);

    const paused = pauseTimer(started, t0 + 90_000);
    expect(currentActiveSeconds(paused, t0 + 120_000)).toBe(90);

    const resumed = resumeTimer(paused, t0 + 120_000);
    const stopped = stopTimer(resumed, t0 + 240_000);

    expect(stopped.sessionWindow?.activeSeconds).toBe(210);
  });

  it("tracks pomodoro remaining time from configured target", () => {
    const base = selectTimerMode(createInitialTimerState(), "pomodoro", 1500);
    const started = startTimer(base, 1000);

    expect(currentRemainingSeconds(started, 1000)).toBe(1500);
    expect(currentRemainingSeconds(started, 121_000)).toBe(1380);
  });

  it("returns empty session when stopping without active duration", () => {
    const stopped = stopTimer(createInitialTimerState(), 10_000);

    expect(stopped.sessionWindow).toBeNull();
  });
});
