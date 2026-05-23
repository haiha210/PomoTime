import { fireEvent, render, screen } from "@testing-library/react";

import App from "./App";

describe("App", () => {
  it("shows login screen when user is not authenticated", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "PomoTime" })).toBeInTheDocument();
    expect(screen.getByTestId("supabase-mode")).toHaveTextContent("Supabase mode: demo");
  });

  it("logs in demo user and opens dashboard", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "demo@pomotime.local" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "demo-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByTestId("command-status")).toHaveTextContent("Command:");
  });

  it("navigates across all main views without crashing", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));
    await screen.findByRole("heading", { name: "Dashboard" });

    fireEvent.click(screen.getByRole("link", { name: "Onboarding" }));
    expect(await screen.findByRole("heading", { name: "Onboarding" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Timer" }));
    expect(await screen.findByRole("heading", { name: "Timer" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "History" }));
    expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Stats" }));
    expect(await screen.findByRole("heading", { name: "Statistics" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Goals" }));
    expect(await screen.findByRole("heading", { name: "Goals" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
