import { useEffect, useState } from "react";

import { tauriCommands } from "./lib/tauriCommands";

function App(): React.JSX.Element {
  const hasSupabaseConfig = Boolean(
    (window.POMOTIME_SUPABASE_URL || "").trim() &&
      (window.POMOTIME_SUPABASE_ANON_KEY || "").trim()
  );
  const [commandStatus, setCommandStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    tauriCommands.listGoals("demo-user").then((response) => {
      if (!active) {
        return;
      }

      if (response.success) {
        setCommandStatus("connected");
        return;
      }

      if (response.error === "Tauri runtime is not available") {
        setCommandStatus("web-preview");
        return;
      }

      setCommandStatus("error");
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app-container">
      <h1>PomoTime</h1>
      <p className="subtitle">React + Tauri desktop foundation is ready.</p>
      <p data-testid="config-status" className="status">
        Supabase config: {hasSupabaseConfig ? "configured" : "demo mode"}
      </p>
      <p data-testid="command-status" className="status">
        Tauri command channel: {commandStatus}
      </p>
    </main>
  );
}

export default App;
