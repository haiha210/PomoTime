import { type FormEvent, useMemo, useState } from "react";

import { loginWithEmailPassword, loginWithGoogle, registerWithEmailPassword } from "./authService";
import type { AuthSession } from "./authTypes";

interface AuthViewProps {
  hasSupabaseConfig: boolean;
  onLogin(session: AuthSession): void;
}

export function AuthView({ hasSupabaseConfig, onLogin }: AuthViewProps): React.JSX.Element {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(hasSupabaseConfig ? "" : "demo@pomotime.local");
  const [password, setPassword] = useState(hasSupabaseConfig ? "" : "demo-password");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [status, setStatus] = useState(
    hasSupabaseConfig
      ? "Sign in with your Supabase account or create a new one."
      : "Use demo credentials or connect Supabase keys."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const title = mode === "login" ? "Login" : "Create account";
  const submitLabel = mode === "login" ? "Login" : "Create account";
  const secondaryLabel = mode === "login" ? "Need an account? Create one" : "Already have an account? Login";
  const helperText = useMemo(() => {
    if (!hasSupabaseConfig) {
      return "Demo mode is active because Supabase runtime config is missing.";
    }

    return mode === "login"
      ? "Sign in with email/password or continue with Google."
      : "Create your account with email/password or continue with Google.";
  }, [hasSupabaseConfig, mode]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    const result =
      mode === "login"
        ? await loginWithEmailPassword(email, password)
        : await registerWithEmailPassword(email, password, displayName);
    setIsSubmitting(false);

    if (result.session) {
      onLogin(result.session);
      return;
    }

    setStatus(result.error || result.message || "Unable to continue");
  }

  async function handleGoogleLogin(): Promise<void> {
    setIsSubmitting(true);
    const result = await loginWithGoogle();
    setIsSubmitting(false);

    if (result.session) {
      onLogin(result.session);
      return;
    }

    setStatus(result.error || result.message || "Google login failed");
  }

  return (
    <section className="auth-screen">
      <div className="auth-card login-view-shell">
        <div className="login-card">
          <h2>{title}</h2>
          <p className="muted">{helperText}</p>
          <p className="status-line" data-testid="supabase-mode">
            Supabase mode: {hasSupabaseConfig ? "configured" : "demo"}
          </p>

          <form className="login-form-stack" onSubmit={handleEmailLogin}>
            {mode === "signup" ? (
              <label className="field">
                Display name (optional)
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Example: Hai Ha"
                  type="text"
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label className="field">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </label>

            <label className="field">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                type="password"
                autoComplete="current-password"
              />
            </label>

            <div className="btn-row">
              <button type="submit" className="btn primary" disabled={isSubmitting}>
                {submitLabel}
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setMode((current) => (current === "login" ? "signup" : "login"));
                  setStatus(
                    hasSupabaseConfig
                      ? "Use Supabase authentication to continue."
                      : "Use demo credentials or connect Supabase keys."
                  );
                }}
              >
                {secondaryLabel}
              </button>
            </div>
          </form>

          <div className="login-divider">or</div>

          <div className="btn-row">
            <button type="button" className="btn google" onClick={handleGoogleLogin} disabled={isSubmitting}>
              <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.5 5.5 0 0 1-2.39 3.61v2.99h3.87c2.26-2.08 3.56-5.15 3.56-8.63z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-2.99c-1.07.72-2.44 1.14-4.07 1.14-3.13 0-5.78-2.12-6.73-4.98H1.27v3.09A12 12 0 0 0 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.27V6.64H1.27A12 12 0 0 0 0 12c0 1.94.46 3.78 1.27 5.36l4-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.76 0 3.35.61 4.59 1.81l3.44-3.44C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.27 6.64l4 3.09c.95-2.86 3.6-4.98 6.73-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <p className="status-line" data-testid="auth-status">
            {status}
          </p>
        </div>

        <div className="login-side">
          <h3>Welcome</h3>
          <p className="muted">
            Keep your learning streak strong with quick sessions, weekly progress, and goal tracking in one place.
          </p>
        </div>
      </div>
    </section>
  );
}
