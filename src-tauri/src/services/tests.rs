use std::time::{SystemTime, UNIX_EPOCH};

use crate::repository::{RepositoryContext, StudySession};

use super::{
  AuthStateService, AuthSyncInput, LocalAuthState, ProgressService, StopTimerInput, TimerService,
};

fn test_user_id(prefix: &str) -> String {
  let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("system time before unix epoch")
    .as_nanos();

  format!("{prefix}-{timestamp}")
}

#[test]
fn auth_state_service_keeps_previous_refresh_token_when_input_missing_it() {
  let previous = LocalAuthState {
    user_id: "u-1".to_string(),
    email: "old@example.com".to_string(),
    access_token: "old-access".to_string(),
    refresh_token: Some("persist-refresh".to_string()),
    synced_unix_seconds: 100,
    is_authenticated: true,
  };

  let synced = AuthStateService::sync_local_state(
    Some(previous),
    AuthSyncInput {
      user_id: "u-1".to_string(),
      email: "new@example.com".to_string(),
      access_token: "new-access".to_string(),
      refresh_token: None,
      synced_unix_seconds: 200,
    },
  );

  assert_eq!(synced.email, "new@example.com");
  assert_eq!(synced.access_token, "new-access");
  assert_eq!(synced.refresh_token.as_deref(), Some("persist-refresh"));
  assert!(synced.is_authenticated);
}

#[test]
fn auth_state_service_clear_state_marks_user_as_logged_out() {
  let cleared = AuthStateService::clear_state(300);

  assert!(!cleared.is_authenticated);
  assert!(cleared.user_id.is_empty());
  assert!(cleared.access_token.is_empty());
  assert!(cleared.refresh_token.is_none());
}

#[test]
fn progress_service_computes_daily_progress_and_streak() {
  let sampled_sessions = vec![StudySession {
    id: "s1".to_string(),
    user_id: "u1".to_string(),
    goal_id: None,
    subject_id: None,
    title: "Sample".to_string(),
    note: String::new(),
    start_time: "2026-04-03T08:00:00Z".to_string(),
    end_time: "2026-04-03T08:45:00Z".to_string(),
    duration_minutes: 45,
    work_mode: "focus_clock".to_string(),
  }];

  let studied_minutes = ProgressService::sum_studied_minutes(&sampled_sessions);
  assert_eq!(studied_minutes, 45);

  let progress = ProgressService::calculate_daily_progress(180, 135);
  assert_eq!(progress.target_minutes, 180);
  assert_eq!(progress.studied_minutes, 135);
  assert_eq!(progress.remaining_minutes, 45);
  assert!(!progress.is_target_reached);
  assert!((progress.progress_ratio - 0.75).abs() < f64::EPSILON);

  let completed_dates = vec![
    "2026-04-01".to_string(),
    "2026-04-02".to_string(),
    "2026-04-03".to_string(),
    "2026-03-30".to_string(),
  ];

  let streak = ProgressService::calculate_streak(&completed_dates, "2026-04-03")
    .expect("streak calculation should succeed");
  assert_eq!(streak, 3);

  let today_streak = ProgressService::calculate_streak_until_today(&Vec::new())
    .expect("streak-until-today should support empty list");
  assert_eq!(today_streak, 0);
}

#[test]
fn timer_service_stop_timer_saves_session_with_calculated_duration() {
  crate::database::initialize_database().expect("migration should run before timer service test");
  let context = RepositoryContext::from_env();
  let timer_service = TimerService::new(context.sessions());
  let user_id = test_user_id("timer-user");

  let result = timer_service
    .stop_timer_and_save_session(StopTimerInput {
      user_id: user_id.clone(),
      goal_id: None,
      subject_id: None,
      title: "Focus coding".to_string(),
      note: "Ship feature".to_string(),
      start_time: "2026-04-10T08:00:00Z".to_string(),
      end_time: "2026-04-10T09:35:00Z".to_string(),
      started_at_unix_seconds: 1775808000,
      stopped_at_unix_seconds: 1775813700,
      work_mode: "focus_clock".to_string(),
    })
    .expect("timer stop should save session");

  assert_eq!(result.duration_minutes, 95);
  assert_eq!(result.session.duration_minutes, 95);

  let session_repository = context.sessions();
  let saved_session = session_repository
    .find_by_id(&result.session.id)
    .expect("find session should succeed")
    .expect("saved session should exist");

  assert_eq!(saved_session.user_id, user_id);
  assert_eq!(saved_session.duration_minutes, 95);

  session_repository
    .delete(&result.session.id)
    .expect("session cleanup should succeed");
}
