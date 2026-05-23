export type TimerMode = "pomodoro" | "focus_clock";
export type TimerStatus = "idle" | "running" | "paused";

export interface TimerSessionWindow {
  startedAtUnixSeconds: number;
  stoppedAtUnixSeconds: number;
  activeSeconds: number;
}

export interface TimerMachineState {
  mode: TimerMode;
  status: TimerStatus;
  targetSeconds: number;
  startedAtUnixSeconds: number | null;
  segmentStartedAtMs: number | null;
  accumulatedActiveSeconds: number;
}

export function createInitialTimerState(
  mode: TimerMode = "focus_clock",
  targetSeconds = 25 * 60
): TimerMachineState {
  return {
    mode,
    status: "idle",
    targetSeconds,
    startedAtUnixSeconds: null,
    segmentStartedAtMs: null,
    accumulatedActiveSeconds: 0,
  };
}

function segmentElapsedSeconds(segmentStartedAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - segmentStartedAtMs) / 1000));
}

export function currentActiveSeconds(state: TimerMachineState, nowMs: number): number {
  if (state.status !== "running" || state.segmentStartedAtMs === null) {
    return state.accumulatedActiveSeconds;
  }

  return state.accumulatedActiveSeconds + segmentElapsedSeconds(state.segmentStartedAtMs, nowMs);
}

export function currentRemainingSeconds(state: TimerMachineState, nowMs: number): number {
  if (state.mode !== "pomodoro") {
    return 0;
  }

  return Math.max(0, state.targetSeconds - currentActiveSeconds(state, nowMs));
}

export function selectTimerMode(
  state: TimerMachineState,
  mode: TimerMode,
  targetSeconds = 25 * 60
): TimerMachineState {
  if (state.status !== "idle") {
    return state;
  }

  return createInitialTimerState(mode, targetSeconds);
}

export function startTimer(state: TimerMachineState, nowMs: number): TimerMachineState {
  if (state.status !== "idle") {
    return state;
  }

  return {
    ...state,
    status: "running",
    startedAtUnixSeconds: Math.floor(nowMs / 1000),
    segmentStartedAtMs: nowMs,
    accumulatedActiveSeconds: 0,
  };
}

export function pauseTimer(state: TimerMachineState, nowMs: number): TimerMachineState {
  if (state.status !== "running" || state.segmentStartedAtMs === null) {
    return state;
  }

  return {
    ...state,
    status: "paused",
    segmentStartedAtMs: null,
    accumulatedActiveSeconds:
      state.accumulatedActiveSeconds + segmentElapsedSeconds(state.segmentStartedAtMs, nowMs),
  };
}

export function resumeTimer(state: TimerMachineState, nowMs: number): TimerMachineState {
  if (state.status !== "paused") {
    return state;
  }

  return {
    ...state,
    status: "running",
    segmentStartedAtMs: nowMs,
  };
}

export function stopTimer(
  state: TimerMachineState,
  nowMs: number
): { nextState: TimerMachineState; sessionWindow: TimerSessionWindow | null } {
  const activeSeconds = currentActiveSeconds(state, nowMs);
  const startedAtUnixSeconds = state.startedAtUnixSeconds;

  const nextState = createInitialTimerState(state.mode, state.targetSeconds);

  if (!startedAtUnixSeconds || activeSeconds <= 0) {
    return { nextState, sessionWindow: null };
  }

  return {
    nextState,
    sessionWindow: {
      startedAtUnixSeconds,
      stoppedAtUnixSeconds: Math.floor(nowMs / 1000),
      activeSeconds,
    },
  };
}
