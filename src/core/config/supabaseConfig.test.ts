import { getSupabaseRuntimeConfig, isSupabaseConfigured } from "./supabaseConfig";

describe("supabaseConfig", () => {
  const originalPomotimeUrl = window.POMOTIME_SUPABASE_URL;
  const originalPomotimeAnon = window.POMOTIME_SUPABASE_ANON_KEY;
  const originalLearntimeUrl = window.LEARNTIME_SUPABASE_URL;
  const originalLearntimeAnon = window.LEARNTIME_SUPABASE_ANON_KEY;

  afterEach(() => {
    window.POMOTIME_SUPABASE_URL = originalPomotimeUrl;
    window.POMOTIME_SUPABASE_ANON_KEY = originalPomotimeAnon;
    window.LEARNTIME_SUPABASE_URL = originalLearntimeUrl;
    window.LEARNTIME_SUPABASE_ANON_KEY = originalLearntimeAnon;
  });

  it("returns pomotime config when available", () => {
    window.POMOTIME_SUPABASE_URL = "https://example.supabase.co";
    window.POMOTIME_SUPABASE_ANON_KEY = "anon-1";

    const config = getSupabaseRuntimeConfig();

    expect(config).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-1",
      source: "pomotime",
    });
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("falls back to legacy learntime keys", () => {
    window.POMOTIME_SUPABASE_URL = "";
    window.POMOTIME_SUPABASE_ANON_KEY = "";
    window.LEARNTIME_SUPABASE_URL = "https://legacy.supabase.co";
    window.LEARNTIME_SUPABASE_ANON_KEY = "legacy-anon";

    const config = getSupabaseRuntimeConfig();

    expect(config).toEqual({
      url: "https://legacy.supabase.co",
      anonKey: "legacy-anon",
      source: "learntime",
    });
  });

  it("returns null when config keys are missing", () => {
    window.POMOTIME_SUPABASE_URL = "";
    window.POMOTIME_SUPABASE_ANON_KEY = "";
    window.LEARNTIME_SUPABASE_URL = "";
    window.LEARNTIME_SUPABASE_ANON_KEY = "";

    expect(getSupabaseRuntimeConfig()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });
});
