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

  const nextFingerprint = `${runtimeConfig.url}::${runtimeConfig.apiKey}`;
  if (cachedClient && nextFingerprint === cachedFingerprint) {
    return cachedClient;
  }

  cachedClient = createClient(runtimeConfig.url, runtimeConfig.apiKey);
  cachedFingerprint = nextFingerprint;

  return cachedClient;
}
