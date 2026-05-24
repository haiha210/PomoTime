export type TimerMode = "pomodoro" | "focus_clock";
export type TimerStatus = "idle" | "running" | "paused";
export type TimerPhase = "work" | "break";

export interface TimerSessionWindow {
  startedAtUnixSeconds: number;
  stoppedAtUnixSeconds: number;
  activeSeconds: number;
}

export interface TimerMachineState {
  mode: TimerMode;
  status: TimerStatus;
  phase: TimerPhase;
  targetSeconds: number;
  workSeconds: number;
  breakSeconds: number;
  startedAtUnixSeconds: number | null;
  segmentStartedAtMs: number | null;
  accumulatedActiveSeconds: number;
}

const DEFAULT_WORK_SECONDS = 25 * 60;
const DEFAULT_BREAK_SECONDS = 5 * 60;

export function createInitialTimerState(
  mode: TimerMode = "focus_clock",
  workSeconds: number = DEFAULT_WORK_SECONDS,
  breakSeconds: number = DEFAULT_BREAK_SECONDS
): TimerMachineState {
  return {
    mode,
    status: "idle",
    phase: "work",
    targetSeconds: workSeconds,
    workSeconds,
    breakSeconds,
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
  workSeconds: number = state.workSeconds || DEFAULT_WORK_SECONDS,
  breakSeconds: number = state.breakSeconds || DEFAULT_BREAK_SECONDS
): TimerMachineState {
  if (state.status !== "idle") {
    return state;
  }

  return createInitialTimerState(mode, workSeconds, breakSeconds);
}

export function setDurations(
  state: TimerMachineState,
  workSeconds: number,
  breakSeconds: number
): TimerMachineState {
  if (state.status !== "idle") {
    return state;
  }

  const normalizedWork = Math.max(60, Math.floor(workSeconds || DEFAULT_WORK_SECONDS));
  const normalizedBreak = Math.max(0, Math.floor(breakSeconds || 0));

  return {
    ...state,
    workSeconds: normalizedWork,
    breakSeconds: normalizedBreak,
    targetSeconds: state.phase === "break" ? normalizedBreak : normalizedWork,
  };
}

export function startTimer(state: TimerMachineState, nowMs: number): TimerMachineState {
  if (state.status !== "idle") {
    return state;
  }

  return {
    ...state,
    status: "running",
    phase: "work",
    targetSeconds: state.workSeconds || DEFAULT_WORK_SECONDS,
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
  const wasWorkPhase = state.phase === "work";

  const nextState = createInitialTimerState(state.mode, state.workSeconds, state.breakSeconds);

  if (!wasWorkPhase || !startedAtUnixSeconds || activeSeconds <= 0) {
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

/**
 * Advance from completed work phase into break, or from completed break back to idle.
 * Returns the session window for the work phase that just ended (caller persists it).
 */
export function advancePhase(
  state: TimerMachineState,
  nowMs: number
): { nextState: TimerMachineState; sessionWindow: TimerSessionWindow | null } {
  if (state.mode !== "pomodoro") {
    return { nextState: state, sessionWindow: null };
  }

  if (state.phase === "work") {
    const activeSeconds = currentActiveSeconds(state, nowMs);
    const startedAtUnixSeconds = state.startedAtUnixSeconds;
    const sessionWindow: TimerSessionWindow | null =
      startedAtUnixSeconds && activeSeconds > 0
        ? {
            startedAtUnixSeconds,
            stoppedAtUnixSeconds: Math.floor(nowMs / 1000),
            activeSeconds,
          }
        : null;

    const breakSeconds = state.breakSeconds || 0;
    if (breakSeconds <= 0) {
      return {
        nextState: createInitialTimerState(state.mode, state.workSeconds, state.breakSeconds),
        sessionWindow,
      };
    }

    return {
      nextState: {
        ...state,
        phase: "break",
        status: "running",
        targetSeconds: breakSeconds,
        startedAtUnixSeconds: null,
        segmentStartedAtMs: nowMs,
        accumulatedActiveSeconds: 0,
      },
      sessionWindow,
    };
  }

  // Break phase ended → return to idle, ready for next work cycle.
  return {
    nextState: createInitialTimerState(state.mode, state.workSeconds, state.breakSeconds),
    sessionWindow: null,
  };
}
