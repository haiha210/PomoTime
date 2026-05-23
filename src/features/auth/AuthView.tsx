import { FormEvent, useState } from "react";

import { loginWithEmailPassword, loginWithGoogle } from "./authService";
import type { AuthSession } from "./authTypes";

interface AuthViewProps {
  hasSupabaseConfig: boolean;
  onLogin(session: AuthSession): void;
}

export function AuthView({ hasSupabaseConfig, onLogin }: AuthViewProps): React.JSX.Element {
  const [email, setEmail] = useState("demo@pomotime.local");
  const [password, setPassword] = useState("demo-password");
  const [status, setStatus] = useState("Use demo credentials or connect Supabase keys.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await loginWithEmailPassword(email, password);
    setIsSubmitting(false);

    if (result.session) {
      onLogin(result.session);
      return;
    }

    setStatus(result.error || "Unable to login");
  }

  async function handleGoogleLogin(): Promise<void> {
    setIsSubmitting(true);
    const result = await loginWithGoogle();
    setIsSubmitting(false);

    if (result.session) {
      onLogin(result.session);
      return;
    }

    setStatus(result.error || "Google login failed");
  }

  return (
    <section className="auth-screen">
      <div className="auth-card">
        <h1>PomoTime</h1>
        <p className="subtitle">A focused desktop workflow for deep learning sessions.</p>
        <p className="status-line" data-testid="supabase-mode">
          Supabase mode: {hasSupabaseConfig ? "configured" : "demo"}
        </p>

        <button type="button" className="btn secondary" onClick={handleGoogleLogin} disabled={isSubmitting}>
          Continue with Google
        </button>

        <form className="auth-form" onSubmit={handleEmailLogin}>
          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              type="password"
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="btn primary" disabled={isSubmitting}>
            Sign in with email
          </button>
        </form>

        <p className="status-line" data-testid="auth-status">
          {status}
        </p>
      </div>
    </section>
  );
}
