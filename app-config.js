// Optional runtime fallback for Supabase auth.
// Prefer VITE_* env variables; keep this file with empty placeholders in git.
// Prefer publishable keys. Legacy anon keys remain supported for older builds/configs.
window.POMOTIME_SUPABASE_URL = window.POMOTIME_SUPABASE_URL || "";
window.POMOTIME_SUPABASE_PUBLISHABLE_KEY = window.POMOTIME_SUPABASE_PUBLISHABLE_KEY || "";
window.POMOTIME_SUPABASE_ANON_KEY = window.POMOTIME_SUPABASE_ANON_KEY || "";

// Keep legacy keys for backward compatibility with older builds/configs.
window.LEARNTIME_SUPABASE_URL = window.LEARNTIME_SUPABASE_URL || window.POMOTIME_SUPABASE_URL;
window.LEARNTIME_SUPABASE_PUBLISHABLE_KEY =
  window.LEARNTIME_SUPABASE_PUBLISHABLE_KEY || window.POMOTIME_SUPABASE_PUBLISHABLE_KEY;
window.LEARNTIME_SUPABASE_ANON_KEY =
  window.LEARNTIME_SUPABASE_ANON_KEY || window.POMOTIME_SUPABASE_ANON_KEY;
