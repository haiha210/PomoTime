import type { User } from "@supabase/supabase-js";

import { getSupabaseClient } from "../../core/supabase/client";

import type { AuthSession } from "./authTypes";
import { clearDemoSession, loadDemoSession, saveDemoSession } from "./sessionStore";

export interface AuthResult {
  session?: AuthSession;
  error?: string;
  message?: string;
}

function displayNameFromEmail(email: string): string {
  return email.split("@")[0] || "User";
}

function mapSupabaseUser(user: User): AuthSession {
  const metadata = user.user_metadata || {};
  const email = user.email || "unknown@supabase.local";
  const displayName =
    String(metadata.full_name || metadata.name || "").trim() || displayNameFromEmail(email);
  const avatarUrl =
    String(metadata.avatar_url || metadata.picture || "").trim() || null;

  return {
    userId: user.id,
    email,
    displayName,
    avatarUrl,
    provider: "supabase",
  };
}

function getOAuthRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}#/auth`;
}

function getEmailAuthRedirectUrl(): string {
  // Keep email redirects hash-free to avoid hash-router conflicts in confirmation URLs.
  return `${window.location.origin}${window.location.pathname}`;
}

function isEmailNotConfirmedError(message?: string): boolean {
  return /email\s+not\s+confirmed/i.test(String(message || ""));
}

async function buildEmailNotConfirmedMessage(
  supabaseClient: NonNullable<ReturnType<typeof getSupabaseClient>>,
  email: string
): Promise<string> {
  try {
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getEmailAuthRedirectUrl(),
      },
    });

    if (error) {
      return `Email not confirmed. We could not resend confirmation email: ${error.message}. Please check your inbox/spam and try again in a minute.`;
    }

    return "Email not confirmed. We sent another confirmation email. Please check your inbox and spam folder.";
  } catch {
    return "Email not confirmed. Please confirm your email before logging in.";
  }
}

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim();

  if (!normalizedEmail || !password.trim()) {
    return { error: "Email and password are required" };
  }

  const supabaseClient = getSupabaseClient();

  if (!supabaseClient) {
    const session = {
      userId: `demo-${normalizedEmail.toLowerCase()}`,
      email: normalizedEmail,
      displayName: displayNameFromEmail(normalizedEmail),
      provider: "demo" as const,
    };

    saveDemoSession(session);
    return { session };
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    if (isEmailNotConfirmedError(error.message)) {
      return {
        error: await buildEmailNotConfirmedMessage(supabaseClient, normalizedEmail),
      };
    }

    return { error: error.message || "Login failed" };
  }

  if (!data.user) {
    return { error: "Login failed" };
  }

  const mappedUser = mapSupabaseUser(data.user);

  return {
    session: mappedUser,
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
    options: {
      redirectTo: getOAuthRedirectUrl(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    message: "Google sign-in started. Complete the flow in the browser window.",
  };
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  if (!email.trim() || !password.trim()) {
    return { error: "Email and password are required" };
  }

  const supabaseClient = getSupabaseClient();
  const normalizedDisplayName = String(displayName || "").trim();

  if (!supabaseClient) {
    const session = {
      userId: `demo-${email.toLowerCase()}`,
      email,
      displayName: normalizedDisplayName || displayNameFromEmail(email),
      provider: "demo" as const,
    };

    saveDemoSession(session);
    return { session };
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: normalizedDisplayName ? { full_name: normalizedDisplayName } : undefined,
    },
  });

  if (error || !data.user) {
    return { error: error?.message || "Sign up failed" };
  }

  if (!data.session) {
    return {
      message: "Account created. Check your email to confirm your registration before signing in.",
    };
  }

  return {
    session: mapSupabaseUser(data.user),
    message: "Account created successfully.",
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

  return mapSupabaseUser(data.session.user);
}

export async function logoutCurrentSession(): Promise<void> {
  clearDemoSession();

  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
}

export function subscribeToAuthChanges(onSessionChange: (session: AuthSession | null) => void): () => void {
  const supabaseClient = getSupabaseClient();

  if (!supabaseClient) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session?.user ? mapSupabaseUser(session.user) : null);
  });

  return () => {
    subscription.unsubscribe();
  };
}
