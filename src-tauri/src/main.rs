#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod services;

fn main() {
  // Tauri is a thin shell: persistence runs in the renderer via Supabase.
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running PomoTime app");
}
