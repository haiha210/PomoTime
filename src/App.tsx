import { useEffect, useState } from "react";

import { AppRouter } from "./app/AppRouter";
import { isSupabaseConfigured } from "./core/config/supabaseConfig";
import { logoutCurrentSession, restoreSession, subscribeToAuthChanges } from "./features/auth/authService";
import type { AuthSession } from "./features/auth/authTypes";
import { migrateLegacyLocalStorageData } from "./lib/legacyMigration";
import { isTauriRuntimeAvailable, tauriCommands } from "./lib/tauriCommands";

function App(): React.JSX.Element {
  const hasSupabaseConfig = isSupabaseConfigured();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [commandStatus, setCommandStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setIsAuthReady(true);
    });

    restoreSession()
      .then((restoredSession) => {
        if (!active) {
          return;
        }

        setSession(restoredSession);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setIsAuthReady(true);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!isTauriRuntimeAvailable()) {
      setCommandStatus("web-preview");
      return () => {
        active = false;
      };
    }

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

  if (!isAuthReady) {
    return (
      <section className="auth-screen">
        <div className="auth-card">
          <h2>Loading session...</h2>
          <p className="muted">Checking your Supabase authentication state.</p>
        </div>
      </section>
    );
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
