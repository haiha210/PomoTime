export interface SupabaseRuntimeConfig {
  url: string;
  apiKey: string;
  keyType: "publishable" | "anon";
  source: "pomotime" | "learntime";
}

function clean(value?: string): string {
  return (value || "").trim();
}

function readEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv];
  return typeof value === "string" ? clean(value) : "";
}

function readRuntimeConfigValue(envName: string, windowValue?: string): string {
  return readEnv(envName) || clean(windowValue);
}

export function getSupabaseRuntimeConfig(): SupabaseRuntimeConfig | null {
  const pomotimeUrl = readRuntimeConfigValue("VITE_POMOTIME_SUPABASE_URL", window.POMOTIME_SUPABASE_URL);
  const pomotimePublishableKey = readRuntimeConfigValue(
    "VITE_POMOTIME_SUPABASE_PUBLISHABLE_KEY",
    window.POMOTIME_SUPABASE_PUBLISHABLE_KEY
  );
  const pomotimeAnonKey = readRuntimeConfigValue("VITE_POMOTIME_SUPABASE_ANON_KEY", window.POMOTIME_SUPABASE_ANON_KEY);

  if (pomotimeUrl && (pomotimePublishableKey || pomotimeAnonKey)) {
    return {
      url: pomotimeUrl,
      apiKey: pomotimePublishableKey || pomotimeAnonKey,
      keyType: pomotimePublishableKey ? "publishable" : "anon",
      source: "pomotime",
    };
  }

  const learntimeUrl = readRuntimeConfigValue("VITE_LEARNTIME_SUPABASE_URL", window.LEARNTIME_SUPABASE_URL);
  const learntimePublishableKey = readRuntimeConfigValue(
    "VITE_LEARNTIME_SUPABASE_PUBLISHABLE_KEY",
    window.LEARNTIME_SUPABASE_PUBLISHABLE_KEY
  );
  const learntimeAnonKey = readRuntimeConfigValue("VITE_LEARNTIME_SUPABASE_ANON_KEY", window.LEARNTIME_SUPABASE_ANON_KEY);

  if (learntimeUrl && (learntimePublishableKey || learntimeAnonKey)) {
    return {
      url: learntimeUrl,
      apiKey: learntimePublishableKey || learntimeAnonKey,
      keyType: learntimePublishableKey ? "publishable" : "anon",
      source: "learntime",
    };
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseRuntimeConfig());
}
