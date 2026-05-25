import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseClient } from "../core/supabase/client";
import { tauriCommands } from "./tauriCommands";

vi.mock("../core/supabase/client", () => ({
  getSupabaseClient: vi.fn(),
}));

describe("tauriCommands", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReset();
  });

  afterEach(() => {
    vi.mocked(getSupabaseClient).mockReset();
  });

  it("returns an error when Supabase client is not configured", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);

    const response = await tauriCommands.listGoals("user-1");

    expect(response.success).toBe(false);
    expect(response.error).toBe("Supabase client is not configured");
  });

  it("calls Supabase with the mapped goal payload when configured", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "goal-1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    }));
    const from = vi.fn(() => ({ insert, update }));

    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const response = await tauriCommands.createGoal({
      userId: "user-1",
      title: "Read docs",
      goalType: "custom",
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      isActive: true,
    });

    expect(from).toHaveBeenCalledWith("learning_goals");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        title: "Read docs",
        description: null,
        goal_type: "custom",
        start_date: "2026-05-01",
        end_date: "2026-05-07",
        is_active: true,
      })
    );
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ id: "goal-1" });
  });
});
