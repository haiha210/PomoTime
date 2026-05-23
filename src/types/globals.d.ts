declare global {
  interface TauriCore {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  }

  interface TauriWindowApi {
    core?: TauriCore;
  }

  interface Window {
    POMOTIME_SUPABASE_URL?: string;
    POMOTIME_SUPABASE_PUBLISHABLE_KEY?: string;
    POMOTIME_SUPABASE_ANON_KEY?: string;
    LEARNTIME_SUPABASE_URL?: string;
    LEARNTIME_SUPABASE_PUBLISHABLE_KEY?: string;
    LEARNTIME_SUPABASE_ANON_KEY?: string;
    __TAURI__?: TauriWindowApi;
  }
}

export {};
