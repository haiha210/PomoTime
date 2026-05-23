import { render, screen } from "@testing-library/react";

import App from "./App";

describe("App", () => {
  it("shows app title", async () => {
    render(<App />);
    await screen.findByTestId("command-status");

    expect(screen.getByRole("heading", { name: "PomoTime" })).toBeInTheDocument();
  });

  it("shows demo mode when Supabase config is empty", async () => {
    render(<App />);
    await screen.findByTestId("command-status");

    expect(screen.getByTestId("config-status")).toHaveTextContent(
      "Supabase config: demo mode"
    );
  });

  it("shows web preview status when Tauri runtime is unavailable", async () => {
    render(<App />);

    expect(await screen.findByTestId("command-status")).toHaveTextContent(
      "Tauri command channel: web-preview"
    );
  });
});
