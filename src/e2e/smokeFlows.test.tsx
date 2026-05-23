import { fireEvent, render, screen } from "@testing-library/react";

import App from "../App";

interface TauriMockState {
  goals: Array<{
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    goal_type: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
  }>;
  sessions: Array<{
    id: string;
    user_id: string;
    goal_id: string | null;
    subject_id: string | null;
    title: string;
    note: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    work_mode: string;
  }>;
}

function installTauriMock(): void {
  const state: TauriMockState = {
    goals: [],
    sessions: [],
  };

  const invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
    if (command === "list_goals") {
      const userId = args?.userId as string;
      return {
        success: true,
        data: state.goals.filter((goal) => goal.user_id === userId),
      };
    }

    if (command === "create_goal") {
      const input = args?.input as Record<string, unknown>;
      const created = {
        id: `goal-${state.goals.length + 1}`,
        user_id: String(input.user_id),
        title: String(input.title),
        description: (input.description as string | null) ?? null,
        goal_type: String(input.goal_type),
        start_date: String(input.start_date),
        end_date: String(input.end_date),
        is_active: Boolean(input.is_active),
      };
      state.goals = state.goals.map((goal) => ({ ...goal, is_active: false }));
      state.goals.push(created);
      return { success: true, data: created };
    }

    if (command === "list_sessions") {
      const userId = args?.userId as string;
      return {
        success: true,
        data: state.sessions.filter((session) => session.user_id === userId),
      };
    }

    if (command === "save_stopped_timer") {
      const input = args?.input as Record<string, unknown>;
      const startedAt = Number(input.started_at_unix_seconds);
      const stoppedAt = Number(input.stopped_at_unix_seconds);
      const created = {
        id: `session-${state.sessions.length + 1}`,
        user_id: String(input.user_id),
        goal_id: (input.goal_id as string | null) ?? null,
        subject_id: (input.subject_id as string | null) ?? null,
        title: String(input.title),
        note: String(input.note),
        start_time: String(input.start_time),
        end_time: String(input.end_time),
        duration_minutes: Math.max(1, Math.floor((stoppedAt - startedAt) / 60)),
        work_mode: String(input.work_mode),
      };
      state.sessions.push(created);
      return { success: true, data: created };
    }

    if (command === "list_weekly_targets") {
      return {
        success: true,
        data: [],
      };
    }

    return {
      success: true,
      data: null,
    };
  });

  (window as Window & { __TAURI__?: unknown }).__TAURI__ = {
    core: {
      invoke: invoke as unknown as <T>(
        command: string,
        args?: Record<string, unknown>
      ) => Promise<T>,
    },
  };
}

describe("critical smoke flows", () => {
  beforeEach(() => {
    window.location.hash = "";
    sessionStorage.clear();
    localStorage.clear();
    installTauriMock();
  });

  afterEach(() => {
    delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
    vi.restoreAllMocks();
  });

  it("supports login and logout", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "Login" });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(await screen.findByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("creates first goal from onboarding", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "Login" });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(screen.getByRole("link", { name: "Onboarding" }));
    await screen.findByRole("heading", { name: "Onboarding" });

    fireEvent.change(screen.getByLabelText("Goal title"), {
      target: { value: "IELTS 7.0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create first goal" }));

    expect(await screen.findByTestId("active-goal-status")).toHaveTextContent("IELTS 7.0");
  });

  it("starts and stops a study session", async () => {
    let nowMs = Date.UTC(2026, 5, 3, 8, 0, 0);
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    render(<App />);
    await screen.findByRole("button", { name: "Login" });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(screen.getByRole("link", { name: "Session Timer" }));
    await screen.findByRole("heading", { name: "Timer" });

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    nowMs += 2 * 60 * 1000;
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(await screen.findByTestId("timer-status")).toHaveTextContent("Saved session");

    fireEvent.click(screen.getByRole("link", { name: "History" }));
    expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(await screen.findByText("Deep work block")).toBeInTheDocument();
  });
});
