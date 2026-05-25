import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isSupabaseConfigured } from "../core/config/supabaseConfig";
import { migrateLegacyLocalStorageData } from "./legacyMigration";
import { tauriCommands } from "./tauriCommands";

vi.mock("../core/config/supabaseConfig", () => ({
  isSupabaseConfigured: vi.fn(),
}));

vi.mock("./tauriCommands", () => ({
  tauriCommands: {
    createSubject: vi.fn(),
    createGoal: vi.fn(),
    saveStoppedTimer: vi.fn(),
  },
}));

describe("legacyMigration", () => {
  const userId = "Demo User";
  const storageKey = "pomotime.v2.user.demo-user";

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(isSupabaseConfigured).mockReset();
    vi.mocked(tauriCommands.createSubject).mockReset();
    vi.mocked(tauriCommands.createGoal).mockReset();
    vi.mocked(tauriCommands.saveStoppedTimer).mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("skips migration when Supabase is unavailable", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        subjects: ["English"],
        goals: [
          {
            id: "goal-legacy-1",
            title: "Legacy goal",
            type: "custom",
            startDate: "2026-01-01",
            endDate: "2026-01-07",
            isActive: true,
          },
        ],
      })
    );

    const result = await migrateLegacyLocalStorageData(userId);

    expect(result.migrated).toBe(false);
    expect(result.reason).toBe("supabase-unavailable");
    expect(localStorage.getItem(storageKey)).not.toBeNull();
  });

  it("migrates goals, subjects, and sessions then marks migration as done", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(tauriCommands.createSubject).mockResolvedValue({
      success: true,
      data: {
        id: "subject-new-1",
        user_id: "demo-user",
        name: "English",
        color: null,
      },
    });
    vi.mocked(tauriCommands.createGoal).mockResolvedValue({
      success: true,
      data: {
        id: "goal-new-1",
        user_id: "demo-user",
        title: "Legacy goal",
        description: null,
        goal_type: "custom",
        start_date: "2026-01-01",
        end_date: "2026-01-07",
        is_active: true,
      },
    });
    vi.mocked(tauriCommands.saveStoppedTimer).mockResolvedValue({
      success: true,
      data: {
        id: "session-new-1",
        user_id: "demo-user",
        goal_id: "goal-new-1",
        subject_id: "subject-new-1",
        title: "Legacy session",
        note: "Migrated",
        start_time: "2026-01-02T00:00:00.000Z",
        end_time: "2026-01-02T00:30:00.000Z",
        duration_minutes: 30,
        work_mode: "focus_clock",
      },
    });

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        subjects: ["English"],
        goals: [
          {
            id: "goal-legacy-1",
            title: "Legacy goal",
            type: "custom",
            startDate: "2026-01-01",
            endDate: "2026-01-07",
            isActive: true,
          },
        ],
        studySessions: [
          {
            goalId: "goal-legacy-1",
            subject: "English",
            title: "Legacy session",
            date: "2026-01-02",
            durationMinutes: 30,
            workMode: "focus_clock",
            note: "Migrated",
          },
        ],
      })
    );

    const result = await migrateLegacyLocalStorageData(userId);

    expect(result.migrated).toBe(true);
    expect(result.goalsMigrated).toBe(1);
    expect(result.subjectsMigrated).toBe(1);
    expect(result.sessionsMigrated).toBe(1);

    expect(tauriCommands.saveStoppedTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        goalId: "goal-new-1",
        subjectId: "subject-new-1",
      })
    );

    expect(localStorage.getItem("pomotime.db-migration.v1.demo-user")).toBe("done");
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
});
