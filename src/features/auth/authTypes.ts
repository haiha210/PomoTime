export interface AuthSession {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  provider: "demo" | "supabase";
}
