export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
  source: "pomotime" | "learntime";
}

function clean(value?: string): string {
  return (value || "").trim();
}

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  const pomotimeUrl = clean(window.POMOTIME_SUPABASE_URL);
  const pomotimeAnonKey = clean(window.POMOTIME_SUPABASE_ANON_KEY);

  if (pomotimeUrl && pomotimeAnonKey) {
    return {
      url: pomotimeUrl,
      anonKey: pomotimeAnonKey,
      source: "pomotime",
    };
  }

  const learntimeUrl = clean(window.LEARNTIME_SUPABASE_URL);
  const learntimeAnonKey = clean(window.LEARNTIME_SUPABASE_ANON_KEY);

  if (learntimeUrl && learntimeAnonKey) {
    return {
      url: learntimeUrl,
      anonKey: learntimeAnonKey,
      source: "learntime",
    };
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseRuntimeConfig());
}
