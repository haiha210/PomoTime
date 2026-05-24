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

const TAURI_UNAVAILABLE_ERROR = "Tauri runtime is not available";
const WEB_PREVIEW_STORAGE_KEY = "pomotime.web-preview.db.v1";

interface WebPreviewDatabase {
  goals: GoalRecord[];
  subjects: SubjectRecord[];
  weeklyTargets: WeeklyTargetRecord[];
  sessions: SessionRecord[];
}

let webPreviewMemoryDatabase: WebPreviewDatabase = {
  goals: [],
  subjects: [],
  weeklyTargets: [],
  sessions: [],
};

function createDefaultWebPreviewDatabase(): WebPreviewDatabase {
  return {
    goals: [],
    subjects: [],
    weeklyTargets: [],
    sessions: [],
  };
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readWebPreviewDatabase(): WebPreviewDatabase {
  if (typeof localStorage === "undefined") {
    return cloneValue(webPreviewMemoryDatabase);
  }

  const raw = localStorage.getItem(WEB_PREVIEW_STORAGE_KEY);
  if (!raw) {
    return createDefaultWebPreviewDatabase();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WebPreviewDatabase>;
    return {
      goals: Array.isArray(parsed.goals) ? (parsed.goals as GoalRecord[]) : [],
      subjects: Array.isArray(parsed.subjects) ? (parsed.subjects as SubjectRecord[]) : [],
      weeklyTargets: Array.isArray(parsed.weeklyTargets)
        ? (parsed.weeklyTargets as WeeklyTargetRecord[])
        : [],
      sessions: Array.isArray(parsed.sessions) ? (parsed.sessions as SessionRecord[]) : [],
    };
  } catch {
    return createDefaultWebPreviewDatabase();
  }
}

function writeWebPreviewDatabase(database: WebPreviewDatabase): void {
  webPreviewMemoryDatabase = cloneValue(database);

  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(WEB_PREVIEW_STORAGE_KEY, JSON.stringify(database));
}

function generateLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

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
  let streak = 0;
  let cursor = endIsoDate;

  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = previousIsoDate(cursor);
  }

  return streak;
}

function webPreviewCommand<T>(command: string, args?: InvokeArguments): ApiResponse<T> {
  const database = readWebPreviewDatabase();
  const input = (args as { input?: Record<string, unknown> } | undefined)?.input || {};

  switch (command) {
    case "create_goal": {
      const userId = String(input.user_id || "demo-user");
      const newGoal: GoalRecord = {
        id: generateLocalId("goal"),
        user_id: userId,
        title: String(input.title || "Untitled goal"),
        description: (input.description as string | null) ?? null,
        goal_type: String(input.goal_type || "custom"),
        start_date: String(input.start_date || toLocalIsoDate(new Date())),
        end_date: String(input.end_date || toLocalIsoDate(new Date())),
        is_active: Boolean(input.is_active),
      };

      const nextGoals = newGoal.is_active
        ? [
            ...database.goals.map((goal) =>
              goal.user_id === userId ? { ...goal, is_active: false } : goal
            ),
            newGoal,
          ]
        : [...database.goals, newGoal];

      writeWebPreviewDatabase({
        ...database,
        goals: nextGoals,
      });

      return { success: true, data: cloneValue(newGoal) as T };
    }

    case "list_goals": {
      const userId = String((args as { userId?: string } | undefined)?.userId || "");
      const goals = database.goals.filter((goal) => goal.user_id === userId);
      return { success: true, data: cloneValue(goals) as T };
    }

    case "update_goal": {
      const goalId = String(input.id || "");
      const currentGoal = database.goals.find((goal) => goal.id === goalId);

      if (!currentGoal) {
        return { success: false, error: `Goal not found: ${goalId}` };
      }

      const updatedGoal: GoalRecord = {
        ...currentGoal,
        title: String(input.title ?? currentGoal.title),
        description:
          input.description === undefined
            ? currentGoal.description ?? null
            : ((input.description as string | null) ?? null),
        goal_type: String(input.goal_type ?? currentGoal.goal_type),
        start_date: String(input.start_date ?? currentGoal.start_date),
        end_date: String(input.end_date ?? currentGoal.end_date),
        is_active: Boolean(input.is_active ?? currentGoal.is_active),
      };

      let nextGoals = database.goals.map((goal) => (goal.id === goalId ? updatedGoal : goal));

      if (updatedGoal.is_active) {
        nextGoals = nextGoals.map((goal) =>
          goal.user_id === updatedGoal.user_id && goal.id !== updatedGoal.id
            ? { ...goal, is_active: false }
            : goal
        );
      }

      writeWebPreviewDatabase({
        ...database,
        goals: nextGoals,
      });

      return { success: true, data: cloneValue(updatedGoal) as T };
    }

    case "delete_goal": {
      const goalId = String((args as { id?: string } | undefined)?.id || "");
      const nextGoals = database.goals.filter((goal) => goal.id !== goalId);
      const nextWeeklyTargets = database.weeklyTargets.filter((target) => target.goal_id !== goalId);
      const nextSessions = database.sessions.map((session) =>
        session.goal_id === goalId ? { ...session, goal_id: null } : session
      );

      writeWebPreviewDatabase({
        ...database,
        goals: nextGoals,
        weeklyTargets: nextWeeklyTargets,
        sessions: nextSessions,
      });

      return { success: true, data: { deleted: true } as T };
    }

    case "set_active_goal": {
      const goalId = String((args as { goalId?: string } | undefined)?.goalId || "");
      const selectedGoal = database.goals.find((goal) => goal.id === goalId);

      if (!selectedGoal) {
        return { success: false, error: `Goal not found: ${goalId}` };
      }

      const nextGoals = database.goals.map((goal) => {
        if (goal.user_id !== selectedGoal.user_id) {
          return goal;
        }

        return {
          ...goal,
          is_active: goal.id === selectedGoal.id,
        };
      });

      writeWebPreviewDatabase({
        ...database,
        goals: nextGoals,
      });

      return {
        success: true,
        data: cloneValue({ ...selectedGoal, is_active: true }) as T,
      };
    }

    case "list_weekly_targets": {
      const goalId = String((args as { goalId?: string } | undefined)?.goalId || "");
      const weeklyTargets = database.weeklyTargets
        .filter((target) => target.goal_id === goalId)
        .sort((left, right) => left.weekday - right.weekday);

      return { success: true, data: cloneValue(weeklyTargets) as T };
    }

    case "upsert_weekly_target": {
      const goalId = String(input.goal_id || "");
      const weekday = Number(input.weekday || 0);
      const targetMinutes = Math.max(0, Math.floor(Number(input.target_minutes || 0)));

      const currentTarget = database.weeklyTargets.find(
        (target) => target.goal_id === goalId && target.weekday === weekday
      );

      const updatedTarget: WeeklyTargetRecord = currentTarget
        ? {
            ...currentTarget,
            target_minutes: targetMinutes,
          }
        : {
            id: generateLocalId("weekly-target"),
            goal_id: goalId,
            weekday,
            target_minutes: targetMinutes,
          };

      const nextWeeklyTargets = currentTarget
        ? database.weeklyTargets.map((target) =>
            target.id === currentTarget.id ? updatedTarget : target
          )
        : [...database.weeklyTargets, updatedTarget];

      writeWebPreviewDatabase({
        ...database,
        weeklyTargets: nextWeeklyTargets,
      });

      return { success: true, data: cloneValue(updatedTarget) as T };
    }

    case "create_subject": {
      const userId = String(input.user_id || "demo-user");
      const newSubject: SubjectRecord = {
        id: generateLocalId("subject"),
        user_id: userId,
        name: String(input.name || "General"),
        color: (input.color as string | null) ?? null,
      };

      writeWebPreviewDatabase({
        ...database,
        subjects: [...database.subjects, newSubject],
      });

      return { success: true, data: cloneValue(newSubject) as T };
    }

    case "list_subjects": {
      const userId = String((args as { userId?: string } | undefined)?.userId || "");
      const subjects = database.subjects.filter((subject) => subject.user_id === userId);
      return { success: true, data: cloneValue(subjects) as T };
    }

    case "update_subject": {
      const subjectId = String(input.id || "");
      const currentSubject = database.subjects.find((subject) => subject.id === subjectId);

      if (!currentSubject) {
        return { success: false, error: `Subject not found: ${subjectId}` };
      }

      const updatedSubject: SubjectRecord = {
        ...currentSubject,
        name: String(input.name ?? currentSubject.name),
        color:
          input.color === undefined ? currentSubject.color ?? null : ((input.color as string | null) ?? null),
      };

      writeWebPreviewDatabase({
        ...database,
        subjects: database.subjects.map((subject) =>
          subject.id === subjectId ? updatedSubject : subject
        ),
      });

      return { success: true, data: cloneValue(updatedSubject) as T };
    }

    case "delete_subject": {
      const subjectId = String((args as { id?: string } | undefined)?.id || "");
      const nextSubjects = database.subjects.filter((subject) => subject.id !== subjectId);
      const nextSessions = database.sessions.map((session) =>
        session.subject_id === subjectId ? { ...session, subject_id: null } : session
      );

      writeWebPreviewDatabase({
        ...database,
        subjects: nextSubjects,
        sessions: nextSessions,
      });

      return { success: true, data: { deleted: true } as T };
    }

    case "save_stopped_timer": {
      const startedAtUnixSeconds = Math.floor(Number(input.started_at_unix_seconds || 0));
      const stoppedAtUnixSeconds = Math.floor(Number(input.stopped_at_unix_seconds || startedAtUnixSeconds));
      const durationMinutes = Math.max(
        1,
        Math.floor(Math.max(0, stoppedAtUnixSeconds - startedAtUnixSeconds) / 60)
      );

      const fallbackStart = new Date(startedAtUnixSeconds * 1000).toISOString();
      const fallbackEnd = new Date(stoppedAtUnixSeconds * 1000).toISOString();

      const newSession: SessionRecord = {
        id: generateLocalId("session"),
        user_id: String(input.user_id || "demo-user"),
        goal_id: input.goal_id ? String(input.goal_id) : null,
        subject_id: input.subject_id ? String(input.subject_id) : null,
        title: String(input.title || "Study session"),
        note: String(input.note || ""),
        start_time: String(input.start_time || fallbackStart),
        end_time: String(input.end_time || fallbackEnd),
        duration_minutes: durationMinutes,
        work_mode: String(input.work_mode || "focus_clock"),
      };

      writeWebPreviewDatabase({
        ...database,
        sessions: [...database.sessions, newSession],
      });

      return { success: true, data: cloneValue(newSession) as T };
    }

    case "list_sessions": {
      const userId = String((args as { userId?: string } | undefined)?.userId || "");
      const sessions = database.sessions
        .filter((session) => session.user_id === userId)
        .sort((left, right) => right.start_time.localeCompare(left.start_time));

      return { success: true, data: cloneValue(sessions) as T };
    }

    case "add_manual_session": {
      const durationMinutes = Math.max(1, Math.floor(Number(input.duration_minutes || 0)));
      const newSession: SessionRecord = {
        id: generateLocalId("session"),
        user_id: String(input.user_id || "demo-user"),
        goal_id: input.goal_id ? String(input.goal_id) : null,
        subject_id: input.subject_id ? String(input.subject_id) : null,
        title: String(input.title || "Manual session"),
        note: String(input.note || ""),
        start_time: String(input.start_time || new Date().toISOString()),
        end_time: String(input.end_time || new Date().toISOString()),
        duration_minutes: durationMinutes,
        work_mode: String(input.work_mode || "focus_clock"),
      };

      writeWebPreviewDatabase({
        ...database,
        sessions: [...database.sessions, newSession],
      });

      return { success: true, data: cloneValue(newSession) as T };
    }

    case "update_session": {
      const sessionId = String(input.id || "");
      const currentSession = database.sessions.find((session) => session.id === sessionId);

      if (!currentSession) {
        return { success: false, error: `Session not found: ${sessionId}` };
      }

      const updatedSession: SessionRecord = {
        ...currentSession,
        goal_id:
          input.goal_id === undefined ? currentSession.goal_id ?? null : input.goal_id ? String(input.goal_id) : null,
        subject_id:
          input.subject_id === undefined
            ? currentSession.subject_id ?? null
            : input.subject_id
              ? String(input.subject_id)
              : null,
        title: String(input.title ?? currentSession.title),
        note: String(input.note ?? currentSession.note),
        start_time: String(input.start_time ?? currentSession.start_time),
        end_time: String(input.end_time ?? currentSession.end_time),
        duration_minutes: Math.max(1, Math.floor(Number(input.duration_minutes ?? currentSession.duration_minutes))),
        work_mode: String(input.work_mode ?? currentSession.work_mode),
      };

      writeWebPreviewDatabase({
        ...database,
        sessions: database.sessions.map((session) => (session.id === sessionId ? updatedSession : session)),
      });

      return { success: true, data: cloneValue(updatedSession) as T };
    }

    case "delete_session": {
      const sessionId = String((args as { id?: string } | undefined)?.id || "");

      writeWebPreviewDatabase({
        ...database,
        sessions: database.sessions.filter((session) => session.id !== sessionId),
      });

      return { success: true, data: { deleted: true } as T };
    }

    case "get_daily_stats": {
      const userId = String(input.user_id || "");
      const date = String(input.date || toLocalIsoDate(new Date()));
      const targetMinutes = Math.max(0, Math.floor(Number(input.target_minutes || 0)));

      const userSessions = database.sessions.filter((session) => session.user_id === userId);
      const studiedMinutes = userSessions
        .filter((session) => toIsoDateKey(session.start_time) === date)
        .reduce((sum, session) => sum + Math.max(0, session.duration_minutes), 0);

      const dateSet = new Set(
        userSessions
          .filter((session) => session.duration_minutes > 0)
          .map((session) => toIsoDateKey(session.start_time))
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

      return { success: true, data: cloneValue(data) as T };
    }

    default:
      return {
        success: false,
        error: `Unsupported command in web preview: ${command}`,
      };
  }
}

function getTauriInvoke(): TauriInvoke | null {
  return window.__TAURI__?.core?.invoke ?? null;
}

export function isTauriRuntimeAvailable(): boolean {
  return Boolean(getTauriInvoke());
}

async function callCommand<T>(
  command: string,
  args?: InvokeArguments
): Promise<ApiResponse<T>> {
  const invoke = getTauriInvoke();

  if (!invoke) {
    return webPreviewCommand<T>(command, args);
  }

  try {
    return await invoke<ApiResponse<T>>(command, args);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : TAURI_UNAVAILABLE_ERROR,
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
