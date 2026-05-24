import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Clear Supabase env in tests so callCommand falls back to the
// Tauri invoke / web-preview path that the existing tests assert on.
vi.stubEnv("VITE_POMOTIME_SUPABASE_URL", "");
vi.stubEnv("VITE_POMOTIME_SUPABASE_PUBLISHABLE_KEY", "");
vi.stubEnv("VITE_POMOTIME_SUPABASE_ANON_KEY", "");
vi.stubEnv("VITE_LEARNTIME_SUPABASE_URL", "");
vi.stubEnv("VITE_LEARNTIME_SUPABASE_PUBLISHABLE_KEY", "");
vi.stubEnv("VITE_LEARNTIME_SUPABASE_ANON_KEY", "");
