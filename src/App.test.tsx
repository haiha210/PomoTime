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

describe("App without Supabase configuration", () => {
  beforeEach(() => {
    window.location.hash = "";
    sessionStorage.clear();
    localStorage.clear();
  });

  it("shows the login screen with a Supabase-missing notice", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByTestId("supabase-mode")).toHaveTextContent("Supabase mode: missing");
    expect(screen.queryByLabelText("Display name (optional)")).not.toBeInTheDocument();
  });

  it("disables the login submit button when Supabase is missing", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });

    const submitButton = screen.getByRole("button", { name: "Login" }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it("surfaces a Supabase-required error when login is attempted directly", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });

    // Force-submit the form despite the disabled button to assert the service
    // refuses to create a session without Supabase.
    const form = submitButton().closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    expect(await screen.findByTestId("auth-flash-message")).toHaveTextContent(
      "Supabase configuration required to sign in."
    );
  });

  it("shows validation error when login fields are empty", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "" } });

    const form = submitButton().closest("form") as HTMLFormElement;
    fireEvent.submit(form);

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
});

function submitButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Login" }) as HTMLButtonElement;
}
