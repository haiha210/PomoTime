import { getSupabaseClient } from "../core/supabase/client";

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

const SUPABASE_UNAVAILABLE_ERROR = "Supabase client is not configured";

function toLocalIsoDate(value: Date): string {
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoDateKey(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp.slice(0, 10);
  }

  return toLocalIsoDate(parsed);
}

function previousIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  const cursor = new Date(year, month - 1, day);
  cursor.setDate(cursor.getDate() - 1);
  return toLocalIsoDate(cursor);
}

function calculateStreakFromDateSet(dateSet: Set<string>, endIsoDate: string): number {
  let cursor = dateSet.has(endIsoDate) ? endIsoDate : previousIsoDate(endIsoDate);
  let streak = 0;

  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = previousIsoDate(cursor);
  }

  return streak;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseClient());
}

async function callCommand<T>(
  command: string,
  args?: InvokeArguments
): Promise<ApiResponse<T>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: SUPABASE_UNAVAILABLE_ERROR };
  }

  const input = (args as { input?: Record<string, unknown> } | undefined)?.input || {};
  const wrapError = (error: unknown): ApiResponse<T> => ({
    success: false,
    error: error instanceof Error ? error.message : String(error ?? "unknown error"),
  });

  try {
    switch (command) {
      case "create_goal": {
        const userId = String(input.user_id || "");
        const isActive = Boolean(input.is_active);

        if (isActive) {
          const { error: deactivateError } = await supabase
            .from("learning_goals")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("is_active", true);
          if (deactivateError) return wrapError(deactivateError);
        }

        const { data, error } = await supabase
          .from("learning_goals")
          .insert({
            user_id: userId,
            title: String(input.title || "Untitled goal"),
            description: (input.description as string | null) ?? null,
            goal_type: String(input.goal_type || "custom"),
            start_date: String(input.start_date || toLocalIsoDate(new Date())),
            end_date: String(input.end_date || toLocalIsoDate(new Date())),
            is_active: isActive,
          })
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "list_goals": {
        const userId = String((args as { userId?: string } | undefined)?.userId || "");
        const { data, error } = await supabase
          .from("learning_goals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) return wrapError(error);
        return { success: true, data: (data ?? []) as T };
      }

      case "update_goal": {
        const goalId = String(input.id || "");
        const { data: current, error: fetchError } = await supabase
          .from("learning_goals")
          .select("*")
          .eq("id", goalId)
          .single();
        if (fetchError) return wrapError(fetchError);
        if (!current) return { success: false, error: `Goal not found: ${goalId}` };

        const nextActive = Boolean(input.is_active ?? current.is_active);
        if (nextActive) {
          const { error: deactivateError } = await supabase
            .from("learning_goals")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("user_id", current.user_id)
            .neq("id", goalId)
            .eq("is_active", true);
          if (deactivateError) return wrapError(deactivateError);
        }

        const { data, error } = await supabase
          .from("learning_goals")
          .update({
            title: String(input.title ?? current.title),
            description:
              input.description === undefined
                ? current.description
                : ((input.description as string | null) ?? null),
            goal_type: String(input.goal_type ?? current.goal_type),
            start_date: String(input.start_date ?? current.start_date),
            end_date: String(input.end_date ?? current.end_date),
            is_active: nextActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", goalId)
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "delete_goal": {
        const goalId = String((args as { id?: string } | undefined)?.id || "");
        const { error } = await supabase.from("learning_goals").delete().eq("id", goalId);
        if (error) return wrapError(error);
        return { success: true, data: { deleted: true } as T };
      }

      case "set_active_goal": {
        const goalId = String((args as { goalId?: string } | undefined)?.goalId || "");
        const { data: target, error: fetchError } = await supabase
          .from("learning_goals")
          .select("*")
          .eq("id", goalId)
          .single();
        if (fetchError) return wrapError(fetchError);
        if (!target) return { success: false, error: `Goal not found: ${goalId}` };

        const nowIso = new Date().toISOString();
        const { error: deactivateError } = await supabase
          .from("learning_goals")
          .update({ is_active: false, updated_at: nowIso })
          .eq("user_id", target.user_id)
          .neq("id", goalId)
          .eq("is_active", true);
        if (deactivateError) return wrapError(deactivateError);

        const { data, error } = await supabase
          .from("learning_goals")
          .update({ is_active: true, updated_at: nowIso })
          .eq("id", goalId)
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "list_weekly_targets": {
        const goalId = String((args as { goalId?: string } | undefined)?.goalId || "");
        const { data, error } = await supabase
          .from("weekly_goal_targets")
          .select("*")
          .eq("goal_id", goalId)
          .order("weekday", { ascending: true });
        if (error) return wrapError(error);
        return { success: true, data: (data ?? []) as T };
      }

      case "upsert_weekly_target": {
        const goalId = String(input.goal_id || "");
        const weekday = Number(input.weekday || 0);
        const targetMinutes = Math.max(0, Math.floor(Number(input.target_minutes || 0)));

        const { data, error } = await supabase
          .from("weekly_goal_targets")
          .upsert(
            {
              goal_id: goalId,
              weekday,
              target_minutes: targetMinutes,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "goal_id,weekday" }
          )
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "create_subject": {
        const { data, error } = await supabase
          .from("subjects")
          .insert({
            user_id: String(input.user_id || ""),
            name: String(input.name || "General"),
            color: (input.color as string | null) ?? null,
          })
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "list_subjects": {
        const userId = String((args as { userId?: string } | undefined)?.userId || "");
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .eq("user_id", userId)
          .order("name", { ascending: true });
        if (error) return wrapError(error);
        return { success: true, data: (data ?? []) as T };
      }

      case "update_subject": {
        const subjectId = String(input.id || "");
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) patch.name = String(input.name);
        if (input.color !== undefined) patch.color = (input.color as string | null) ?? null;

        const { data, error } = await supabase
          .from("subjects")
          .update(patch)
          .eq("id", subjectId)
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "delete_subject": {
        const subjectId = String((args as { id?: string } | undefined)?.id || "");
        const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
        if (error) return wrapError(error);
        return { success: true, data: { deleted: true } as T };
      }

      case "save_stopped_timer": {
        const startedAtUnixSeconds = Math.floor(Number(input.started_at_unix_seconds || 0));
        const stoppedAtUnixSeconds = Math.floor(
          Number(input.stopped_at_unix_seconds || startedAtUnixSeconds)
        );
        const durationMinutes = Math.max(
          1,
          Math.floor(Math.max(0, stoppedAtUnixSeconds - startedAtUnixSeconds) / 60)
        );
        const fallbackStart = new Date(startedAtUnixSeconds * 1000).toISOString();
        const fallbackEnd = new Date(stoppedAtUnixSeconds * 1000).toISOString();

        const { data, error } = await supabase
          .from("study_sessions")
          .insert({
            user_id: String(input.user_id || ""),
            goal_id: input.goal_id ? String(input.goal_id) : null,
            subject_id: input.subject_id ? String(input.subject_id) : null,
            title: String(input.title || "Study session"),
            note: String(input.note || ""),
            start_time: String(input.start_time || fallbackStart),
            end_time: String(input.end_time || fallbackEnd),
            duration_minutes: durationMinutes,
            work_mode: String(input.work_mode || "focus_clock"),
          })
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "list_sessions": {
        const userId = String((args as { userId?: string } | undefined)?.userId || "");
        const { data, error } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("start_time", { ascending: false });
        if (error) return wrapError(error);
        return { success: true, data: (data ?? []) as T };
      }

      case "add_manual_session": {
        const durationMinutes = Math.max(1, Math.floor(Number(input.duration_minutes || 0)));
        const { data, error } = await supabase
          .from("study_sessions")
          .insert({
            user_id: String(input.user_id || ""),
            goal_id: input.goal_id ? String(input.goal_id) : null,
            subject_id: input.subject_id ? String(input.subject_id) : null,
            title: String(input.title || "Manual session"),
            note: String(input.note || ""),
            start_time: String(input.start_time || new Date().toISOString()),
            end_time: String(input.end_time || new Date().toISOString()),
            duration_minutes: durationMinutes,
            work_mode: String(input.work_mode || "focus_clock"),
          })
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "update_session": {
        const sessionId = String(input.id || "");
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.goal_id !== undefined) {
          patch.goal_id = input.goal_id ? String(input.goal_id) : null;
        }
        if (input.subject_id !== undefined) {
          patch.subject_id = input.subject_id ? String(input.subject_id) : null;
        }
        if (input.title !== undefined) patch.title = String(input.title);
        if (input.note !== undefined) patch.note = String(input.note);
        if (input.start_time !== undefined) patch.start_time = String(input.start_time);
        if (input.end_time !== undefined) patch.end_time = String(input.end_time);
        if (input.duration_minutes !== undefined) {
          patch.duration_minutes = Math.max(1, Math.floor(Number(input.duration_minutes)));
        }
        if (input.work_mode !== undefined) patch.work_mode = String(input.work_mode);

        const { data, error } = await supabase
          .from("study_sessions")
          .update(patch)
          .eq("id", sessionId)
          .select()
          .single();
        if (error) return wrapError(error);
        return { success: true, data: data as T };
      }

      case "delete_session": {
        const sessionId = String((args as { id?: string } | undefined)?.id || "");
        const { error } = await supabase.from("study_sessions").delete().eq("id", sessionId);
        if (error) return wrapError(error);
        return { success: true, data: { deleted: true } as T };
      }

      case "get_daily_stats": {
        const userId = String(input.user_id || "");
        const date = String(input.date || toLocalIsoDate(new Date()));
        const targetMinutes = Math.max(0, Math.floor(Number(input.target_minutes || 0)));

        const { data: sessions, error } = await supabase
          .from("study_sessions")
          .select("start_time, duration_minutes")
          .eq("user_id", userId);
        if (error) return wrapError(error);

        const rows = (sessions ?? []) as Array<{ start_time: string; duration_minutes: number }>;
        const studiedMinutes = rows
          .filter((row) => toIsoDateKey(row.start_time) === date)
          .reduce((sum, row) => sum + Math.max(0, row.duration_minutes), 0);

        const dateSet = new Set(
          rows
            .filter((row) => row.duration_minutes > 0)
            .map((row) => toIsoDateKey(row.start_time))
        );

        const data: DailyStatsRecord = {
          date,
          target_minutes: targetMinutes,
          studied_minutes: studiedMinutes,
          remaining_minutes: Math.max(0, targetMinutes - studiedMinutes),
          progress_ratio: targetMinutes === 0 ? 0 : Math.min(1, studiedMinutes / targetMinutes),
          is_target_reached: targetMinutes > 0 && studiedMinutes >= targetMinutes,
          streak: calculateStreakFromDateSet(dateSet, date),
        };

        return { success: true, data: data as T };
      }

      default:
        return { success: false, error: `Unsupported command: ${command}` };
    }
  } catch (error) {
    return wrapError(error);
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

export interface ManualSessionPayload {
  userId: string;
  goalId?: string;
  subjectId?: string;
  title: string;
  note: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  workMode: string;
}

export interface UpdateSessionPayload {
  id: string;
  goalId?: string;
  subjectId?: string;
  title: string;
  note: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
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

  addManualSession: (payload: ManualSessionPayload): Promise<ApiResponse<SessionRecord>> =>
    callCommand("add_manual_session", {
      input: {
        user_id: payload.userId,
        goal_id: payload.goalId ?? null,
        subject_id: payload.subjectId ?? null,
        title: payload.title,
        note: payload.note,
        start_time: payload.startTime,
        end_time: payload.endTime,
        duration_minutes: payload.durationMinutes,
        work_mode: payload.workMode,
      },
    }),

  updateSession: (payload: UpdateSessionPayload): Promise<ApiResponse<SessionRecord>> =>
    callCommand("update_session", {
      input: {
        id: payload.id,
        goal_id: payload.goalId ?? null,
        subject_id: payload.subjectId ?? null,
        title: payload.title,
        note: payload.note,
        start_time: payload.startTime,
        end_time: payload.endTime,
        duration_minutes: payload.durationMinutes,
        work_mode: payload.workMode,
      },
    }),

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
