export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type InvokeArguments = Record<string, unknown> | undefined;
type TauriInvoke = <T>(command: string, args?: InvokeArguments) => Promise<T>;

function getTauriInvoke(): TauriInvoke | null {
  return window.__TAURI__?.core?.invoke ?? null;
}

async function callCommand<T>(
  command: string,
  args?: InvokeArguments
): Promise<ApiResponse<T>> {
  const invoke = getTauriInvoke();

  if (!invoke) {
    return {
      success: false,
      error: "Tauri runtime is not available",
    };
  }

  try {
    return await invoke<ApiResponse<T>>(command, args);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface GoalPayload {
  userId: string;
  title: string;
  description?: string;
  goalType: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SubjectPayload {
  userId: string;
  name: string;
  color?: string;
}

export interface StopTimerPayload {
  userId: string;
  goalId?: string;
  subjectId?: string;
  title: string;
  note: string;
  startTime: string;
  endTime: string;
  startedAtUnixSeconds: number;
  stoppedAtUnixSeconds: number;
  workMode: string;
}

export interface DailyStatsPayload {
  userId: string;
  date: string;
  targetMinutes: number;
}

export const tauriCommands = {
  createGoal: (payload: GoalPayload): Promise<ApiResponse<unknown>> =>
    callCommand("create_goal", {
      input: {
        user_id: payload.userId,
        title: payload.title,
        description: payload.description ?? null,
        goal_type: payload.goalType,
        start_date: payload.startDate,
        end_date: payload.endDate,
        is_active: payload.isActive,
      },
    }),

  listGoals: (userId: string): Promise<ApiResponse<unknown[]>> =>
    callCommand("list_goals", { userId }),

  createSubject: (payload: SubjectPayload): Promise<ApiResponse<unknown>> =>
    callCommand("create_subject", {
      input: {
        user_id: payload.userId,
        name: payload.name,
        color: payload.color ?? null,
      },
    }),

  listSubjects: (userId: string): Promise<ApiResponse<unknown[]>> =>
    callCommand("list_subjects", { userId }),

  saveStoppedTimer: (payload: StopTimerPayload): Promise<ApiResponse<unknown>> =>
    callCommand("save_stopped_timer", {
      input: {
        user_id: payload.userId,
        goal_id: payload.goalId ?? null,
        subject_id: payload.subjectId ?? null,
        title: payload.title,
        note: payload.note,
        start_time: payload.startTime,
        end_time: payload.endTime,
        started_at_unix_seconds: payload.startedAtUnixSeconds,
        stopped_at_unix_seconds: payload.stoppedAtUnixSeconds,
        work_mode: payload.workMode,
      },
    }),

  listSessions: (userId: string): Promise<ApiResponse<unknown[]>> =>
    callCommand("list_sessions", { userId }),

  getDailyStats: (payload: DailyStatsPayload): Promise<ApiResponse<unknown>> =>
    callCommand("get_daily_stats", {
      input: {
        user_id: payload.userId,
        date: payload.date,
        target_minutes: payload.targetMinutes,
      },
    }),
};
