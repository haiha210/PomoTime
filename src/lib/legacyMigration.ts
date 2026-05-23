import { tauriCommands } from "./tauriCommands";

const STORAGE_PREFIX = "pomotime.v2.user";
const LEGACY_STORAGE_PREFIX = "learntime.v2.user";
const MIGRATION_MARKER_PREFIX = "pomotime.db-migration.v1";

interface LegacyGoal {
  id?: string;
  title?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

interface LegacySession {
  goalId?: string;
  subject?: string;
  title?: string;
  date?: string;
  durationMinutes?: number;
  workMode?: string;
  note?: string;
  startTime?: string;
  endTime?: string;
}

interface LegacyPayload {
  goals?: LegacyGoal[];
  subjects?: string[];
  studySessions?: LegacySession[];
}

export interface LegacyMigrationResult {
  migrated: boolean;
  reason: string;
  goalsMigrated: number;
  subjectsMigrated: number;
  sessionsMigrated: number;
}

function normalizeUserId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "user";
}

function storageKeyForUser(prefix: string, userId: string): string {
  return `${prefix}.${normalizeUserId(userId)}`;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toIsoDateTime(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function fallbackTimesByDateAndDuration(date: string, durationMinutes: number): {
  startTime: string;
  endTime: string;
} | null {
  const base = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return null;
  }

  const safeDurationMinutes = Math.max(1, Math.floor(durationMinutes));
  const end = new Date(base.getTime() + safeDurationMinutes * 60_000);

  return {
    startTime: base.toISOString(),
    endTime: end.toISOString(),
  };
}

function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function readLegacyPayload(userId: string): {
  payload: LegacyPayload | null;
  keys: string[];
} {
  const currentKey = storageKeyForUser(STORAGE_PREFIX, userId);
  const legacyKey = storageKeyForUser(LEGACY_STORAGE_PREFIX, userId);

  const currentPayload = parseJson<LegacyPayload>(localStorage.getItem(currentKey));
  const legacyPayload = parseJson<LegacyPayload>(localStorage.getItem(legacyKey));

  return {
    payload: currentPayload ?? legacyPayload,
    keys: [currentKey, legacyKey],
  };
}

function migrationMarkerKey(userId: string): string {
  return storageKeyForUser(MIGRATION_MARKER_PREFIX, userId);
}

function isTauriAvailable(): boolean {
  return Boolean(window.__TAURI__?.core?.invoke);
}

export async function migrateLegacyLocalStorageData(
  userId: string
): Promise<LegacyMigrationResult> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return {
      migrated: false,
      reason: "missing-user-id",
      goalsMigrated: 0,
      subjectsMigrated: 0,
      sessionsMigrated: 0,
    };
  }

  const markerKey = migrationMarkerKey(normalizedUserId);
  if (localStorage.getItem(markerKey) === "done") {
    return {
      migrated: false,
      reason: "already-migrated",
      goalsMigrated: 0,
      subjectsMigrated: 0,
      sessionsMigrated: 0,
    };
  }

  const { payload, keys } = readLegacyPayload(normalizedUserId);
  if (!payload) {
    localStorage.setItem(markerKey, "done");
    return {
      migrated: false,
      reason: "no-legacy-data",
      goalsMigrated: 0,
      subjectsMigrated: 0,
      sessionsMigrated: 0,
    };
  }

  if (!isTauriAvailable()) {
    return {
      migrated: false,
      reason: "tauri-unavailable",
      goalsMigrated: 0,
      subjectsMigrated: 0,
      sessionsMigrated: 0,
    };
  }

  const subjectIdByName = new Map<string, string>();
  const goalIdByLegacyId = new Map<string, string>();

  let goalsMigrated = 0;
  let subjectsMigrated = 0;
  let sessionsMigrated = 0;

  const subjects = new Set<string>(payload.subjects ?? []);
  for (const session of payload.studySessions ?? []) {
    if (session.subject?.trim()) {
      subjects.add(session.subject.trim());
    }
  }

  for (const subjectName of subjects) {
    const cleanName = subjectName.trim();
    if (!cleanName) {
      continue;
    }

    const response = await tauriCommands.createSubject({
      userId: normalizedUserId,
      name: cleanName,
    });

    if (!response.success || !response.data?.id) {
      return {
        migrated: false,
        reason: response.error || `cannot-create-subject:${cleanName}`,
        goalsMigrated,
        subjectsMigrated,
        sessionsMigrated,
      };
    }

    subjectIdByName.set(cleanName, response.data.id);
    subjectsMigrated += 1;
  }

  for (const goal of payload.goals ?? []) {
    const title = (goal.title || "").trim();
    const goalType = (goal.type || "custom").trim() || "custom";
    const startDate = goal.startDate || "2026-01-01";
    const endDate = goal.endDate || startDate;

    if (!title) {
      continue;
    }

    const response = await tauriCommands.createGoal({
      userId: normalizedUserId,
      title,
      goalType,
      startDate,
      endDate,
      isActive: Boolean(goal.isActive),
    });

    if (!response.success || !response.data?.id) {
      return {
        migrated: false,
        reason: response.error || `cannot-create-goal:${title}`,
        goalsMigrated,
        subjectsMigrated,
        sessionsMigrated,
      };
    }

    if (goal.id) {
      goalIdByLegacyId.set(goal.id, response.data.id);
    }

    goalsMigrated += 1;
  }

  for (const session of payload.studySessions ?? []) {
    const durationMinutes = Math.max(1, Math.floor(Number(session.durationMinutes || 0)));

    const startTimeFromPayload = session.startTime ? toIsoDateTime(session.startTime) : null;
    const endTimeFromPayload = session.endTime ? toIsoDateTime(session.endTime) : null;

    const fallbackTimes =
      !startTimeFromPayload || !endTimeFromPayload
        ? fallbackTimesByDateAndDuration(String(session.date || ""), durationMinutes)
        : null;

    const startTime = startTimeFromPayload || fallbackTimes?.startTime;
    const endTime = endTimeFromPayload || fallbackTimes?.endTime;

    if (!startTime || !endTime) {
      continue;
    }

    const response = await tauriCommands.saveStoppedTimer({
      userId: normalizedUserId,
      goalId: session.goalId ? goalIdByLegacyId.get(session.goalId) : undefined,
      subjectId: session.subject ? subjectIdByName.get(session.subject.trim()) : undefined,
      title: (session.title || "Study session").trim() || "Study session",
      note: session.note || "",
      startTime,
      endTime,
      startedAtUnixSeconds: toUnixSeconds(startTime),
      stoppedAtUnixSeconds: toUnixSeconds(endTime),
      workMode: (session.workMode || "focus_clock").trim() || "focus_clock",
    });

    if (!response.success) {
      return {
        migrated: false,
        reason: response.error || "cannot-save-session",
        goalsMigrated,
        subjectsMigrated,
        sessionsMigrated,
      };
    }

    sessionsMigrated += 1;
  }

  localStorage.setItem(markerKey, "done");
  keys.forEach((key) => localStorage.removeItem(key));

  return {
    migrated: true,
    reason: "migrated",
    goalsMigrated,
    subjectsMigrated,
    sessionsMigrated,
  };
}
