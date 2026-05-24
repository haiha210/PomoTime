import { useEffect, useMemo, useRef, useState } from "react";

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
  type TimerMode,
  type TimerPhase,
  type TimerSessionWindow,
  type TimerStatus,
} from "./timerMachine";

const POMODORO_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export interface TimerMachineViewState {
  mode: TimerMode;
  phase: TimerPhase;
  status: TimerStatus;
  activeSeconds: number;
  displaySeconds: number;
}

export interface PhaseTransitionEvent {
  /** Phase that just ended. */
  endedPhase: TimerPhase;
  /** Phase that has just started (null if returning to idle). */
  startedPhase: TimerPhase | null;
  /** Work session window when a work phase completes; null otherwise. */
  workSessionWindow: TimerSessionWindow | null;
}

export interface TimerStateMachineApi {
  state: TimerMachineViewState;
  setMode(mode: TimerMode): void;
  setPomodoroMinutes(minutes: number): void;
  setBreakMinutes(minutes: number): void;
  start(): void;
  pause(): void;
  resume(): void;
  stopAndCollectWindow(): TimerSessionWindow | null;
}

export interface UseTimerStateMachineOptions {
  onPhaseTransition?(event: PhaseTransitionEvent): void;
  initialWorkMinutes?: number;
  initialBreakMinutes?: number;
}

export function useTimerStateMachine(
  options: UseTimerStateMachineOptions = {}
): TimerStateMachineApi {
  const initialWorkSeconds = Math.max(60, Math.floor((options.initialWorkMinutes ?? 25) * 60));
  const initialBreakSeconds = Math.max(0, Math.floor((options.initialBreakMinutes ?? 5) * 60));
  const [state, setState] = useState(() =>
    createInitialTimerState("focus_clock", initialWorkSeconds || POMODORO_SECONDS, initialBreakSeconds || BREAK_SECONDS)
  );
  const stateRef = useRef(state);
  const [nowMs, setNowMs] = useState(Date.now());

  const onPhaseTransition = options.onPhaseTransition;
  const onPhaseTransitionRef = useRef(onPhaseTransition);
  useEffect(() => {
    onPhaseTransitionRef.current = onPhaseTransition;
  }, [onPhaseTransition]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state.status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.status]);

  const activeSeconds = useMemo(() => currentActiveSeconds(state, nowMs), [state, nowMs]);
  const remainingSeconds = useMemo(() => currentRemainingSeconds(state, nowMs), [state, nowMs]);

  // Detect countdown completion → auto-advance phase, fire transition event.
  useEffect(() => {
    if (state.mode !== "pomodoro" || state.status !== "running") {
      return;
    }

    if (remainingSeconds > 0) {
      return;
    }

    const completionMoment = Date.now();
    const { nextState, sessionWindow } = advancePhase(state, completionMoment);
    if (nextState === state) {
      return;
    }

    const endedPhase = state.phase;
    const startedPhase = nextState.status === "running" ? nextState.phase : null;

    setState(nextState);
    setNowMs(completionMoment);

    if (onPhaseTransitionRef.current) {
      onPhaseTransitionRef.current({
        endedPhase,
        startedPhase,
        workSessionWindow: sessionWindow,
      });
    }
  }, [remainingSeconds, state]);

  return {
    state: {
      mode: state.mode,
      phase: state.phase,
      status: state.status,
      activeSeconds,
      displaySeconds: state.mode === "pomodoro" ? remainingSeconds : activeSeconds,
    },
    setMode: (mode) => {
      setState((previous) => {
        const workSeconds = previous.workSeconds > 0 ? previous.workSeconds : POMODORO_SECONDS;
        const breakSeconds = previous.breakSeconds >= 0 ? previous.breakSeconds : BREAK_SECONDS;
        return selectTimerMode(previous, mode, workSeconds, breakSeconds);
      });
      setNowMs(Date.now());
    },
    setPomodoroMinutes: (minutes) => {
      const normalizedMinutes = Math.max(1, Math.min(180, Math.floor(minutes || 0)));
      setState((previous) => setDurations(previous, normalizedMinutes * 60, previous.breakSeconds));
      setNowMs(Date.now());
    },
    setBreakMinutes: (minutes) => {
      const normalizedMinutes = Math.max(0, Math.min(60, Math.floor(minutes || 0)));
      setState((previous) => setDurations(previous, previous.workSeconds, normalizedMinutes * 60));
      setNowMs(Date.now());
    },
    start: () => {
      setState((previous) => startTimer(previous, Date.now()));
      setNowMs(Date.now());
    },
    pause: () => {
      setState((previous) => pauseTimer(previous, Date.now()));
      setNowMs(Date.now());
    },
    resume: () => {
      setState((previous) => resumeTimer(previous, Date.now()));
      setNowMs(Date.now());
    },
    stopAndCollectWindow: () => {
      const now = Date.now();
      const result = stopTimer(stateRef.current, now);
      setState(result.nextState);
      setNowMs(now);
      return result.sessionWindow;
    },
  };
}
