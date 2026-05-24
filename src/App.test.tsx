import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("./core/config/supabaseConfig", () => ({
  getSupabaseRuntimeConfig: () => null,
  isSupabaseConfigured: () => false,
}));

vi.mock("./core/supabase/client", () => ({
  getSupabaseClient: () => null,
}));

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "";
    sessionStorage.clear();
    localStorage.clear();
  });

  it("shows login screen when user is not authenticated", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByTestId("supabase-mode")).toHaveTextContent("Supabase mode: demo");
    expect(screen.queryByLabelText("Display name (optional)")).not.toBeInTheDocument();
  });

  it("logs in demo user and opens dashboard", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo@pomotime.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "demo-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByTestId("command-status")).toHaveTextContent("Command:");
  });

  it("shows validation error when login fields are empty", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByTestId("auth-flash-message")).toHaveTextContent(
      "Email and password are required"
    );
  });

  it("toggles password visibility with eye button", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput.type).toBe("password");
  });

  it("restores previous demo session on startup", async () => {
    sessionStorage.setItem(
      "pomotime.auth.demo-session",
      JSON.stringify({
        userId: "demo-restored-user",
        email: "restored@pomotime.local",
        displayName: "Restored User",
        provider: "demo",
      })
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("navigates across all main views without crashing", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(screen.getByRole("link", { name: "Onboarding" }));
    expect(await screen.findByRole("heading", { name: "Onboarding" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Session Timer" }));
    expect(await screen.findByRole("heading", { name: "Timer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "History" }));
    expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Goal Settings" }));
    expect(await screen.findByRole("heading", { name: "Goals" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
