import type { AuthSession } from "./authTypes";

const DEMO_SESSION_KEY = "pomotime.auth.demo-session";

export function loadDemoSession(): AuthSession | null {
  const rawValue = sessionStorage.getItem(DEMO_SESSION_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as AuthSession;
    if (!parsed.userId || !parsed.email || !parsed.displayName) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDemoSession(session: AuthSession): void {
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}
