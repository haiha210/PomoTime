#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod repository;
mod services;

fn main() {
  database::initialize_database().expect("failed to initialize PostgreSQL schema");

  if is_migrations_only_mode() {
    return;
  }

  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running PomoTime app");
}

fn is_migrations_only_mode() -> bool {
  matches!(
    std::env::var("POMOTIME_RUN_MIGRATIONS_ONLY").ok().as_deref(),
    Some("1")
  )
}
