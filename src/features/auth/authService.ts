import { getSupabaseClient } from "../../core/supabase/client";

import type { AuthSession } from "./authTypes";

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
    return {
      session: {
        userId: `demo-${email.toLowerCase()}`,
        email,
        displayName: displayNameFromEmail(email),
        provider: "demo",
      },
    };
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
    return {
      session: {
        userId: "demo-google-user",
        email: "google-demo@pomotime.local",
        displayName: "Google Demo",
        provider: "demo",
      },
    };
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

export async function logoutCurrentSession(): Promise<void> {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
}
