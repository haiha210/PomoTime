import { tauriCommands } from "./tauriCommands";

describe("tauriCommands", () => {
  afterEach(() => {
    delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
  });

  it("returns a structured error when Tauri runtime is missing", async () => {
    const response = await tauriCommands.listGoals("user-1");

    expect(response.success).toBe(false);
    expect(response.error).toBe("Tauri runtime is not available");
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
