#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod repository;
mod services;

fn main() {
  if is_migrations_only_mode() {
    if let Err(error) = database::initialize_database() {
      eprintln!("migration run failed: {error}");
      std::process::exit(1);
    }
    return;
  }

  // Skip DB connection at startup; frontend talks to Supabase directly.
  // Keep the postgres command handlers registered for the migrations-only path
  // and any future local-Postgres usage, but do not require Postgres to launch.
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      commands::goal_commands::create_goal,
      commands::goal_commands::list_goals,
      commands::goal_commands::update_goal,
      commands::goal_commands::delete_goal,
      commands::weekly_target_commands::set_active_goal,
      commands::weekly_target_commands::list_weekly_targets,
      commands::weekly_target_commands::upsert_weekly_target,
      commands::subject_commands::create_subject,
      commands::subject_commands::list_subjects,
      commands::subject_commands::update_subject,
      commands::subject_commands::delete_subject,
      commands::session_commands::save_stopped_timer,
      commands::session_commands::list_sessions,
      commands::session_commands::add_manual_session,
      commands::session_commands::update_session,
      commands::session_commands::delete_session,
      commands::stats_commands::get_daily_stats,
    ])
    .run(tauri::generate_context!())
    .expect("error while running PomoTime app");
}

fn is_migrations_only_mode() -> bool {
  matches!(
    std::env::var("POMOTIME_RUN_MIGRATIONS_ONLY")
      .ok()
      .as_deref(),
    Some("1")
  )
}
