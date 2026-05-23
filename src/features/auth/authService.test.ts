import { getSupabaseClient } from "../../core/supabase/client";

import {
  loginWithEmailPassword,
  loginWithGoogle,
  registerWithEmailPassword,
  restoreSession,
  subscribeToAuthChanges,
} from "./authService";

vi.mock("../../core/supabase/client", () => ({
  getSupabaseClient: vi.fn(),
}));

function createMockClient() {
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn();

  return {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      resend: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange,
    },
    unsubscribe,
  };
}

describe("authService", () => {
  const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
  });

  it("passes a redirect URL to Google OAuth", async () => {
    const client = createMockClient();
    client.auth.signInWithOAuth.mockResolvedValue({ error: null });
    mockedGetSupabaseClient.mockReturnValue(client as never);

    const result = await loginWithGoogle();

    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}#/auth`,
      },
    });
    expect(result.message).toContain("Google sign-in started");
  });

  it("resends confirmation email when login fails because email is not confirmed", async () => {
    const client = createMockClient();
    client.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: null,
      },
      error: {
        message: "Email not confirmed",
      },
    });
    client.auth.resend.mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: null,
    });
    mockedGetSupabaseClient.mockReturnValue(client as never);

    const result = await loginWithEmailPassword("new@example.com", "secret123");

    expect(client.auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "new@example.com",
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });
    expect(result.error).toContain("sent another confirmation email");
  });

  it("returns resend error details when unconfirmed email resend fails", async () => {
    const client = createMockClient();
    client.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: null,
      },
      error: {
        message: "Email not confirmed",
      },
    });
    client.auth.resend.mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: {
        message: "For security purposes, you can only request this after 60 seconds.",
      },
    });
    mockedGetSupabaseClient.mockReturnValue(client as never);

    const result = await loginWithEmailPassword("new@example.com", "secret123");

    expect(result.error).toContain("could not resend confirmation email");
    expect(result.error).toContain("60 seconds");
  });

  it("returns a confirmation message when sign up requires email verification", async () => {
    const client = createMockClient();
    client.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "new@example.com",
          user_metadata: { full_name: "New User" },
        },
        session: null,
      },
      error: null,
    });
    mockedGetSupabaseClient.mockReturnValue(client as never);

    const result = await registerWithEmailPassword("new@example.com", "secret123", "New User");

    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret123",
      options: {
        data: { full_name: "New User" },
      },
    });
    expect(result.message).toContain("Check your email");
  });

  it("maps the restored Supabase session to the app session", async () => {
    const client = createMockClient();
    client.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "person@example.com",
            user_metadata: {
              full_name: "Person Example",
              avatar_url: "https://example.com/avatar.png",
            },
          },
        },
      },
      error: null,
    });
    mockedGetSupabaseClient.mockReturnValue(client as never);

    const session = await restoreSession();

    expect(session).toEqual({
      userId: "user-1",
      email: "person@example.com",
      displayName: "Person Example",
      avatarUrl: "https://example.com/avatar.png",
      provider: "supabase",
    });
  });

  it("subscribes to auth state changes and unsubscribes cleanly", () => {
    const client = createMockClient();
    client.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      callback("SIGNED_IN", {
        user: {
          id: "user-2",
          email: "oauth@example.com",
          user_metadata: { name: "OAuth User" },
        },
      });

      return {
        data: {
          subscription: {
            unsubscribe: client.unsubscribe,
          },
        },
      };
    });
    mockedGetSupabaseClient.mockReturnValue(client as never);

    const onSessionChange = vi.fn();
    const unsubscribe = subscribeToAuthChanges(onSessionChange);

    expect(onSessionChange).toHaveBeenCalledWith({
      userId: "user-2",
      email: "oauth@example.com",
      displayName: "OAuth User",
      avatarUrl: null,
      provider: "supabase",
    });

    unsubscribe();

    expect(client.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
