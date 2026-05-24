import {
  advancePhase,
  createInitialTimerState,
  currentActiveSeconds,
  currentRemainingSeconds,
  pauseTimer,
  resumeTimer,
  selectTimerMode,
  setDurations,
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

  it("ignores pause when not running", () => {
    const idle = createInitialTimerState();
    expect(pauseTimer(idle, 1_000)).toBe(idle);
  });

  it("ignores resume when not paused", () => {
    const idle = createInitialTimerState();
    expect(resumeTimer(idle, 1_000)).toBe(idle);
  });

  it("ignores mode selection while not idle", () => {
    const running = startTimer(createInitialTimerState("focus_clock"), 1_000);
    expect(selectTimerMode(running, "pomodoro", 1500)).toBe(running);
  });

  it("setDurations applies new work/break only while idle", () => {
    const idle = createInitialTimerState("pomodoro", 25 * 60, 5 * 60);
    const updated = setDurations(idle, 30 * 60, 10 * 60);
    expect(updated.workSeconds).toBe(30 * 60);
    expect(updated.breakSeconds).toBe(10 * 60);
    expect(updated.targetSeconds).toBe(30 * 60);

    const running = startTimer(updated, 1_000);
    const noChange = setDurations(running, 50 * 60, 20 * 60);
    expect(noChange).toBe(running);
  });

  it("setDurations clamps invalid input to sensible minimums", () => {
    const idle = createInitialTimerState("pomodoro");
    const clamped = setDurations(idle, 0, -5);
    expect(clamped.workSeconds).toBeGreaterThanOrEqual(60);
    expect(clamped.breakSeconds).toBe(0);
  });

  it("advancePhase moves work → break with a session window", () => {
    const base = selectTimerMode(createInitialTimerState(), "pomodoro", 60, 30);
    const started = startTimer(base, 1_000);
    const completion = 1_000 + 60_000;
    const { nextState, sessionWindow } = advancePhase(started, completion);

    expect(nextState.phase).toBe("break");
    expect(nextState.status).toBe("running");
    expect(nextState.targetSeconds).toBe(30);
    expect(sessionWindow?.activeSeconds).toBe(60);
  });

  it("advancePhase skips break when breakSeconds is zero", () => {
    const base = selectTimerMode(createInitialTimerState(), "pomodoro", 60, 0);
    const started = startTimer(base, 1_000);
    const { nextState, sessionWindow } = advancePhase(started, 1_000 + 60_000);

    expect(nextState.phase).toBe("work");
    expect(nextState.status).toBe("idle");
    expect(sessionWindow?.activeSeconds).toBe(60);
  });

  it("advancePhase from break returns to idle without a session window", () => {
    const base = selectTimerMode(createInitialTimerState(), "pomodoro", 60, 30);
    const started = startTimer(base, 1_000);
    const afterWork = advancePhase(started, 1_000 + 60_000).nextState;
    const afterBreak = advancePhase(afterWork, 1_000 + 60_000 + 30_000);

    expect(afterBreak.nextState.phase).toBe("work");
    expect(afterBreak.nextState.status).toBe("idle");
    expect(afterBreak.sessionWindow).toBeNull();
  });

  it("advancePhase is a no-op outside pomodoro", () => {
    const focus = startTimer(createInitialTimerState("focus_clock"), 1_000);
    const { nextState, sessionWindow } = advancePhase(focus, 1_000 + 10_000);
    expect(nextState).toBe(focus);
    expect(sessionWindow).toBeNull();
  });

  it("stopTimer during break phase produces no session window", () => {
    const base = selectTimerMode(createInitialTimerState(), "pomodoro", 60, 30);
    const started = startTimer(base, 1_000);
    const inBreak = advancePhase(started, 1_000 + 60_000).nextState;
    const stopped = stopTimer(inBreak, 1_000 + 60_000 + 5_000);
    expect(stopped.sessionWindow).toBeNull();
    expect(stopped.nextState.phase).toBe("work");
    expect(stopped.nextState.status).toBe("idle");
  });

  it("currentRemainingSeconds is zero for focus_clock", () => {
    const focus = startTimer(createInitialTimerState("focus_clock"), 1_000);
    expect(currentRemainingSeconds(focus, 2_000)).toBe(0);
  });
});
