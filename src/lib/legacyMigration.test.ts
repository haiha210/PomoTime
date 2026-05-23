import { migrateLegacyLocalStorageData } from "./legacyMigration";

describe("legacyMigration", () => {
  const userId = "Demo User";
  const storageKey = "pomotime.v2.user.demo-user";

  beforeEach(() => {
    localStorage.clear();
    delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
  });

  it("skips migration when Tauri runtime is unavailable", async () => {
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
    expect(result.reason).toBe("tauri-unavailable");
    expect(localStorage.getItem(storageKey)).not.toBeNull();
  });

  it("migrates goals, subjects, and sessions then marks migration as done", async () => {
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

    const invoke = vi.fn(async (command: string) => {
      if (command === "create_subject") {
        return { success: true, data: { id: "subject-new-1" } };
      }

      if (command === "create_goal") {
        return { success: true, data: { id: "goal-new-1" } };
      }

      if (command === "save_stopped_timer") {
        return { success: true, data: { id: "session-new-1" } };
      }

      return { success: false, error: `unexpected:${command}` };
    });

    (window as Window & { __TAURI__?: unknown }).__TAURI__ = {
      core: {
        invoke: invoke as unknown as TauriCore["invoke"],
      },
    };

    const result = await migrateLegacyLocalStorageData(userId);

    expect(result.migrated).toBe(true);
    expect(result.goalsMigrated).toBe(1);
    expect(result.subjectsMigrated).toBe(1);
    expect(result.sessionsMigrated).toBe(1);

    expect(invoke).toHaveBeenCalledWith(
      "save_stopped_timer",
      expect.objectContaining({
        input: expect.objectContaining({
          goal_id: "goal-new-1",
          subject_id: "subject-new-1",
        }),
      })
    );

    expect(localStorage.getItem("pomotime.db-migration.v1.demo-user")).toBe("done");
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
});
