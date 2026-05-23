import { render, screen } from "@testing-library/react";

import App from "./App";

describe("App", () => {
  it("shows app title", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "PomoTime" })).toBeInTheDocument();
  });

  it("shows demo mode when Supabase config is empty", () => {
    render(<App />);

    expect(screen.getByTestId("config-status")).toHaveTextContent(
      "Supabase config: demo mode"
    );
  });
});
