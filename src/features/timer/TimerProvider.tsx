import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

import {
  useTimerStateMachine,
  type PhaseTransitionEvent,
  type TimerStateMachineApi,
} from "./useTimerStateMachine";

const WORK_PREF_KEY = "pomotime.timer.workMinutes";
const BREAK_PREF_KEY = "pomotime.timer.breakMinutes";

function readNumberPref(key: string, fallback: number): number {
  if (typeof localStorage === "undefined") {
    return fallback;
  }
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type PhaseHandler = (event: PhaseTransitionEvent) => void;

interface TimerContextValue {
  timer: TimerStateMachineApi;
  registerPhaseHandler(handler: PhaseHandler | null): void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  children: ReactNode;
}

export function TimerProvider({ children }: TimerProviderProps): React.JSX.Element {
  const phaseHandlerRef = useRef<PhaseHandler | null>(null);

  const initialWorkMinutes = useMemo(() => readNumberPref(WORK_PREF_KEY, 25), []);
  const initialBreakMinutes = useMemo(() => readNumberPref(BREAK_PREF_KEY, 5), []);

  const timer = useTimerStateMachine({
    initialWorkMinutes,
    initialBreakMinutes,
    onPhaseTransition: (event) => {
      phaseHandlerRef.current?.(event);
    },
  });

  const value = useMemo<TimerContextValue>(
    () => ({
      timer,
      registerPhaseHandler: (handler) => {
        phaseHandlerRef.current = handler;
      },
    }),
    [timer]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimerContext(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimerContext must be used within a TimerProvider");
  }
  return ctx;
}
