import { getSupabaseRuntimeConfig, isSupabaseConfigured } from "./supabaseConfig";

describe("supabaseConfig", () => {
  const envKeys = [
    "VITE_POMOTIME_SUPABASE_URL",
    "VITE_POMOTIME_SUPABASE_PUBLISHABLE_KEY",
    "VITE_POMOTIME_SUPABASE_ANON_KEY",
    "VITE_LEARNTIME_SUPABASE_URL",
    "VITE_LEARNTIME_SUPABASE_PUBLISHABLE_KEY",
    "VITE_LEARNTIME_SUPABASE_ANON_KEY",
  ] as const;

  const originalPomotimeUrl = window.POMOTIME_SUPABASE_URL;
  const originalPomotimePublishable = window.POMOTIME_SUPABASE_PUBLISHABLE_KEY;
  const originalPomotimeAnon = window.POMOTIME_SUPABASE_ANON_KEY;
  const originalLearntimeUrl = window.LEARNTIME_SUPABASE_URL;
  const originalLearntimePublishable = window.LEARNTIME_SUPABASE_PUBLISHABLE_KEY;
  const originalLearntimeAnon = window.LEARNTIME_SUPABASE_ANON_KEY;

  beforeEach(() => {
    envKeys.forEach((key) => vi.stubEnv(key, ""));
  });

  afterEach(() => {
    window.POMOTIME_SUPABASE_URL = originalPomotimeUrl;
    window.POMOTIME_SUPABASE_PUBLISHABLE_KEY = originalPomotimePublishable;
    window.POMOTIME_SUPABASE_ANON_KEY = originalPomotimeAnon;
    window.LEARNTIME_SUPABASE_URL = originalLearntimeUrl;
    window.LEARNTIME_SUPABASE_PUBLISHABLE_KEY = originalLearntimePublishable;
    window.LEARNTIME_SUPABASE_ANON_KEY = originalLearntimeAnon;
    vi.unstubAllEnvs();
  });

  it("prefers VITE pomotime env values over window runtime config", () => {
    vi.stubEnv("VITE_POMOTIME_SUPABASE_URL", "https://env.supabase.co");
    vi.stubEnv("VITE_POMOTIME_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_env");
    window.POMOTIME_SUPABASE_URL = "https://window.supabase.co";
    window.POMOTIME_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_window";
    window.POMOTIME_SUPABASE_ANON_KEY = "anon-window";

    const config = getSupabaseRuntimeConfig();

    expect(config).toEqual({
      url: "https://env.supabase.co",
      apiKey: "sb_publishable_env",
      keyType: "publishable",
      source: "pomotime",
    });
  });

  it("uses VITE legacy learntime values when pomotime config is missing", () => {
    vi.stubEnv("VITE_LEARNTIME_SUPABASE_URL", "https://legacy-env.supabase.co");
    vi.stubEnv("VITE_LEARNTIME_SUPABASE_ANON_KEY", "legacy-env-anon");

    const config = getSupabaseRuntimeConfig();

    expect(config).toEqual({
      url: "https://legacy-env.supabase.co",
      apiKey: "legacy-env-anon",
      keyType: "anon",
      source: "learntime",
    });
  });

  it("returns pomotime config when publishable key is available", () => {
    window.POMOTIME_SUPABASE_URL = "https://example.supabase.co";
    window.POMOTIME_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1";
    window.POMOTIME_SUPABASE_ANON_KEY = "";

    const config = getSupabaseRuntimeConfig();

    expect(config).toEqual({
      url: "https://example.supabase.co",
      apiKey: "sb_publishable_1",
      keyType: "publishable",
      source: "pomotime",
    });
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("falls back to pomotime anon key when publishable key is missing", () => {
    window.POMOTIME_SUPABASE_URL = "https://example.supabase.co";
    window.POMOTIME_SUPABASE_PUBLISHABLE_KEY = "";
    window.POMOTIME_SUPABASE_ANON_KEY = "anon-1";

    const config = getSupabaseRuntimeConfig();

    expect(config).toEqual({
      url: "https://example.supabase.co",
      apiKey: "anon-1",
      keyType: "anon",
      source: "pomotime",
    });
  });

  it("falls back to legacy learntime keys", () => {
    window.POMOTIME_SUPABASE_URL = "";
    window.POMOTIME_SUPABASE_PUBLISHABLE_KEY = "";
    window.POMOTIME_SUPABASE_ANON_KEY = "";
    window.LEARNTIME_SUPABASE_URL = "https://legacy.supabase.co";
    window.LEARNTIME_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_legacy";
    window.LEARNTIME_SUPABASE_ANON_KEY = "legacy-anon";

    const config = getSupabaseRuntimeConfig();

    expect(config).toEqual({
      url: "https://legacy.supabase.co",
      apiKey: "sb_publishable_legacy",
      keyType: "publishable",
      source: "learntime",
    });
  });

  it("returns null when config keys are missing", () => {
    window.POMOTIME_SUPABASE_URL = "";
    window.POMOTIME_SUPABASE_PUBLISHABLE_KEY = "";
    window.POMOTIME_SUPABASE_ANON_KEY = "";
    window.LEARNTIME_SUPABASE_URL = "";
    window.LEARNTIME_SUPABASE_PUBLISHABLE_KEY = "";
    window.LEARNTIME_SUPABASE_ANON_KEY = "";

    expect(getSupabaseRuntimeConfig()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });
});
