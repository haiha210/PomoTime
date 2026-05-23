import { tauriCommands } from "./tauriCommands";

const WEB_PREVIEW_STORAGE_KEY = "pomotime.web-preview.db.v1";

describe("tauriCommands", () => {
  afterEach(() => {
    delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
    localStorage.removeItem(WEB_PREVIEW_STORAGE_KEY);
  });

  it("uses web-preview fallback storage when Tauri runtime is missing", async () => {
    const created = await tauriCommands.createGoal({
      userId: "user-1",
      title: "Read docs",
      goalType: "custom",
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      isActive: true,
    });

    expect(created.success).toBe(true);

    const listed = await tauriCommands.listGoals("user-1");
    expect(listed.success).toBe(true);
    expect(listed.data).toHaveLength(1);
    expect(listed.data?.[0]?.title).toBe("Read docs");
  });

  it("calls the expected command with mapped payload", async () => {
    const invoke = vi.fn().mockResolvedValue({ success: true, data: { id: "goal-1" } });

    (window as Window & { __TAURI__?: unknown }).__TAURI__ = {
      core: {
        invoke,
      },
    };

    const response = await tauriCommands.createGoal({
      userId: "user-1",
      title: "Read docs",
      goalType: "custom",
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      isActive: true,
    });

    expect(invoke).toHaveBeenCalledWith("create_goal", {
      input: {
        user_id: "user-1",
        title: "Read docs",
        description: null,
        goal_type: "custom",
        start_date: "2026-05-01",
        end_date: "2026-05-07",
        is_active: true,
      },
    });
    expect(response.success).toBe(true);
  });
});
