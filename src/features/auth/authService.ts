import { getSupabaseClient } from "../../core/supabase/client";

import type { AuthSession } from "./authTypes";
import { clearDemoSession, loadDemoSession, saveDemoSession } from "./sessionStore";

export interface AuthResult {
  session?: AuthSession;
  error?: string;
}

function displayNameFromEmail(email: string): string {
  return email.split("@")[0] || "User";
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!email.trim() || !password.trim()) {
    return { error: "Email and password are required" };
  }

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    const session = {
      userId: `demo-${email.toLowerCase()}`,
      email,
      displayName: displayNameFromEmail(email),
      provider: "demo" as const,
    };

    saveDemoSession(session);
    return { session };
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || "Login failed" };
  }

  return {
    session: {
      userId: data.user.id,
      email: data.user.email || email,
      displayName:
        String(data.user.user_metadata?.full_name || "").trim() ||
        displayNameFromEmail(data.user.email || email),
      avatarUrl: data.user.user_metadata?.avatar_url || null,
      provider: "supabase",
    },
  };
}

export async function loginWithGoogle(): Promise<AuthResult> {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    const session = {
      userId: "demo-google-user",
      email: "google-demo@pomotime.local",
      displayName: "Google Demo",
      provider: "demo" as const,
    };

    saveDemoSession(session);
    return { session };
  }

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
  });

  if (error) {
    return { error: error.message };
  }

  return {
    error:
      "Google OAuth redirect started. Complete sign-in in browser and reopen app.",
  };
}

export async function restoreSession(): Promise<AuthSession | null> {
  const supabaseClient = getSupabaseClient();

  if (!supabaseClient) {
    return loadDemoSession();
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.user) {
    return null;
  }

  const user = data.session.user;
  return {
    userId: user.id,
    email: user.email || "unknown@supabase.local",
    displayName:
      String(user.user_metadata?.full_name || "").trim() ||
      displayNameFromEmail(user.email || "user@supabase.local"),
    avatarUrl: user.user_metadata?.avatar_url || null,
    provider: "supabase",
  };
}

export async function logoutCurrentSession(): Promise<void> {
  clearDemoSession();

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
}
