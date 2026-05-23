import { useEffect, useState } from "react";

import { AppRouter } from "./app/AppRouter";
import { isSupabaseConfigured } from "./core/config/supabaseConfig";
import { logoutCurrentSession } from "./features/auth/authService";
import type { AuthSession } from "./features/auth/authTypes";
import { migrateLegacyLocalStorageData } from "./lib/legacyMigration";
import { tauriCommands } from "./lib/tauriCommands";

function App(): React.JSX.Element {
  const hasSupabaseConfig = isSupabaseConfigured();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [commandStatus, setCommandStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    migrateLegacyLocalStorageData("demo-user")
      .catch(() => undefined)
      .then(() => tauriCommands.listGoals("demo-user"))
      .then((response) => {
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

  function handleLogout(): void {
    logoutCurrentSession()
      .catch(() => undefined)
      .finally(() => setSession(null));
  }

  return (
    <AppRouter
      hasSupabaseConfig={hasSupabaseConfig}
      commandStatus={commandStatus}
      session={session}
      onLogin={setSession}
      onLogout={handleLogout}
    />
  );
}

export default App;
