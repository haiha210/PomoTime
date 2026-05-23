import { useEffect, useMemo, useRef, useState } from "react";

import {
  createInitialTimerState,
  currentActiveSeconds,
  currentRemainingSeconds,
  pauseTimer,
  resumeTimer,
  selectTimerMode,
  startTimer,
  stopTimer,
  type TimerMode,
  type TimerSessionWindow,
  type TimerStatus,
} from "./timerMachine";

const POMODORO_SECONDS = 25 * 60;

export interface TimerMachineViewState {
  mode: TimerMode;
  status: TimerStatus;
  activeSeconds: number;
  displaySeconds: number;
}

export interface TimerStateMachineApi {
  state: TimerMachineViewState;
  setMode(mode: TimerMode): void;
  start(): void;
  pause(): void;
  resume(): void;
  stopAndCollectWindow(): TimerSessionWindow | null;
}

export function useTimerStateMachine(): TimerStateMachineApi {
  const [state, setState] = useState(() => createInitialTimerState("focus_clock", POMODORO_SECONDS));
  const stateRef = useRef(state);
  const [nowMs, setNowMs] = useState(Date.now());

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

  return {
    state: {
      mode: state.mode,
      status: state.status,
      activeSeconds,
      displaySeconds: state.mode === "pomodoro" ? remainingSeconds : activeSeconds,
    },
    setMode: (mode) => {
      setState((previous) => selectTimerMode(previous, mode, POMODORO_SECONDS));
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
