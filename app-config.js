// Optional runtime config for Supabase auth.
// Keep empty values to run in demo mode.
window.POMOTIME_SUPABASE_URL = "";
window.POMOTIME_SUPABASE_ANON_KEY = "";

// Keep legacy keys for backward compatibility with older builds/configs.
window.LEARNTIME_SUPABASE_URL = window.LEARNTIME_SUPABASE_URL || window.POMOTIME_SUPABASE_URL;
window.LEARNTIME_SUPABASE_ANON_KEY =
	window.LEARNTIME_SUPABASE_ANON_KEY || window.POMOTIME_SUPABASE_ANON_KEY;
