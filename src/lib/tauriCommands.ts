export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DeleteResult {
  deleted: boolean;
}

export interface GoalRecord {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  goal_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface SubjectRecord {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
}

export interface WeeklyTargetRecord {
  id: string;
  goal_id: string;
  weekday: number;
  target_minutes: number;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  goal_id?: string | null;
  subject_id?: string | null;
  title: string;
  note: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  work_mode: string;
}

export interface DailyStatsRecord {
  date: string;
  target_minutes: number;
  studied_minutes: number;
  remaining_minutes: number;
  progress_ratio: number;
  is_target_reached: boolean;
  streak: number;
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

export interface GoalUpdatePayload extends GoalPayload {
  id: string;
}

export interface SubjectPayload {
  userId: string;
  name: string;
  color?: string;
}

export interface SubjectUpdatePayload {
  id: string;
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
  createGoal: (payload: GoalPayload): Promise<ApiResponse<GoalRecord>> =>
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

  listGoals: (userId: string): Promise<ApiResponse<GoalRecord[]>> =>
    callCommand("list_goals", { userId }),

  updateGoal: (payload: GoalUpdatePayload): Promise<ApiResponse<GoalRecord>> =>
    callCommand("update_goal", {
      input: {
        id: payload.id,
        title: payload.title,
        description: payload.description ?? null,
        goal_type: payload.goalType,
        start_date: payload.startDate,
        end_date: payload.endDate,
        is_active: payload.isActive,
      },
    }),

  deleteGoal: (id: string): Promise<ApiResponse<DeleteResult>> =>
    callCommand("delete_goal", { id }),

  setActiveGoal: (goalId: string): Promise<ApiResponse<GoalRecord>> =>
    callCommand("set_active_goal", { goalId }),

  listWeeklyTargets: (goalId: string): Promise<ApiResponse<WeeklyTargetRecord[]>> =>
    callCommand("list_weekly_targets", { goalId }),

  upsertWeeklyTarget: (
    goalId: string,
    weekday: number,
    targetMinutes: number
  ): Promise<ApiResponse<WeeklyTargetRecord>> =>
    callCommand("upsert_weekly_target", {
      input: {
        goal_id: goalId,
        weekday,
        target_minutes: targetMinutes,
      },
    }),

  createSubject: (payload: SubjectPayload): Promise<ApiResponse<SubjectRecord>> =>
    callCommand("create_subject", {
      input: {
        user_id: payload.userId,
        name: payload.name,
        color: payload.color ?? null,
      },
    }),

  listSubjects: (userId: string): Promise<ApiResponse<SubjectRecord[]>> =>
    callCommand("list_subjects", { userId }),

  updateSubject: (payload: SubjectUpdatePayload): Promise<ApiResponse<SubjectRecord>> =>
    callCommand("update_subject", {
      input: {
        id: payload.id,
        name: payload.name,
        color: payload.color ?? null,
      },
    }),

  deleteSubject: (id: string): Promise<ApiResponse<DeleteResult>> =>
    callCommand("delete_subject", { id }),

  saveStoppedTimer: (payload: StopTimerPayload): Promise<ApiResponse<SessionRecord>> =>
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

  listSessions: (userId: string): Promise<ApiResponse<SessionRecord[]>> =>
    callCommand("list_sessions", { userId }),

  deleteSession: (id: string): Promise<ApiResponse<DeleteResult>> =>
    callCommand("delete_session", { id }),

  getDailyStats: (payload: DailyStatsPayload): Promise<ApiResponse<DailyStatsRecord>> =>
    callCommand("get_daily_stats", {
      input: {
        user_id: payload.userId,
        date: payload.date,
        target_minutes: payload.targetMinutes,
      },
    }),
};
