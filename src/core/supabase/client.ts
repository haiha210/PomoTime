import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseRuntimeConfig } from "../config/supabaseConfig";

let cachedClient: SupabaseClient | null = null;
let cachedFingerprint = "";

export function getSupabaseClient(): SupabaseClient | null {
  const runtimeConfig = getSupabaseRuntimeConfig();

  if (!runtimeConfig) {
    cachedClient = null;
    cachedFingerprint = "";
    return null;
  }

  const nextFingerprint = `${runtimeConfig.url}::${runtimeConfig.anonKey}`;
  if (cachedClient && nextFingerprint === cachedFingerprint) {
    return cachedClient;
  }

  cachedClient = createClient(runtimeConfig.url, runtimeConfig.anonKey);
  cachedFingerprint = nextFingerprint;

  return cachedClient;
}
